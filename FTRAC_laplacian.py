#%% Finite-Time Robust Adaptive Consensus (FTRAC) - LAPLACIAN
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from scipy.integrate import solve_ivp

def darken_color(color, amount=0.6):
    """
    Darkens a given matplotlib color.
    `amount` < 1 darkens the color, > 1 would lighten it.
    """
    try:
        c = mcolors.to_rgb(color)
        return tuple([amount * x for x in c])
    except:
        return color 

## Graph definition: 
np.random.seed(42)  # For reproducibility

NODES = {
    1: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [4]},
    2: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [5]},
    3: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [8]},
    4: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [7]},
    5: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [9]},
    6: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [2]},
    7: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [3]},
    8: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [6]},
    9: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [1]},
}

# NODES = {
#     1: {'x0': 0.2, 'z0': 0.05, 'neighbors': [4]},
#     2: {'x0': 0.5, 'z0': 0.35, 'neighbors': [5]},
#     3: {'x0': 0.8, 'z0': 0.65, 'neighbors': [8]},
#     4: {'x0': 0.3, 'z0': 0.15, 'neighbors': [7]},
#     5: {'x0': 0.4, 'z0': 0.25, 'neighbors': [9]},
#     6: {'x0': 0.9, 'z0': 0.75, 'neighbors': [2]},
#     7: {'x0': 0.3, 'z0': 0.45, 'neighbors': [3]},
#     8: {'x0': 0.7, 'z0': 0.55, 'neighbors': [6]},
#     9: {'x0': 1.0, 'z0': 0.85, 'neighbors': [1]},
# }


G = nx.DiGraph()
for node, props in NODES.items():
    G.add_node(node, pos=(props['x0'], props['z0']))
    for neighbor in props['neighbors']:
        G.add_edge(node, neighbor)

print("Graph nodes:", G.nodes)
print("Graph edges:", G.edges)

## Plotting the graph:
subax1 = plt.subplot(121)
nx.draw(G, with_labels=True, font_weight='bold')
plt.show()

## Laplacian matrix: 
L = nx.linalg.directed_laplacian_matrix(G)
L = np.array(L)
print("Laplacian Matrix:\n", L) 
use_laplacian = False

#% >>> System parameters: 
## Simulation:
T        = 30.0
dt       = 0.01
time     = np.arange(0, T, dt)
n_points = len(time)
n_agents = len(NODES)

## Adaptive gain: 
eta                   = 0.5      # adaptation gain
freeze_threshold_off  = 0.0125   # error-threshold to freeze gain evolution ("ε" in paper)
freeze_threshold_on   = 0.0250   # error-threshold to re-activate gain evolution ("ε̄" in paper)
active                = np.zeros(n_agents)  # Initially, all agents are inactive

params = {
    "dt": dt,
    "n_points":      n_points,
    "n_agents":      n_agents,
    "use_laplacian": use_laplacian, 
    "eta":           eta,
    "epsilon_off":   freeze_threshold_off,
    "epsilon_on":    freeze_threshold_on,
    "active":        active,
    "nodes":         NODES,
}

## Disturbance: bounded known input
nu = np.random.uniform(-0.25, 0.25, (n_agents, n_points))  # uniformly distributed between -0.25 and 0.25

## Initial conditions:
init_conditions = {
    "x": np.array([NODES[i+1]['x0'] for i in range(n_agents)]),
    "z": np.array([NODES[i+1]['z0'] for i in range(n_agents)]),
    "vtheta": np.zeros(n_agents)  # Initial adaptive gains
}

#% >>> Plotting aux:
def plot_simulation(t, x, z, vartheta, mv, params):
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
    mv = mv[:,:-1]

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

