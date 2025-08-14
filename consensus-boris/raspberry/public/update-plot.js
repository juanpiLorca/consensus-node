
// io-client: connect to the io-server (server-hub)
const socket = io();

// Define some plot configurations
const MAX_PLOT_POINTS = 20;
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'brown', 'pink', 'cyan', 'magenta', 'lime', 'indigo', 'violet', 'black', 'gray', 'silver', 'gold']    //Must be longer than BACKEND_IDS

// Define the plot layout
const stateLayout = {
  autosize: true,
  title: 'Server States',
  xaxis: { title: 'Time [s]' },
  yaxis: { title: 'State' },
};
const gammaLayout = {
  autosize: true,
  title: 'Server Gammas',
  xaxis: { title: 'Time [s]' },
  yaxis: { title: 'Gamma' },
};

// browser-ui: on page load
// -> browser-client: get BACKEND_IDS from the server-hub/getBackendIds route (server-hub)
// -> browser-ui: render plot
async function getBackendIds() {
  try {
    const response = await fetch('/getBackendIds');
    const data = await response.json();
    const BACKEND_IDS = data;
    renderPlot(BACKEND_IDS);
  } catch (error) {
    console.error('Error fetching /getBackendIds:', error);
  }
}
getBackendIds();

// browser-ui: definition of render plot auxiliar function
function renderPlot(BACKEND_IDS) {

  // Define the plot data, plot traces and the plot itself
  let serverData = BACKEND_IDS.map(() => ({ time: [], state: [], gamma: []}));
  let stateTraces = BACKEND_IDS.map((id, i) => ({
    x: serverData[i].time,
    y: serverData[i].state,
    type: 'scatter',
    mode: 'lines',
    name: `Server ${id}`,
    line: { color: COLORS[i] },
  }));
  Plotly.newPlot('statePlot', stateTraces, stateLayout);
  let gammaTraces = BACKEND_IDS.map((id, i) => ({
    x: serverData[i].time,
    y: serverData[i].gamma,
    type: 'scatter',
    mode: 'lines',
    name: `Server ${id}`,
    line: { color: COLORS[i] },
  }));
  Plotly.newPlot('gammaPlot', gammaTraces, gammaLayout);

  // io-client: on data reception from the io-server (server-hub)
  // -> browser-ui: update plot
  for (const [i, id] of BACKEND_IDS.entries()) {
    socket.on(`state${id}`, (state) => {
      console.log(`Received from IO-Server-${id}: `, state);
      serverData[i].time.push(state.timestamp / 1000);
      serverData[i].state.push(state.state);
      serverData[i].gamma.push(state.gamma);
      if (serverData[i].time.length > MAX_PLOT_POINTS) {
        serverData[i].time.shift();
        serverData[i].state.shift();
        serverData[i].gamma.shift();
      }
      Plotly.update('statePlot', { x: [serverData[i].time], y: [serverData[i].state] }, stateLayout, [i]);
      Plotly.update('gammaPlot', { x: [serverData[i].time], y: [serverData[i].gamma] }, gammaLayout, [i]);
    });
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
