class Algorithm {

    setParams(params) {

        this.dt = 0.01; 

        // Controller parameters:
        this.scale_factor = 1000;
        this.inv_scale_factor = 0.001;
        this.scale_eta = 0.0001; 

        this.state0 = (Number(params.state) * this.inv_scale_factor);
        this.vstate0 = (Number(params.vstate) * this.inv_scale_factor);
        this.vartheta0 = (Number(params.vartheta) * this.inv_scale_factor);
        this.eta = (Number(params.eta) * this.scale_eta);

        this.delta = 0.01; 

        // Disturbance parameters:
        this.random = Boolean(params.disturbance.random);
        this.offset = Number(params.disturbance.offset);
        this.amplitude = Number(params.disturbance.amplitude);
        this.phase = Number(params.disturbance.phase * 0.01);
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

        for (let j in neighborVStates) {
            if (neighborEnabled[j]) {
                vi += (-1) * Math.sign(this.vstate - neighborVStates[j]) * Math.sqrt(Math.abs(this.vstate - neighborVStates[j]));
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
        const disturbance = this.computeDisturbance() * this.inv_scale_factor;

        // 1. Compute consensus law for virtal state
        const {vi, numberNeighbors} = this.v_i(neighborVStates, neighborEnabled);
        this.gi = vi;

        // 2. Compute error term (sigma) and gradient
        this.sigma = this.state - this.vstate;
        this.grad = Math.sign(this.sigma); 

        // 3. Compute control input
        u = this.gi - this.vartheta * this.grad;

        // 4. Compute dvtheta (derivative of vartheta)
        let dvtheta = (Math.abs(this.sigma) > this.delta) ? this.eta * 1.0 : 0.0;

        // 5. Update state, virtual state and vartheta
        this.state = this.state + this.dt * (u + disturbance);
        this.vstate = this.vstate + this.dt * this.gi;
        this.vartheta = this.vartheta + this.dt * dvtheta;

        return {
            state: Math.floor(this.state * this.scale_factor),
            vstate: Math.floor(this.vstate * this.scale_factor),
            vartheta: Math.floor(this.vartheta * this.scale_factor)
        };
    }

}

// Exports:
algo = new Algorithm();
module.exports = {
    algo
};