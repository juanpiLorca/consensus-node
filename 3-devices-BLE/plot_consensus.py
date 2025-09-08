import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

files = ['data/pi1-node_1_log.csv', 'data/pi2-node_2_log.csv', 'data/pi3-node_3_log.csv']
headers = ['timestamp', 'x', 'z', 'vtheta', 'g', 'u']

num_sim = 1
dt = 0.01
N = 999  # Adjust N to the number of data points you want to use

x = np.zeros((N, len(files)))
z = np.zeros((N, len(files)))
vtheta = np.zeros((N, len(files)))
g = np.zeros((N, len(files)))
u = np.zeros((N, len(files)))

for i, file in enumerate(files):
    if not os.path.exists(file):
        print(f"Warning: {file} does not exist!")
        continue  # Skip this file if it doesn't exist

    df = pd.read_csv(file, names=headers, skiprows=1)
    x[:, i] = df['x'].values[:N]
    z[:, i] = df['z'].values[:N]
    vtheta[:, i] = df['vtheta'].values[:N]
    g[:, i] = df['g'].values[:N]
    u[:, i] = df['u'].values[:N]

# Time vector for plotting
t = np.arange(N)

# Create subplots
fig, axs = plt.subplots(5, 1, figsize=(10, 8))

# Plot data for each node
for i in range(len(files)):
    axs[0].plot(t, x[:, i], label=f'x_{i+1}')
    axs[1].plot(t, z[:, i], label=f'z_{i+1}')
    axs[2].plot(t, vtheta[:, i], label=f'θ_{i+1}')
    axs[3].plot(t, g[:, i], label=f'g_{i+1}', linestyle='--')
    axs[4].plot(t, u[:, i], label=f'u_{i+1}', linestyle=':')

# Set grid and legends for each subplot
for ax in axs:
    ax.grid()
    ax.legend()

# Set labels for each subplot
axs[0].set_ylabel('x(t)')
axs[1].set_ylabel('z(t)')
axs[2].set_ylabel('θ(t)')
axs[3].set_ylabel('g(t)')
axs[4].set_ylabel('u(t)')
axs[4].set_xlabel('Time (s)')

plt.tight_layout()
plt.savefig(f'data/plots/consensus_plot_{num_sim}.pdf', dpi=300)
plt.close()
