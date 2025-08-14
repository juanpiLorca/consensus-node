// Include modules
#include "serial.h"
#include <stdlib.h>
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>

// Register the logger for this module
LOG_MODULE_REGISTER(Module_Serial, LOG_LEVEL_INF);

// Public boolean to know if the consensus algorithm has received a triggered signal
static bool available_neighbors[N_MAX_NEIGHBORS] = {false};
static uint8_t neighbors[N_MAX_NEIGHBORS] = {1};
static int32_t neighbor_states[N_MAX_NEIGHBORS] = {100};
static bool neighbor_enabled[N_MAX_NEIGHBORS] = {false};
consensus_params consensus = {
	false,					// running
	false,					// enabled	
	true,					// first_time_running
	false,					// all_neighbors_observed
	available_neighbors,	// avaliable_neighbors
	0,						// node
	neighbors,				// neigbors
	1,						// number of neighbors = N
	0,						// time0 (internal clock time)
	0,						// algorithm type
	1000,					// period of the consensus task
	100,					// initial state
	50,						// initial gamma
	1,						// lambda parameter
	50,                     // pole parameter
	0,  					// error dead zone parameeter
	100,					// state variable
	50,						// gamma variable
	0.0,    				// error variable
	0.0,					// error DC variable
	0.0,					// integral (PI) manipulated variable
	neighbor_states,		// neighbor states
	neighbor_enabled,		// neighbor enabled
	{false, 0, 0, 0, 0, 0}  // disturbance parameters
};		

// Get the device pointer of the UART hardware
const struct device *uart = DEVICE_DT_GET(DT_NODELABEL(uart0));

// Define the receive buffer
static uint8_t rx_buf[RX_BUFF_SIZE];

// Define the send buffer
static uint8_t tx_buf[TX_BUFF_SIZE];

