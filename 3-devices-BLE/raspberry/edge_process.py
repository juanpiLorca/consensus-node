import sys
import csv 
import argparse
from serial_comm import SerialComm
from params import SimParameters, SERIAL_PORT, SERIAL_DELAY, BAUDRATE, SCALE_FACTOR, NODES



def map_params(params: SimParameters, nodes=NODES): 

    parser = argparse.ArgumentParser()
    parser.add_argument("node_id", type=int)
    args = parser.parse_args()
    node_id = args.node_id
    print(f"Runnng node: {node_id} loop")

    params.node      = node_id
    params.enable    = nodes[node_id]["enable"]
    params.neighbors = nodes[node_id]["neighbors"]
    params.x0        = nodes[node_id]["x0"]
    params.z0        = nodes[node_id]["z0"]
    params.vtheta    = nodes[node_id]["vtheta"]
    params.eta       = nodes[node_id]["eta"]

    params.msg_network += f"{params.enable},{params.node},{params.neighbors}\n\r"
    params.msg_algorithm += f"{params.x0},{params.z0},{params.vtheta},{params.eta}\n\r"
    params.msg_trigger += f"{params.trigger}\n\r"


def main(): 
    comm = SerialComm(SERIAL_PORT, BAUDRATE)
    params = SimParameters()
    map_params(params, nodes=NODES)

    with open(f"data/node_{params.node}_log.csv", 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["timestamp", "x", "z", "vtheta"])

    sim_state = 0
    while True: 
        if sim_state == 0:
            try: 
                comm.serial_write(params.msg_network)
                comm.serial_delay(SERIAL_DELAY)
                comm.serial_write(params.msg_algorithm)
                comm.serial_delay(SERIAL_DELAY)
                comm.serial_write(params.msg_trigger)
            except Exception as e:
                print(f"Error occurred: {e}")
            sim_state += 1

        elif sim_state == 1:
            data = comm.read_data()

            try:
                if data.lower() == "end":
                    sim_state += 1
                else: 
                    arr = data[1:].split(',')
                    timestamp = int(arr[0])
                    x = int(arr[1]) / SCALE_FACTOR
                    z = int(arr[2]) / SCALE_FACTOR
                    vtheta = int(arr[3]) / SCALE_FACTOR
                    writer.writerow([timestamp, x, z, vtheta])

            except (ValueError, IndexError) as e:
                print(f"Malformed data: {data} — Error: {e}")

        elif sim_state == 2:
            print("Simulation ended.")
            comm.close()
            break


if __name__ == "__main__":
    main()