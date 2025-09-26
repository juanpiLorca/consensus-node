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
    1: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [2]},
    2: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [3]},
    3: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [4]},
    4: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [1]},
}

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

#% >>> System parameters: 
## Simulation:
T        = 15.0
dt       = 0.01
time     = np.arange(0, T, dt)
n_points = len(time)
n_agents = len(NODES)

## Adaptive gain: 
eta                   = 0.5    # adaptation gain
freeze_threshold_off  = 0.01   # error-threshold to freeze gain evolution ("δ" or "ε" in paper)
freeze_threshold_on   = 0.02   # error-threshold to re-activate gain evolution ("Δ" or "ε̄" in paper)
active                = np.zeros(n_agents)  # Initially, all agents are inactive

params = {
    "dt": dt,
    "n_points": n_points,
    "n_agents": n_agents,
    "eta": eta,
    "epsilon_off": freeze_threshold_off,
    "epsilon_on": freeze_threshold_on,
    "active": active,
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
def plot_simulation_grid(t, x, z, vartheta, mv, n_agents, save_path=None, epsilon=(freeze_threshold_off, freeze_threshold_on)):
    """
    Plot x, z, vartheta, and u in a 2x2 grid.
    
    Parameters:
    - t: time vector
    - x, z, vartheta, mv: 2D arrays of shape (n_agents, n_points)
    - n_agents: number of agents
    - save_path: path to save figure (optional)
    """
    # Trim last time step (if necessary)
    t = t[:-1]
    x = x[:,:-1]
    z = z[:,:-1]
    sigma = x - z
    vartheta = vartheta[:,:-1]
    mv = mv[:,:-1]

    fig, axs = plt.subplots(2, 2, figsize=(14, 8))
    
    # --- Top-left: x_i ---
    colors = plt.cm.tab10.colors  

    for i in range(n_agents):
        base_color = colors[i % len(colors)]
        ref_color = darken_color(base_color, amount=0.75)  

        axs[0,0].plot(t, x[i,:], color=base_color, linestyle='-', label=f'$x_{{{i+1}}}$')
        axs[0,0].plot(t, z[i,:], color=ref_color, linestyle='--', label=f'$z_{{{i+1}}}$ (ref.)')
    
    axs[0,0].set_title('States $x_i$')
    axs[0,0].set_xlabel('Time [s]')
    axs[0,0].set_ylabel('$x(t)$')
    axs[0,0].legend(ncol=3)
    axs[0,0].grid(True)  # uniformly distributed between -0.25 and 0.25
    
    # --- Top-right: sigma_i ---
    for i in range(n_agents):
        axs[0,1].plot(t, sigma[i,:], label=f'$\\sigma_{i+1}$')
    axs[0,1].axhline(epsilon[0], color='k', linestyle='--', label='$\\pm \\epsilon$')
    axs[0,1].axhline(-epsilon[0], color='k', linestyle='--')
    axs[0,1].axhline(epsilon[1], color='r', linestyle='--', label='$\\pm \\bar{\\epsilon}$')
    axs[0,1].axhline(-epsilon[1], color='r', linestyle='--')
    axs[0,1].set_ylim([-(epsilon[1] * 1.5), (epsilon[1] * 1.5)])
    axs[0,1].set_title('Error term $\\sigma_i$')
    axs[0,1].set_xlabel('Time [s]')
    axs[0,1].set_ylabel('$\\sigma(t)$')
    axs[0,1].legend(ncol=3)
    axs[0,1].grid(True)
    
    # --- Bottom-left: vartheta_i ---
    for i in range(n_agents):
        axs[1,0].plot(t, vartheta[i,:], label=f'$\\vartheta_{i+1}$')
    axs[1,0].set_title('Adaptive gains $\\vartheta_i$')
    axs[1,0].set_xlabel('Time [s]')
    axs[1,0].set_ylabel('$\\vartheta(t)$')
    axs[1,0].legend(ncol=3)
    axs[1,0].grid(True)
    
    # --- Bottom-right: control u (example: first agent) ---
    axs[1,1].plot(t, mv[0,:], label='$u_1$')
    axs[1,1].set_title('Control input $u_1$')
    axs[1,1].set_xlabel('Time [s]')
    axs[1,1].set_ylabel('$u(t)$')
    axs[1,1].legend()
    axs[1,1].grid(True)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        print(f"Figure saved to {save_path}")
    plt.show()

def plot_states(t, x, z, n_agents, save_path=None, ref_state_num=1):
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
    z = z[ref_state_num-1,:-1]

    fig, ax = plt.subplots(figsize=(10, 6))
    for i in range(n_agents):
        ax.plot(t, x[i,:], linestyle='-', label=f'$x_{{{i+1}}}$')
    ax.plot(t, z, '--k', label=f'$z_{{{ref_state_num}}}$ (ref.)')
    ax.set_title('States $x_i$')
    ax.set_xlabel('Time [s]')
    ax.set_ylabel('$x(t)$')
    ax.legend(ncol=3)
    ax.grid(True)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        print(f"Figure saved to {save_path}")
    plt.show()

def plot_sign_function(t, x, z, agent=1):
    sigma = x - z
    grad = np.sign(sigma)

    fig, axs = plt.subplots(2, 1, figsize=(10, 8))

    # --- Top plot: grad vs time ---
    axs[0].step(t, grad[agent-1, :], lw=2, where='post',
                label=rf'$\nabla |\sigma_{{{agent}}}|_1$')
    axs[0].axhline(0, color='k', linestyle='--', linewidth=1)
    axs[0].set_title(f'Sign function evolution for Agent {agent}', fontsize=14)
    axs[0].set_xlabel('Time [s]', fontsize=12)
    axs[0].set_ylabel('Sign value', fontsize=12)
    axs[0].legend()
    axs[0].grid(True, linestyle='--', alpha=0.7)

    # --- Bottom plot: grad vs sigma ---
    axs[1].scatter(sigma[agent-1, :], grad[agent-1, :],
                   c=t, cmap='viridis', s=25, alpha=0.7,
                   label=rf'$\nabla |\sigma_{{{agent}}}|_1$ vs $\sigma_{{{agent}}}$')
    axs[1].axhline(0, color='k', linestyle='--', linewidth=1)
    axs[1].axvline(0, color='k', linestyle='--', linewidth=1)
    axs[1].set_title(f'Sign function vs Error for Agent {agent}', fontsize=14)
    axs[1].set_xlabel(r'$\sigma(t)$', fontsize=12)
    axs[1].set_ylabel('Sign value', fontsize=12)
    axs[1].legend()
    axs[1].grid(True, linestyle='--', alpha=0.7)

    plt.tight_layout()
    plt.show()
              
#%% Dynamics:
def dynamics(t, y, n_agents, nu, mv, params): 
    dydt = np.zeros_like(y)

    x = y[:n_agents]
    z = y[n_agents:2*n_agents]
    vtheta = y[2*n_agents:3*n_agents]

    v = -L @ z
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
    mv = np.zeros(shape=(n_agents, n_points))
    y = np.concatenate(
        [init_conditions["x"], init_conditions["z"], init_conditions["vtheta"]]
    )

    t = 0.0
    for k in range(n_points):

        x[:, k] = y[:n_agents]
        z[:, k] = y[n_agents:2*n_agents]
        vtheta[:, k] = y[2*n_agents:3*n_agents]
        y = rk4_step(dynamics, t, y, dt, n_agents, nu[:, k], mv, params)

        t += dt
    return x, z, vtheta, mv

x, z, vtheta, mv = simulate_dynamics(params, init_conditions)
t = np.linspace(0, T, n_points)
plot_simulation_grid(t, x, z, vtheta, mv, n_agents)
plot_states(t, x, z, n_agents, ref_state_num=1)
plot_sign_function(t, x, z, agent=1)

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

    mv = np.zeros(shape=(n_agents, n_points))

    def dyn(t, y):
        return dynamics(t, y, n_agents, nu[:, int(t/dt)], mv, params)

    sol = solve_ivp(dyn, t_span, y0, t_eval=t_eval, method='RK45')

    x = sol.y[:n_agents, :]
    z = sol.y[n_agents:2*n_agents, :]
    vtheta = sol.y[2*n_agents:3*n_agents, :]

    return x, z, vtheta, mv

x, z, vtheta, mv = simulate_dynamics_solve_ivp(params, init_conditions)
t = np.linspace(0, T, n_points)
plot_simulation_grid(t, x, z, vtheta, mv, n_agents)
plot_states(t, x, z, n_agents, ref_state_num=1)
plot_sign_function(t, x, z, agent=1)