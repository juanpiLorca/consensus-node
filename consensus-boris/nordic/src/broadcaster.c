// Include modules
#include "broadcaster.h"
#include <zephyr/logging/log.h>

// Register the logger for this module
LOG_MODULE_REGISTER(Module_Broadcaster, LOG_LEVEL_INF);

// Function that initialize the broadcaster with scan response
int broadcaster_start(custom_data_type* custom_data)
{
	struct bt_data ad[] = {
		BT_DATA(BT_DATA_NAME_COMPLETE, DEVICE_NAME, DEVICE_NAME_LEN),
		BT_DATA(BT_DATA_MANUFACTURER_DATA, (unsigned char *)custom_data, sizeof(custom_data_type))
	};
    int err = bt_le_adv_start(BT_LE_ADV_NCONN, ad, ARRAY_SIZE(ad), ad, ARRAY_SIZE(ad));
	if (err) {
		LOG_ERR("Advertising failed to start (err %d)\n", err);
		return err;
	}
	LOG_INF("Advertising successfully started\n");
	return 0;
}

// Function that updates the broadcaster with scan response
int broadcaster_update_scan_response_custom_data(custom_data_type* custom_data)
{
	struct bt_data ad[] = {
		BT_DATA(BT_DATA_NAME_COMPLETE, DEVICE_NAME, DEVICE_NAME_LEN),
		BT_DATA(BT_DATA_MANUFACTURER_DATA, (unsigned char *)custom_data, sizeof(custom_data_type))
	};
	int err = bt_le_adv_update_data(ad, ARRAY_SIZE(ad), ad, ARRAY_SIZE(ad));
	if (err) {
		LOG_ERR("Advertising failed to update (err %d)\n", err);
		return err;
	}
	LOG_INF("Advertising successfully updated: value = %d \n", custom_data->vstate);
	return 0;
	
}
