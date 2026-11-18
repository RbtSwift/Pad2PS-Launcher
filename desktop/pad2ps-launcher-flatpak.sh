#!/bin/bash
export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID:-io.github.rbtswift.Pad2PSLauncher}"
mkdir -p "$TMPDIR"
exec /app/opt/Pad2PS-Launcher/pad2ps-launcher --no-sandbox "$@"
