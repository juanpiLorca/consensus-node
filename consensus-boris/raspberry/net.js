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

// Define the network
let NODES;
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

// red-jeston ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
NODES = {
  1: {ip: '192.168.0.136', type: TYPE_BLE,    enabled: true, neighbors: [4], clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 50, phase: 0, samples: 1}},
  2: {ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true, neighbors: [5], clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 50, phase: 0, samples: 1}},
  3: {ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true, neighbors: [8], clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 50, phase: 0, samples: 1}},
  4: {ip: '192.168.0.101', type: TYPE_BLE,    enabled: true, neighbors: [7], clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 50, phase: 0, samples: 1}},
  5: {ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true, neighbors: [9], clock: 1000, state: 5000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 50, phase: 0, samples: 1}},
  6: {ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: true, neighbors: [2], clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 50, phase: 0, samples: 1}},
  7: {ip: '192.168.0.134', type: TYPE_BLE,    enabled: true, neighbors: [3], clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 50, phase: 0, samples: 1}},
  8: {ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true, neighbors: [6], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 50, phase: 0, samples: 1}},
  9: {ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true, neighbors: [1], clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 50, phase: 0, samples: 1}},
}
// red-jeston ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


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

// 9node-clusters
//       3 --- 9
//        \   /
//          6
//        /   \
// 7 --- 1     8 --- 2
//  \   /       \   /
//    4           5
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

// red-jeston ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NODES = {
//   1: {ip: '192.168.0.136', type: TYPE_BLE,    enabled: true,  neighbors: [4,6,7],   clock: 1000, state: 1000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 300, amplitude: 0, phase: 0, samples: 1}},
//   2: {ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true,  neighbors: [5,8],     clock: 1000, state: 4000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 700, amplitude: 0, phase: 0, samples: 1}},
//   3: {ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true,  neighbors: [6,9],     clock: 1000, state: 7000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 600, amplitude: 0, phase: 0, samples: 1}},
//   4: {ip: '192.168.0.101', type: TYPE_BLE,    enabled: true,  neighbors: [1,7],     clock: 1000, state: 2000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 100, amplitude: 0, phase: 0, samples: 1}},
//   5: {ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true,  neighbors: [2,8],     clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 900, amplitude: 0, phase: 0, samples: 1}},
//   6: {ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: false, neighbors: [1,3,8,9], clock: 1000, state: 8000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 400, amplitude: 0, phase: 0, samples: 1}},
//   7: {ip: '192.168.0.134', type: TYPE_BLE,    enabled: true,  neighbors: [1,4],     clock: 1000, state: 3000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 800, amplitude: 0, phase: 0, samples: 1}},
//   8: {ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true,  neighbors: [2,5,6],   clock: 1000, state: 6000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 200, amplitude: 0, phase: 0, samples: 1}},
//   9: {ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true,  neighbors: [3,6],     clock: 1000, state: 9000, gamma: 0, lambda: 100, pole: 50, dead: 50, disturbance: {random: true, offset: 500, amplitude: 0, phase: 0, samples: 1}},
// }
// red-jeston ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


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

const BACKEND_IDS = Object.keys(NODES);
const NODE_ADDRESSES = Object.fromEntries(BACKEND_IDS.map(id => [id, `http://${NODES[id].ip}:${NODE_TYPE_PORT[NODES[id].type]}`]));
const BACKEND_ADDRESSES = Object.fromEntries(BACKEND_IDS.map(id => [id, `http://${NODES[id].ip}:${BACKEND_TYPE_PORT[NODES[id].type]}`]));

// Export the network related constants
module.exports = {
  IP_ADDRESS, HUB_PORT, BACKEND_TYPE_PORT, NODE_TYPE_PORT, NODE_WIFI_PORT, NODE_BRIDGE_PORT,
  TYPE_BLE, TYPE_WIFI, TYPE_BRIDGE,
  BACKEND_IDS, BACKEND_ADDRESSES, NODE_ADDRESSES, NODES,
};
