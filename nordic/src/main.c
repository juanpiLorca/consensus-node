#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <dk_buttons_and_leds.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gap.h>
#include <math.h>
#include <stdlib.h>

#include "consensus.h"
#include "common.h"
#include "observer.h"
#include "broadcaster.h"
#include "serial.h"

#define M_PI 3.14159265358979323846f

// Register the logger for this module 
LOG_MODULE_REGISTER(Module_Main, LOG_LEVEL_INF); 

/**
 * Led status
 */
#define LED_STATUS                  DK_LED1
#define BLINK_INTERVAL_MS           1000
/**
 * Thread stack size and priority
 */
#define STACK_SIZE                  2048
#define THREAD_CONSENSUS_PRIORITY   7

/**
 * Function declarations: --------------------------------------------------------------
 */
static void leds_init(void);                        // Auxiliary function for starting LEDs
static void bt_init(void);                          // Auxiliary function for starting Bluetooth
static float disturbance(consensus_params* cp);     // Auxiliary function to compute disturbance
static float sign(float x);                         // Auxiliary function to get the sign of a float number
static float v_i(consensus_params* cp);             // Function to compute the v_i term in the consensus algorithm
static void update_consensus(consensus_params* cp); // Function to update the consensus algorithm
static void thread_consensus(void);                 // Thread to run the consensus algorithm periodically
/*
 * -------------------------------------------------------------------------------------
 */

/**
 * Main thread:
 */
int main(void) {

    int blink_status = 0; 

    leds_init();
    bt_init();
    serial_init();

    while (1) {
        dk_set_led(LED_STATUS, (++blink_status) % 2);
        k_sleep(K_MSEC(consensus.Ts));
    }
}

/**
 * Consensus thread:
 */
K_THREAD_DEFINE(thread_consensus_id, STACK_SIZE,
                thread_consensus, NULL, NULL, NULL,
                THREAD_CONSENSUS_PRIORITY, 0, 0);

/**
 * Function definitions: --------------------------------------------------------------
 */

static void leds_init(void) {
	int err = dk_leds_init();
	if (err) {
		LOG_ERR("Status LED failed to start (err %d)\n", err);
		return;
	}
	LOG_INF("Status LED successfully started\n");
}

static void bt_init(void) {
    int err = bt_enable(NULL);
	if (err) {
		LOG_ERR("Bluetooth failed to start (err %d)\n", err);
		return;
	}
	LOG_INF("Bluetooth successfully started\n");
}

static float disturbance(consensus_params* cp) {
    float amp = (float)cp->disturbance.amplitude * cp->inv_scale_factor;
    float off = (float)cp->disturbance.offset * cp->inv_scale_factor;
    return amp * ((float)rand() / (float)RAND_MAX - off);
}

static float sign(float x) {
    if (x > 0.0f) {
        return 1.0f;
    } else if (x < 0.0f) {
        return -1.0f;
    } else {
        return 0.0f;
    }
}

static float v_i(consensus_params* cp) {
    float vstate_f = (float)(cp->vstate * cp->inv_scale_factor);
    float vi = 0.0f;
    for (int j = 0; j < cp->N; j++) {
        if (cp->neighbor_enabled[j]) {
            float diff = vstate_f - (float)(cp->neighbor_vstates[j] * cp->inv_scale_factor);
            vi += -1.0f * sign(diff) * sqrtf(fabsf(diff));
        }
    }
    return vi;
}

static void update_consensus(consensus_params* cp) {

    // 1. Cast to float for calculations: system and disturbance parameters

    // Dynamic variables & parameters
    float x = (float)(cp->state * cp->inv_scale_factor);
    float z = (float)(cp->vstate * cp->inv_scale_factor);
    float vartheta = (float)(cp->vartheta * cp->inv_scale_factor);
    float eta = (float)(cp->eta * cp->scale_eta);

    // Disturbance: 
    float nu = disturbance(cp);

    // 2. Compute error term and gradients
    float sigma = x - z; 
    float grad = sign(sigma); 

    // 3. Compute control input
    float vi = v_i(cp);
    float gi = vi; 
    float ui = gi - vartheta * grad; 

    // 4. Compute dvtheta (derivative of vartheta): hysteresis bounding 
    float dvtheta = 0.0f; 
    if (cp->active == 0){ 
        if ((float)fabs(sigma) > cp->epsilonON){
            cp->active = 1;
            dvtheta = eta * 1.0f; 
        } else {
            dvtheta = 0.0f; 
        }
    } else {
        if ((float)fabs(sigma) <= cp->epsilonOFF){
            cp->active = 0;
            dvtheta = 0.0f; 
        } else {
            dvtheta = eta * 1.0f; 
        }
    }

    // 5. Update dynamic variables
    cp->state = (int32_t)((x + cp->dt * (ui + nu)) * cp->scale_factor);
    cp->vstate = (int32_t)((z + cp->dt * gi) * cp->scale_factor);
    cp->vartheta = (int32_t)((vartheta + cp->dt * dvtheta) * cp->scale_factor);

    // 6. Update disturbance parameters & log info.
    cp->disturbance.counter = (cp->disturbance.counter + 1) % cp->disturbance.samples;
}

