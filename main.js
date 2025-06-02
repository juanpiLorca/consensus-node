// Import Modules
const { parser, serialWrite, serialDelay } = require('./libs/serial');

const MAX_COUNTER = 3;

/**
 * Using global counter to keep track of the number of messages
 */
let counter = 0;

// Start by sending the initial counter value
process.send(counter);

process.on('message', async (newCounter) => {
  try {
    // Update the counter
    counter = newCounter;

    // Send the counter value via serial
    await serialWrite(counter.toString());
    await serialDelay();

    console.log('Counter value sent:', counter);

    // Increment or reset the counter
    if (counter < MAX_COUNTER) {
      process.send(counter + 1);
    } else {
      counter = 0;
      console.log('Counter reset to 0');
      process.send(counter);
    }
  } catch (error) {
    console.error('Error in message handler:', error);
  }
});
