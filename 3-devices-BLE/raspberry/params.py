HOST_IP='192.168.0.172'
PORT=9999

SERIAL_PORT='/dev/ttyACM0' 
SERIAL_DELAY=0.5
BAUDRATE=115200

SCALE_FACTOR=1000

NODES = {
    1 : {'dt': 1000, 'enable': 1, 'x0': 5000, 'z0': 5000, 'vtheta': 0, 'eta': 5000, 'neighbors': [2], 'trigger': 1}, #z=4
    2 : {'dt': 1000, 'enable': 1, 'x0': 1000, 'z0': 1000, 'vtheta': 0, 'eta': 5000, 'neighbors': [3], 'trigger': 1}, #z=2
    3 : {'dt': 1000, 'enable': 1, 'x0': 8000, 'z0': 8000, 'vtheta': 0, 'eta': 5000, 'neighbors': [1], 'trigger': 1}, #z=7
}

class SimParameters: 

    # >> Node info.
    enable = 0
    node = 0
    neighbors = []

    # >> Node dynamics: 
    Ts = 1.0
    x0 = 0
    z0 = 0
    vtheta = 0
    eta = 0

    # >> Node loop trigger: 
    trigger = 0

    # >> Params serial message: n --> network, a --> algorithm, t --> trigger
    msg_network = "n"
    msg_algorithm = "a"
    msg_trigger = "t"
    msg_end = "e"

    # Debugging Boolean flags
    debug_mode = False

