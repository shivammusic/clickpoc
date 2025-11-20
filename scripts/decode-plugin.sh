#!/usr/bin/env bash
set -euo pipefail

# Decode the text-friendly base64 copy of the plugin into a Caido-loadable zip.
# Usage: ./scripts/decode-plugin.sh [output.zip]
# Default output is ./caido-graphql-inql.zip

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="${1:-$ROOT_DIR/caido-graphql-inql.zip}"

B64_SOURCE="$ROOT_DIR/caido-graphql-inql.zip.b64"
if [ ! -f "$B64_SOURCE" ]; then
  echo "Base64 archive not found at $B64_SOURCE" >&2
  exit 1
fi

base64 -d "$B64_SOURCE" > "$OUTPUT"
echo "Decoded plugin written to $OUTPUT"