def plot_sign_function(x, z, agent=1):
    sigma = x - z
    grad = np.sign(sigma)

    fig, ax = plt.subplots(figsize=(6, 4))
    # --- histogram of grad values ---
    grad_vals = grad[agent-1, :]
    bins = [-1.5, -0.5, 0.5, 1.5]   # bins centered at -1, 0, +1
    counts, _, _ = ax.hist(grad_vals, bins=bins, rwidth=0.6,
                               color='tab:orange', edgecolor='k')

    ax.set_xticks([-1, 0, 1])
    ax.set_title(f'Histogram of sign values for Agent {agent}', fontsize=14)
    ax.set_xlabel('Sign value', fontsize=12)
    ax.set_ylabel('Count', fontsize=12)
    ax.grid(axis='y', linestyle='--', alpha=0.7)

    # annotate counts above bars
    for x_pos, c in zip([-1, 0, 1], counts):
        ax.text(x_pos, c + 0.5, str(int(c)), ha='center', fontsize=12)

    plt.tight_layout()
    plt.show()

def plot_hysteresis(sigma, dvtheta, params, agent=1):
    fig, axs = plt.subplots(1, 2, figsize=(14, 6))

    n_agents = params["n_agents"]
    epsilon = (params["epsilon_off"], params["epsilon_on"])
    
    # Main hysteresis curve
    axs[0].step(np.abs(sigma[agent-1, :]), dvtheta[agent-1, :], where='post', lw=2,
            label=rf'$\dot{{\vartheta}}_{{{agent}}}$ vs $|\sigma_{{{agent}}}|$',
            color='tab:blue')
    axs[0].set_xlim(0, (2) * params["epsilon_on"])
    # Reference lines
    axs[0].axhline(0, color='k', linestyle='--', linewidth=1)
    axs[0].axvline(0, color='k', linestyle='--', linewidth=1)

    # Hysteresis thresholds
    axs[0].axvline(params["epsilon_off"], color='r', linestyle='--', 
               label=r'$\pm \epsilon_{\mathrm{off}}$')
    axs[0].axvline(-params["epsilon_off"], color='r', linestyle='--')
    axs[0].axvline(params["epsilon_on"], color='g', linestyle='--', 
               label=r'$\pm \epsilon_{\mathrm{on}}$')
    axs[0].axvline(-params["epsilon_on"], color='g', linestyle='--')

    # Labels and styling
    axs[0].set_title(f'Hysteresis behavior for Agent {agent}', fontsize=14)
    axs[0].set_xlabel(r'$|\sigma(t)|$', fontsize=12)
    axs[0].set_ylabel(r'$\dot{\vartheta}(t)$', fontsize=12)
    axs[0].legend()
    axs[0].grid(True, linestyle='--', alpha=0.7)

    for i in range(n_agents):
        axs[1].plot(t, sigma[i,:], label=f'$\\sigma_{i+1}$')
    axs[1].axhline(epsilon[0], color='k', linestyle='--', label='$\\pm \\epsilon$')
    axs[1].axhline(-epsilon[0], color='k', linestyle='--')
    axs[1].axhline(epsilon[1], color='r', linestyle='--', label='$\\pm \\bar{\\epsilon}$')
    axs[1].axhline(-epsilon[1], color='r', linestyle='--')
    axs[1].set_ylim([-(epsilon[1] * 1.5), (epsilon[1] * 1.5)])
    axs[1].set_title('Error term $\\sigma_i$')
    axs[1].set_xlabel('Time (s)')
    axs[1].set_ylabel('$\\sigma(t)$')
    axs[1].legend(ncol=3)
    axs[1].grid(True)

    plt.tight_layout()
    plt.show()

#%% Dynamics:
## Consensus law (Javier's design): 
def vi(i, z, neighbors): 
    diffs = z[i] - z[neighbors]
    return -np.sum(np.sign(diffs) * np.sqrt(np.abs(diffs)))

