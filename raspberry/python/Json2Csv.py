import json
import os
import csv

class JSONtoCSVConverter:
    def __init__(self, filename_template, simulation, total_nodes, output_dir="csv_output"):
        self.filename_template = filename_template  # e.g., "data/{}/{}.json"
        self.simulation = simulation
        self.total_nodes = total_nodes
        self.output_dir = output_dir

        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def convert(self):
        for i in range(1, self.total_nodes + 1):
            filename = self.filename_template.format(self.simulation, i)

            if not os.path.exists(filename):
                print(f"[Warning] File not found: {filename}")
                continue

            with open(filename, "r") as f:
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

            data_dict = content.get("data", {})
            timestamp = data_dict.get("timestamp", [])
            state = data_dict.get("state", [])
            vstate = data_dict.get("vstate", [])
            vartheta = data_dict.get("vartheta", [])

            # Ensure consistent length
            min_len = min(len(timestamp), len(state), len(vstate), len(vartheta))
            if min_len == 0:
                print(f"[Warning] Empty data in file: {filename}")
                continue

            # Truncate if needed
            timestamp = timestamp[:min_len]
            state = state[:min_len]
            vstate = vstate[:min_len]
            vartheta = vartheta[:min_len]

            # Interpolate missing values at the beginning if necessary

            # Prepare CSV file
            csv_filename = os.path.join(self.output_dir, f"node_{i}.csv")
            with open(csv_filename, "w", newline="") as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(["timestamp", "state", "vstate", "vartheta"])
                writer.writerows(zip(timestamp, state, vstate, vartheta))

            print(f"[Info] Converted {filename} -> {csv_filename}")


if __name__ == "__main__":
    num_agents = 30
    sim_name = f"{num_agents}node-clusters"
    output_csv_dir = f"data/{num_agents}node-clusters-csv"
    num_agents = 30
    converter = JSONtoCSVConverter(filename_template="../data/{}/{}.json",
                                   simulation=sim_name,
                                   total_nodes=num_agents,
                                   output_dir=output_csv_dir)
    converter.convert()
