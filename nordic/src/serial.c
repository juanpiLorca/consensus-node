#include <stdlib.h>
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include "consensus.h"
#include "serial.h"

// Register the logger for this module
LOG_MODULE_REGISTER(Module_Serial, LOG_LEVEL_INF);

static bool available_neighbors[N_MAX_NEIGHBORS] = {false};
static bool neighbor_enabled[N_MAX_NEIGHBORS] = {false};
static uint8_t neighbors[N_MAX_NEIGHBORS] = {1};
static int32_t neighbor_vstates[N_MAX_NEIGHBORS] = {50};

consensus_params consensus = {
	false,					// running
	false,					// enabled	
	true,					// first_time_running
	false,					// all_neighbors_observed
	available_neighbors,	// avaliable_neighbors
	0,						// node
	neighbors,				// neigbors
    1e6f,                   // scale_factor <-- Make sure this is consistent with the one in algo.js - Make it as a loading parameter
    1e-6f,                  // inv_scale_factor <-- Make sure this is consistent with the one in algo.js - Make it as a loading parameter
    1e-4f,                  // scale_eta <-- Make sure this is consistent with the one in algo.js - Make it as a loading parameter
	1,						// number of neighbors = N
	0,						// time0 (internal clock time)
	1000,					// period of the consensus task
    1e-3,                   // "dt": integration step (since there's no continuous process running) 
	100,					// initial state
    50,						// initial vstate
    0,						// initial vartheta
    0,                      // eta
    100,                    // state 
    50,                     // vstate
    1,                      // vartheta
    0,                      // active boolean --> for hysteresis bounding
    0.075f,                 // epsilonON <-- Make sure this is consistent with the one in algo.js - Make it as a loading parameter
    0.010f,                 // epsilonOFF <-- Make sure this is consistent with the one in algo.js - Make it as a loading parameter
    neighbor_enabled,		// neighbor enabled
    neighbor_vstates,		// neighbor vstates
	{false, 0, 0, 0, 0, 0, 0, 0, 0}  // disturbance parameters
};	

/**
 * Device pointer to the UART hardware
 */
const struct device *uart = DEVICE_DT_GET(DT_NODELABEL(uart0)); 

// Buffers for TX and RX data
static uint8_t tx_buf[TX_BUFF_SIZE];
static uint8_t rx_buf[RX_BUFF_SIZE];

/**
 * Callback function to handle UART events
 */
static void uart_cb(const struct device *dev, struct uart_event *evt, void *user_data) {
    switch (evt->type) {

        case UART_RX_RDY: 

            for (int i=evt->data.rx.offset; i < evt->data.rx.offset+evt->data.rx.len; i++) {
                uint8_t c = evt->data.rx.buf[i];

                if (c == '\r' || c == '\n') {

                    // First byte is the message type: 
                    uint8_t type = evt->data.rx.buf[0]; 

                    uint8_t *pt;
                    uint8_t cnt; 
                    switch (type) {

                        // When receiving consensus trigger type: 't'
                        case 't': 
                            if (evt->data.rx.buf[1] != '0') {
                                consensus.running = true; 
                                consensus.first_time_running = true; 
                                consensus.all_neighbors_observed = false;
								consensus.disturbance.counter = 0;
                    			consensus.time0 = k_uptime_get();
                    			consensus.state = consensus.state0;
                                consensus.vstate = consensus.vstate0;
                                consensus.vartheta = consensus.vartheta0;
                    			for (int i = 0; i < N_MAX_NEIGHBORS; i++) {
                    				consensus.available_neighbors[i] = false;
                    				consensus.neighbor_vstates[i] = consensus.vstate0;
									consensus.neighbor_enabled[i] = false;
                    			}
                    		} else {
                    			consensus.running = false;
                    		}
                    		break;

                        // When receiving network configuration type: 'n'
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

                            consensus.N = cnt - 2; 
                            break; 

                        // When receiving algorithm realted type
                        case 'a': 
                            pt = strtok(&(evt->data.rx.buf[1]), ","); 
                            cnt = 0; 
                            
                            while (pt != NULL) {
                                int32_t value = atoi(pt); 
                                switch (cnt) {
                                    case 0:  consensus.Ts                         = value;        break;
                                    case 1:  consensus.state0                     = value;        break; 
                                    case 2:  consensus.vstate0                    = value;        break; 
                                    case 3:  consensus.vartheta0                  = value;        break; 
                                    case 4:  consensus.eta                        = value;        break; 
                                    case 5:  consensus.disturbance.disturbance_on = (value == 1); break;
                                    case 6:  consensus.disturbance.amplitude      = value;        break; 
                                    case 7:  consensus.disturbance.offset         = value;        break; 
                                    case 8:  consensus.disturbance.beta           = value;        break;
                                    case 9:  consensus.disturbance.A              = value;        break;
                                    case 10: consensus.disturbance.frequency      = value;        break;
                                    case 11: consensus.disturbance.phase          = value;        break;
                                    case 12: consensus.disurbance.samples         = value;        break; 
                                    default: break;
                                }

                                cnt++; 
                                pt = strtok(NULL, ",");
                            }
                            break; 
                        
                        default: 
                            LOG_ERR("The received message has unknown type."); 
                            break; 
                    }
                    
                    // Disable Rx to reset the offset of the Rx Buffer
                    uart_rx_disable(dev); 
                    break; 
                }
            }
            break; 
        
        case UART_RX_DISABLED: 
            uart_rx_enable(dev, rx_buf, sizeof(rx_buf), RX_TIMEOUT); 
        
        default: 
            break; 
    }
}

/**
 * Function to start serial:
 */
void serial_init() {

    if (!device_is_ready(uart)) {
        LOG_ERR("Serial not ready!"); 
        return; 
    }

    int err = uart_callback_set(uart, uart_cb, NULL); 
    	if (err) {
		LOG_ERR("Serial failed to start (err %d)\n", err);
		return;
	}

	err = uart_rx_enable(uart, rx_buf, sizeof rx_buf, RX_TIMEOUT);
	if (err) {
		LOG_ERR("Serial failed to enable read (err %d)\n", err);
		return;
	}
	
	LOG_INF("Serial successfully started\n");
	return;
}

/**
 * Function to send the logged data over serial:
 */
void serial_log_consensus() {

    // Prepare the string format: "dtime,state,vstate,vartheta,neighbor_vstate1,neighbor_vstate2,...neighbor_vstateN\n\r"
    int64_t timestamp = k_uptime_get() - consensus.time0; 
    int len = snprintf(
        (char *)tx_buf, sizeof(tx_buf), 
        "d%lld,%d,%d,%d", 
        timestamp, 
        consensus.state, 
        consensus.vstate, 
        consensus.vartheta
    );

    // Append neighbor states to the buffer making sure we do not exceed de Tx buffer size
    for (int i = 0; i < consensus.N; i++) {
        len += snprintf((char *)tx_buf + len, sizeof(tx_buf) - len, ",%d", consensus.neighbor_vstates[i]); 
    }

    len += snprintf((char *)tx_buf + len, sizeof(tx_buf) - len, "\n\r"); 

    // Send data asynchronously using uart_tx
    uart_tx(uart, tx_buf, len, SYS_FOREVER_US); 
}