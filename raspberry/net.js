const os = require('os');

// Define function to get backend-server's IP address
function getIpAddress() {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    console.log('Cannot find IP address.');
    process.exit(1);
}

// Define constants for the backend server:
const IP_ADDRESS = getIpAddress();

// Ports:
const HUB_PORT = 3000;
const BACKEND_BLE_PORT = 3001;
const BACKEND_WIFI_PORT = 3002;
const BACKEND_BRIDGE_PORT = 3003;
const NODE_BLE_PORT = BACKEND_BLE_PORT;     //Not used, but it would make sense if the ble edge would use a port
const NODE_WIFI_PORT = 3004;
const NODE_BRIDGE_PORT = 3005;

// Types of nodes:
const TYPE_BLE = 'ble';
const TYPE_WIFI = 'wifi';
const TYPE_BRIDGE = 'bridge';
const BACKEND_TYPE_PORT = {
  [TYPE_BLE]: BACKEND_BLE_PORT,
  [TYPE_WIFI]: BACKEND_WIFI_PORT,
  [TYPE_BRIDGE]: BACKEND_BRIDGE_PORT,
};
const NODE_TYPE_PORT = {
  [TYPE_BLE]: NODE_BLE_PORT,
  [TYPE_WIFI]: NODE_WIFI_PORT,
  [TYPE_BRIDGE]: NODE_BRIDGE_PORT,
};

// Define the network: red-jetson -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// IP addresses of the nodes in the network are given by the office router (192.168.0.1) ==> red-jetson

let NODES;

// 9node-ring-dir: ... ---> 4 ---> 1 ---> 9 ---> 5 ---> 2 ---> 6 ---> 8 ---> 3 ---> 7 ---> ...
NODES = {
  1: {ip: '192.168.0.136', type: TYPE_BLE,    enabled: true, neighbors: [4], clock: 1000, state: 2000,  vstate: 500,  vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  2: {ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true, neighbors: [5], clock: 1000, state: 5000,  vstate: 3500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  3: {ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true, neighbors: [8], clock: 1000, state: 8000,  vstate: 6500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  4: {ip: '192.168.0.101', type: TYPE_BLE,    enabled: true, neighbors: [7], clock: 1000, state: 3000,  vstate: 1500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  5: {ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true, neighbors: [9], clock: 1000, state: 4000,  vstate: 2500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  6: {ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: true, neighbors: [2], clock: 1000, state: 9000,  vstate: 7500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  7: {ip: '192.168.0.134', type: TYPE_BLE,    enabled: true, neighbors: [3], clock: 1000, state: 2000,  vstate: 4500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  8: {ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true, neighbors: [6], clock: 1000, state: 7000,  vstate: 5500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
  9: {ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true, neighbors: [1], clock: 1000, state: 10000, vstate: 8500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
}; 

// 9node-clusters
//       3 --- 9
//        \   /
//          6
//        /   \
// 7 --- 1     8 --- 2
//  \   /       \   /
//    4           5
// NODES = {
//   1: {ip: '192.168.0.136', type: TYPE_BLE,    enabled: true,  neighbors: [4,6,7],   clock: 1000, state: 2000,  vstate: 500,  vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   2: {ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true,  neighbors: [5,8],     clock: 1000, state: 5000,  vstate: 3500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   3: {ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true,  neighbors: [6,9],     clock: 1000, state: 8000,  vstate: 6500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   4: {ip: '192.168.0.101', type: TYPE_BLE,    enabled: true,  neighbors: [1,7],     clock: 1000, state: 3000,  vstate: 1500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   5: {ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true,  neighbors: [2,8],     clock: 1000, state: 4000,  vstate: 2500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   6: {ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: false, neighbors: [1,3,8,9], clock: 1000, state: 9000,  vstate: 7500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   7: {ip: '192.168.0.134', type: TYPE_BLE,    enabled: true,  neighbors: [1,4],     clock: 1000, state: 2000,  vstate: 4500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   8: {ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true,  neighbors: [2,5,6],   clock: 1000, state: 7000,  vstate: 5500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
//   9: {ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true,  neighbors: [3,6],     clock: 1000, state: 10000, vstate: 8500, vartheta: 0, eta: 5000, disturbance: {amplitude: 500, offset: 500, samples: 1}, laplacian: 0},
// }; 



// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const BACKEND_IDS = Object.keys(NODES); 
const NODE_ADDRESSES = Object.fromEntries(BACKEND_IDS.map(id => [id, `http://${NODES[id].ip}:${NODE_TYPE_PORT[NODES[id].type]}`]));
const BACKEND_ADDRESSES = Object.fromEntries(BACKEND_IDS.map(id => [id, `http://${NODES[id].ip}:${BACKEND_TYPE_PORT[NODES[id].type]}`]));

// Export the network related constants
module.exports = {
  IP_ADDRESS, 
  HUB_PORT, 
  BACKEND_TYPE_PORT, 
  NODE_TYPE_PORT, 
  NODE_WIFI_PORT, 
  NODE_BRIDGE_PORT,
  TYPE_BLE, 
  TYPE_WIFI, 
  TYPE_BRIDGE,
  BACKEND_IDS, 
  BACKEND_ADDRESSES, 
  NODE_ADDRESSES, 
  NODES,
};

