const { SerialPort, ReadlineParser } = require('serialport');


const SERIAL_PATH = '/dev/ttyACM0'; 
const SERIAL_BAUD_RATE = 115200;
const SERIAL_DELAY = 1000; 


// Open the serial port and create a parser 
const port = new SerialPort({ path: SERIAL_PATH, baudRate: SERIAL_BAUD_RATE });
const parser = port.pipe(new ReadlineParser()); 

/**
 * Writing to serial port
 * @param {string} msg - The data to write to the serial port
 */
function serialWrite(msg) {
    return new Promise((resolve, reject) => {
        port.write(msg, (err) => {
            if (err) {
                reject(`Error writing to serial port: ${err}`);
            } else {
                resolve(`Data written to serial port: ${msg}`);
            }
        });
    }); 
}

/**
 * Serial delay  
 */ 
function serialDelay() {
    return new Promise(resolve => setTimeout(resolve, SERIAL_DELAY));
}

// Module exports
module.exports = {
    parser,
    serialWrite,
    serialDelay
};