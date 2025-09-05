#!/bin/bash

# Define the list of host aliases from your ~/.ssh/config file.
# The host aliases should be "pi1", "pi2", "pi3" as per your config.
DEVICES=("pi1" "pi2" "pi3")

REMOTE_DIR="/home/control/Desktop/consensus-node/3-devices-BLE/raspberry/data"
LOCAL_DIR="./data"

# Create a directory to store the downloaded files if it doesn't exist.
mkdir -p "$LOCAL_DIR"

# Loop through each device and copy the file
for i in "${!DEVICES[@]}"; do
    device="${DEVICES[$i]}"
    # The device number is the loop index plus one (0-indexed array)
    DEVICE_NUMBER=$((i+1))
    
    # Construct the remote filename using the device number.
    REMOTE_FILE="node_${DEVICE_NUMBER}_log.csv"

    echo "Attempting to copy $REMOTE_FILE from $device..."

    # The scp command now correctly uses the constructed remote filename.
    scp "$device:$REMOTE_DIR/$REMOTE_FILE" "$LOCAL_DIR/$device-$REMOTE_FILE"

    if [ $? -eq 0 ]; then
        echo "Successfully copied $REMOTE_FILE from $device to $LOCAL_DIR/$device-$REMOTE_FILE"
    else
        echo "Error: Failed to copy file from $device"
    fi
    echo "--------------------------------------"
done

echo "Automation complete."