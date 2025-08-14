class Algorithm {

    setParams(params) {

        // Controller parameters:
        this.state0 = Number(params.state);
        this.vstate0 = Number(params.vstate);
        this.vartheta0 = Number(params.vartheta);
        this.eta = Number(params.eta);

        // Disturbance parameters:
        this.random = Boolean(params.disturbance.random);
        this.offset = Number(params.disturbance.offset);
        this.amplitude = Number(params.disturbance.amplitude);
        this.phase = Number(params.disturbance.phase);
        this.samples = Number(params.disturbance.samples);
    }

    resetInitialConditions() {
        this.state = this.state0;
        this.vstate = this.vstate0;
        this.vartheta = this.vartheta0;

        this.cnt = 0; 
        this.sigma = 0;
        this.grad = 0;  
        this.gi = 0
    }

    v_i(neighborVStates, neighborEnabled) {

        let vi = 0; 
        let numberNeighbors = 0;

        for (let j in neighborStates) {
            if (neighborEnabled[j]) {
                vi += (-1) * Math.sign(this.state - neighborVStates[j]) * Math.sqrt(Math.abs(this.state - neighborVStates[j]));
                numberNeighbors++;
            }
        }

        return {vi: vi, numberNeighbors: numberNeighbors};
    }

    computeDisturbance() {
        const normNoise = (this.random) ? 2 * (Math.random() - 0.5) : Math.sin(2*Math.PI*(this.cnt/this.samples - this.phase)); 
        const disturbance = this.offset + this.amplitude * normNoise;
        this.cnt = (this.cnt + 1) % this.samples;
        return disturbance;
    }

    update(neighborVStates, neighborEnabled) {
        let u = 0; 
        const disturbance = this.computeDisturbance();

        // 1. Compute consensus law for virtal state
        const {vi, numberNeighbors} = this.v_i(neighborVStates, neighborEnabled);
        this.gi = vi;

        // 2. Compute error term (sigma) and gradient
        this.sigma = this.state - this.vstate;
        this.grad = Math.sign(this.sigma); 

        // 3. Compute control input
        u = this.gi - this.vartheta * this.grad;

        // 4. Update state, virtual state and vartheta
        this.state = Math.floor(this.state + u + disturbance);
        this.vstate = Math.floor(this.vstate + this.gi);
        this.vartheta = Math.floor(this.vartheta + this.eta * (Math.sign(this.sigma) * Math.sign(this.sigma)));
    }

}

// Exports:
algo = new Algorithm();
module.exports = {
    algo
};