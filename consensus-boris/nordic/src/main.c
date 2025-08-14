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

// Auxiliar function for updating the consensus algorithm
void update_consensus(consensus_params *cp) {
    // Cast to float for accurate computation
    float x = (float)cp->state;
    float g = (float)(cp->gamma * 0.001);
    float a = (float)(cp->lambda * 0.000001);
	float p = (float)(cp->pole * 0.01);
	float ed = (float)cp->dead;
	// For algorithm with LPF system
	float x0 = (float)cp->state0;
	float e_past = cp->error;
	float e_dc_past = cp->error_dc;
	float ui_past = cp->ui;
	// For disturbance
	float cnt = (float)cp->disturbance.counter;
	float off = (float)cp->disturbance.offset;
	float amp = (float)cp->disturbance.amplitude;
	float pha = (float)(cp->disturbance.phase * 0.01);
	float Ns = (float)cp->disturbance.samples;
	float norm_noise = cp->disturbance.random ? (float)rand() / RAND_MAX : sin(2*M_PI*(cnt/Ns - pha));
	float disturbance = off + amp * norm_noise;
    // Compute the error
	float e = 0;
	float N = 0;
	for (int i=0; i < cp->N; i++) {
		if (cp->neighbor_enabled[i]) {
			e += ((float)cp->neighbor_states[i] - x);
			N++;
		}
	}
	if (N > 0) {
	    e /= N;
	}
	// Compute manipulated variable and update the algorithm
	float uf = x0;//(x0 + N * (e + x)) / (1 + N);
	float ui = ui_past + g * (e - p * e_past);
	float e_dc = p * e_dc_past + (1 - p) * e;
	float e_ac = e - e_dc; 
	float u = 0;
	switch (cp->algorithm) {
        case ALGO_TYPE_ORIGINAL:
            u = g * sign(e) + disturbance;
            cp->state = (int32_t)(x + u);
            cp->gamma = (int32_t)((g + a * sign(fabs(e))) * 1000);
            break;
        case ALGO_TYPE_INTEGRAL:
            u = g * e + disturbance;
            cp->state = (int32_t)(x + u);
            cp->gamma = (int32_t)(fabs(g + a * fabs(e) * sign(fabs(e) - ed)) * 1000);
            break;
        case ALGO_TYPE_PI_LPF:
            u = uf + ui + disturbance;
            cp->state = (int32_t)(p * x + (1 - p) * u);
			cp->gamma = (int32_t)(fabs(g + a * fabs(e) * sign(fabs(e_dc) - fabs(e_ac))) * 1000);
            break;
        default:
            u = uf + ui + disturbance;
            cp->state = (int32_t)(p * x + (1 - p) * u);
            cp->gamma = (int32_t)(fabs(g + a * fabs(e) * sign(fabs(e_dc) - fabs(e_ac))) * 1000);
    }
	cp->disturbance.counter = (cp->disturbance.counter + 1) % cp->disturbance.samples;
	cp->error = e;
	cp->error_dc = e_dc;
	cp->ui = ui;
	LOG_INF("x: %d, g: %d, a: %d, e: %d, state: %d, gamma: %d", (int32_t)x, (int32_t)g, (int32_t)a, (int32_t)e, cp->state, cp->gamma);
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

// Thread: Concensus Algorithm
void thread_consensus(void) {
	custom_data_type custom_data = {MANUFACTURER_ID, consensus.enabled ? NETID_ENABLED : NETID_DISABLED, consensus.node, consensus.state};
	static neighbor_info_type neighbor_info;
	while (1) {
		if (consensus.running) {
			if (consensus.first_time_running) {
				custom_data.netid_enabled = consensus.enabled ? NETID_ENABLED : NETID_DISABLED;
				custom_data.node = consensus.node;
				custom_data.state = consensus.state;
				broadcaster_start(&custom_data);
				observer_start();
				serial_log_consensus();
				consensus.first_time_running = false;
			}
			if (consensus.all_neighbors_observed) {
				if (!k_msgq_get(&custom_observer_msg_queue, &neighbor_info, K_FOREVER)) {
					if (consensus.enabled) {
					    memcpy(consensus.neighbor_states, neighbor_info.states, sizeof(neighbor_info.states));
					    memcpy(consensus.neighbor_enabled, neighbor_info.enabled, sizeof(neighbor_info.enabled));
					    update_consensus(&consensus);
					}
					custom_data.netid_enabled = consensus.enabled ? NETID_ENABLED : NETID_DISABLED;
					custom_data.state = consensus.state;
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
