//import {createBluetooth} from 'node-ble'
const {createBluetooth} = require('node-ble');
const {bluetooth, destroy} = createBluetooth();

// A delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to discover and retrieve the required network devices
async function bleGetDevices(neighborsRequired) {
  // Define some variables
  let numberAttempts = 0;
  let devices = [];
  let nordicNeighbors = {};
  const adapter = await bluetooth.defaultAdapter();
  // Start discovery if it's not already happening
  if (!(await adapter.isDiscovering())) {
    await adapter.startDiscovery();
  }
  // Continue searching until all required nodes are found
  while (devices.length !== neighborsRequired.length) {
    // Print the number of attempt for trying to discover the required nodes
    numberAttempts += 1;
    console.log('Finding nodes. Attempt ' + numberAttempts);
    // Get available devices
    const uuids = await adapter.devices();
    // Filter the devices based on UUID and node requirements
    for (const uuid of uuids) {
      try {
        const device = await adapter.getDevice(uuid);
        const name = await device.getName();
        if (name === 'LABCTRL') {
          console.log('name:', name);
          const dataRaw = await device.getManufacturerData();
          const dataBuff = Object.values(dataRaw)[0];
          const netidEnabled = dataBuff.readUInt8(0);
          const node = dataBuff.readUInt8(1);
          const value = dataBuff.readInt32LE(2);
          console.log('node:', node);
          // If node is required, add to the list of found devices
          if (neighborsRequired.includes(node)) {
            console.log('Found node: ', node);
            devices.push(device);
            nordicNeighbors[node] = device;
          }
        }
      } catch (error) {
        // Optional: Log errors if needed
      }
    }
    // If all required nodes are found, exit the loop
    if (devices.length === neighborsRequired.length) {
      console.log('Required nodes found!');
      break;
    }
    // Wait before trying again
    await delay(1000);
  }
  return nordicNeighbors;
}

//
async function bleGetState(device) {
  const dataRaw = await device.getManufacturerData();
  const dataBuff = Object.values(dataRaw)[0];
  const netidEnabled = dataBuff.readUInt8(0);
  const node = dataBuff.readUInt8(1);
  const state = dataBuff.readInt32LE(2);
  return {state: state, enabled: (netidEnabled === 127)};   //127 = 0x7f = NETID_ENABLED
}

//
function bleGenerateManufacturerData(enabled, node, state) {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt8(node, 0);    // 1 byte for node
  buffer.writeInt32LE(state, 1); // 4 bytes for value
  return `${enabled ? 'f' : '0'}` +
         ` 0x${buffer.toString('hex', 0, 1)}` +
         ` 0x${buffer.toString('hex', 1, 2)}` + 
         ` 0x${buffer.toString('hex', 2, 3)}` +
         ` 0x${buffer.toString('hex', 3, 4)}` +
         ` 0x${buffer.toString('hex', 4, 5)}`;
}

module.exports = { bleGetDevices, bleGetState, bleGenerateManufacturerData };