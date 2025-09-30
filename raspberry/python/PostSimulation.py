import os
import json 
import numpy as np
import matplotlib.pyplot as plt

class PostSimulation: 
    def __init__(self, simulation_dir, num_agents):
        self.simulation_dir = simulation_dir
        self.num_agents = num_agents
        self.conversion_factor = 1000  

        self.epsilon_on = 0.02
        self.epsilon_off = 0.01

        self.data = {}  

    def load_data(self):
        for i in range(1, self.num_agents + 1):
            filename = f"{self.simulation_dir}/{i}.json"

            if not os.path.exists(filename):
                print(f"[Warning] File not found: {filename}")
                continue

            with open(filename, 'r') as f:
                raw_content = json.load(f)

            # Handle string-wrapped JSON (double encoded)
            if isinstance(raw_content, str):
                try:
                    content = json.loads(raw_content)
                except json.JSONDecodeError:
                    print(f"[Error] Failed to decode JSON string in {filename}")
                    continue
            else:
                content = raw_content
            data_dict = content.get('data', {})

            # Parse the lists as floats (or ints if appropriate)
            timestamp = [int(x) for x in data_dict.get('timestamp', [])]
            state = [int(x) for x in data_dict.get('state', [])]
            vstate = [int(x) for x in data_dict.get('vstate', [])]
            vartheta = [int(x) for x in data_dict.get('vartheta', [])]

            # Sanity check: ensure all lists are the same length
            min_len = min(len(timestamp), len(state), len(vstate), len(vartheta))
            if min_len == 0:
                print(f"[Warning] Empty data in file: {filename}")
                continue

            # Truncate all to same length if needed
            timestamp = timestamp[:min_len]
            state     = state[:min_len]
            vstate    = vstate[:min_len]
            vartheta  = vartheta[:min_len]

            # Stack into [timestamp, state, vstate, vartheta]
            node_data = np.stack([timestamp, state, vstate, vartheta], axis=1)

            self.data[i] = node_data

    def hysteresis_analysis(self, agent=1):
        """
        Hysteresis and convergence analysis for a specific agent.
        Args:
            agent (int): The agent number to analyze.
        Returns:
            None: Displays plots for hysteresis behavior and sign value histogram.
        """
        node_data = self.data[agent]
        x = node_data[:, 1] / self.conversion_factor
        z = node_data[:, 2] / self.conversion_factor
        sigma = x - z
        grad_vals = np.sign(sigma)

        # --- Apply hysteresis logic ---
        active = 0
        dvtheta = np.zeros_like(sigma)
        for k in range(len(sigma) - 1):
            if active == 0:
                if np.abs(sigma[k]) > self.epsilon_on:
                    active = 1
                    dvtheta[k] = 1
            else:
                if np.abs(sigma[k]) <= self.epsilon_off:
                    active = 0
                dvtheta[k] = int(active)

        # --- Create figure ---
        fig, axs = plt.subplots(2, 1, figsize=(10, 8), sharex=False)

        # --- Top plot: histogram of sign values ---
        bins = [-1.5, -0.5, 0.5, 1.5]   # bins centered at -1, 0, +1
        counts, _, _ = axs[0].hist(
            grad_vals, bins=bins, rwidth=0.6,
            color='tab:orange', edgecolor='k', linewidth=1.2
        )
        axs[0].set_xticks([-1, 0, 1])
        axs[0].set_title(f'Histogram of sign values for Agent {agent}', fontsize=14)
        axs[0].set_xlabel('Sign value', fontsize=12)
        axs[0].set_ylabel('Count', fontsize=12)
        axs[0].grid(axis='y', linestyle='--', alpha=0.7)

        # annotate counts above bars
        for x_pos, c in zip([-1, 0, 1], counts):
            axs[0].text(x_pos, c + 0.5, str(int(c)), ha='center', fontsize=12)

        # --- Bottom plot: hysteresis step behavior ---
        axs[1].step(np.abs(sigma), dvtheta, where='post', lw=2,
            label=rf'$\dot{{\vartheta}}_{{{agent}}}$ vs $|\sigma_{{{agent}}}|$',
            color='tab:blue')
        
        axs[1].set_xlim(0, 2 * self.epsilon_on)
        axs[1].set_ylim(-0.2, 1.2)

        # Reference lines
        axs[1].axhline(0, color='k', linestyle='--', linewidth=1)
        axs[1].axvline(self.epsilon_off, color='r', linestyle='--', 
                label=r'$\epsilon_{\mathrm{off}}$')
        axs[1].axvline(self.epsilon_on, color='g', linestyle='--', 
                label=r'$\epsilon_{\mathrm{on}}$')

        # Labels and styling
        axs[1].set_title(f'Hysteresis behavior for Agent {agent}', fontsize=14)
        axs[1].set_xlabel(r'$|\sigma(t)|$', fontsize=12)
        axs[1].set_ylabel(r'$\dot{\vartheta}(t)$', fontsize=12)
        axs[1].legend()
        axs[1].grid(True, linestyle='--', alpha=0.7)

        plt.tight_layout()
        plt.show()

    def plot_errors(self):

        fig, ax = plt.subplots(figsize=(10, 5))
        for idx, node_id in enumerate(sorted(self.data.keys())):
            node_data = self.data[node_id]

            t = node_data[:, 0] * 0.01 / 1000.0 
            x = node_data[:, 1] / self.conversion_factor
            z = node_data[:, 2] / self.conversion_factor
            sigma = x - z

            ax.plot(t, sigma, label=f'$\sigma_{{{node_id}}}$')
        
        ax.axhline(self.epsilon_off, color='k', linestyle='--', label='$\\pm \\epsilon$')
        ax.axhline(-self.epsilon_off, color='k', linestyle='--')
        ax.axhline(self.epsilon_on, color='r', linestyle='--', label='$\\pm \\bar{\\epsilon}$')
        ax.axhline(-self.epsilon_on, color='r', linestyle='--')
        ax.set_ylim([-(self.epsilon_on * 1.5), (self.epsilon_on * 1.5)])
        ax.set_title('Error term $\\sigma_i$')
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('$\\sigma(t)$')
        ax.legend(ncol=3)
        ax.grid(True)

        plt.tight_layout()
        plt.show()


if __name__ == "__main__":
    sim_name = "9node_cluster"
    num_agents = 9
    post_sim = PostSimulation(simulation_dir=f"../data/{sim_name}", num_agents=num_agents)
    post_sim.load_data()
    post_sim.hysteresis_analysis(agent=1)
    post_sim.plot_errors()