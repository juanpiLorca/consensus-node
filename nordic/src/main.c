/*
 * Copyright (c) 2016 Intel Corporation
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* Controlling LEDs through UART. Press 1-3 on your keyboard to toggle LEDS 1-3 on your development
 * kit */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>
/* STEP 3 - Include the header file of the UART driver in main.c */
#include <zephyr/drivers/uart.h>

/* 1000 msec = 1 sec */
#define SLEEP_TIME_MS 		1000
#define RECEIVE_BUFF_SIZE	10 
#define RX_TIMEOUT 			100
#define TX_TIMEOUT 			SYS_FOREVER_US

/* STEP 5.1 - Get the device pointers of the LEDs through gpio_dt_spec */
static const struct gpio_dt_spec led0 = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios); 
static const struct gpio_dt_spec led1 = GPIO_DT_SPEC_GET(DT_ALIAS(led1), gpios); 
static const struct gpio_dt_spec led2 = GPIO_DT_SPEC_GET(DT_ALIAS(led2), gpios); 

/* STEP 4.1 - Get the device pointer of the UART hardware */
const struct device *uart = DEVICE_DT_GET(DT_NODELABEL(uart0)); 

/* STEP 9.1 - Define the transmission buffer, which is a buffer to hold the data to be sent over
 * UART */
static uint8_t tx_buf[] = {"nRF Connect SDK Fundamentals Course\r\n"
	"Press 1-3 on your keyboard to toggle LEDS 1-3 on your development kit\r\n"};

/* STEP 10.1.2 - Define the receive buffer */
static uint8_t rx_buf[RECEIVE_BUFF_SIZE] = {0};

/* STEP 7 - Define the callback function for UART */
static void uart_callback(const struct device *dev, struct uart_event *evt, void *user_data)
{
	/* STEP 7.1 - Handle the UART events */
	switch (evt->type) {
	case UART_RX_RDY:

		printk("Received data: %.*d\n\r", evt->data.rx.len, evt->data.rx.buf[evt->data.rx.offset]);

		if ((evt->data.rx.len) == 1) {
			if (evt->data.rx.buf[evt->data.rx.offset] == '1') {
				gpio_pin_toggle_dt(&led0);
			} else if (evt->data.rx.buf[evt->data.rx.offset] == '2') {
				gpio_pin_toggle_dt(&led1);
			} else if (evt->data.rx.buf[evt->data.rx.offset] == '3') {
				gpio_pin_toggle_dt(&led2);
			}
		}
		break;

	case UART_RX_DISABLED:
		printk("Receiving disabled\n\r");
		uart_rx_enable(dev, rx_buf, sizeof(rx_buf), RX_TIMEOUT);
		break;
	default:
		printk("Unknown event type: %d\n\r", evt->type);
		break;
	}
}


int main(void)
{
	int ret;

	/* STEP 4.2 - Verify that the UART device is ready */
	if (!device_is_ready(uart)) {
		printk("UART device is not ready\n\r"); 
		return 1; 
	}

	/* STEP 5.2 - Verify that the LED devices are ready */
	if (!device_is_ready(led0.port)) {
		printk("GPIO device for LED0 is not ready\n\r");
		return 1;
	}

	/* STEP 6 - Configure the GPIOs of the LEDs */
	ret = gpio_pin_configure_dt(&led0, GPIO_OUTPUT_ACTIVE);
	if (ret < 0) {
		return 1 ; 
	}
	ret = gpio_pin_configure_dt(&led1, GPIO_OUTPUT_ACTIVE);
	if (ret < 0) {
		return 1 ;
	}
	ret = gpio_pin_configure_dt(&led2, GPIO_OUTPUT_ACTIVE);
	if (ret < 0) {
		return 1 ;
	}

	/* STEP 8 - Register the UART callback function: ISR */
	ret = uart_callback_set(uart, uart_callback, NULL); 
	if (ret) {
		return 1;
	}

	/* STEP 9.2 - Send the data over UART by calling uart_tx() */
	ret = uart_tx(uart, tx_buf, sizeof(tx_buf), TX_TIMEOUT); 
	if (ret) {
		return 1; 
	}

	/* STEP 10.3  - Start receiving by calling uart_rx_enable() and pass it the address of the
	 * receive  buffer */
	ret = uart_rx_enable(uart, rx_buf, sizeof(rx_buf), RX_TIMEOUT);
	if (ret) {
		return 1; 
	}

	while (1) {
		k_msleep(SLEEP_TIME_MS);
	}
}