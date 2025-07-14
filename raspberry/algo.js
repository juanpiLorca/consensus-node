const ALGO_TYPE_ORIGINAL = 0;
const ALGO_TYPE_INTEGRAL = 1;
const ALGO_TYPE_PI_LPF = 2;

class Algorithm {

  setParams(params) {
    // Algorithm parameters
    this.algorithm = parseInt(params.algorithm);
    this.state0 = Number(params.state);
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
    this.gamma = this.gamma0;
    this.cnt = 0;
    this.error = 0;
    this.errorDC = 0;
    this.ui = 0;
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
    const { error, numberNeighbors } = this.computeError(neighborStates, neighborEnabled);
    const uf = this.state0;//(this.state0 + numberNeighbors * (error + this.state)) / (1 + numberNeighbors);
    const ui = this.ui + this.gamma * (error - this.pole * this.error);
    const disturbance = this.computeDisturbance();
    const errorDC = this.pole * this.errorDC + (1 - this.pole) * this.error;
    const errorAC = this.error - this.errorDC; 
    let u = 0;
    switch (this.algorithm) {
      case ALGO_TYPE_ORIGINAL:
        u = this.gamma * Math.sign(error) + disturbance;
        this.state = Math.floor(this.state + u);
        this.gamma = Math.floor((this.gamma + this.lambda * Math.sign(Math.abs(error))) * 1000) / 1000;
        break;
      case ALGO_TYPE_INTEGRAL:
        u = this.gamma * error + disturbance;
        this.state = Math.floor(this.state + u);
        this.gamma = Math.floor(Math.abs(this.gamma + this.lambda * Math.abs(error) * Math.sign(Math.abs(error) - this.dead)) * 1000) / 1000;
        break;
      case ALGO_TYPE_PI_LPF:
        u = uf + ui + disturbance;
        this.state = Math.floor(this.pole * this.state + (1 - this.pole) * u);
        this.gamma = Math.floor(Math.abs(this.gamma + this.lambda * Math.abs(error) * Math.sign(Math.abs(errorDC) - Math.abs(errorAC))) * 1000) / 1000;
        break;
      default:
        u = uf + ui + disturbance;
        this.state = Math.floor(this.pole * this.state + (1 - this.pole) * u);
        this.gamma = Math.floor(Math.abs(this.gamma + this.lambda * Math.abs(error) * Math.sign(Math.abs(errorDC) - Math.abs(errorAC))) * 1000) / 1000;
    }
    this.error = error;
    this.errorDC = errorDC;
    this.ui = ui;
    return { state: this.state, gamma: Math.floor(this.gamma * 1000)}
  }

}

// Export an instanse of the algorithm
const algo = new Algorithm();
module.exports = { algo }
