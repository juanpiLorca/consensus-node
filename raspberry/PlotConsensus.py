import json
import numpy as np
import matplotlib.pyplot as plt
import os

class PlotConsensus:
    def __init__(self, filename_template, simulation, total_nodes, conversion_factor=1000):
        self.filename_template = filename_template  # e.g., "data/{}/{}.json"
        self.simulation = simulation
        self.total_nodes = total_nodes
        self.conversion_factor = conversion_factor
        self.data = {}  # Store data for each node as {node_id: np.array}

    def load_data(self):
        for i in range(1, self.total_nodes + 1):
            filename = self.filename_template.format(self.simulation, i)

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

    def plot(self, ref_node=1):
        fig, axs = plt.subplots(3, 1, figsize=(12, 8), sharex=True)

        for node_id in sorted(self.data.keys()):
            node_data = self.data[node_id]

            t = node_data[:, 0] * 0.01 / 1000.0  # Convert ms to seconds
            x = node_data[:, 1] / self.conversion_factor
            z = node_data[:, 2] / self.conversion_factor
            vtheta = node_data[:, 3] / self.conversion_factor

            axs[0].plot(t, x, label=f'$x_{{{node_id}}}$')
            axs[1].plot(t, z, label=f'$z_{{{node_id}}}$')
            axs[2].plot(t, vtheta, label=f'$\\vartheta_{{{node_id}}}$')

        z_data = self.data[ref_node]
        t = z_data[:, 0] * 0.01 / 1000.0
        z = z_data[:, 2] / self.conversion_factor
        axs[0].plot(t, z, '--k', label=f'$z_{{{ref_node}}}$ (ref.)')  

        axs[0].set_ylabel('$x(t)$')
        axs[1].set_ylabel('$z(t)$')
        axs[2].set_ylabel('$\\vartheta(t)$')
        axs[2].set_xlabel('Time (s)')

        for ax in axs:
            ax.legend(ncol=3)
            ax.grid(True)

        plt.tight_layout()
        plt.show()


if __name__ == "__main__":
    plotter = PlotConsensus(filename_template="data/{}/{}.json", simulation="9node_cluster", total_nodes=9)
    plotter.load_data()
    plotter.plot(ref_node=1)