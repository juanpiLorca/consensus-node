const { IP_ADDRESS, NODE_TYPE_PORT, TYPE_BLE, TYPE_BRIDGE } = require('./net'); 
const TYPE = process.argv[2]; 


//////////////////////////////
// Run the BLE edge-process //
//////////////////////////////

if (TYPE == TYPE_BLE) {

    // Import serial modules 
    const { parser, serialWrite, serialDelay } = require('./serial'); 

    // For detecting trigger changes
    let pastTrigger = false;

    // uart-rx: on receive data from uart-tx device (nordic)
    // --> Edge Process: send state (x) to backend-process
    parser.on('data', (data) => {
        
        const line = data.replace(/\r/g, '').replace(/\n/g, '');
        const msgType = line[0]; 
        if (msgType == 'd') {
            
            // Data message decoding: 
            // "d<timestamp>,<state>,<vstate>,<vartheta>,<neighbor_vstate1>,<neighbor_vstate2>,...<neighbor_vstateN>\n\r"
            const arr = line.slice(1).split(',');
            const state = { 
                timestamp: arr[0], 
                state: arr[1], 
                vstate: arr[2], 
                vartheta: arr[3], 
                neighborVStates: arr.slice(4) 
            };
            process.send(state); //process.send({ type: 'state', data: state });
        }
    })

    process.on('message', async (params) => {

        // 3 types of messages from backend-process: n -> network, a -> consensus (used to be 'a' as algorithm), t -> trigger
        // (1) Network params: { enabled, node, neighbors } --> 'n'
        // (2) Consensus params: { clock, state, vstate, vartheta, eta, disturbance.random, disturbance.offset, disturbance.amplitude, disturbance.phase, disturbance.samples } --> 'a'
        // (3) Trigger params: { trigger } --> 't'
        const msgNetwork = `n,${params.enabled ? 1 : 0},${params.node},${params.neighbors.join(',')}\n\r`;
        const msgConsensus = `a,${params.clock},${params.state},${params.vstate},${params.vartheta},${params.eta},${params.disturbance.random ? 1 : 0},` + 
            `${params.disturbance.offset},${params.disturbance.amplitude},${params.disturbance.phase},${params.disturbance.samples}\n\r`;
        const msgTrigger = `t,${params.trigger ? 1 : 0}\n\r`;

        try {
            await serialWrite(msgNetwork); 
            await serialDelay();
            
            await serialWrite(msgConsensus);

            if ((params.trigger && !pastTrigger) || (!params.trigger && pastTrigger)) {
                await serialDelay();
                await serialWrite(msgTrigger);
                pastTrigger = params.trigger;
            }
            console.log('Edge-Server params updated successfully: ', params);
        } catch (error) {
            console.error('Edge-Server error updating params: ', error);
        }
    }); 

/////////////////////////////////////////
// Run the WIFI or BRIDGE edge-process //
/////////////////////////////////////////

} else { 

    const http = require('http');
    const express = require('express');
    const axios = require('axios');
    
    const { bleGetDevices, bleGetState, bleGenerateManufacturerData } = require('./ble');
    const { algo } = require('./algo');

    const { exec } = require('child_process');

    let advProcess = null;
    let nordicNeighbors = [];

    // Create HTTP server (express-server) and configure middleware to parse JSON bodies for express-server
    const app = express();
    const server = http.createServer(app);
    app.use(express.json());

    // Store data in RAM for consensus parameters/variables
    // { enabled, node, neighbors, clock, state, vstate, vartheta, eta, disturbance: { random, offset, amplitude, phase, samples }, trigger, 
    //   neighborTypes: {}, neighborAddress: {} }
    // New configuration posted in /updateParams route
    let params = { trigger: false }; 

    // Global variables related to the consensus algorithm
    let intervalId = null;
    let isInitial = true;

    let time0 = 0; 
    let state = {}; // --> { timestamp, state, vstate, vartheta, neighborState }

    // Auxiliary function to return neighbor virtual states 
    async function getNeighborStates() {
        let neighborVStates = [];
        let neighborEnabled = []; 

        try { 
            for (let id of params.neighbors) {

                if (params.neighborTypes[id] == TYPE_BLE) {
                    const data = await bleGetState(nordicNeighbors[id]); 
                    neighborVStates.push(Number(data.vstate));
                    neighborEnabled.push(Boolean(data.enabled));
                } else {
                    const response = await axios.get(`${params.neighborAddress[id]}/getVState`)
                    neighborVStates.push(Number(response.data.vstate));
                    neighborEnabled.push(Boolean(response.data.enabled));
                }
            }
        } catch (error) {
            console.error('Error fetching from url');
        }

        return { neighborVStates: neighborVStates, neighborEnabled: neighborEnabled };
    }

    // Consensus algorithm execution every clock period
    async function updateConsensus() { 

        // 1. Update state: timestamp, state, vstate, vartheta and neighborState
        state.timestamp = Date.now() - time0; 

        if (params.enabled) {
            const { neighborVStates, neighborEnabled } = await getNeighborStates();
            state.neighborVStates = neighborVStates;
            ({ state: state.state, vstate: state.vstate, vartheta: state.vartheta } = algo.update(neighborVStates, neighborEnabled));
        }

        // 2. Send state to backend-process
        process.send(state); //process.send({ type: 'state', data: state });

        // 3. Broadcast via BLE
        if (TYPE === TYPE_BRIDGE) {
            const bleCommand = `manufacturer 0x0059 0x7` + bleGenerateManufacturerData(params.enabled, params.node, state.vstate) + `\r`; 
            advProcess.stdin.write(bleCommand);
        }
    }

    // Auxiliary function for starting BLE for bridge configuration (restarts the advertising process if any error)
    function startBleBridge() {
        advProcess = exec(`./bleadv.sh "${bleGenerateManufacturerData(params.enabled, params.node, state.vstate)}"`);
        advProcess.on('exit', (code, signal) => {
            if (code !== 0) {
                console.log(`Advertise process exited with error code ${code}. Restarting advertising process...`); 
                startBleBridge(); 
            }
        }); 
    }

    // Edge-process: on params message received from backend-process
    // --> Edge Process: if trigger, than start/stop consensus algorithm
    // --> Edge Process: update the params global variable 
    process.on('message', async (updatedParams) => {
        try {
            if (isInitial) {
                state = {
                    timestamp: 0, 
                    state: updatedParams.state, 
                    vstate: updatedParams.vstate, 
                    vartheta: updatedParams.vartheta, 
                    neighborVStates: []
                }; 
                isInitial = false;
            }
            if (updatedParams.trigger && !params.trigger) {
                // Start consensus algorithm if trigger is true and was false before <-- GUI interaction
                time0 = Date.now();
                state = {
                    timestamp: Date.now() - time0, 
                    state: updatedParams.state, 
                    vstate: updatedParams.vstate, 
                    vartheta: updatedParams.vartheta, 
                    neighborVStates: []
                };
                
                algo.setParams(params);
                algo.resetInitialConditions(); 

                if (TYPE === TYPE_BRIDGE) {
                    startBleBridge();
                    const nordicNeighborsRequired = updatedParams.neighbors.filter(id => updatedParams.neighborTypes[id] === TYPE_BLE).map(id => id);
                    nordicNeighbors = await bleGetDevices(nordicNeighborsRequired);
                }

                intervalId = setInterval(updateConsensus, updatedParams.clock);

            } else if (!updatedParams.trigger && params.trigger) {
                clearInterval(intervalId);
                if (TYPE === TYPE_BRIDGE) {
                    advProcess.kill();
                }
            }

            params = updatedParams; 
            algo.setParams(params);
            console.log('Edge-Server params updated successfully: ', params);

        } catch (error) {
            console.error('Error updating Edge-Server params: ', error);
        }
    }); 

    // Express-server: on get to /getVState route
    // --> Return the current vstate of the edge process
    app.get('/getVState', (_req, res) => {
        res.json({vstate: state.vstate, enabled: params.enabled});
    });

    // http-server: start edge http server (express-server)
    server.listen(NODE_TYPE_PORT[TYPE], '0.0.0.0', () => {
        console.log(`Edge-Server running at http://${IP_ADDRESS}:${NODE_TYPE_PORT[TYPE]}`);
    });

}