static void thread_consensus(void) {
    custom_data_type custom_data = {
        MANUFACTURER_ID, 
        consensus.enabled ? NETID_ENABLED : NETID_DISABLED, 
        consensus.node, 
        consensus.vstate
    };

    static neighbor_info_type neighbor_info; 
    while (1) {
        if (consensus.running) {
			if (consensus.first_time_running) {
				custom_data.netid_enabled = consensus.enabled ? NETID_ENABLED : NETID_DISABLED;
				custom_data.node = consensus.node;
				custom_data.vstate = consensus.vstate;
				broadcaster_init(&custom_data);
				observer_init();
				serial_log_consensus();
				consensus.first_time_running = false;
			}
			if (consensus.all_neighbors_observed) {
				if (!k_msgq_get(&custom_observer_msg_queue, &neighbor_info, K_FOREVER)) {
					if (consensus.enabled) {
					    memcpy(consensus.neighbor_vstates, neighbor_info.vstates, sizeof(neighbor_info.vstates));
					    memcpy(consensus.neighbor_enabled, neighbor_info.enabled, sizeof(neighbor_info.enabled));
					    update_consensus(&consensus);
					}
					custom_data.netid_enabled = consensus.enabled ? NETID_ENABLED : NETID_DISABLED;
					custom_data.vstate = consensus.vstate;
		    		broadcaster_update_scan_response_custom_data(&custom_data);
				    serial_log_consensus();
		    	}
			}
		}
		k_sleep(K_MSEC(consensus.Ts));
    }
}


// static void thread_consensus(void) {
//     custom_data_type custom_data = { ... };
//     static neighbor_info_type neighbor_info; 
    
//     while (1) {
//         if (consensus.running) {
            
//             // 1. ASYNCHRONOUS NETWORK INPUT UPDATE (0.1s rate)
//             // Executes the following block ONLY when a new message arrives from the observer thread.
//             if (!k_msgq_get(&custom_observer_msg_queue, &neighbor_info, K_NO_WAIT)) { 
//                 if (consensus.all_neighbors_observed) {
//                     // Update the neighbor inputs used by the dynamics
//                     memcpy(consensus.neighbor_vstates, neighbor_info.vstates, sizeof(neighbor_info.vstates));
//                     memcpy(consensus.neighbor_enabled, neighbor_info.enabled, sizeof(neighbor_info.enabled));
//                 }
                
//                 // 3. SLOW ASYNCHRONOUS OUTPUT REPORTING (0.1s rate)
//                 // Executes ONLY when the input is updated, giving you the flexibility you want.
//                 serial_log_consensus(); // <-- This is executed at the 0.1s rate
//             }
            
//             if (consensus.enabled) {
//                 // 2. SYNCHRONOUS DYNAMICS EXECUTION (1ms rate)
//                 // Runs every 1ms, using the neighbor data updated at 0.1s.
//                 update_consensus(&consensus);
//             }
            
//             // 4. BROADCAST UPDATE (can be 1ms or 0.1s, depending on BLE load)
//             // It's often best to only update the broadcast state (which neighbors read) when the
//             // consensus calculation *uses* a new network input (i.e., inside the k_msgq_get block).
//             // For simplicity, let's keep it inside the k_msgq_get block alongside serial_log_consensus.
//             // If you put it here, it will run every 1ms, increasing BLE advertising load. 

//         }
        
//         // 5. FAST LOOP TIMER (1ms rate)
//         k_sleep(K_MSEC(consensus.Ts));
//     }
// }
