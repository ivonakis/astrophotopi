#!/bin/bash

# ── Configuration ────────────────────────────────────────────────────────────
HOME_SSID="YourHomeNetwork"     # your home WiFi name
AP_SSID="AstroPi"               # AP name broadcast in the field
AP_PASSWORD="astrophoto"        # AP password (min 8 chars)
INTERFACE="wlan0"
TIMEOUT=60                      # seconds to wait for home network
# ─────────────────────────────────────────────────────────────────────────────

LOG=/var/log/wifi-ap-fallback.log
log() { echo "$(date '+%H:%M:%S') $*" | tee -a "$LOG"; }

is_connected() {
    nmcli -t -f ACTIVE,SSID dev wifi 2>/dev/null | grep -q "^yes:${HOME_SSID}$"
}

log "=== boot: looking for '$HOME_SSID' (${TIMEOUT}s timeout) ==="

for ((i = 1; i <= TIMEOUT; i++)); do
    if is_connected; then
        log "Connected to '$HOME_SSID' after ${i}s"
        exit 0
    fi
    sleep 1
done

log "Home network not found. Starting access point '$AP_SSID'..."

# Create the AP connection profile once; reuse on subsequent boots
if ! nmcli connection show "$AP_SSID" &>/dev/null; then
    log "Creating AP connection profile..."
    nmcli connection add \
        type wifi \
        ifname "$INTERFACE" \
        con-name "$AP_SSID" \
        ssid "$AP_SSID" \
        "802-11-wireless.mode" ap \
        ipv4.method shared \
        wifi-sec.key-mgmt wpa-psk \
        wifi-sec.psk "$AP_PASSWORD"
fi

nmcli connection up "$AP_SSID"
log "AP active — connect to '$AP_SSID' and open http://10.42.0.1:3000"
