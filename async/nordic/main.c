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

// --- GLOBAL TIMER DECLARATION (FAST LOOP) ---
// This timer will trigger the simulation logic at the high-frequency dt rate.
static struct k_timer dynamics_timer;
// -------------------------------------------

// --- SYNCHRONIZATION: MUTEX FOR CONSENSUS STATE ---
// Mutex to protect the global 'consensus' state from concurrent access 
// by the slow thread and the fast timer handler.
static struct k_mutex consensus_mutex;
// MORE ON THIS VIDEO: https://www.youtube.com/watch?v=i23zYS54JtI
// --------------------------------------------------

/**
 * Function declarations: --------------------------------------------------------------
 */
static void leds_init(void);                                 // Auxiliary function for starting LEDs
static void bt_init(void);                                   // Auxiliary function for starting Bluetooth
static float disturbance(consensus_params* cp);              // Auxiliary function to compute disturbance
static float sign(float x);                                  // Auxiliary function to get the sign of a float number
static float max_of_two_non_negative_f(float a, float b);    // Auxiliary function to get the max of two floats, clamped at 0.0f
static float v_i(consensus_params* cp);                      // Function to compute the v_i term in the consensus algorithm
static void update_consensus(consensus_params* cp);          // Function to update the consensus algorithm
static void thread_consensus(void);                          // Thread to run the consensus algorithm periodically
static void timer_fast_simulation_handler(struct k_timer *dummy);   // Handler for the high-frequency dynamics timer
// ---------------------------------
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
    
    // Initialize the synchronization primitives
    k_mutex_init(&consensus_mutex);

    // Initialize the high-frequency dynamics timer
    k_timer_init(&dynamics_timer, timer_fast_simulation_handler, NULL);

    while (1) {
        dk_set_led(LED_STATUS, (++blink_status) % 2);
        k_sleep(K_MSEC(consensus.Ts)); // Simple blink, not related to core consensus timing
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
    float nu = 0.0f;
    if (!cp->disturbance.disturbance_on) {
        nu = 0.0f; 
    } else {
        // Scaling factors
        float amp = (float)cp->disturbance.amplitude * cp->inv_scale_factor;
        float off = (float)cp->disturbance.offset * cp->inv_scale_factor;
        float beta = (float)cp->disturbance.beta * cp->inv_scale_factor;
        float A = (float)cp->disturbance.A * cp->inv_scale_factor; 
        float f = (float)cp->disturbance.frequency;                                    
        float phi_shift_s = (float)cp->disturbance.phase * cp->inv_scale_factor;       
        float t = (float)cp->disturbance.counter * (float)cp->dt * cp->inv_scale_factor; // dt must be scaled to seconds

        float m = amp * ((float)rand() / (float)RAND_MAX - off); 
        
        float sinusoidal = A * sinf(2.0f * M_PI * f * (t - phi_shift_s));
        nu = m + beta + sinusoidal;
    } 
    return nu; 
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

/**
 * Function to find the maximum of two floating-point numbers (float type), 
 * clamped to be non-negative.
 */
static float max_of_two_non_negative_f(float a, float b) {
    // 1. Find the maximum of the two inputs
    float max_val = fmaxf(a, b);
    
    // 2. Clamp the result: Return the maximum between 0.0f and max_val.
    // This ensures no negative value is returned.
    return fmaxf(0.0f, max_val); 
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
    float dt = (float)(cp->dt * cp->inv_scale_factor); 
    float x = (float)(cp->state * cp->inv_scale_factor);
    float z = (float)(cp->vstate * cp->inv_scale_factor);
    float vartheta = (float)(cp->vartheta * cp->inv_scale_factor);
    float eta = (float)(cp->eta * cp->inv_scale_factor);

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
    // Using the specified function name max_of_two_non_negative_f for non-negative clamping.
    cp->state = (int32_t)(max_of_two_non_negative_f(x + dt * (ui + nu), 0.0f) * cp->scale_factor);
    cp->vstate = (int32_t)(max_of_two_non_negative_f(z + dt * gi, 0.0f) * cp->scale_factor);
    cp->vartheta = (int32_t)(max_of_two_non_negative_f(vartheta + dt * dvtheta, 0.0f) * cp->scale_factor);

    // 6. Update disturbance parameters & log info.
    cp->disturbance.counter = (cp->disturbance.counter + 1) % cp->disturbance.samples;
}

/**
 * --- NEW FAST SIMULATION LOOP (Timer Handler) ---
 * Runs every 'consensus.dt' (e.g., 1ms). This is non-blocking math.
 */
static void timer_fast_simulation_handler(struct k_timer *dummy) {
    ARG_UNUSED(dummy);

    if (consensus.running && consensus.enabled) {
        
        // --- CRITICAL SECTION START: Protect state variables during dynamics update and BLE update ---
        k_mutex_lock(&consensus_mutex, K_FOREVER);
        
        // 1. Execute the fast Euler step (READS/WRITES the shared state)
        update_consensus(&consensus);
        
        // 2. Update BLE advertisement with the new state (READS the shared vstate)
        custom_data_type custom_data = {
            MANUFACTURER_ID, 
            consensus.enabled ? NETID_ENABLED : NETID_DISABLED, 
            consensus.node, 
            consensus.vstate
        };
        broadcaster_update_scan_response_custom_data(&custom_data);

        k_mutex_unlock(&consensus_mutex);
        // --- CRITICAL SECTION END ---
    }
}


/**
 * --- REFACTORED SLOW NETWORK/LOGGING LOOP (Thread) ---
 * Runs periodically based on consensus.Ts (or only on new network messages).
 * It waits for new neighbor data and handles the serial logging output.
 */
static void thread_consensus(void) {
    static neighbor_info_type neighbor_info; 

    k_timeout_t Ts = K_MSEC(consensus.Ts); 

    while (1) {
        if (consensus.running) {
            
            if (consensus.first_time_running) {
                // Perform one-time setup
                broadcaster_init(NULL); // Initial setup for broadcaster
                observer_init();        // Initial setup for observer

                // Start the FAST simulation timer
                k_timer_start(&dynamics_timer, K_MSEC(0), K_MSEC(consensus.dt));
                
                consensus.first_time_running = false;
                LOG_INF("Consensus Timer started with dt=%d ms.", consensus.dt);
            }
            
            // --- 1. SLOW BLOCKING NETWORK I/O (Receiving neighbor data) ---
            if (consensus.all_neighbors_observed) {
                if (!k_msgq_get(&custom_observer_msg_queue, &neighbor_info, K_FOREVER)) {
                    
                    // --- CRITICAL SECTION START: Protect neighbor inputs during memcpy ---
                    k_mutex_lock(&consensus_mutex, K_FOREVER);
                    
                    // Update the shared neighbor data (WRITING to shared state)
                    if (consensus.enabled) {
                        memcpy(consensus.neighbor_vstates, neighbor_info.vstates, sizeof(neighbor_info.vstates));
                        memcpy(consensus.neighbor_enabled, neighbor_info.enabled, sizeof(neighbor_info.enabled));
                    }
                    
                    k_mutex_unlock(&consensus_mutex);
                    // --- CRITICAL SECTION END ---
                }
            }

            // --- 2. SLOW LOGGING/POSTING ---
            // Need to protect logging, as it READS all state variables written by the fast timer.
            k_mutex_lock(&consensus_mutex, K_FOREVER);
            serial_log_consensus(); 
            k_mutex_unlock(&consensus_mutex);

        } else {
            // Stop the FAST simulation timer when consensus is not running
            k_timer_stop(&dynamics_timer);
            consensus.first_time_running = true; // Reset for next run
            
            // Wait for a new trigger message before checking again
            k_sleep(K_MSEC(100)); 
        }        
        
        // Ensure this thread yields/sleeps to allow the timer thread to run
        k_sleep(Ts); 
    }
}
