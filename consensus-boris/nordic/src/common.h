#ifndef COMMON_H_
#define COMMON_H_

// For BT device name
#define DEVICE_NAME CONFIG_BT_DEVICE_NAME
#define DEVICE_NAME_LEN (sizeof(DEVICE_NAME) - 1)
#define MANUFACTURER_ID 0x0059
#define NETID_ENABLED 0x7F
#define NETID_DISABLED 0x70
#define N_MAX_NEIGHBORS 4

// For algorithm type
#define ALGO_TYPE_ORIGINAL 0
#define ALGO_TYPE_INTEGRAL 1
#define ALGO_TYPE_PI_LPF 2

// Custom type to represent a data 
typedef struct {
	uint16_t manufacturer;  // Unique universal manufacturer ID
	uint8_t netid_enabled;  // This is for network filtering and considering the node for udpating in the algorithm
	uint8_t node;			// The ID of the in the custom network
	int32_t state;			// A number (note that int32_t is aligned with uint16_t for "man" and uint16_t for "id")
} custom_data_type;

#define CUSTOM_DATA_TYPE_SIZE sizeof(custom_data_type)

#endif // COMMON_H_
