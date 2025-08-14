// browser-ui: on page load
// -> browser-client: get dataTree from server-hub/getDataTree route (server-hub)
// -> browser-ui: render directories dropdown
async function getDataTree() {
  try {
    const response = await fetch('/getDataTree');
    const data = await response.json();
    const dataTree = data;
    renderDataDirectories(dataTree);
  } catch (error) {
    console.error('Error fetching /getDataTree:', error);
  }
}
getDataTree();

// browser-ui: definition of render data directories dropdown auxiliar function
function renderDataDirectories(dataTree) {
  const dropdown = document.getElementById('dropdown');
  dropdown.addEventListener('change', (event) => updateDirectory(event, dataTree));
  dropdown.innerHTML = '<option value="" disabled selected>Select a directory</option>';
  for (const dir in dataTree) {
    const option = document.createElement('option');
    option.value = dir;
    option.textContent = dir;
    dropdown.appendChild(option);
  }
}

// browser-ui: on updateDirectory dropdown
// -> browser-client: fetch json files to server-hub/data/dir/id.json route (server-hub)
// -> browser-ui: display a plot
async function updateDirectory(event, dataTree) {
  const dir = event.target.value;  // Get the selected option's value
  const basepath = `/data/${dir}/`;
  const filenames = Object.keys(dataTree[dir]);
  try {
    let stateTraces = [];
    let gammaTraces = [];
    let lambda;
    for (const filename of filenames) {
      const response = await fetch(basepath + filename);
      const node = await response.json();
      const stateTrace = {
        x: node.data.timestamp.map(i=>i/1000),
        y: node.data.state,
        mode: 'lines',
        name: `Node ${node.params.node}`
      }
      const gammaTrace = {
        x: node.data.timestamp.map(i=>i/1000),
        y: node.data.gamma,
        mode: 'lines',
        name: `Node ${node.params.node}`
      }
      stateTraces.push(stateTrace);
      gammaTraces.push(gammaTrace);
      lambda = node.params.lambda / 1000000;
    }
    // Define the plot layouts
    const stateLayout = {
      autosize: true,
      title: `Consensus Algorithm. lambda = ${lambda} `,
      xaxis: { title: 'Time [s]' },
      yaxis: { title: 'State' }
    };
    const gammaLayout = {
      autosize: true,
      title: `Consensus Algorithm. lambda = ${lambda} `,
      xaxis: { title: 'Time [s]' },
      yaxis: { title: 'Gamma' }
    };
    // Define mode bar buttons
    const modeBarButtons = {
      modeBarButtonsToRemove: [],
      modeBarButtonsToAdd: [{
        name: 'Download Image as .svg',
        icon: Plotly.Icons.camera,
        click: function(gd) {
          Plotly.downloadImage(gd, {format: 'svg'})
        }
      }]
    }
    Plotly.newPlot('statePlot', stateTraces, stateLayout, modeBarButtons);
    Plotly.newPlot('gammaPlot', gammaTraces, gammaLayout, modeBarButtons);
  } catch (error) {
    console.error('Error fetching /data/<dir>/<id>.json:', error);
  }
}

// browser-ui: on window resize
// -> browser-ui: relayout size of plotly graph
window.onresize = function() {
  Plotly.relayout('statePlot', {
    'xaxis.autorange': true,
    'yaxis.autorange': true
  });
  Plotly.relayout('gammaPlot', {
    'xaxis.autorange': true,
    'yaxis.autorange': true
  });
};
