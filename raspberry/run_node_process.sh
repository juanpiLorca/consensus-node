#!/bin/bash

# Make sure 'moreutils' is installed for timestamping
# sudo apt install moreutils

# Paths to logs
BLE_LOG="ble.log"
WIFI_LOG="wifi.log"
BRIDGE_LOG="bridge.log"

# Function to open a terminal with logging
run_terminal() {
    local cmd="$1"
    local log="$2"
    gnome-terminal -- bash -c "$cmd 2>&1 | ts '[%Y-%m-%d %H:%M:%S]' | tee $log; exec bash"
}

# Launch processes
run_terminal "node back ble" "$BLE_LOG"
run_terminal "node back wifi" "$WIFI_LOG"
run_terminal "node back bridge" "$BRIDGE_LOG"
