const ALGO_TYPE_ORIGINAL = 0;
const ALGO_TYPE_INTEGRAL = 1;
const ALGO_TYPE_PI_LPF = 2;
const ALGO_FINITE_TIME = 3; 

class Algorithm {

  setParams(params) {
    // Algorithm parameters
    this.algorithm = parseInt(params.algorithm);
    this.state0 = Number(params.state);

    // Add virtual state for Javier's consensus algorithm pourpose
    this.vstate0 = Number(params.vstate);

    this.gamma0 = Number(params.gamma) * 0.001;
    this.lambda = Number(params.lambda) * 0.000001;
    this.pole = Number(params.pole) * 0.01;
    this.dead = Number(params.dead);
    // Disturbance parameters
    this.random = Boolean(params.disturbance.random);
    this.offset = Number(params.disturbance.offset);
    this.amplitude = Number(params.disturbance.amplitude);
    this.phase = Number(params.disturbance.phase) * 0.01;
    this.samples = parseInt(params.disturbance.samples);
  }

  resetInitialConditions() {
    this.state = this.state0;
    // Add virtual state for Javier's consensus algorithm pourpose
    this.vstate = this.vstate0;
    this.gi = 0; 
    this.grad = 0; 

    this.gamma = this.gamma0;
    this.cnt = 0;
    this.error = 0;
    this.errorDC = 0;
    this.ui = 0;
  }

  // Add consensus law: 
  v_i(neighborStates, neighborEnabled) {

    let vi = 0; 
    let numberNeighbors = 0;

    for (let j in neighborStates) {
        if (neighborEnabled[j]) {
            vi += (-1) * Math.sign(this.vstate - neighborStates[j]) * Math.sqrt(Math.abs(this.vstate - neighborStates[j]));
            numberNeighbors++;
        }
    }

    return {vi: vi, numberNeighbors: numberNeighbors};
  }


  computeError(neighborStates, neighborEnabled) {
    let error = 0;
    let numberNeighbors = 0;
    for (let j in neighborStates) {
      if (neighborEnabled[j]) {
        error += (neighborStates[j] - this.state);
        numberNeighbors++;
      }
    }
    if (numberNeighbors > 0) {
      error /= numberNeighbors;
    }
    return {error: error, numberNeighbors: numberNeighbors};
  }

  computeDisturbance() {
    const normNoise = (this.random) ? 2 * (Math.random() - 0.5) : Math.sin(2*Math.PI*(this.cnt/this.samples - this.phase)); 
	  const disturbance = this.offset + this.amplitude * normNoise;
	  this.cnt = (this.cnt + 1) % this.samples;
    return disturbance;
  }

  update(neighborStates, neighborEnabled) {

    if (this.algorithm === ALGO_FINITE_TIME) {
      let u = 0;
      
      const disturbance = this.computeDisturbance();

      // 1. Compute consensus law for virtal state
      const {vi, numberNeighbors} = this.v_i(neighborStates, neighborEnabled);
      this.gi = vi;

      // 2. Compute error term (sigma) and gradient
      const sigma = this.state - this.vstate;
      this.error = sigma;
      this.grad = Math.sign(this.error); 

      // 3. Compute control input
      u = this.gi - this.gamma * this.grad;

      // 4. Update state, virtual state and gamma
      this.state = Math.floor(this.state + u + disturbance);
      this.vstate = Math.floor(this.vstate + this.gi);
      this.gamma = this.gamma + this.lambda * (Math.sign(this.error) * Math.sign(this.error));
    } else {
      console.log('Unknown algorithm type');
    }

    return { state: this.state, vstate: this.vstate, gamma: Math.floor(this.gamma * 1000)}
  }

}

// Export an instanse of the algorithm
const algo = new Algorithm();
module.exports = { algo }
