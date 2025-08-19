// Import the network module and receive the type of edge-process
const { IP_ADDRESS, NODE_TYPE_PORT, TYPE_BLE, TYPE_BRIDGE } = require('./net');
const TYPE = process.argv[2];

//////////////////////////////
// Run the BLE edge-process //
//////////////////////////////
if (TYPE === TYPE_BLE) {

// Import modules
const { parser, serialWrite, serialDelay } = require('./serial');

// For detecting trigger changes
pastTrigger = false;

// uart-rx: on receive data from uart-tx (nordic)
// -> edge-process: send state message to backend-process
parser.on('data', (data) => {
  const line = data.replace(/\r/g, '').replace(/\n/g, '');
  console.log('Nordic raw: ', line);
  const msgType = line[0];
  if (msgType == 'd') {
    const arr = line.slice(1).split(',');
    const state = { timestamp: arr[0], gamma: arr[1], state: arr[2], vstate: arr[3], neighborStates: arr.slice(4)};
    process.send(state);
  }
})

// edge-process: on params message received from backend-process
// -> uart-tx: send trigger-network-algorithm params to uart-rx (nordic)
process.on('message', async (params) => {
  const msgNetwork = `n${params.enabled ? 1 : 0},${params.node},${params.neighbors.join(',')}\n\r`;
  const msgAlgorithm = `a${params.algorithm},${params.clock},${params.state},${params.gamma},${params.lambda},${params.pole},${params.dead},` +
    `${params.disturbance.random ? 1 : 0},${params.disturbance.offset},${params.disturbance.amplitude},${params.disturbance.phase},${params.disturbance.samples},`+ 
    `${params.vstate}\n\r`;
  const msgTrigger = `t${params.trigger ? 1 : 0}\n\r`;
  try {
    await serialWrite(msgNetwork);
    await serialDelay();
    await serialWrite(msgAlgorithm);
    if ((params.trigger && !pastTrigger) || (!params.trigger && pastTrigger)) {
      await serialDelay();
      await serialWrite(msgTrigger);
      pastTrigger = params.trigger;
    }
    console.log('Edge-Server params updated successfully:', params);
  } catch (error) {
    console.log('Edge-Server error updating params');
  }
});


/////////////////////////////////////////
// Run the WIFI or BRIDGE edge-process //
/////////////////////////////////////////
} else {

// Import modules
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

// Store data in RAM for consensus parameters
let params = {trigger: false};

// Some global variables related to the consensus algorithm
let intervalId = null;
let isInitial = true;
let time0 = 0;
let state = {};     //{timestamp: 0, gamma: 1, state: 1000, vstate: 5000, neighborStates: [2000, 3000]}

// Auxiliar function to return neighbor states
async function getNeighborStates() {
  let neighborStates = [];
  let neighborEnabled = [];
  try {
    for (let id of params.neighbors) {
      if (params.neighborTypes[id] === TYPE_BLE) {
        const data = await bleGetState(nordicNeighbors[id]); 
        neighborStates.push(Number(data.vstate));
        neighborEnabled.push(Boolean(data.enabled));
      } else {
        const response = await axios.get(`${params.neighborAddresses[id]}/getState`);
        neighborStates.push(Number(response.data.vstate));
        neighborEnabled.push(Boolean(response.data.enabled));
      }
    }
  } catch (error) {
    console.error(`Error fetching from url`);
  }
  return {neighborStates: neighborStates, neighborEnabled: neighborEnabled}
}

// The consensus algorithm
async function updateConsensus() {

  // Update the state: timestamp, gamma, state and neigbor-states
  state.timestamp = Date.now() - time0;
  if (params.enabled) {
    const { neighborStates, neighborEnabled } = await getNeighborStates();
    state.neighborStates = neighborStates;
    ({ state: state.state, vstate: state.vstate, gamma: state.gamma} = algo.update(neighborStates, neighborEnabled));
  }

  // Send state to bakend-process
  process.send(state);

  // Broadcast via BLE
  if (TYPE === TYPE_BRIDGE) {
    const bleCommand = `manufacturer 0x0059 0x7` + bleGenerateManufacturerData(params.enabled, params.node, state.vstate) + `\r`;
    advProcess.stdin.write(bleCommand);
  }
}

// Auxiliar function for starting ble for bridge configuration (restarts the process if any error)
function startBleBridge() {
  advProcess = exec(`./bleadv.sh "${bleGenerateManufacturerData(params.enabled, params.node, state.vstate)}"`);
  advProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.log(`Advertise process exited with error code: ${code}. Restart advertise process.`);
      startBleBridge();
    }
  });
}

// edge-process: on params message received from backend-process
// -> edge-process: if trigger, then start/stop consensus algorithm
// -> edge-process: update params global variable
process.on('message', async (updatedParams) => {
  try {
    if (isInitial) {
      state = {timestamp: 0, gamma: updatedParams.gamma, state: updatedParams.state, vstate: updatedParams.vstate, neighborStates: []};
      isInitial = false;
    }
    if (updatedParams.trigger && !params.trigger) {
      time0 = Date.now();
      state = {timestamp: Date.now() - time0, gamma: updatedParams.gamma, state: updatedParams.state, vstate: updatedParams.vstate, neighborStates: []};
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
    console.log('Edge-server params updated successfully:', params);
  } catch (error) {
    console.log('Edge-server error updating params');
  }
});

// express-server: on get to /getState route
app.get('/getState', (_req, res) => {
  res.json({vstate: state.vstate, enabled: params.enabled});
});

// http-server: start edge http server (express-server)
server.listen(NODE_TYPE_PORT[TYPE], '0.0.0.0', () => {
  console.log(`Edge-Server running at http://${IP_ADDRESS}:${NODE_TYPE_PORT[TYPE]}`);
});


}