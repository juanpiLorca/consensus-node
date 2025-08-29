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

    // Disturbance parameters
    float cnt = (float)cp->disturbance.counter;
	float off = (float)cp->disturbance.offset;
	float amp = (float)cp->disturbance.amplitude;
	float pha = (float)(cp->disturbance.phase * 0.01);
	float Ns = (float)cp->disturbance.samples;
    float norm_noise = cp->disturbance.random ? 2.0f * ((float)rand() / (float)RAND_MAX - 0.5f) : sinf(2.0f * M_PI * ((cnt / Ns) - pha));
	// float norm_noise = cp->disturbance.random ? (float)rand() / (float)RAND_MAX : sinf(2.0f * M_PI * ( (cnt/Ns) - pha ));
	float disturbance = (off + amp * norm_noise) * (cp->inv_scale_factor);

    // 2. Compute error term and gradients
    float sigma = x - z; 
    float grad = sign(sigma); 

    // 3. Compute control input
    float vi = v_i(cp);
    float gi = vi; 
    float ui = gi - vartheta * grad; 

    // 4. Compute dvtheta (derivative of vartheta)
    float dvtheta = (fabsf(sigma) > cp->delta) ? eta * 1.0f : 0.0f; 

    // 5. Update dynamic variables
    cp->state = (int32_t)((x + cp->dt * (ui + disturbance)) * cp->scale_factor);
    cp->vstate = (int32_t)((z + cp->dt * gi) * cp->scale_factor);
    cp->vartheta = (int32_t)((vartheta + cp->dt * dvtheta) * cp->scale_factor);
    cp->sigma = (int32_t)(sigma * cp->scale_factor);
    cp->gi = gi;
    cp->ui = ui;

    // 6. Update disturbance parameters & log info.
    cp->disturbance.counter = (cp->disturbance.counter + 1) % cp->disturbance.samples;
	LOG_INF("x: %d, z: %d, vartheta: %d, sigma: %d", cp->state, cp->vstate, cp->vartheta, cp->sigma);
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

