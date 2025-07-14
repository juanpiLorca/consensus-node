// Import modules
const fs = require('fs').promises;

// Define some global variables for this module
const DATA_PATH = './data/';
let filepath = DATA_PATH + 'dummy.json';
let isFirstLine = true;         // this is just to make sure to write the first line of the data
let isEnable = false;           // this is just to make sure when ending logger we don't add another data line

// Create the data directory if doesn't exists
fs.mkdir(DATA_PATH, { recursive: true });

// Function to update the local private filepath variable
function loggerUpdateFilename(filename) {
  filepath = DATA_PATH + filename;
}

// Function to write the first part of the .json logger file
async function loggerStart(params) {
  try {
    isFirstLine = true;
    isEnable = true;
    await fs.writeFile(filepath, '{\n');
    await fs.appendFile(filepath, '"params":' + JSON.stringify(params) + ',\n');
    await fs.appendFile(filepath, '"data": [');
  } catch (err) {
    console.error('Error loggerStart:', err);
  }
}

// Function to write the data lines of the .json logger file
// async function loggerLine(state) {
//   try {
//     const arr = [state.timestamp, state.gamma, state.state, ...state.neighborStates];
//     if (isEnable) {
//       if (isFirstLine) {
//         await fs.appendFile(filepath, '\n' + JSON.stringify(arr));
//         isFirstLine = false;
//       } else {
//         await fs.appendFile(filepath, ',\n' + JSON.stringify(arr));
//       }
//     }
//   } catch (err) {
//     console.error('Error loggerLine:', err);
//   }
// }
// --- Finite-Time Robust Adaptive Coordination ---
// Function to write the data lines of the .json logger file
async function loggerLine(state) {
  try {
    // Always include timestamp, gamma, state
    const arr = [state.timestamp, state.gamma, state.state];

    // If vstate and vartheta exist, log them too
    if ('vstate' in state) {
      arr.push(state.vstate);
    }
    if ('vartheta' in state) {
      arr.push(state.vartheta);
    }

    // Always add neighbor states
    arr.push(...state.neighborStates);

    if (isEnable) {
      if (isFirstLine) {
        await fs.appendFile(filepath, '\n' + JSON.stringify(arr));
        isFirstLine = false;
      } else {
        await fs.appendFile(filepath, ',\n' + JSON.stringify(arr));
      }
    }
  } catch (err) {
    console.error('Error loggerLine:', err);
  }
}
// --- Finite-Time Robust Adaptive Coordination ---


// Function to write the last part of the .json logger file
// async function loggerEnd(){
//   try {
//     if (isEnable) {
//       await fs.appendFile(filepath, '\n]\n}');
//       isFirstLine = false;
//       isEnable = false;
//       // Get the complete object of the file
//       const rawData = await fs.readFile(filepath, { encoding: 'utf8' });
//       let objData = JSON.parse(rawData);
//       dataTransposed = objData.data[0].map((_, i) => objData.data.map(row => row[i]));
//       objData.data = {}
//       objData.data.timestamp = dataTransposed[0];
//       objData.data.gamma = dataTransposed[1];
//       objData.data.state = dataTransposed[2];
//       for (let i in objData.params.neighbors) {
//         objData.data[objData.params.neighbors[i]] = dataTransposed[parseInt(i)+3];
//       }
//       await fs.writeFile(filepath, JSON.stringify(objData, null, 2), 'utf8');
//     }
//   } catch (err) {
//     console.error('Error loggerEnd:', err);
//   }
// }
// --- Finite-Time Robust Adaptive Coordination ---
// Function to write the last part of the .json logger file
async function loggerEnd() {
  try {
    if (isEnable) {
      await fs.appendFile(filepath, '\n]\n}');
      isFirstLine = false;
      isEnable = false;

      // Get the complete object of the file
      const rawData = await fs.readFile(filepath, { encoding: 'utf8' });
      let objData = JSON.parse(rawData);

      // Transpose data: [ [a,b,c], [a,b,c], ... ] => { a: [], b: [], c: [] }
      const dataTransposed = objData.data[0].map((_, i) => objData.data.map(row => row[i]));

      objData.data = {};
      objData.data.timestamp = dataTransposed[0];
      objData.data.gamma = dataTransposed[1];
      objData.data.state = dataTransposed[2];

      let columnOffset = 3;

      // If vstate and vartheta exist, capture them
      const expectedColumns = 3 + objData.params.neighbors.length;
      if (dataTransposed.length > expectedColumns) {
        objData.data.vstate = dataTransposed[columnOffset];
        columnOffset++;
      }
      if (dataTransposed.length > expectedColumns) {
        objData.data.vartheta = dataTransposed[columnOffset];
        columnOffset++;
      }

      // Now neighbors
      for (let i in objData.params.neighbors) {
        objData.data[objData.params.neighbors[i]] = dataTransposed[columnOffset + parseInt(i)];
      }

      await fs.writeFile(filepath, JSON.stringify(objData, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error loggerEnd:', err);
  }
}
// --- Finite-Time Robust Adaptive Coordination ---

// Export the functions
module.exports = {loggerUpdateFilename, loggerStart, loggerLine, loggerEnd};
