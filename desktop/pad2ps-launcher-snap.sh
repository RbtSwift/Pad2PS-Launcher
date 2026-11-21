#!/bin/bash
# Launcher wrapper for Snap confinement
export HOME="${SNAP_USER_DATA:-$HOME}"
exec "$SNAP/opt/Pad2PS-Launcher/pad2ps-launcher" "$@"