// Define the callback function for UART
static void uart_cb(const struct device *dev, struct uart_event *evt, void *user_data){
	switch (evt->type) {
	    case UART_RX_RDY:
			// Read all the characters stored in the rx buffer and check if it is present the EOL character
			for (int i=evt->data.rx.offset; i < evt->data.rx.offset+evt->data.rx.len; i++) {
				uint8_t c = evt->data.rx.buf[i];
				if (c== '\r' || c=='\n') {
					// The first byte is the type of message
                    uint8_t type = evt->data.rx.buf[0];
                    uint8_t *pt;
                    uint8_t cnt;
                    switch (type) {
                    	// When receiving consensus trigger type
                    	case 't':
                    		if (evt->data.rx.buf[1] != '0') {
                    			consensus.running = true;
                    			consensus.first_time_running = true;
                    			consensus.all_neighbors_observed = false;
								consensus.disturbance.counter = 0;
								consensus.error = 0.0;
								consensus.error_dc = 0.0;
								consensus.ui = 0.0;
                    			consensus.time0 = k_uptime_get();
                    			consensus.state = consensus.state0;
                    			consensus.gamma = consensus.gamma0;
                    			for (int i = 0; i < N_MAX_NEIGHBORS; i++) {
                    				consensus.available_neighbors[i] = false;
                    				consensus.neighbor_states[i] = consensus.state0;
									consensus.neighbor_enabled[i] = false;
                    			}
                    		} else {
                    			consensus.running = false;
                    		}
                    		LOG_INF("running: %d. time0: %lld", consensus.running, consensus.time0);
                    		break;
                    	// When receiving network related type
                    	case 'n':
                    	    pt = strtok(&(evt->data.rx.buf[1]), ",");
                    		cnt = 0;
                    		while (pt != NULL) {
                    			uint8_t id = atoi(pt);
                    			if (cnt == 0) {
									consensus.enabled = (id == 1);
								} else if (cnt == 1) {
                    				consensus.node = id;
                    			} else {
                    				consensus.neighbors[cnt-2] = id;
                    			}
                    			cnt++;
                    		    pt = strtok(NULL, ",");
                    		}
                    		consensus.N = cnt-2;
                    		LOG_INF("enabled: %d. node: %d. N: %d", consensus.enabled, consensus.node, consensus.N);
                    		for (int i = 0; i < consensus.N; i++) {
                    			LOG_INF("neighbor: index = %d. id: %d.", i, consensus.neighbors[i]);
                    		}
                    		break;
                    	// When receiving algorithm related type
                    	case 'a':
                    	    pt = strtok(&(evt->data.rx.buf[1]), ",");
                    		cnt = 0;
                    		while (pt != NULL) {
                    		    int32_t value = atoi(pt);
                    			switch (cnt) {
									case 0:
                    					consensus.algorithm = value;
                    					break;
                    				case 1:
                    					consensus.Ts = value;
                    					break;
                    				case 2:
                    					consensus.state0 = value;
                    					break;
                    				case 3:
                    					consensus.gamma0 = value;
                    					break;
                    				case 4:
                    					consensus.lambda = value;
                    					break;
									case 5:
                    					consensus.pole = value;
                    					break;
									case 6:
                    					consensus.dead = value;
										break;
									case 7:
                    					consensus.disturbance.random = (value == 1);
										break;
									case 8:
                    					consensus.disturbance.offset = value;
                    					break;
									case 9:
                    					consensus.disturbance.amplitude = value;
                    					break;
									case 10:
                    					consensus.disturbance.phase = value;
                    					break;
									case 11:
                    					consensus.disturbance.samples = value;
                    					break;
                    				default:
                    					break;
                    			}
                    			cnt++;
                    		    pt = strtok(NULL, ",");
                    		}
                    		LOG_INF("Ts: %d. state0: %d. gamma0: %d. lambda: %d.", consensus.Ts, consensus.state0, consensus.gamma0, consensus.lambda);
                    		break;
                    	default:
                    		LOG_ERR("The received message has unknown type");
                    		break;
                    }
                    // Diseable rx to reset the offset of the rx buffer
                    uart_rx_disable(dev);
					break;
				}
			}
			break;
	    case UART_RX_DISABLED:
		    uart_rx_enable(dev, rx_buf, sizeof rx_buf, RX_TIMEOUT);
		    break;
	    default:
		    break;
	}
}

// Function to start serial
void serial_start() {
	// Verify that the UART device is ready
	if (!device_is_ready(uart)) {
		LOG_ERR("Serial not ready");
		return;
	}
	// Set the uart callback
	int err = uart_callback_set(uart, uart_cb, NULL);
	if (err) {
		LOG_ERR("Serial failed to start (err %d)\n", err);
		return;
	}
	// Start receiving by calling uart_rx_enable() and pass it the address of the receive buffer
	err = uart_rx_enable(uart, rx_buf, sizeof rx_buf, RX_TIMEOUT);
	if (err) {
		LOG_ERR("Serial failed to enable read (err %d)\n", err);
		return;
	}
	
	LOG_INF("Serial successfully started\n");
	return;
}

// Function to send the log data over serial
void serial_log_consensus() {
    // Prepare the string in the format "dtime,gamma,state,nieghbor_state1,nieghbor_state2\n\r"
	int64_t timestamp = k_uptime_get() - consensus.time0;
    int len = snprintf((char *)tx_buf, sizeof(tx_buf), "d%lld,%d,%d", timestamp, consensus.gamma, consensus.state);
	// Append neighbor states to the buffer (we need to ensure we don't ecxeed TX buffer size)
	for (int i = 0; i < consensus.N; i++) {
    	len += snprintf((char *)tx_buf + len, sizeof(tx_buf) - len, ",%d", consensus.neighbor_states[i]);
	}
	len += snprintf(tx_buf + len, sizeof(tx_buf) - len, "\n\r");
    // Send data asynchronously using uart_tx (I don't care if the tx is problematic, so I don't get the error)
    uart_tx(uart, tx_buf, len, SYS_FOREVER_US);
}
