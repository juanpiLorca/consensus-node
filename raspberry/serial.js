// Import modules
const { SerialPort, ReadlineParser } = require('serialport')

// Define configuration parameters
const SERIAL_PATH = '/dev/ttyACM0'
const SERIAL_BAUD = 115200

// Define the port and the parser
const port = new SerialPort({path: SERIAL_PATH, baudRate: SERIAL_BAUD})
const parser = port.pipe(new ReadlineParser())

// Auxiliar function to write data with the asyc/await style
function serialWrite(msg) {
  return new Promise((resolve, reject) => {
    port.write(msg, (err) => {
      if (err) {
        reject(`Error sending data: ${err}`);  // Reject if there's an error
      } else {
        resolve(`Sent message: ${msg}`);  // Resolve on success
      }
    });
  });
}

// Auxiliar function for an async/await delay, useful between consecutive writes
function serialDelay() {
  return new Promise(resolve => setTimeout(resolve, 500));
}

// Export the necessary objects and functions
module.exports = { parser, serialWrite, serialDelay };
