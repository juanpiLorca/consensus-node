// Import modules
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const { fork } = require('child_process');
const { loggerUpdateFilename, loggerStart, loggerLine, loggerEnd } = require('./log');
const { IP_ADDRESS, BACKEND_TYPE_PORT  } = require('./net');

// Get the type of the edge-process
const TYPE = process.argv[2];
const BACKEND_PORT = BACKEND_TYPE_PORT[TYPE];

// Create HTTP server (express-server and io-server)
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure middleware for serving static json files and to parse JSON bodies for express-server
app.use(express.static(path.join(__dirname, 'data')));
app.use(express.json());

// Store data in RAM for consensus parameters
// params = {
//   trigger: false, filename: 'temp', node: 1, address: `http://192.168.1.126:${BLE_PORT}`,
//   neighborAddresses: {2: `http://192.168.1.126:${BLE_PORT}`, 3: `http://192.168.1.127:${BLE_PORT}`, 7: `http://192.168.1.123:${BRIDGE_PORT}`},
//   type: TYPE_BLE, enabled: true, neighbors: [2,3,7], clock: 1000, state: 1000, gamma: 1, lambda: 5,
//   neighborTypes: {2: TYPE_BLE, 3: TYPE_BLE, 7: TYPE_BRIDGE},
// }
let params = {trigger: false};

// backend-process: spawn edge-process
// -> backend-process: on message received from edge-process
// -> io-server: emite the state tto the io-client (server-hub)
// -> logger: save data line
const edgeProcess = fork(`./edge.js`, [TYPE]);
edgeProcess.on('message', (state) => {
  io.emit('state', state);
  loggerLine(state);
  console.log(`IO-Server-${params.node} Sent: state = ${state.state}, gamma = ${state.gamma}`);
});

// express-server: on post /updateParams route
// -> logger: start or end logger according to trigger
// -> backend-process: send params message to edge-process (ble, wifi, bridge)
app.post('/updateParams', async (req, res) => {
  try {
    const updatedParams = req.body;
    if (updatedParams.trigger && !params.trigger) {
      loggerUpdateFilename(`${updatedParams.filename}-${updatedParams.type}.json`);
      await loggerStart(updatedParams);
    } else if (!updatedParams.trigger && params.trigger) {
      await loggerEnd();
    }
    edgeProcess.send(updatedParams);
    params = updatedParams;
    console.log('Backend-Server params updated successfully: ', params);
    res.status(200).json({ message: 'Backend-Server params updated successfully', params });
  } catch (error) {
    res.status(500).json({ message: 'Backend-Server error updating params' });
  }
});

// http-server: start server (for both express-server and io-server)
server.listen(BACKEND_PORT, '0.0.0.0', () => {
  console.log(`Backend-Server running at http://${IP_ADDRESS}:${BACKEND_PORT}`);
});
