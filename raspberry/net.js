// Import modules
const os = require('os');

// Define funtion to get backend-server's IP address
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

// Some constants
const IP_ADDRESS = getIpAddress();
const HUB_PORT = 3000;
const BACKEND_BLE_PORT = 3001;
const BACKEND_WIFI_PORT = 3002;
const BACKEND_BRIDGE_PORT = 3003;
const NODE_BLE_PORT = BACKEND_BLE_PORT;     //Not used, but it would make sense if the ble edge would use a port
const NODE_WIFI_PORT = 3004;
const NODE_BRIDGE_PORT = 3005;
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

// Define the network: re-jetson ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let NODES;

// 9node-ring-dir
NODES = {
  1: {ip: '192.168.0.136', type: TYPE_BLE,    enabled: true, neighbors: [4], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 50, phase: 0, samples: 1}, vstate:  500, eta: 0.01, vartheta: 0},
  2: {ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true, neighbors: [5], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 50, phase: 0, samples: 1}, vstate: 1500, eta: 0.01, vartheta: 0},
  3: {ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true, neighbors: [8], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 50, phase: 0, samples: 1}, vstate: 2500, eta: 0.01, vartheta: 0},
  4: {ip: '192.168.0.101', type: TYPE_BLE,    enabled: true, neighbors: [7], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 50, phase: 0, samples: 1}, vstate: 3500, eta: 0.01, vartheta: 0},
  5: {ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true, neighbors: [9], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 50, phase: 0, samples: 1}, vstate: 4500, eta: 0.01, vartheta: 0},
  6: {ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: true, neighbors: [2], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 50, phase: 0, samples: 1}, vstate: 5500, eta: 0.01, vartheta: 0},
  7: {ip: '192.168.0.134', type: TYPE_BLE,    enabled: true, neighbors: [3], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 50, phase: 0, samples: 1}, vstate: 6500, eta: 0.01, vartheta: 0},
  8: {ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true, neighbors: [6], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 50, phase: 0, samples: 1}, vstate: 7500, eta: 0.01, vartheta: 0},
  9: {ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true, neighbors: [1], clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 50, phase: 0, samples: 1}, vstate: 8500, eta: 0.01, vartheta: 0},
}

