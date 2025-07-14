#ifndef OBSERVER_H_
#define OBSERVER_H_

// Include modules
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/hci.h>
#include "common.h"

// Define a type for the message queue
typedef struct {
    int32_t states[N_MAX_NEIGHBORS];    // to store the state values of the neighbors

    // ---- Finite-Time Robust Adaptive Coordination ---
    int32_t vstates[N_MAX_NEIGHBORS];   // to store the virtual reference systems of the neighbors
    // ---- Finite-Time Robust Adaptive Coordination ---
    
    bool enabled[N_MAX_NEIGHBORS];      // to store whether the neighbor is enabled or not
} neighbor_info_type;

// Declare the message queue as extern to be used outside the observer module
extern struct k_msgq custom_observer_msg_queue;

// Declare public functions
int observer_start(void);

#endif // OBSERVER_H_

