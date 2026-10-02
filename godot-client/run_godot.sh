#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
exec godot --editor project.godot
