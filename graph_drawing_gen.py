#%% Graph drawing and Laplacian matrix generation
import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

#%% Example NODES definition 1
NODES1 = {
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

# Create graph
G1 = nx.DiGraph()  # use Graph() if undirected
pos1 = {}

for node, attrs in NODES1.items():
    pos1[node] = (attrs['x0'], attrs['z0'])
    for neigh in attrs['neighbors']:
        G1.add_edge(node, neigh)

L1 = nx.linalg.directed_laplacian_matrix(G1)
L1 = np.array(L1)
print("Laplacian Matrix L1:\n", L1)

# Draw nodes & edges
plt.figure(figsize=(4,4))
nx.draw(G1, pos1, with_labels=True, node_size=800, node_color="lightgrey", 
        font_weight="bold", arrows=True)
plt.grid(True)
plt.show()

#%% Example NODES definition 2
NODES2 = {
    1: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [4,6,7]},
    2: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [5,8]},
    3: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [6,9]},
    4: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [1,7]},
    5: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [2,8]},
    6: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [1,3,8,9]},
    7: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [1,4]},
    8: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [2,5,6]},
    9: {'x0': np.random.uniform(-2,2), 'z0': np.random.uniform(-2,2), 'neighbors': [3,6]},
}

# Create graph
G2 = nx.DiGraph()  
pos2 = {}

for node, attrs in NODES2.items():
    pos2[node] = (attrs['x0'], attrs['z0'])
    for neigh in attrs['neighbors']:
        G2.add_edge(node, neigh)

L2 = nx.linalg.directed_laplacian_matrix(G2)
L2 = np.array(L2)
print("Laplacian Matrix L2:\n", L2)

# Draw nodes & edges
plt.figure(figsize=(4,4))
nx.draw(G2, pos2, with_labels=True, node_size=800, node_color
        ="lightgrey", font_weight="bold", arrows=True)
plt.grid(True)
plt.show()