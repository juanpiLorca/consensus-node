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
    let vstateTraces = [];
    let gammaTraces = [];
    let lambda;
    
    for (const filename of filenames) {
      const response = await fetch(basepath + filename);
      const node = await response.json();
    
      const stateTrace = {
        x: node.data.timestamp.map(i => i / 1000),
        y: node.data.state,
        mode: 'lines',
        name: `Node ${node.params.node}`,
        xaxis: 'x',
        yaxis: 'y1'
      };

      const vstateTrace = {
        x: node.data.timestamp.map(i => i / 1000),
        y: node.data.vstate,
        mode: 'lines',
        name: `Node ${node.params.node}`,
        xaxis: 'x',
        yaxis: 'y2'
      };
      
      const gammaTrace = {
        x: node.data.timestamp.map(i => i / 1000),
        y: node.data.gamma,
        mode: 'lines',
        name: `Node ${node.params.node}`,
        xaxis: 'x',
        yaxis: 'y2'
      };
    
      stateTraces.push(stateTrace);
      vstateTraces.push(vstateTrace);
      gammaTraces.push(gammaTrace);
      lambda = node.params.lambda / 1000000;
    }

    // Combine state and vstate traces for the subplot
    const traces = [...stateTraces, ...vstateTraces, ...gammaTraces];

    // Define the layout for the subplot
    const layout = {
      autosize: true,
      height: 600,
      margin: {l: 48, r: 0, t: 0, b: 36},
      grid: { rows: 2, columns: 1, shared_xaxes: true, roworder: 'top to bottom' },
      xaxis: { title: 'Time [s]' },
      yaxis1: { title: 'State'}, // Top subplot
      yaxis2: { title: 'VState'}, // Middle subplot
      yaxis3: { title: 'Gamma'}, // Bottom subplot
      showlegend: false,
    };
    
    // Define mode bar buttons
    const modeBarButtons = {
      modeBarButtonsToRemove: [],
      modeBarButtonsToAdd: [{
        name: 'Download Image as .svg',
        icon: Plotly.Icons.camera,
        click: function(gd) {
          Plotly.downloadImage(gd, { format: 'svg' });
        }
      }]
    };
    
    // Plot the combined subplots
    Plotly.newPlot('plot', traces, layout, modeBarButtons);

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
  Plotly.relayout('vstatePlot', {
    'xaxis.autorange': true,
    'yaxis.autorange': true
  });
  Plotly.relayout('gammaPlot', {
    'xaxis.autorange': true,
    'yaxis.autorange': true
  });
};
