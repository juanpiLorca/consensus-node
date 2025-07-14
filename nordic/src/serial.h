#ifndef SERIAL_H_
#define SERIAL_H_

// Include modules
#include <zephyr/drivers/uart.h>
#include "common.h"

// Definitions
#define TX_BUFF_SIZE 64
#define RX_BUFF_SIZE 64
#define RX_TIMEOUT 50000   //50000us = 50ms = 0.05s. If this is too small, then we will not receive a full string from application

// Custom type to store disturbance parameters sent by a user through uart
typedef struct {
    uint32_t counter;   // Counter
    bool random;        // Boolean to define random noise
    int32_t offset;     // Disturbance offset
    int32_t amplitude;  // Disturbance amplitude
    int32_t phase;      // Phase of the disturbance
    uint32_t samples;   // Number of samples
} disturbance_params;

// Custom type to store consensus parameters sent by a user through uart
typedef struct {
    bool running;
    bool enabled;
    bool first_time_running;
    bool all_neighbors_observed;
    bool* available_neighbors;
    uint8_t node;
    uint8_t* neighbors;
	uint8_t N;
    int64_t time0;
    uint8_t algorithm;
    int32_t Ts;
    int32_t state0;
    int32_t gamma0;
    int32_t lambda;
    int32_t pole;
    int32_t dead;
    int32_t state;
    int32_t gamma;
    float error;
    float error_dc;
    float ui;
    int32_t* neighbor_states;
    bool* neighbor_enabled;
    disturbance_params disturbance;
} consensus_params;

// Public boolean to know if the consensus algorithm has received a triggered signal
extern consensus_params consensus;

// Declare public functions
void serial_start(void);
void serial_log_consensus();

#endif // SERIAL_H_