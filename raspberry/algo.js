class Algorithm {

    setParams(params) {

        this.dt = 0.01; 

        // Controller parameters:
        this.scale_factor = 1000;
        this.inv_scale_factor = 0.001;
        this.scale_eta = 0.0001; 
        this.active = 0;
        this.epsilonOFF = 0.0125;
        this.epsilonON = 0.0250;

        this.state0 = (Number(params.state) * this.inv_scale_factor);
        this.vstate0 = (Number(params.vstate) * this.inv_scale_factor);
        this.vartheta0 = (Number(params.vartheta) * this.inv_scale_factor);
        this.eta = (Number(params.eta) * this.scale_eta);

        // Disturbance parameters:
        this.offset = Number(params.disturbance.offset) * this.inv_scale_factor;
        this.amplitude = Number(params.disturbance.amplitude) * this.inv_scale_factor;
        this.samples = Number(params.disturbance.samples);
        
        // Use Laplacian or not:
        this.laplacian = Boolean(params.laplacian);
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
                let diff = this.vstate - neighborVStates[j] * this.inv_scale_factor;
                vi += (-1) * Math.sign(diff) * Math.sqrt(Math.abs(diff));
                numberNeighbors++;
            }
        }
        return {vi: vi, numberNeighbors: numberNeighbors};
    }

    computeLaplacian(neighborVStates, neighborEnabled) {
        
        let vi = 0; 
        let vstate_neighbor_sum = 0;
        let numberNeighbors = 0;

        for (let j in neighborVStates) {
            if (neighborEnabled[j]) {
                vstate_neighbor_sum += neighborVStates[j] * this.inv_scale_factor;
                numberNeighbors++;
            }
        }
        
        vi = (numberNeighbors * this.vstate) - vstate_neighbor_sum;
        return {vi: vi, numberNeighbors: numberNeighbors};
    }

    computeDisturbance() {
        const disturbance = this.amplitude * (Math.random() - this.offset);
        this.cnt = (this.cnt + 1) % this.samples;
        return disturbance;
    }

    update(neighborVStates, neighborEnabled) {
        let u = 0; 
        const disturbance = this.computeDisturbance(); 

        // 1. Compute consensus law for virtal state
        if (this.laplacian){
            const {vi, numberNeighbors} = this.compueLaplacian(neighborVStates, neighborEnabled);
        } else {
            const {vi, numberNeighbors} = this.v_i(neighborVStates, neighborEnabled);
        }
        this.gi = vi;

        // 2. Compute error term (sigma) and gradient
        this.sigma = this.state - this.vstate;
        this.grad = Math.sign(this.sigma); 

        // 3. Compute control input
        u = this.gi - this.vartheta * this.grad;

        // 4. Compute dvtheta (derivative of vartheta)
        let dvtheta = 0;
        if (this.active == 0) {
            if (Math.abs(this.sigma) > this.epsilonON) {
                this.active = 1;
                dvtheta = this.eta * 1.0;
            } else {
                dvtheta = 0.0;
            }
        } else {
            if (Math.abs(this.sigma) <= this.epsilonOFF) {
                this.active = 0;
                dvtheta = 0.0;
            } else {
                dvtheta = this.eta * 1.0;
            }
        }

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