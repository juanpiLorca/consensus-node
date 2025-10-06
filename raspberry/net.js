const os = require('os');
const seedrandom = require('seedrandom');

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

// Define function to encode float to integer (for transmission)
function encodeFloat(x, scale = 1e6) {
  return Math.round(x * scale);
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

// Number of nodes: 
const NUM_NODES = 30; // maximum number of nodes supported

// Seed the random number generator for reproducibility
const rng = seedrandom('consensus');

// Pre-generated initial states for up to 30 nodes: 
const INITIAL_STATES = Array.from({length: NUM_NODES}, () => encodeFloat(rng() * 10));
const INITIAL_VSTATES = Array.from({length: NUM_NODES}, () => encodeFloat(rng() * 10));

function createNodes(topologyConfig) {
    const nodes = {}; 
    for (let i = 0; i < topologyConfig.length; i++) {
        cfg = topologyConfig[i];
        nodes[cfg.id] = {
            ip: cfg.ip,
            type: cfg.type,
            enabled: cfg.enabled,
            neighbors: cfg.neighbors,
            clock: cfg.clock,
            state: INITIAL_STATES[cfg.id],
            vstate: INITIAL_VSTATES[cfg.id],
            vartheta: 0,
            eta: 5000,
            disturbance: {
                amplitude: 500,
                offset: 500,
                samples: 1
            }
        }
    }
    return nodes;
}

// Define the network: red-jetson -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// IP addresses of the nodes in the network are given by the office router (192.168.0.1) ==> red-jetson

// Consider a scale factor of 10000 to be able to work Tx integers in the nodes

let TOPOLOGY;

// 9node-ring-dir: ... ---> 4 ---> 1 ---> 9 ---> 5 ---> 2 ---> 6 ---> 8 ---> 3 ---> 7 ---> ...
// TOPOLOGY = [
//   {id: 1, ip: '192.168.0.136', type: TYPE_BLE,    enabled: true, neighbors: [4], clock: 250},
//   {id: 2, ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true, neighbors: [5], clock: 250},
//   {id: 3, ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true, neighbors: [8], clock: 250},
//   {id: 4, ip: '192.168.0.101', type: TYPE_BLE,    enabled: true, neighbors: [7], clock: 250},
//   {id: 5, ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true, neighbors: [9], clock: 250},
//   {id: 6, ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: true, neighbors: [2], clock: 250},
//   {id: 7, ip: '192.168.0.134', type: TYPE_BLE,    enabled: true, neighbors: [3], clock: 250},
//   {id: 8, ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true, neighbors: [6], clock: 250},
//   {id: 9, ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true, neighbors: [1], clock: 250},
// ]; 

// 9node-clusters
//       3 --- 9
//        \   /
//          6
//        /   \
// 7 --- 1     8 --- 2
//  \   /       \   /
//    4           5
TOPOLOGY = [
  {id: 1, ip: '192.168.0.136', type: TYPE_BLE,    enabled: true,  neighbors: [4,6,7],   clock: 250},
  {id: 2, ip: '192.168.0.136', type: TYPE_WIFI,   enabled: true,  neighbors: [5,8],     clock: 250},
  {id: 3, ip: '192.168.0.136', type: TYPE_BRIDGE, enabled: true,  neighbors: [6,9],     clock: 250},
  {id: 4, ip: '192.168.0.101', type: TYPE_BLE,    enabled: true,  neighbors: [1,7],     clock: 250},
  {id: 5, ip: '192.168.0.101', type: TYPE_WIFI,   enabled: true,  neighbors: [2,8],     clock: 250},
  {id: 6, ip: '192.168.0.101', type: TYPE_BRIDGE, enabled: false, neighbors: [1,3,8,9], clock: 250},
  {id: 7, ip: '192.168.0.134', type: TYPE_BLE,    enabled: true,  neighbors: [1,4],     clock: 250},
  {id: 8, ip: '192.168.0.134', type: TYPE_WIFI,   enabled: true,  neighbors: [2,5,6],   clock: 250},
  {id: 9, ip: '192.168.0.134', type: TYPE_BRIDGE, enabled: true,  neighbors: [3,6],     clock: 250},
]; 


// n30-dirline
// 1 <--- 2 <--- 3 <--- ... 28 <--- 29 <--- (30 disabled)
// TOPOLOGY = [
//  {id:  1, ip: '192.168.0.136', type: TYPE_BLE,    enabled:  true, neighbors: [ 2], clock: 250},
//  {id:  2, ip: '192.168.0.101', type: TYPE_BLE,    enabled:  true, neighbors: [ 3], clock: 250},
//  {id:  3, ip: '192.168.0.134', type: TYPE_BLE,    enabled:  true, neighbors: [ 4], clock: 250},
//  {id:  4, ip: '192.168.0.191', type: TYPE_BLE,    enabled:  true, neighbors: [ 5], clock: 250},
//  {id:  5, ip: '192.168.0.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 6], clock: 250},
//  {id:  6, ip: '192.168.0.130', type: TYPE_BLE,    enabled:  true, neighbors: [ 7], clock: 250},
//  {id:  7, ip: '192.168.0.154', type: TYPE_BLE,    enabled:  true, neighbors: [ 8], clock: 250},
//  {id:  8, ip: '192.168.0.196', type: TYPE_BLE,    enabled:  true, neighbors: [ 9], clock: 250},
//  {id:  9, ip: '192.168.0.162', type: TYPE_BLE,    enabled:  true, neighbors: [10], clock: 250},
//  {id: 10, ip: '192.168.0.140', type: TYPE_BLE,    enabled:  true, neighbors: [11], clock: 250},
//  {id: 11, ip: '192.168.0.136', type: TYPE_BRIDGE, enabled:  true, neighbors: [12], clock: 250},
//  {id: 12, ip: '192.168.0.101', type: TYPE_BRIDGE, enabled:  true, neighbors: [13], clock: 250},
//  {id: 13, ip: '192.168.0.134', type: TYPE_BRIDGE, enabled:  true, neighbors: [14], clock: 250},
//  {id: 14, ip: '192.168.0.191', type: TYPE_BRIDGE, enabled:  true, neighbors: [15], clock: 250},
//  {id: 15, ip: '192.168.0.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [16], clock: 250},
//  {id: 16, ip: '192.168.0.136', type: TYPE_WIFI,   enabled:  true, neighbors: [17], clock: 250},
//  {id: 17, ip: '192.168.0.101', type: TYPE_WIFI,   enabled:  true, neighbors: [18], clock: 250},
//  {id: 18, ip: '192.168.0.134', type: TYPE_WIFI,   enabled:  true, neighbors: [19], clock: 250},
//  {id: 19, ip: '192.168.0.191', type: TYPE_WIFI,   enabled:  true, neighbors: [20], clock: 250},
//  {id: 20, ip: '192.168.0.166', type: TYPE_WIFI,   enabled:  true, neighbors: [21], clock: 250},
//  {id: 21, ip: '192.168.0.130', type: TYPE_WIFI,   enabled:  true, neighbors: [22], clock: 250},
//  {id: 22, ip: '192.168.0.154', type: TYPE_WIFI,   enabled:  true, neighbors: [23], clock: 250},
//  {id: 23, ip: '192.168.0.196', type: TYPE_WIFI,   enabled:  true, neighbors: [24], clock: 250},
//  {id: 24, ip: '192.168.0.162', type: TYPE_WIFI,   enabled:  true, neighbors: [25], clock: 250},
//  {id: 25, ip: '192.168.0.140', type: TYPE_WIFI,   enabled:  true, neighbors: [26], clock: 250},
//  {id: 26, ip: '192.168.0.130', type: TYPE_BRIDGE, enabled:  true, neighbors: [27], clock: 250},
//  {id: 27, ip: '192.168.0.154', type: TYPE_BRIDGE, enabled:  true, neighbors: [28], clock: 250},
//  {id: 28, ip: '192.168.0.196', type: TYPE_BRIDGE, enabled:  true, neighbors: [29], clock: 250},
//  {id: 29, ip: '192.168.0.162', type: TYPE_BRIDGE, enabled:  true, neighbors: [30], clock: 250},
//  {id: 30, ip: '192.168.0.140', type: TYPE_BRIDGE, enabled: false, neighbors: [ 1], clock: 250},
// ]; 

// n30-ring4
// ... <---> 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> 30 <---> ...
// TOPOLOGY = [
// {id: 1,  ip: '192.168.0.136', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30,  3,  4], clock: 250},
// {id: 2,  ip: '192.168.0.101', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1,  4,  5], clock: 250},
// {id: 3,  ip: '192.168.0.134', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2,  5,  6], clock: 250},
// {id: 4,  ip: '192.168.0.191', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3,  6,  7], clock: 250},
// {id: 5,  ip: '192.168.0.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4,  7,  8], clock: 250},
// {id: 6,  ip: '192.168.0.130', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5,  8,  9], clock: 250},
// {id: 7,  ip: '192.168.0.154', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6,  9, 10], clock: 250},
// {id: 8,  ip: '192.168.0.196', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7, 10, 11], clock: 250},
// {id: 9,  ip: '192.168.0.162', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8, 11, 12], clock: 250},
// {id: 10, ip: '192.168.0.140', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9, 12, 13], clock: 250},
// {id: 11, ip: '192.168.0.136', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10, 13, 14], clock: 250},
// {id: 12, ip: '192.168.0.101', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11, 14, 15], clock: 250},
// {id: 13, ip: '192.168.0.134', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12, 15, 16], clock: 250},
// {id: 14, ip: '192.168.0.191', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13, 16, 17], clock: 250},
// {id: 15, ip: '192.168.0.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14, 17, 18], clock: 250},
// {id: 16, ip: '192.168.0.136', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15, 18, 19], clock: 250},
// {id: 17, ip: '192.168.0.101', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16, 19, 20], clock: 250},
// {id: 18, ip: '192.168.0.134', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17, 20, 21], clock: 250},
// {id: 19, ip: '192.168.0.191', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18, 21, 22], clock: 250},
// {id: 20, ip: '192.168.0.166', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19, 22, 23], clock: 250},
// {id: 21, ip: '192.168.0.130', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20, 23, 24], clock: 250},
// {id: 22, ip: '192.168.0.154', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21, 24, 25], clock: 250},
// {id: 23, ip: '192.168.0.196', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22, 25, 26], clock: 250},
// {id: 24, ip: '192.168.0.162', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23, 26, 27], clock: 250},
// {id: 25, ip: '192.168.0.140', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24, 27, 28], clock: 250},
// {id: 26, ip: '192.168.0.130', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25, 28, 29], clock: 250},
// {id: 27, ip: '192.168.0.154', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26, 29, 30], clock: 250},
// {id: 28, ip: '192.168.0.196', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27, 30,  1], clock: 250},
// {id: 29, ip: '192.168.0.162', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28,  1,  2], clock: 250},
// {id: 30, ip: '192.168.0.140', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 1, 29,  2,  3], clock: 250},
// ];

// // n30-ring3
// // ... <---> 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> 30 <---> ...
// NODES = [
//  {id:  1 ip: '192.168.0.136', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30,  3], clock: 250},
//  {id:  2 ip: '192.168.0.101', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1,  4], clock: 250},
//  {id:  3 ip: '192.168.0.134', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2,  5], clock: 250},
//  {id:  4 ip: '192.168.0.191', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3,  6], clock: 250},
//  {id:  5 ip: '192.168.0.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4,  7], clock: 250},
//  {id:  6 ip: '192.168.0.130', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5,  8], clock: 250},
//  {id:  7 ip: '192.168.0.154', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6,  9], clock: 250},
//  {id:  8 ip: '192.168.0.196', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7, 10], clock: 250},
//  {id:  9 ip: '192.168.0.162', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8, 11], clock: 250},
//  {id: 10 ip: '192.168.0.140', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9, 12], clock: 250},
//  {id: 11 ip: '192.168.0.136', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10, 13], clock: 250},
//  {id: 12 ip: '192.168.0.101', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11, 14], clock: 250},
//  {id: 13 ip: '192.168.0.134', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12, 15], clock: 250},
//  {id: 14 ip: '192.168.0.191', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13, 16], clock: 250},
//  {id: 15 ip: '192.168.0.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14, 17], clock: 250},
//  {id: 16 ip: '192.168.0.136', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15, 18], clock: 250},
//  {id: 17 ip: '192.168.0.101', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16, 19], clock: 250},
//  {id: 18 ip: '192.168.0.134', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17, 20], clock: 250},
//  {id: 19 ip: '192.168.0.191', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18, 21], clock: 250},
//  {id: 20 ip: '192.168.0.166', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19, 22], clock: 250},
//  {id: 21 ip: '192.168.0.130', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20, 23], clock: 250},
//  {id: 22 ip: '192.168.0.154', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21, 24], clock: 250},
//  {id: 23 ip: '192.168.0.196', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22, 25], clock: 250},
//  {id: 24 ip: '192.168.0.162', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23, 26], clock: 250},
//  {id: 25 ip: '192.168.0.140', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24, 27], clock: 250},
//  {id: 26 ip: '192.168.0.130', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25, 28], clock: 250},
//  {id: 27 ip: '192.168.0.154', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26, 29], clock: 250},
//  {id: 28 ip: '192.168.0.196', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27, 30], clock: 250},
//  {id: 29 ip: '192.168.0.162', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28,  1], clock: 250},
//  {id: 30 ip: '192.168.0.140', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 1, 29,  2], clock: 250},
// ]

// // n30-ring2
// // ... <---> 1 <---> 2 <---> 3 <---> ... 28 <---> 29 <---> 30 <---> ...
// NODES = [
//  {id:  1, ip: '192.168.0.136', type: TYPE_BLE,    enabled:  true, neighbors: [ 2, 30], clock: 250},
//  {id:  2, ip: '192.168.0.101', type: TYPE_BLE,    enabled:  true, neighbors: [ 3,  1], clock: 250},
//  {id:  3, ip: '192.168.0.134', type: TYPE_BLE,    enabled:  true, neighbors: [ 4,  2], clock: 250},
//  {id:  4, ip: '192.168.0.191', type: TYPE_BLE,    enabled:  true, neighbors: [ 5,  3], clock: 250},
//  {id:  5, ip: '192.168.0.166', type: TYPE_BLE,    enabled:  true, neighbors: [ 6,  4], clock: 250},
//  {id:  6, ip: '192.168.0.130', type: TYPE_BLE,    enabled:  true, neighbors: [ 7,  5], clock: 250},
//  {id:  7, ip: '192.168.0.154', type: TYPE_BLE,    enabled:  true, neighbors: [ 8,  6], clock: 250},
//  {id:  8, ip: '192.168.0.196', type: TYPE_BLE,    enabled:  true, neighbors: [ 9,  7], clock: 250},
//  {id:  9, ip: '192.168.0.162', type: TYPE_BLE,    enabled:  true, neighbors: [10,  8], clock: 250},
//  {id: 10, ip: '192.168.0.140', type: TYPE_BLE,    enabled:  true, neighbors: [11,  9], clock: 250},
//  {id: 11, ip: '192.168.0.136', type: TYPE_BRIDGE, enabled:  true, neighbors: [12, 10], clock: 250},
//  {id: 12, ip: '192.168.0.101', type: TYPE_BRIDGE, enabled:  true, neighbors: [13, 11], clock: 250},
//  {id: 13, ip: '192.168.0.134', type: TYPE_BRIDGE, enabled:  true, neighbors: [14, 12], clock: 250},
//  {id: 14, ip: '192.168.0.191', type: TYPE_BRIDGE, enabled:  true, neighbors: [15, 13], clock: 250},
//  {id: 15, ip: '192.168.0.166', type: TYPE_BRIDGE, enabled:  true, neighbors: [16, 14], clock: 250},
//  {id: 16, ip: '192.168.0.136', type: TYPE_WIFI,   enabled:  true, neighbors: [17, 15], clock: 250},
//  {id: 17, ip: '192.168.0.101', type: TYPE_WIFI,   enabled:  true, neighbors: [18, 16], clock: 250},
//  {id: 18, ip: '192.168.0.134', type: TYPE_WIFI,   enabled:  true, neighbors: [19, 17], clock: 250},
//  {id: 19, ip: '192.168.0.191', type: TYPE_WIFI,   enabled:  true, neighbors: [20, 18], clock: 250},
//  {id: 20, ip: '192.168.0.166', type: TYPE_WIFI,   enabled:  true, neighbors: [21, 19], clock: 250},
//  {id: 21, ip: '192.168.0.130', type: TYPE_WIFI,   enabled:  true, neighbors: [22, 20], clock: 250},
//  {id: 22, ip: '192.168.0.154', type: TYPE_WIFI,   enabled:  true, neighbors: [23, 21], clock: 250},
//  {id: 23, ip: '192.168.0.196', type: TYPE_WIFI,   enabled:  true, neighbors: [24, 22], clock: 250},
//  {id: 24, ip: '192.168.0.162', type: TYPE_WIFI,   enabled:  true, neighbors: [25, 23], clock: 250},
//  {id: 25, ip: '192.168.0.140', type: TYPE_WIFI,   enabled:  true, neighbors: [26, 24], clock: 250},
//  {id: 26, ip: '192.168.0.130', type: TYPE_BRIDGE, enabled:  true, neighbors: [27, 25], clock: 250},
//  {id: 27, ip: '192.168.0.154', type: TYPE_BRIDGE, enabled:  true, neighbors: [28, 26], clock: 250},
//  {id: 28, ip: '192.168.0.196', type: TYPE_BRIDGE, enabled:  true, neighbors: [29, 27], clock: 250},
//  {id: 29, ip: '192.168.0.162', type: TYPE_BRIDGE, enabled:  true, neighbors: [30, 28], clock: 250},
//  {id: 30, ip: '192.168.0.140', type: TYPE_BRIDGE, enabled:  true, neighbors: [ 1, 29], clock: 250},
// ]



// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const NODES = createNodes(TOPOLOGY); 
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

