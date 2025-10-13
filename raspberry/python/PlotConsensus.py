import json
import numpy as np
import matplotlib.pyplot as plt
import os
import matplotlib.colors as mcolors

# --- Visualization Setup ---
# Set Matplotlib parameters for high-quality figures suitable for a paper
plt.rcParams['text.usetex'] = False
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.size'] = 14
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['xtick.labelsize'] = 12
plt.rcParams['ytick.labelsize'] = 12
plt.rcParams['legend.fontsize'] = 10

# Define a distinct color cycle for plotting many lines (up to 30)
NUM_COLORS = 30 
try:
    cmap = plt.colormaps['turbo'] 
    sampled_colors = [cmap(i) for i in np.linspace(0.0, 2.0, NUM_COLORS)]
    plt.rcParams['axes.prop_cycle'] = plt.cycler(color=sampled_colors)
except Exception:
    custom_colors = plt.cm.get_cmap('turbo', NUM_COLORS)
    plt.rcParams['axes.prop_cycle'] = plt.cycler(color=[custom_colors(i) for i in range(NUM_COLORS)])


class PlotConsensus:
    def __init__(
            self, 
            filename_template, 
            simulation, total_nodes, 
            conversion_factor=1e6, 
            Ts= 0.25, 
            dt= 1e-3
        ):
        self.filename_template = filename_template
        self.simulation = simulation
        self.total_nodes = total_nodes
        self.conversion_factor = conversion_factor
        self.Ts = Ts
        self.dt = dt
        self.time_factor = self.dt / (self.Ts * 1000.0)  
        self.data = {}

    def load_data(self):
        for i in range(1, self.total_nodes + 1):
            filename = self.filename_template.format(self.simulation, i)
            if not os.path.exists(filename):
                continue
            try:
                with open(filename, 'r') as f:
                    raw_content = json.load(f)
            except json.JSONDecodeError:
                continue

            content = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
            data_dict = content.get('data', {})

            timestamp = [int(x) for x in data_dict.get('timestamp', [])]
            state = [int(x) for x in data_dict.get('state', [])]
            vstate = [int(x) for x in data_dict.get('vstate', [])]
            vartheta = [int(x) for x in data_dict.get('vartheta', [])]

            min_len = min(len(timestamp), len(state), len(vstate), len(vartheta))
            if min_len == 0: continue

            node_data = np.stack([timestamp[:min_len], state[:min_len], vstate[:min_len], vartheta[:min_len]], axis=1)
            self.data[i] = node_data

    # --- Consensus States and Gains Plot Method (Updated) ---
    def plot(self, ref_node=1, save_filename=None):
        fig, axs = plt.subplots(2, 1, figsize=(15, 10), sharex=True) 

        if not self.data: return # Check data
        t_max = max([self.data[n][:, 0].max() for n in self.data]) * self.time_factor
        
        for node_id in sorted(self.data.keys()):
            node_data = self.data[node_id]
            t = node_data[:, 0] * self.time_factor
            x = node_data[:, 1] / self.conversion_factor
            vtheta = node_data[:, 3] / self.conversion_factor
            axs[0].plot(t, x, label=f'$x_{{{node_id}}}$', linewidth=1.25)
            axs[1].plot(t, vtheta, label=f'$\\vartheta_{{{node_id}}}$', linewidth=1.25)

        if ref_node in self.data:
            z_data = self.data[ref_node]
            t = z_data[:, 0] * self.time_factor
            z = z_data[:, 2] / self.conversion_factor
            axs[0].plot(t, z, '--', color='black', linewidth=2.25, label=f'$z_{{{ref_node}}}$ (ref.)')

        # Configuration for higher grid resolution and external legend
        num_cols = int(np.ceil(self.total_nodes / 5.0))
        for ax in axs:
            ax.set_xlim([0, t_max])
            
            # 1. Higher Grid Resolution
            ax.minorticks_on()
            ax.grid(True, which='major', linestyle='-', linewidth=0.5)
            ax.grid(True, which='minor', linestyle=':', linewidth=0.25)
            
            # 2. External Legend (Upper Right)
            ax.legend(loc='upper left', 
                      bbox_to_anchor=(1.01, 1.0), # Places the legend outside the axes
                      ncol=num_cols, 
                      fontsize=10, 
                      fancybox=True, 
                      shadow=False)

        axs[0].set_ylabel('$x(t)$')
        axs[1].set_ylabel('$\\vartheta(t)$')
        axs[1].set_xlabel('Time (s)')

        plt.tight_layout(rect=[0, 0, 0.95, 1]) # Adjust tight_layout to account for external legend
        if save_filename:
            fig.savefig(save_filename, format='pdf', bbox_inches='tight')
            print(f"Figure saved to {save_filename}")
        plt.show()

    # --- Virtual State z(t) Plot Method (Updated) ---
    def plot_vstate(self, save_filename=None):
        if not self.data: return
        fig, ax = plt.subplots(1, 1, figsize=(15, 6))
        t_max = max([self.data[n][:, 0].max() for n in self.data]) * self.time_factor

        for node_id in sorted(self.data.keys()):
            node_data = self.data[node_id]
            t = node_data[:, 0] * self.time_factor
            z = node_data[:, 2] / self.conversion_factor
            ax.plot(t, z, label=f'$z_{{{node_id}}}$', linewidth=1.25)

        ax.set_xlim([0, t_max])
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('$z(t)$')
        
        # 1. Higher Grid Resolution
        ax.minorticks_on()
        ax.grid(True, which='major', linestyle='-', linewidth=0.5)
        ax.grid(True, which='minor', linestyle=':', linewidth=0.25)

        # 2. External Legend (Upper Right)
        num_cols = int(np.ceil(self.total_nodes / 5.0))
        ax.legend(loc='upper left', bbox_to_anchor=(1.01, 1.0), 
                  fancybox=True, shadow=False, ncol=num_cols)

        plt.tight_layout(rect=[0, 0, 0.95, 1]) # Adjust tight_layout
        if save_filename:
            fig.savefig(save_filename, format='pdf', bbox_inches='tight')
            print(f"Figure saved to {save_filename}")
        plt.show()


    # --- Lyapunov Function V(t) Plot Method (Updated) ---
    def plot_lyapunov(self, save_filename=None, yzoom=False):
        if not self.data: return
        fig, ax = plt.subplots(1, 1, figsize=(15, 6))
        t_max = max([self.data[n][:, 0].max() for n in self.data]) * self.time_factor

        for node_id in sorted(self.data.keys()):
            node_data = self.data[node_id]
            t = node_data[:, 0] * self.time_factor
            x = node_data[:, 1] / self.conversion_factor
            z = node_data[:, 2] / self.conversion_factor
            V = np.abs(x - z)
            ax.plot(t, V, label=f'$|\\sigma_{{{node_id}}}|$', linewidth=1.25)

        ax.set_xlim([0, t_max])
        if yzoom:
            ax.set_ylim([0, 0.1])
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('$V(t)$') 
        
        # 1. Higher Grid Resolution
        ax.minorticks_on()
        ax.grid(True, which='major', linestyle='-', linewidth=0.5)
        ax.grid(True, which='minor', linestyle=':', linewidth=0.25)

        # 2. External Legend (Upper Right)
        num_cols = int(np.ceil(self.total_nodes / 5.0))
        ax.legend(loc='upper left', bbox_to_anchor=(1.01, 1.0), 
                  fancybox=True, shadow=False, ncol=num_cols)

        plt.tight_layout(rect=[0, 0, 0.95, 1]) # Adjust tight_layout
        if save_filename:
            fig.savefig(save_filename, format='pdf', bbox_inches='tight')
            print(f"Figure saved to {save_filename}")
        plt.show()


if __name__ == "__main__":
    sim_name = "18node-ring_dir_1ms"
    num_agents = 18
    plotter = PlotConsensus(
        filename_template="../data/{}/{}.json",
        simulation=sim_name, 
        total_nodes=num_agents)
    plotter.load_data()
    plotter.plot(ref_node=1) 
    plotter.plot_vstate()
    plotter.plot_lyapunov()