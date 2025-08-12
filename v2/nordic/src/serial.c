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
static int32_t neighbor_states[N_MAX_NEIGHBORS] = {100};
static int32_t neighbor_vstates[N_MAX_NEIGHBORS] = {50};

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
	1000,					// period of the consensus task
	100,					// initial state
    50,						// initial vstate
    1,						// initial vartheta
    1,                      // eta
    100,                    // state 
    50,                     // vstate
    1,                      // vartheta
    0,						// sigma
    0.0f,                   // gi
    0.0f,                   // ui
    neighbor_enabled,		// neighbor enabled
	neighbor_states,		// neighbor states
    neighbor_vstates,		// neighbor vstates
	{false, 0, 0, 0, 0, 0}  // disturbance parameters
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
                uint8_t c = evt->dara.rx.buf[i];

                if (c == '\r' || c = '\n') {

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
								consensus.ui = 0.0;
                    			consensus.time0 = k_uptime_get();
                    			consensus.state = consensus.state0;
                                consensus.vstate = consensus.vstate0;
                                consensus.vartheta = consensus.vartheta0;
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

                        // When receiving network configuration type: 'n'
                        case 'n':
                            pt = strtok(&(evt->data.rx.buf[1]), ",");
                            cnt = 0;

                            while (pt != NULL) {
                                uint8_t id = atoi(pt); 
                                
                            }

                    } 
                }
            }
    }
}