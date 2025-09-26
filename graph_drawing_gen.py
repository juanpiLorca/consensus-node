import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

# Example NODES definition
NODES = {
    1: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [2]},
    2: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [3]},
    3: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [1]},
}

# Create graph
G = nx.DiGraph()  # use Graph() if undirected
pos = {}

for node, attrs in NODES.items():
    pos[node] = (attrs['x0'], attrs['z0'])
    for neigh in attrs['neighbors']:
        G.add_edge(node, neigh)

# Draw nodes & edges
plt.figure(figsize=(4,4))
nx.draw(G, pos, with_labels=True, node_size=800, node_color="lightgrey", 
        font_weight="bold", arrows=True)
plt.grid(True)
plt.show()
