#ifndef CONSENSUS_H
#define CONSENSUS_H

#include <stdlib.h>
#include <stdint.h>
#include <zephyr/kernel.h>
#include "common.h"

/**
 * Custom type to store disturbance parameters sent by user through UART
 */
typedef struct {
    uint32_t counter; 

    bool random; 
    int32_t offset;
    int32_t amplitude;
    int32_t phase;
    uint32_t samples; 
} disturbance_params;

/**
 * Custom type to store consensus parameters sent by user through UART
 */
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
    int32_t Ts; 
    int32_t state0; 
    int32_t vstate0; 
    int32_t vartheta0;
    int32_t eta; 
    int32_t state; 
    int32_t vstate;
    int32_t vartheta;
    int32_t sigma; // error term
    float gi;
    float ui;  

    bool* neighbor_enabled; 
    int32_t* neighbor_states; 
    int32_t* neighbor_vstates;

    disturbance_params disturbance;
} consensus_params;

/**
 * Public boolean to know if the consensus algorithm has received the triggered signal
 * 
 */
extern consensus_params consensus;

#endif // CONSENSUS_H