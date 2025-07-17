// Import modules
const http = require('http');
const express = require('express');
const axios = require('axios');
const socketIo = require('socket.io');
const socketIoClient = require('socket.io-client');
const path = require('path');
const { IP_ADDRESS, HUB_PORT, NODES, BACKEND_IDS, BACKEND_ADDRESSES, NODE_ADDRESSES } = require('./net');
const { dataGetTree, dataUpdateTree, dataWriteFile } = require('./data');

// Create HTTP server (express-server and io-server)
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure middleware to serve static files and to parse JSON bodies for express-server
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.json());

// Store data in RAM for consensus parameters
let params = {
  trigger: false,
  algorithm: 3, // 3: Finite-Time Robust Adaptive Coordination
  filename: "dummy",
  nodes: NODES,
}

// Auxiliar function to generate backend params
function generateBackendParams(updatedParams, id) {
  const neighbors = updatedParams.nodes[id].neighbors;
  const backendParams = {
    trigger: updatedParams.trigger,
    algorithm: updatedParams.algorithm,
    filename: updatedParams.filename,
    node: id,
    address: NODE_ADDRESSES[id],
    neighborAddresses: Object.fromEntries(neighbors.map(id => [id, NODE_ADDRESSES[id]])),
    ...updatedParams.nodes[id],
    neighborTypes: Object.fromEntries(neighbors.map(id => [id, NODES[id].type])),
  };
  return backendParams;
}

// script-process: on script load
// -> axios-client: post initial params to the server-backend-i/updateParams
// -> io-client: start the io-clients 
async function updateBackendParams(updatedParams) {
  try {
    for (let id of BACKEND_IDS) {
      const backendParams = generateBackendParams(updatedParams, id);
      console.log(`Generated backendParams for node ${id}:`, backendParams);
      await axios.post(`${BACKEND_ADDRESSES[id]}/updateParams`, backendParams);
    }
    console.log('Hub-Server: Backend-Server params updated successfully:', updatedParams);
  } catch (error) {
    console.error('Hub-Server: Backend-Server error updating params.');
  }
}
updateBackendParams(params);

// io-client: auxiliar function to start io-clients
function startIoClients() {

  // io-client: connect to the io-servers (server-backends)
  const sockets = BACKEND_IDS.reduce((sockets, id) => {
    sockets[id] = socketIoClient(BACKEND_ADDRESSES[id]);
    return sockets;
  }, {});
  
  // io-client: on data reception from the io-servers (server-backends)
  // -> io-server: relay the state to the io-client (browser-client)
  for (let id of BACKEND_IDS) {
    sockets[id].on('state', (state) => {
      io.emit(`state${id}`, state);
      //console.log(`IO-Server-${params.node} Sent: state = ${state.state}, gamma = ${state.gamma}`);

      // --- Finite-Time Robust Adaptive Coordination ---
      console.log(`IO-Server-${params.node} Sent: state = ${state.state}, vstate = ${state.vstate}, gamma = ${state.gamma}, vartheta = ${state.vartheta}`);
      // --- Finite-Time Robust Adaptive Coordination ---

    });
  }
}
startIoClients();

// io-server: on io-client (browser-client) connection simply log a message
io.on('connection', (_socket) => {
  console.log('Hub-Server socket connected to Browser-Client');
});

// express-server: on get to /getDataTree route
app.get('/getDataTree', (_req, res) => {
  res.json(dataGetTree());
});

// express-server: on get to /getIds route
app.get('/getBackendIds', (_req, res) => {
  res.json(BACKEND_IDS);
});

// express-server: on get to /getParams route
app.get('/getParams', (req, res) => {
  res.json(params);
});

// express-server: on post to /updateParams route
// -> axios-client: if trigger stop process, then request for backend data files and write them into server-hub
// -> axios-client: relay post to the server-backend-i/updateParams (server-backends)
app.post('/updateParams', async (req, res) => {
  const updatedParams = req.body;
  try {
    await updateBackendParams(updatedParams);
    if (!updatedParams.trigger && params.trigger) {
      for (let id of BACKEND_IDS) {
        const response = await axios.get(`${BACKEND_ADDRESSES[id]}/${updatedParams.filename}-${updatedParams.nodes[id].type}.json`);
        await dataWriteFile(response.data, `${updatedParams.filename}`, id);
      }
      await dataUpdateTree();
    }
    params = updatedParams;
    console.log('Hub-Server params updated successfully.', params);
    res.status(200).json({ message: 'Hub-Server params updated successfully.', params });
  } catch (error) {
    res.status(500).json({ message: 'Hub-Server error updating params.' });
  }
});

// http-server: start the server (for both express-server and io-server)
server.listen(HUB_PORT, '0.0.0.0', () => {
  console.log(`Hub-Server running at http://${IP_ADDRESS}:${HUB_PORT}`);
});
