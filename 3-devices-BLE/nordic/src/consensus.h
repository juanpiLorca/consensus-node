#ifndef CONSENSUS_H
#define CONSENSUS_H

#include <stdlib.h>
#include <stdint.h>
#include <zephyr/kernel.h>
#include "common.h"

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
    float scale_factor; 
    float inv_scale_factor; 
    float scale_eta; 
    uint8_t N; 
    int64_t time0; 
    int32_t Ts; 
    float dt; 
    int32_t state0; 
    int32_t vstate0; 
    int32_t vartheta0;
    int32_t eta; 
    int32_t state; 
    int32_t vstate;
    int32_t vartheta;
    int32_t sigma; // error term
    int32_t g; 
    int32_t u; 
    float delta; 
    float gi;
    float ui;  
    bool* neighbor_enabled; 
    int32_t* neighbor_vstates;
} consensus_params;

/**
 * Public boolean to know if the consensus algorithm has received the triggered signal
 * 
 */
extern consensus_params consensus;

#endif // CONSENSUS_H