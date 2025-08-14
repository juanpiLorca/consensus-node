// Include modules
#include "observer.h"
#include "serial.h"
#include <zephyr/logging/log.h>

// Register the logger for this module
LOG_MODULE_REGISTER(Module_Observer, LOG_LEVEL_INF);

// Internal module variables                               
static neighbor_info_type neighbor_info;
K_MSGQ_DEFINE(custom_observer_msg_queue, sizeof(neighbor_info_type), 1, 4);	// define the queue (the size of the queue is 1)

// Define a function to map NEIGHBOR_i_IDs to their respective indices
static int8_t map_node_to_index(uint8_t node) {
	for (int i=0; i < consensus.N; i++) {
		if (consensus.neighbors[i] == node) {
			return i;
		}
	}
	return -1;
}

// Private Callback: On data parsed (called after device has been found)
static bool on_data_parse_after_device_found(struct bt_data *data, void *user_data) {
	custom_data_type *custom_data = user_data;
	switch (data->type) {
		// When getting the manufacturer data (since it can be placed in broadcasting or in scan_response):
		case BT_DATA_MANUFACTURER_DATA:
			if (data->data_len == CUSTOM_DATA_TYPE_SIZE) {
				memcpy(custom_data, data->data, CUSTOM_DATA_TYPE_SIZE);
				// Make sure the data is of our network
				if (custom_data->manufacturer == MANUFACTURER_ID && (custom_data->netid_enabled == NETID_ENABLED || custom_data->netid_enabled == NETID_DISABLED)) { 
					int8_t node_index = map_node_to_index(custom_data->node);
					if (node_index >= 0) {
					    if (!consensus.all_neighbors_observed) {
					    	consensus.available_neighbors[node_index] = true;
					    	int N = 0;
					    	for (int i = 0; i < consensus.N; i++) {
					    		if (consensus.available_neighbors[i]) {
					    			N++;
					    		}
					    	}
					    	if (N == consensus.N) {
					    		consensus.all_neighbors_observed = true;
					    	}
					    }
					    // Update the message queue with the state value of the node (it only updates the place of a node in the array of neighbor values)
					    neighbor_info.states[node_index] = custom_data->state;
					    neighbor_info.enabled[node_index] = (custom_data->netid_enabled == NETID_ENABLED) ? true : false;
					    while (k_msgq_put(&custom_observer_msg_queue, &neighbor_info, K_NO_WAIT) != 0) {
            		    	k_msgq_purge(&custom_observer_msg_queue);		// This logic deletes previous state values in the queue
        			    }
					    LOG_INF("id: %d, state: %d, enabled: %d", custom_data->node, neighbor_info.states[node_index], neighbor_info.enabled[node_index]);
					    //LOG_INF("SCANNED_NODE_ID: %d, SCANNED_NODE_VALUE %d, NEIGHBOR_INDEX %d, NEIGHBOR_STATE %d \n", custom_data->node, custom_data->state, map_node_to_index(custom_data->node), neighbor_states[map_node_to_index(custom_data->node)]);
					}
				}
			}
			return false;
		default:
			return true;
	}
}

// Private Callback: On device found (it just call the parser)
static void on_device_found(const bt_addr_le_t *addr, int8_t rssi, uint8_t type, struct net_buf_simple *ad) {
	// Parse the scanned data to a parse callback
	char ad_parsed[BT_GAP_ADV_MAX_ADV_DATA_LEN];
	bt_data_parse(ad, on_data_parse_after_device_found, ad_parsed);
}

// Public function: start the observer 
int observer_start(void) {
	struct bt_le_scan_param scan_param = {
		.type       = BT_LE_SCAN_TYPE_ACTIVE,			// This enables to send scan requests
		.options    = BT_LE_SCAN_OPT_FILTER_DUPLICATE,
		.interval   = BT_GAP_SCAN_FAST_INTERVAL,
		.window     = BT_GAP_SCAN_FAST_WINDOW,
	};
	int err = bt_le_scan_start(&scan_param, on_device_found);
	if (err) {
		LOG_ERR("Scanning failed to start (err %d)\n", err);
		return err;
	}
	LOG_INF("Scanning successfully started\n");
	return 0;
}
