#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <freertos/FreeRTOS.h> 
#include <freertos/task.h>
#include <freertos/semphr.h>
#include <freertos/queue.h>

typedef struct {
    uint64_t timestamp; 
    uint64_t x; 
    uint64_t u; 
    uint64_t m; 
    SemaphoreHandle_t mutex; 
} dynamic_data_t;


TaskHandle_t xHandle = NULL;

void xTaskEvolution(void *pvParameters) {

    TickType_t xLastWakeTime;
    const TickType_t xFrequency = pdMS_TO_TICKS(1); 
    dynamic_data_t *sys = (dynamic_data_t *) pvParameters;

    xLastWakeTime = xTaskGetTickCount();
    for (;;) {

        if (xSemaphoreTake(sys->mutex, portMAX_DELAY) == pdTRUE) {
            sys->x += (sys->u + sys->m); 
            sys->timestamp = esp_timer_get_time();
            xSemaphoreGive(sys->mutex);
        }
  
        vTaskDelayUntil(&xLastWakeTime, xFrequency);
    }



}

void app_main() {}