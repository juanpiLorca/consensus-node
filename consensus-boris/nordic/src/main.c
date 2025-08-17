// Include modules
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <dk_buttons_and_leds.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gap.h>
#include <math.h>
#include <stdlib.h>
#include "common.h"
#include "observer.h"
#include "broadcaster.h"
#include "serial.h"
#define M_PI 3.14159265358979323846

// Register the logger for this module
LOG_MODULE_REGISTER(Module_Main, LOG_LEVEL_INF);

// For status led
#define STATUS_LED DK_LED1
#define BLINK_INTERVAL 1000

// For threads
#define STACKSIZE 2048
#define THREAD_CONSENSUS_PRIORITY 7

// Auxiliar function for starting LEDs
void leds_start(void) {
	int err = dk_leds_init();
	if (err) {
		LOG_ERR("Status LED failed to start (err %d)\n", err);
		return;
	}
	LOG_INF("Status LED successfully started\n");
}

// Auxiliar function for starting BT
void bt_start(void) {
    int err = bt_enable(NULL);
	if (err) {
		LOG_ERR("Bluetooth failed to start (err %d)\n", err);
		return;
	}
	LOG_INF("Bluetooth successfully started\n");
}

// Auxiliar sign function
float sign(float x) {
    if (x > 0) {
        return 1.0;
    } else if (x < 0) {
        return -1.0;
    } else {
        return 0.0;
    }
}

// Auxiliar function for computing consensus law
float v_i(consensus_params* cp) {
    float vstate_f = (float)cp->vstate;
    float vi = 0.0f;
    for (int j = 0; j < cp->N; j++) {
        if (cp->neighbor_enabled[j]) {
            float diff = vstate_f - (float)cp->neighbor_states[j];
            vi += -1.0f * sign(diff) * sqrtf(fabsf(diff));
        }
    }
    return vi;
}


// Auxiliar function for updating the consensus algorithm
void update_consensus(consensus_params *cp) {

	if (cp->algorithm == ALGO_FINITE_TIME) {
		// For finite time consensus algorithm: Javier's consensus algorithm
		float x = (float)cp->state;
		float z = (float)cp->vstate;
		float vartheta = (float)(cp->gamma * 0.001);
		float eta = (float)(cp->lambda * 0.000001);

		// Disturbance parameters
		float cnt = (float)cp->disturbance.counter;
		float off = (float)cp->disturbance.offset;
		float amp = (float)cp->disturbance.amplitude;
		float pha = (float)(cp->disturbance.phase * 0.01);
		float Ns = (float)cp->disturbance.samples;
		float norm_noise = cp->disturbance.random ? (float)rand() / (float)RAND_MAX : sinf(2.0f * M_PI * ( (cnt/Ns) - pha ));
		float disturbance = off + amp * norm_noise;

		// 2. Compute error term and gradients
		float sigma = x - z; 
		float grad = sign(sigma); 
	
		// 3. Compute control input
		float vi = v_i(cp);
		float gi = vi; 
		float ui = gi - vartheta * grad; 
	
		// 4. Update dynamic variables
		cp->state = (int32_t)(x + ui + disturbance);
		cp->vstate = (int32_t)(z + gi);
		cp->gamma = (int32_t)(vartheta + eta * sign(sigma) * sign(sigma));
		cp->ui = ui;

		// 5. Update disturbance parameters & log info.
		cp->disturbance.counter = (cp->disturbance.counter + 1) % cp->disturbance.samples;
		LOG_INF("x: %d, z: %d, vartheta: %d, sigma: %d, state: %d", (int32_t)x, (int32_t)z, (int32_t)vartheta, (int32_t)sigma, cp->state);
	} else {
		LOG_ERR("Unknown algorithm type: %d", cp->algorithm);
		return;
	}
}

// Thread: Main (just for blinking a LED)
int main(void) {
	// Start status LED and the BLE stack
	int blink_status = 0;
	leds_start();
	bt_start();
	serial_start();
	while (1) {
		dk_set_led(STATUS_LED, (++blink_status) % 2);
		k_sleep(K_MSEC(consensus.Ts));
	}
}

// Thread: Consensus Algorithm
void thread_consensus(void) {
	custom_data_type custom_data = {MANUFACTURER_ID, consensus.enabled ? NETID_ENABLED : NETID_DISABLED, consensus.node, consensus.vstate};
	static neighbor_info_type neighbor_info;
	while (1) {
		if (consensus.running) {
			if (consensus.first_time_running) {
				custom_data.netid_enabled = consensus.enabled ? NETID_ENABLED : NETID_DISABLED;
				custom_data.node = consensus.node;
				custom_data.vstate = consensus.vstate;
				broadcaster_start(&custom_data);
				observer_start();
				serial_log_consensus();
				consensus.first_time_running = false;
			}
			if (consensus.all_neighbors_observed) {
				if (!k_msgq_get(&custom_observer_msg_queue, &neighbor_info, K_FOREVER)) {
					if (consensus.enabled) {
					    memcpy(consensus.neighbor_states, neighbor_info.vstates, sizeof(neighbor_info.vstates));
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

// Init the threads
K_THREAD_DEFINE(thread_consensus_id, STACKSIZE, thread_consensus, NULL, NULL, NULL, THREAD_CONSENSUS_PRIORITY, 0, 0);
