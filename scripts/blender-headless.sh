#!/bin/sh
set -eu

blender_bin="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
if [ ! -x "$blender_bin" ]; then
  blender_bin="$(command -v blender || true)"
fi
if [ -z "$blender_bin" ] || [ ! -x "$blender_bin" ]; then
  echo 'Blender is missing. Install Blender or set BLENDER_BIN to its executable.' >&2
  exit 127
fi

# Isolated settings; Python failures must also fail the calling build/task.
exec "$blender_bin" --background --factory-startup --python-exit-code 1 "$@"
