import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Load graph-agent data from csv: {x0, z0, id, neighbors, enabled}

# Use local model to generate the first 10 seconds of data: 
# >> consider using the same integration time step
# >> consider using the same Ts for data Tx/Rx and logging

#% >>> System parameters: 
## Simulation:
T        = 30.0
dt       = 0.001
time     = np.arange(0, T, dt)
n_points = len(time)
n_agents = len(NODES)

## Adaptive gain: 
omega                 = 1.0     # Timer oscillator frequency (rad/s) --> slope 1s/1s
eta                   = 0.5     # adaptation gain
freeze_threshold_off  = 0.010   # error-threshold to freeze gain evolution ("ε" in paper)
freeze_threshold_on   = 0.050   # error-threshold to re-activate gain evolution ("ε̄" in paper)
active                = np.zeros(n_agents)  # Initially, all agents are inactive

params = {
    "dt":            dt,
    "omega":         omega,
    "n_points":      n_points,
    "n_agents":      n_agents,
    "eta":           eta,
    "epsilon_off":   freeze_threshold_off,
    "epsilon_on":    freeze_threshold_on,
    "active":        active,
    "nodes":         NODES,
}

## Disturbance: bounded known input
alpha   = 1.5
beta    = 0.5
kappa   = 1.0
phi     = np.random.uniform(0, 1, (n_agents, n_points)) 
nu = np.random.uniform(-alpha, alpha, (n_agents, n_points)) + beta + kappa * np.sin(2*np.pi*10*(time - phi))  

## Initial conditions:
init_conditions = {
    "x": np.array([NODES[i+1]['x0'] for i in range(n_agents)]),
    "z": np.array([NODES[i+1]['z0'] for i in range(n_agents)]),
    "vtheta": np.zeros(n_agents)  # Initial adaptive gains
}

#% >>> Plotting aux:
def plot_simulation(t, x, z, vartheta, params):
    """
    Plot x, z, vartheta, and u in a 2x2 grid.
    
    Parameters:
    - t: time vector
    - x, z, vartheta, mv: 2D arrays of shape (n_agents, n_points)
    """
    # Trim last time step (if necessary)
    n_agents = params["n_agents"]

    t = t[:-1]
    x = x[:,:-1]
    z = z[:,:-1]
    vartheta = vartheta[:,:-1]

    fig, axs = plt.subplots(2, 1, figsize=(12, 9))
    
    # --- Top-left: x_i ---
    colors = plt.cm.tab10.colors  

    for i in range(n_agents):
        base_color = colors[i % len(colors)]
        ref_color = darken_color(base_color, amount=0.75)  

        axs[0].plot(t, x[i,:], color=base_color, linestyle='-', label=f'$x_{{{i+1}}}$')
        axs[0].plot(t, z[i,:], color=ref_color, linestyle='--', label=f'$z_{{{i+1}}}$ (ref.)')
    
    axs[0].set_title('States $x_i$')
    axs[0].set_xlabel('Time (s)')
    axs[0].set_ylabel('$x(t)$')
    axs[0].legend(ncol=3)
    axs[0].grid(True) 
    
    # --- Bottom-left: vartheta_i ---
    for i in range(n_agents):
        axs[1].plot(t, vartheta[i,:], label=f'$\\vartheta_{i+1}$')
    axs[1].set_title('Adaptive gains $\\vartheta_i$')
    axs[1].set_xlabel('Time (s)')
    axs[1].set_ylabel('$\\vartheta(t)$')
    axs[1].legend(ncol=3)
    axs[1].grid(True)
    
    plt.tight_layout()
    plt.show()

def plot_states(t, x, z, n_agents, ref_state_num=1):
    """
    Plot x and z states for all agents.
    
    Parameters:
    - t: time vector
    - x, z: 2D arrays of shape (n_agents, n_points)
    - n_agents: number of agents
    - save_path: path to save figure (optional)
    """
    # Trim last time step (if necessary)
    t = t[:-1]
    x = x[:,:-1]
    z = z[:,:-1]

    fig, axs = plt.subplots(2, 1, figsize=(12, 9))
    for i in range(n_agents):
        axs[0].plot(t, x[i,:], linestyle='-', label=f'$x_{{{i+1}}}$')
    axs[0].plot(t, z[ref_state_num-1,:], '--k', label=f'$z_{{{ref_state_num}}}$ (ref.)')
    axs[0].set_title('States $x_i$')
    axs[0].set_xlabel('Time (s)')
    axs[0].set_ylabel('$x(t)$')
    axs[0].legend(ncol=3)
    axs[0].grid(True)

    for i in range(n_agents):
        axs[1].plot(t, z[i,:], linestyle='-', label=f'$z_{{{i+1}}}$ (ref.)')

    axs[1].set_title('Reference states $z_i$')
    axs[1].set_xlabel('Time (s)')
    axs[1].set_ylabel('$z(t)$')
    axs[1].legend(ncol=3)
    axs[1].grid(True)

    plt.tight_layout()
    plt.show()