def dynamics(t, y, n_agents, nu, mv, dvth, params): 
    dydt = np.zeros_like(y)

    x = y[:n_agents]
    z = y[n_agents:2*n_agents]
    vtheta = y[2*n_agents:3*n_agents]

    v = np.zeros(n_agents)
    if params["use_laplacian"]:
        v = -L @ z
    else:
        for i in range(n_agents):
            neighbors = params["nodes"][i+1]['neighbors']
            neighbors_index = [n-1 for n in neighbors]  # Convert to 0-based index
            v[i] = vi(i, z, neighbors_index)
    g = v
    dzdt = g

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
    
    dvthdt = dvtheta
    u = g - vtheta * grad

    k = int(t / params["dt"])
    if k < params["n_points"]:
        dvth[:,k] = dvthdt
        mv[:,k] = u

    dxdt = u + nu 

    dydt[:n_agents] = dxdt
    dydt[n_agents:2*n_agents] = dzdt
    dydt[2*n_agents:3*n_agents] = dvthdt

    return dydt

def rk4_step(f, t, y, dt, *args):
    """
    One step of fixed-step RK4 integration.

    f : function(t, y, *args) -> dydt
    t : current time
    y : current state vector
    dt: time step
    *args: extra arguments passed to f
    """
    k1 = f(t, y, *args)
    k2 = f(t + dt/2, y + dt/2 * k1, *args)
    k3 = f(t + dt/2, y + dt/2 * k2, *args)
    k4 = f(t + dt,   y + dt   * k3, *args)
    return y + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)

#%% Simulation: RK4 integration
def simulate_dynamics(params, init_conditions):
    # Preallocate variables: states, manipulated variables and derivatives
    n_points = params["n_points"]
    n_agents = params["n_agents"]
    dt = params["dt"]

    x = np.zeros(shape=(n_agents, n_points))
    z = np.zeros(shape=(n_agents, n_points))
    vtheta = np.zeros(shape=(n_agents, n_points))
    dvth = np.zeros(shape=(n_agents, n_points))
    mv = np.zeros(shape=(n_agents, n_points))
    y = np.concatenate(
        [init_conditions["x"], init_conditions["z"], init_conditions["vtheta"]]
    )

    t = 0.0
    for k in range(n_points):

        x[:, k] = y[:n_agents]
        z[:, k] = y[n_agents:2*n_agents]
        vtheta[:, k] = y[2*n_agents:3*n_agents]
        y = rk4_step(dynamics, t, y, dt, n_agents, nu[:, k], mv, dvth, params)

        t += dt
    return x, z, vtheta, mv, dvth

x, z, vtheta, mv, dvth = simulate_dynamics(params, init_conditions)
t = np.linspace(0, T, n_points)
plot_simulation(t, x, z, vtheta, mv, params)
plot_states(t, x, z, n_agents, ref_state_num=1)
plot_sign_function(x, z, agent=1)
plot_hysteresis(x - z, dvth, params, agent=1)

#%% Simulation: solve_ivp integration
def simulate_dynamics_solve_ivp(params, init_conditions):
    n_agents = params["n_agents"]
    n_points = params["n_points"]
    dt = params["dt"]
    t_span = (0, params["dt"] * (n_points - 1))
    t_eval = np.linspace(t_span[0], t_span[1], n_points)

    y0 = np.concatenate(
        [init_conditions["x"], init_conditions["z"], init_conditions["vtheta"]]
    )

    dvth = np.zeros(shape=(n_agents, n_points))
    mv = np.zeros(shape=(n_agents, n_points))

    def dyn(t, y):
        return dynamics(t, y, n_agents, nu[:, int(t/dt)], mv, dvth, params)

    sol = solve_ivp(dyn, t_span, y0, t_eval=t_eval, method='RK45')

    x = sol.y[:n_agents, :]
    z = sol.y[n_agents:2*n_agents, :]
    vtheta = sol.y[2*n_agents:3*n_agents, :]

    return x, z, vtheta, mv, dvth

x, z, vtheta, mv, dvth = simulate_dynamics_solve_ivp(params, init_conditions)
t = np.linspace(0, T, n_points)
plot_simulation(t, x, z, vtheta, mv, params)
plot_states(t, x, z, n_agents, ref_state_num=1)
plot_sign_function(x, z, agent=1)
plot_hysteresis(x - z, dvth, params, agent=1)

#%% END OF FILE
print(np.sign(0.0))  # Just to avoid linting error