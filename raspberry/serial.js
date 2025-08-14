const { SerialPort, ReadlineParser } = require('serialport');

const SERIAL_PATH = '/dev/ttyACM0';
const SERIAL_BAUDRATE = 115200;
const SERIAL_DELAY = 500; 

const port = new SerialPort({path: SERIAL_PATH, baudRate: SERIAL_BAUDRATE});
const parser = port.pipe(new ReadlineParser()); 

// Auxiliary function to write data to the serial port with the async/await pattern
function serialWrite(msg) {
    return new Promise((resolve, reject) => {
        port.write(msg, (err) => {

            if (err) { 
                reject(`Error sending data: ${err}`); 
            } else {
                resolve(`Sent message: ${msg}`); 
            }

        });
    });
}

// Auxiliary function to delay the next serial write operation, useful between consecutive writes
function serialDelay() {
    return new Promise(resolve => setTimeout(resolve, SERIAL_DELAY));
}

// Exports: 
module.exports = {
    parser,
    serialWrite,
    serialDelay
};