def vi(i, z, neighbors): 
    diffs = z[i] - z[neighbors]
    return -np.sum(np.sign(diffs) * np.sqrt(np.abs(diffs)))

def dyn2sample(t, y, g, nu, n_agents, dvth, params, sample_points): 
    dydt = np.zeros_like(y)

    x = y[:n_agents]
    z = y[n_agents:2*n_agents]
    vtheta = y[2*n_agents:3*n_agents]

    sigma = x - z
    grad = np.sign(sigma)

    dvtheta = np.zeros(n_agents)
    for i in range(n_agents):
        if params["active"][i] == 0: 
            if np.abs(sigma[i]) > params["epsilon_on"]:
                params["active"][i] = 1
                dvtheta[i] = params["eta"] * 1.0
            else: 
                dvtheta[i] = 0.0

        else:
            if np.abs(sigma[i]) <= params["epsilon_off"]:
                params["active"][i] = 0
                dvtheta[i] = 0.0
            else:
                dvtheta[i] = params["eta"] * 1.0

    u = g - vtheta * grad
    dxdt = u + nu
    dzdt = g    # consensus law
    dvthdt = dvtheta

    k = int(t / params["dt"])
    if k < sample_points:
        dvth[:,k] = dvthdt

    dydt[:n_agents] = dxdt
    dydt[n_agents:2*n_agents] = dzdt
    dydt[2*n_agents:3*n_agents] = dvthdt
    return dydt


def simulate_sampled_dynamics_euler(params, init_conditions, sample_time=0.2):
    n_points = params["n_points"]
    n_agents = params["n_agents"]
    dt = params["dt"]

    # Full trajectories
    x = np.zeros((n_agents, n_points))
    z = np.zeros((n_agents, n_points))
    vtheta = np.zeros((n_agents, n_points))

    # Initial condition vector
    y = np.concatenate(
        [init_conditions["x"], init_conditions["z"], init_conditions["vtheta"]]
    )

    v = np.zeros(n_agents)

    # Sampling setup
    sample_interval = int(sample_time / dt)   # how many steps between samples
    sample_points = n_points // sample_interval
    xs = np.zeros((n_agents, sample_points))
    zs = np.zeros((n_agents, sample_points))
    vthetas = np.zeros((n_agents, sample_points))
    dvthetas = np.zeros((n_agents, sample_points))

    # TODO:
    # Modifications in order to compute dynamics if nodes are enabled/disabled
    
    t = 0.0
    for k in range(n_points):

        # Store full trajectory
        x[:, k] = y[:n_agents]
        z[:, k] = y[n_agents:2*n_agents]
        vtheta[:, k] = y[2*n_agents:3*n_agents]

        # Store sampled trajectories only at sample points
        if k % sample_interval == 0:

            for i in range(n_agents):
                neighbors = params["nodes"][i+1]['neighbors']
                neighbors_index = [n-1 for n in neighbors]
                v[i] = vi(i, z[:, k], neighbors_index)

            sample_idx = k // sample_interval
            if sample_idx < sample_points:
                xs[:, sample_idx] = x[:, k]
                zs[:, sample_idx] = z[:, k]
                vthetas[:, sample_idx] = vtheta[:, k]

        # Euler integration step
        dydt = dyn2sample(t, y, v, nu[:, k], n_agents, dvthetas, params, sample_points)
        y = y + dt * dydt
        t += dt

    return xs, zs, vthetas, dvthetas, sample_points

x, z, vtheta, dvtheta, sample_points = simulate_sampled_dynamics_euler(params, init_conditions)
t = np.linspace(0, T, sample_points)
plot_simulation(t, x, z, vtheta, params)
plot_states(t, x, z, n_agents, ref_state_num=1)