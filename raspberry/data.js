// Create the data directory if doesn't exists
const path = require('path');
const fs = require('fs').promises;

// Define some global variables for this module
const DATA_PATH = './data/';
let tree = {};

// Create the data directory if doesn't exists
fs.mkdir(DATA_PATH, { recursive: true });

// Function to get the directory tree structure
function dataGetTree() {
  return tree;
}

// Async function to write .json files
async function dataWriteFile(data, filename, id) {
  const fileHead = filename;
  await fs.mkdir(DATA_PATH + fileHead , { recursive: true });
  await fs.writeFile(DATA_PATH + fileHead + '/' + id + '.json', JSON.stringify(data, null, 2), 'utf8');
}

// Async function to update the directory tree structure
async function dataUpdateTree() {
  tree = {};
  const dirs = await fs.readdir(DATA_PATH);
  for (const dir of dirs) {
    const dirPath = path.join(DATA_PATH, dir);
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      tree[dir] = {};
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          tree[dir][file] = null;
        }
      }
    }
  }
}

// We call this to update the tree structure in the very beggining
dataUpdateTree();

// Export the functions
module.exports = {dataGetTree, dataUpdateTree, dataWriteFile};