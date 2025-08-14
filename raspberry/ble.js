const { createBluetooth } = require('node-ble'); 
const { bluetooth } = createBluetooth();

const DELAY_LOOP = 1000; // Delay between each loop iteration in milliseconds

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));    
}

// Function to discover and retrive the required network devices
async function bleGetDevices(neighborsRequired) { 
    
    let numberAttempts = 0; 
    let devices = []; 
    let nordicNeighbors = {}; 

    const adapter = await bluetooth.defaultAdapter();
    if (!(await adapter.isDiscovering())) {
        await adapter.startDiscovery();
    }

    // >>> neighborsRequired is a list of devices included in the params --> updateParams route
    while (devices.length !== neighborsRequired.length) {
        
        numberAttempts++;
        console.log('Finding nodes. Attempt ' + numberAttempts); 

        // Get available devices: uuids
        const uuids = await adapter.devices(); 

        // Filter devices based on: 
        // >>> UUID 
        // >>> Node reuirements 
        for (const uuid of uuids) {
            try { 
                const device = await adapter.getDevice(uuid);
                const name = await device.getName(); 
                
                if (name === 'LABCTRL') {
                    console.log('name: ', name); 

                    const dataRaw = await device.getManufacturerData();
                    const dataBuff = Object.values(dataRaw)[0]; 
                    const node = dataBuff.readUInt8(1);

                    console.log('node: ', node);

                    // If node is required given the params (Neighbors)
                    if (neighborsRequired.includes(node)) {
                        console.log('Found node: ', node); 
                        devices.push(device);
                        nordicNeighbors[node] = device; 
                    }
                }
            } catch (error) {
                // TODO: Handle error if device is not found or other issues
            }
        }

        // If all required devices are found, break the loop
        if (devices.length === neighborsRequired.length) {
            console.log('All required nodes found: ', devices.length);
            break;
        }

        await delay(DELAY_LOOP); 
    }

    return nordicNeighbors;
}

// Function to get the state and vstate of a specific device: 
// For nordic board one defines a structure in C (custom_data_type) and sends it via manufacturer data: 
// Example of the custom_data_type structure in C that is being used:
// >>> typedef struct { 
// >>>     uint16_t manufacturer;
// >>>     uint8_t netid_enabled;
// >>>     uint8_t node;
// >>>     int32_t state;
// >>>     int32_t vstate;
// >>> } custom_data_type;
async function bleGetState(device) {

    // Field          | Size (bytes) | Offset in payload (excluding manufacturer ID)
    // -------------- | ------------ | ---------------------------------------------
    // netid_enabled  | 1            | 0
    // node           | 1            | 1
    // state          | 4            | 2
    // vstate         | 4            | 6

    const dataRaw = await device.getManufacturerData();
    const dataBuff = Object.values(dataRaw)[0];
    const netidEnabled = dataBuff.readUInt8(0);
    const state = readInt32BLE(2); 
    const vstate = readInt32BLE(6);

    return {state: state, vstate: vstate, enabled: (netidEnabled === 127)};
}

/**
 * Generates manufacturer data payload for BLE advertising.
 * 
 * Encodes the following fields into a 10-byte buffer:
 * - enabled: 1 byte (127 if true, 0 if false)
 * - node: 1 byte identifier
 * - state: 4 bytes signed integer (little endian)
 * - vstate: 4 bytes signed integer (little endian)
 * 
 * Returns a string of hex bytes prefixed with '0x' and space-separated,
 * suitable for use in BLE advertising commands.
 */
function bleGenerateManufacturerData(enabled, node, state, vstate) {
  const buffer = Buffer.alloc(10);
  
  // Write 1 byte: 127 if enabled, else 0
  buffer.writeUInt8(enabled ? 127 : 0, 0);
  
  // Write 1 byte: node ID
  buffer.writeUInt8(node, 1);
  
  // Write 4 bytes: state as signed 32-bit int, little endian
  buffer.writeInt32LE(state, 2);
  
  // Write 4 bytes: vstate as signed 32-bit int, little endian
  buffer.writeInt32LE(vstate, 6);

  // Convert each byte to '0xXX' hex string, space-separated
  let result = '';
  for (let i = 0; i < buffer.length; i++) {
    result += `0x${buffer.toString('hex', i, i + 1)} `;
  }
  
  return result.trim();
}


// Exports:
module.exports = {
    bleGetDevices,
    bleGetState,
    bleGenerateManufacturerData
};
