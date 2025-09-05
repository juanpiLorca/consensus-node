import os
import csv 
import argparse
import asyncio
from serial_comm import SerialComm
from params import SimParameters, SERIAL_PORT, SERIAL_DELAY, BAUDRATE, SCALE_FACTOR, NODES


def parse_args(): 
    parser = argparse.ArgumentParser()
    parser.add_argument("node_id", type=int)
    parser.add_argument("--samples", type=int, default=1000)
    return parser.parse_args()

def map_params(params: SimParameters, node_id: int, nodes=NODES): 
    print(f"Runnng node: {node_id} loop")

    params.node      = node_id
    params.enable    = nodes[node_id]["enable"]
    params.neighbors = nodes[node_id]["neighbors"]
    params.Ts        = nodes[node_id]["dt"]
    params.x0        = nodes[node_id]["x0"]
    params.z0        = nodes[node_id]["z0"]
    params.vtheta    = nodes[node_id]["vtheta"]
    params.eta       = nodes[node_id]["eta"]

    params.trigger   = nodes[node_id]["trigger"]

    params.msg_network += f"{params.enable},{params.node}," + ','.join(map(str, params.neighbors)) + "\n\r"
    params.msg_algorithm += f"{params.Ts},{params.x0},{params.z0},{params.vtheta},{params.eta}\n\r"
    params.msg_trigger += f"{params.trigger}\n\r"


async def run_state_0(comm, params): 
    try: 
        await comm.serial_write(params.msg_network)
        await comm.serial_delay(SERIAL_DELAY)
        await comm.serial_write(params.msg_algorithm)
        await comm.serial_delay(SERIAL_DELAY)
        await comm.serial_write(params.msg_trigger)
        await comm.serial_delay(SERIAL_DELAY)
        return True
    except Exception as e:
        print(f"Error occurred: {e}")
        return False

def run_state_1(comm, params, writer): 
    data = comm.read_data()
    try:
        print(data)
        arr = data[1:].split(',')
        timestamp = int(arr[0])
        x = int(arr[1]) / SCALE_FACTOR
        z = int(arr[2]) / SCALE_FACTOR
        vtheta = int(arr[3]) / SCALE_FACTOR
        writer.writerow([timestamp, x, z, vtheta])
        return 1

    except (ValueError, IndexError) as e:
        print(f"Malformed data: {data} — Error: {e}")
        return 0

async def run_state_2(comm, params): 
    params.msg_end += f"1\n\r"
    try: 
        await comm.serial_write(params.msg_end)
        await comm.serial_delay(SERIAL_DELAY)
        print("Simulation ended.")
        comm.close()
        return True
    
    except Exception as e:
        print(f"Error occurred: {e}")
        return False

async def main(): 
    args = parse_args()
    params = SimParameters()
    map_params(params, args.node_id)

    os.makedirs("data", exist_ok=True)

    with SerialComm(SERIAL_PORT, BAUDRATE) as comm, \
         open(f"data/node_{params.node}_log.csv", 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["timestamp", "x", "z", "vtheta"])

        await run_simulation(comm, params, writer, args.samples)


async def run_simulation(comm, params, writer, num_samples):
    state = 0
    sample_count = 0

    while True:
        if state == 0:
            success = await run_state_0(comm, params)
            if success:
                state += 1
        
        elif state == 1:
            data_read_count = run_state_1(comm, params, writer)
            sample_count += data_read_count
            if sample_count >= num_samples:
                state += 1

        elif state == 2:
            success = await run_state_2(comm, params)
            if success:
                break 


if __name__ == "__main__":
    asyncio.run(main())