// // 9node-mesh
// // 1 ------- 9 ------- 5
// // | \       |       / |
// // |  4 ---- 3 ---- 8  |
// // | /       |       \ |
// // 7 ------- 6 ------- 2
// NODES = {
//   1: {ip: '192.168.1.125', type: TYPE_BLE,    enabled: true, neighbors: [4,7,9], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 50, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.125', type: TYPE_WIFI,   enabled: true, neighbors: [5,6,8], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 50, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.125', type: TYPE_BRIDGE, enabled: true, neighbors: [4,8],   clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 50, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.126', type: TYPE_BLE,    enabled: true, neighbors: [1,3,7], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 50, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.126', type: TYPE_WIFI,   enabled: true, neighbors: [2,8,9], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 50, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.126', type: TYPE_BRIDGE, enabled: true, neighbors: [2,7],   clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 50, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.127', type: TYPE_BLE,    enabled: true, neighbors: [1,4,6], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 50, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.127', type: TYPE_WIFI,   enabled: true, neighbors: [2,3,5], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 50, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.127', type: TYPE_BRIDGE, enabled: true, neighbors: [1,5],   clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 50, phase: 0, samples: 1}},
// }
// // 9node-ring-dir
// // ... ---> 4 ---> 1 ---> 9 ---> 5 ---> 2 ---> 6 ---> 8 ---> 3 ---> 7 ---> ...
// NODES = {
//   1: {ip: '192.168.1.125', type: TYPE_BLE,    enabled: true, neighbors: [4], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 50, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.125', type: TYPE_WIFI,   enabled: true, neighbors: [5], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 50, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.125', type: TYPE_BRIDGE, enabled: true, neighbors: [8], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 50, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.126', type: TYPE_BLE,    enabled: true, neighbors: [7], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 50, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.126', type: TYPE_WIFI,   enabled: true, neighbors: [9], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 50, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.126', type: TYPE_BRIDGE, enabled: true, neighbors: [2], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 50, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.127', type: TYPE_BLE,    enabled: true, neighbors: [3], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 50, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.127', type: TYPE_WIFI,   enabled: true, neighbors: [6], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 50, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.127', type: TYPE_BRIDGE, enabled: true, neighbors: [1], clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 50, phase: 0, samples: 1}},
// }
// // 9node-ring
// // ... --- 4 --- 1 --- 9 --- 5 --- 2 --- 6 --- 8 --- 3 --- 7 --- ...
// NODES = {
//   1: {ip: '192.168.1.125', type: TYPE_BLE,    enabled: true, neighbors: [4,9], clock: 1500, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 50, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.125', type: TYPE_WIFI,   enabled: true, neighbors: [5,6], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 50, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.125', type: TYPE_BRIDGE, enabled: true, neighbors: [7,8], clock:  500, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 50, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.126', type: TYPE_BLE,    enabled: true, neighbors: [1,7], clock:  500, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 50, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.126', type: TYPE_WIFI,   enabled: true, neighbors: [2,9], clock: 1500, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 50, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.126', type: TYPE_BRIDGE, enabled: true, neighbors: [2,8], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 50, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.127', type: TYPE_BLE,    enabled: true, neighbors: [3,4], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 50, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.127', type: TYPE_WIFI,   enabled: true, neighbors: [3,6], clock:  500, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 50, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.127', type: TYPE_BRIDGE, enabled: true, neighbors: [1,5], clock: 1500, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 50, phase: 0, samples: 1}},
// }
// // 9node-clusters
// //       3 --- 9
// //        \   /
// //          6
// //        /   \
// // 7 --- 1     8 --- 2
// //  \   /       \   /
// //    4           5
// NODES = {
//   1: {ip: '192.168.1.125', type: TYPE_BLE,    enabled: true,  neighbors: [4,6,7],   clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.125', type: TYPE_WIFI,   enabled: true,  neighbors: [5,8],     clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.125', type: TYPE_BRIDGE, enabled: true,  neighbors: [6,9],     clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.126', type: TYPE_BLE,    enabled: true,  neighbors: [1,7],     clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.126', type: TYPE_WIFI,   enabled: true,  neighbors: [2,8],     clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.126', type: TYPE_BRIDGE, enabled: false, neighbors: [1,3,8,9], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.127', type: TYPE_BLE,    enabled: true,  neighbors: [1,4],     clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.127', type: TYPE_WIFI,   enabled: true,  neighbors: [2,5,6],   clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.127', type: TYPE_BRIDGE, enabled: true,  neighbors: [3,6],     clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 0, phase: 0, samples: 1}},
// }
// // 18nodes-ring
// // ... --- 1 --- 2 --- 3 --- ... --- 16 --- 17 --- 18 --- ...
// NODES = {
//   1: {ip: '192.168.1.125', type: TYPE_BLE,    enabled:  true, neighbors: [ 2,18], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.126', type: TYPE_BLE,    enabled:  true, neighbors: [ 3, 1], clock: 1000, state: 1500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.127', type: TYPE_BLE,    enabled:  true, neighbors: [ 4, 2], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.130', type: TYPE_BLE,    enabled:  true, neighbors: [ 5, 3], clock: 1000, state: 2500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.131', type: TYPE_BLE,    enabled:  true, neighbors: [ 6, 4], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.132', type: TYPE_BLE,    enabled:  true, neighbors: [ 7, 5], clock: 1000, state: 3500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.125', type: TYPE_BRIDGE, enabled: false, neighbors: [ 8, 6], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.126', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 9, 7], clock: 1000, state: 4500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.127', type: TYPE_BRIDGE, enabled:  true, neighbors: [10, 8], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.130', type: TYPE_WIFI,   enabled:  true, neighbors: [11, 9], clock: 1000, state: 5500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.131', type: TYPE_WIFI,   enabled:  true, neighbors: [12,10], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.132', type: TYPE_WIFI,   enabled:  true, neighbors: [13,11], clock: 1000, state: 6500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.125', type: TYPE_WIFI,   enabled:  true, neighbors: [14,12], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.126', type: TYPE_WIFI,   enabled:  true, neighbors: [15,13], clock: 1000, state: 7500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.127', type: TYPE_WIFI,   enabled:  true, neighbors: [16,14], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.130', type: TYPE_BRIDGE, enabled:  true, neighbors: [17,15], clock: 1000, state: 8500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.131', type: TYPE_BRIDGE, enabled:  true, neighbors: [18,16], clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.132', type: TYPE_BRIDGE, enabled: false, neighbors: [ 1,17], clock: 1000, state: 9500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
// }
// // 18nodes-ring-dir
// // ... <--- 1 <--- 2 <--- 3 <--- ... <--- 16 <--- 17 <--- 18 <--- ...
// NODES = {
//   1: {ip: '192.168.1.125', type: TYPE_BLE,    enabled:  true, neighbors: [ 2], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.126', type: TYPE_BLE,    enabled:  true, neighbors: [ 3], clock: 1000, state: 1500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.127', type: TYPE_BLE,    enabled:  true, neighbors: [ 4], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.130', type: TYPE_BLE,    enabled:  true, neighbors: [ 5], clock: 1000, state: 2500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.131', type: TYPE_BLE,    enabled:  true, neighbors: [ 6], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.132', type: TYPE_BLE,    enabled:  true, neighbors: [ 7], clock: 1000, state: 3500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.125', type: TYPE_BRIDGE, enabled: false, neighbors: [ 8], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.126', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 9], clock: 1000, state: 4500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.127', type: TYPE_BRIDGE, enabled:  true, neighbors: [10], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.130', type: TYPE_WIFI,   enabled:  true, neighbors: [11], clock: 1000, state: 5500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.131', type: TYPE_WIFI,   enabled:  true, neighbors: [12], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.132', type: TYPE_WIFI,   enabled:  true, neighbors: [13], clock: 1000, state: 6500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.125', type: TYPE_WIFI,   enabled:  true, neighbors: [14], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.126', type: TYPE_WIFI,   enabled:  true, neighbors: [15], clock: 1000, state: 7500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.127', type: TYPE_WIFI,   enabled:  true, neighbors: [16], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.130', type: TYPE_BRIDGE, enabled:  true, neighbors: [17], clock: 1000, state: 8500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.131', type: TYPE_BRIDGE, enabled:  true, neighbors: [18], clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.132', type: TYPE_BRIDGE, enabled: false, neighbors: [ 1], clock: 1000, state: 9500, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
// }
// // 30node-line
// // 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> (30 disabled)
// NODES = {
//   1: {ip: '192.168.1.187', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30], clock: 1000, state: 6800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.105', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1], clock: 1000, state: 6600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.122', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2], clock: 1000, state: 6400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.139', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3], clock: 1000, state: 6200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.141', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.157', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5], clock: 1000, state: 5800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.160', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6], clock: 1000, state: 5600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7], clock: 1000, state: 5400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.171', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8], clock: 1000, state: 5200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.184', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.187', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10], clock: 1000, state: 4800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.105', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11], clock: 1000, state: 4600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.122', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12], clock: 1000, state: 4400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.139', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13], clock: 1000, state: 4200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.141', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.157', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15], clock: 1000, state: 3800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.160', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16], clock: 1000, state: 3600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.166', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17], clock: 1000, state: 3400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  19: {ip: '192.168.1.171', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18], clock: 1000, state: 3200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  20: {ip: '192.168.1.184', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  21: {ip: '192.168.1.187', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20], clock: 1000, state: 2800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  22: {ip: '192.168.1.105', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21], clock: 1000, state: 2600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  23: {ip: '192.168.1.122', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22], clock: 1000, state: 2400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  24: {ip: '192.168.1.139', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23], clock: 1000, state: 2200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  25: {ip: '192.168.1.141', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  26: {ip: '192.168.1.157', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25], clock: 1000, state: 1800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  27: {ip: '192.168.1.160', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26], clock: 1000, state: 1400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  28: {ip: '192.168.1.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27], clock: 1000, state: 1200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  29: {ip: '192.168.1.171', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  30: {ip: '192.168.1.184', type: TYPE_BRIDGE, enabled: false, neighbors: [ 1, 29], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
// }
// // n30-dirline
// // 1 <--- 2 <--- 3 <--- ... 28 <--- 29 <--- (30 disabled)
// NODES = {
//   1: {ip: '192.168.1.187', type: TYPE_BLE,    enabled:  true, neighbors: [ 2], clock: 1000, state: 6800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.105', type: TYPE_BLE,    enabled:  true, neighbors: [ 3], clock: 1000, state: 6600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.122', type: TYPE_BLE,    enabled:  true, neighbors: [ 4], clock: 1000, state: 6400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.139', type: TYPE_BLE,    enabled:  true, neighbors: [ 5], clock: 1000, state: 6200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.141', type: TYPE_BLE,    enabled:  true, neighbors: [ 6], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.157', type: TYPE_BLE,    enabled:  true, neighbors: [ 7], clock: 1000, state: 5800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.160', type: TYPE_BLE,    enabled:  true, neighbors: [ 8], clock: 1000, state: 5600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 9], clock: 1000, state: 5400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.171', type: TYPE_BLE,    enabled:  true, neighbors: [10], clock: 1000, state: 5200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.184', type: TYPE_BLE,    enabled:  true, neighbors: [11], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.187', type: TYPE_BRIDGE, enabled:  true, neighbors: [12], clock: 1000, state: 4800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.105', type: TYPE_BRIDGE, enabled:  true, neighbors: [13], clock: 1000, state: 4600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.122', type: TYPE_BRIDGE, enabled:  true, neighbors: [14], clock: 1000, state: 4400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.139', type: TYPE_BRIDGE, enabled:  true, neighbors: [15], clock: 1000, state: 4200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.141', type: TYPE_BRIDGE, enabled:  true, neighbors: [16], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.157', type: TYPE_WIFI,   enabled:  true, neighbors: [17], clock: 1000, state: 3800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.160', type: TYPE_WIFI,   enabled:  true, neighbors: [18], clock: 1000, state: 3600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.166', type: TYPE_WIFI,   enabled:  true, neighbors: [19], clock: 1000, state: 3400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  19: {ip: '192.168.1.171', type: TYPE_WIFI,   enabled:  true, neighbors: [20], clock: 1000, state: 3200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  20: {ip: '192.168.1.184', type: TYPE_WIFI,   enabled:  true, neighbors: [21], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  21: {ip: '192.168.1.187', type: TYPE_WIFI,   enabled:  true, neighbors: [22], clock: 1000, state: 2800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  22: {ip: '192.168.1.105', type: TYPE_WIFI,   enabled:  true, neighbors: [23], clock: 1000, state: 2600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  23: {ip: '192.168.1.122', type: TYPE_WIFI,   enabled:  true, neighbors: [24], clock: 1000, state: 2400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  24: {ip: '192.168.1.139', type: TYPE_WIFI,   enabled:  true, neighbors: [25], clock: 1000, state: 2200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  25: {ip: '192.168.1.141', type: TYPE_WIFI,   enabled:  true, neighbors: [26], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  26: {ip: '192.168.1.157', type: TYPE_BRIDGE, enabled:  true, neighbors: [27], clock: 1000, state: 1800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  27: {ip: '192.168.1.160', type: TYPE_BRIDGE, enabled:  true, neighbors: [28], clock: 1000, state: 1400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  28: {ip: '192.168.1.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [29], clock: 1000, state: 1200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  29: {ip: '192.168.1.171', type: TYPE_BRIDGE, enabled:  true, neighbors: [30], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  30: {ip: '192.168.1.184', type: TYPE_BRIDGE, enabled: false, neighbors: [ 1], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
// }
// // n30-ring4
// // ... <---> 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> 30 <---> ...
// NODES = {
//   1: {ip: '192.168.1.187', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30,  3,  4], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.122', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1,  4,  5], clock: 1000, state: 1200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.139', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2,  5,  6], clock: 1000, state: 1400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.105', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3,  6,  7], clock: 1000, state: 1600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.141', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4,  7,  8], clock: 1000, state: 1800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.157', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5,  8,  9], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.171', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6,  9, 10], clock: 1000, state: 2200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.160', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7, 10, 11], clock: 1000, state: 2400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.166', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8, 11, 12], clock: 1000, state: 2600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.184', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9, 12, 13], clock: 1000, state: 2800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.187', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10, 13, 14], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.122', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11, 14, 15], clock: 1000, state: 3200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.139', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12, 15, 16], clock: 1000, state: 3400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.105', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13, 16, 17], clock: 1000, state: 3600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.141', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14, 17, 18], clock: 1000, state: 3800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.157', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15, 18, 19], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.171', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16, 19, 20], clock: 1000, state: 4200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.160', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17, 20, 21], clock: 1000, state: 4400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  19: {ip: '192.168.1.166', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18, 21, 22], clock: 1000, state: 4600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  20: {ip: '192.168.1.184', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19, 22, 23], clock: 1000, state: 4800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  21: {ip: '192.168.1.187', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20, 23, 24], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  22: {ip: '192.168.1.122', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21, 24, 25], clock: 1000, state: 5200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  23: {ip: '192.168.1.139', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22, 25, 26], clock: 1000, state: 5400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  24: {ip: '192.168.1.105', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23, 26, 27], clock: 1000, state: 5600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  25: {ip: '192.168.1.141', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24, 27, 28], clock: 1000, state: 5800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  26: {ip: '192.168.1.157', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25, 28, 29], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  27: {ip: '192.168.1.171', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26, 29, 30], clock: 1000, state: 6200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  28: {ip: '192.168.1.160', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27, 30,  1], clock: 1000, state: 6400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  29: {ip: '192.168.1.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28,  1,  2], clock: 1000, state: 6600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  30: {ip: '192.168.1.184', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 1, 29,  2,  3], clock: 1000, state: 6800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
// }
// // n30-ring3
// // ... <---> 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> 30 <---> ...
// NODES = {
//   1: {ip: '192.168.1.187', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30,  3], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.122', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1,  4], clock: 1000, state: 1200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.139', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2,  5], clock: 1000, state: 1400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.105', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3,  6], clock: 1000, state: 1600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.141', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4,  7], clock: 1000, state: 1800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.157', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5,  8], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.171', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6,  9], clock: 1000, state: 2200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.160', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7, 10], clock: 1000, state: 2400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.166', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8, 11], clock: 1000, state: 2600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.184', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9, 12], clock: 1000, state: 2800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.187', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10, 13], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.122', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11, 14], clock: 1000, state: 3200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.139', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12, 15], clock: 1000, state: 3400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.105', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13, 16], clock: 1000, state: 3600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.141', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14, 17], clock: 1000, state: 3800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.157', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15, 18], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.171', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16, 19], clock: 1000, state: 4200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.160', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17, 20], clock: 1000, state: 4400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  19: {ip: '192.168.1.166', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18, 21], clock: 1000, state: 4600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  20: {ip: '192.168.1.184', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19, 22], clock: 1000, state: 4800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  21: {ip: '192.168.1.187', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20, 23], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  22: {ip: '192.168.1.122', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21, 24], clock: 1000, state: 5200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  23: {ip: '192.168.1.139', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22, 25], clock: 1000, state: 5400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  24: {ip: '192.168.1.105', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23, 26], clock: 1000, state: 5600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  25: {ip: '192.168.1.141', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24, 27], clock: 1000, state: 5800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  26: {ip: '192.168.1.157', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25, 28], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  27: {ip: '192.168.1.171', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26, 29], clock: 1000, state: 6200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  28: {ip: '192.168.1.160', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27, 30], clock: 1000, state: 6400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  29: {ip: '192.168.1.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28,  1], clock: 1000, state: 6600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  30: {ip: '192.168.1.184', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 1, 29,  2], clock: 1000, state: 6800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
// }
// // n30-ring2
// // ... <---> 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> 30 <---> ...
// NODES = {
//   1: {ip: '192.168.1.187', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.122', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1], clock: 1000, state: 1200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.139', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2], clock: 1000, state: 1400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.105', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3], clock: 1000, state: 1600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.141', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4], clock: 1000, state: 1800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.157', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.171', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6], clock: 1000, state: 2200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.160', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7], clock: 1000, state: 2400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.166', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8], clock: 1000, state: 2600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.184', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9], clock: 1000, state: 2800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.187', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.122', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11], clock: 1000, state: 3200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.139', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12], clock: 1000, state: 3400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.105', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13], clock: 1000, state: 3600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.141', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14], clock: 1000, state: 3800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.157', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.171', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16], clock: 1000, state: 4200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.160', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17], clock: 1000, state: 4400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  19: {ip: '192.168.1.166', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18], clock: 1000, state: 4600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  20: {ip: '192.168.1.184', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19], clock: 1000, state: 4800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  21: {ip: '192.168.1.187', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  22: {ip: '192.168.1.122', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21], clock: 1000, state: 5200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  23: {ip: '192.168.1.139', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22], clock: 1000, state: 5400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  24: {ip: '192.168.1.105', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23], clock: 1000, state: 5600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  25: {ip: '192.168.1.141', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24], clock: 1000, state: 5800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  26: {ip: '192.168.1.157', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  27: {ip: '192.168.1.171', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26], clock: 1000, state: 6200, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  28: {ip: '192.168.1.160', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27], clock: 1000, state: 6400, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  29: {ip: '192.168.1.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28], clock: 1000, state: 6600, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
//  30: {ip: '192.168.1.184', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 1, 29], clock: 1000, state: 6800, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 0, amplitude: 0, phase: 0, samples: 1}},
// }
// // n30-clusters
// NODES = {
//   1: {ip: '192.168.1.187', type: TYPE_BLE,    enabled:  true, neighbors: [ 2,  3, 21],     clock: 1000, state: 1000, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 150, amplitude: 50, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.122', type: TYPE_BLE,    enabled:  true, neighbors: [ 1,  4],         clock: 1000, state: 1200, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  50, amplitude: 50, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.139', type: TYPE_BLE,    enabled:  true, neighbors: [ 1,  5],         clock: 1000, state: 1400, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 160, amplitude: 50, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.105', type: TYPE_BLE,    enabled:  true, neighbors: [ 2,  5,  6],     clock: 1000, state: 1600, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 220, amplitude: 50, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.141', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  4,  7],     clock: 1000, state: 1800, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 270, amplitude: 50, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.157', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  7,  8],     clock: 1000, state: 2000, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  90, amplitude: 50, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.171', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  6,  9],     clock: 1000, state: 2200, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 170, amplitude: 50, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.160', type: TYPE_BLE,    enabled:  true, neighbors: [ 6, 10],         clock: 1000, state: 2400, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 50, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 7, 10],         clock: 1000, state: 2600, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 50, phase: 0, samples: 1}},
//  10: {ip: '192.168.1.184', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  9, 30],     clock: 1000, state: 2800, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  60, amplitude: 50, phase: 0, samples: 1}},
//  11: {ip: '192.168.1.187', type: TYPE_WIFI,   enabled:  true, neighbors: [12, 13, 21],     clock: 1000, state: 3000, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 130, amplitude: 50, phase: 0, samples: 1}},
//  12: {ip: '192.168.1.122', type: TYPE_WIFI,   enabled:  true, neighbors: [11, 14],         clock: 1000, state: 3200, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 240, amplitude: 50, phase: 0, samples: 1}},
//  13: {ip: '192.168.1.139', type: TYPE_WIFI,   enabled:  true, neighbors: [11, 15],         clock: 1000, state: 3400, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 50, phase: 0, samples: 1}},
//  14: {ip: '192.168.1.105', type: TYPE_WIFI,   enabled:  true, neighbors: [12, 15, 16],     clock: 1000, state: 3600, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 120, amplitude: 50, phase: 0, samples: 1}},
//  15: {ip: '192.168.1.141', type: TYPE_WIFI,   enabled:  true, neighbors: [13, 14, 17],     clock: 1000, state: 3800, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 180, amplitude: 50, phase: 0, samples: 1}},
//  16: {ip: '192.168.1.157', type: TYPE_WIFI,   enabled:  true, neighbors: [14, 17, 18],     clock: 1000, state: 4000, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 190, amplitude: 50, phase: 0, samples: 1}},
//  17: {ip: '192.168.1.171', type: TYPE_WIFI,   enabled:  true, neighbors: [15, 16, 19],     clock: 1000, state: 4200, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  40, amplitude: 50, phase: 0, samples: 1}},
//  18: {ip: '192.168.1.160', type: TYPE_WIFI,   enabled:  true, neighbors: [16, 20],         clock: 1000, state: 4400, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 250, amplitude: 50, phase: 0, samples: 1}},
//  19: {ip: '192.168.1.166', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 20],         clock: 1000, state: 4600, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 230, amplitude: 50, phase: 0, samples: 1}},
//  20: {ip: '192.168.1.184', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 19, 30],     clock: 1000, state: 4800, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 110, amplitude: 50, phase: 0, samples: 1}},
//  21: {ip: '192.168.1.187', type: TYPE_BRIDGE, enabled: false, neighbors: [ 1, 11, 22, 23], clock: 1000, state: 5000, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  70, amplitude: 50, phase: 0, samples: 1}},
//  22: {ip: '192.168.1.122', type: TYPE_BRIDGE, enabled:  true, neighbors: [21, 24],         clock: 1000, state: 5200, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  80, amplitude: 50, phase: 0, samples: 1}},
//  23: {ip: '192.168.1.139', type: TYPE_BRIDGE, enabled:  true, neighbors: [21, 25],         clock: 1000, state: 5400, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  30, amplitude: 50, phase: 0, samples: 1}},
//  24: {ip: '192.168.1.105', type: TYPE_BRIDGE, enabled:  true, neighbors: [22, 25, 26],     clock: 1000, state: 5600, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  20, amplitude: 50, phase: 0, samples: 1}},
//  25: {ip: '192.168.1.141', type: TYPE_BRIDGE, enabled:  true, neighbors: [23, 24, 27],     clock: 1000, state: 5800, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 210, amplitude: 50, phase: 0, samples: 1}},
//  26: {ip: '192.168.1.157', type: TYPE_BRIDGE, enabled:  true, neighbors: [24, 27, 28],     clock: 1000, state: 6000, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 260, amplitude: 50, phase: 0, samples: 1}},
//  27: {ip: '192.168.1.171', type: TYPE_BRIDGE, enabled:  true, neighbors: [25, 26, 29],     clock: 1000, state: 6200, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 290, amplitude: 50, phase: 0, samples: 1}},
//  28: {ip: '192.168.1.160', type: TYPE_BRIDGE, enabled:  true, neighbors: [26, 30],         clock: 1000, state: 6400, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset:  10, amplitude: 50, phase: 0, samples: 1}},
//  29: {ip: '192.168.1.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 30],         clock: 1000, state: 6600, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 140, amplitude: 50, phase: 0, samples: 1}},
//  30: {ip: '192.168.1.184', type: TYPE_BRIDGE, enabled: false, neighbors: [10, 20, 28, 29], clock: 1000, state: 6800, gamma: 0, lambda: 500, pole: 50, dead: 50, disturbance: {random: true, offset: 180, amplitude: 50, phase: 0, samples: 1}},
// }
// // 9node-clusters
// //       3 --- 9
// //        \   /
// //          6
// //        /   \
// // 7 --- 1     8 --- 2
// //  \   /       \   /
// //    4           5
// NODES = {
//   1: {ip: '192.168.1.112', type: TYPE_BLE,    enabled: true,  neighbors: [4,6,7],   clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   2: {ip: '192.168.1.112', type: TYPE_WIFI,   enabled: true,  neighbors: [5,8],     clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   3: {ip: '192.168.1.112', type: TYPE_BRIDGE, enabled: true,  neighbors: [6,9],     clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   4: {ip: '192.168.1.190', type: TYPE_BLE,    enabled: true,  neighbors: [1,7],     clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   5: {ip: '192.168.1.190', type: TYPE_WIFI,   enabled: true,  neighbors: [2,8],     clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   6: {ip: '192.168.1.190', type: TYPE_BRIDGE, enabled: false, neighbors: [1,3,8,9], clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   7: {ip: '192.168.1.136', type: TYPE_BLE,    enabled: true,  neighbors: [1,4],     clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   8: {ip: '192.168.1.136', type: TYPE_WIFI,   enabled: true,  neighbors: [2,5,6],   clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
//   9: {ip: '192.168.1.136', type: TYPE_BRIDGE, enabled: true,  neighbors: [3,6],     clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 0, disturbance: {random: true, offset: 0, amplitude: 50, phase: 0, samples: 1}},
// }
const BACKEND_IDS = Object.keys(NODES);
const NODE_ADDRESSES = Object.fromEntries(BACKEND_IDS.map(id => [id, `http://${NODES[id].ip}:${NODE_TYPE_PORT[NODES[id].type]}`]));
const BACKEND_ADDRESSES = Object.fromEntries(BACKEND_IDS.map(id => [id, `http://${NODES[id].ip}:${BACKEND_TYPE_PORT[NODES[id].type]}`]));

// Export the network related constants
module.exports = {
  IP_ADDRESS, HUB_PORT, BACKEND_TYPE_PORT, NODE_TYPE_PORT, NODE_WIFI_PORT, NODE_BRIDGE_PORT,
  TYPE_BLE, TYPE_WIFI, TYPE_BRIDGE,
  BACKEND_IDS, BACKEND_ADDRESSES, NODE_ADDRESSES, NODES,
};
