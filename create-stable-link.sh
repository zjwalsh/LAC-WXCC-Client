#!/bin/bash

# Deploy script that creates a stable link to the latest bundle

BUILD_DIR="/home/zjwalsh/Projects/TSMiddleware/client/build"
STATIC_JS_DIR="$BUILD_DIR/static/js"

# Find the main JS file (excluding maps)
MAIN_JS=$(ls $STATIC_JS_DIR/main.*.js 2>/dev/null | grep -v ".map" | head -1)

if [ -z "$MAIN_JS" ]; then
    echo "Error: No main JS file found in $STATIC_JS_DIR"
    exit 1
fi

# Create a symlink with a stable name
ln -sf "$(basename $MAIN_JS)" "$STATIC_JS_DIR/main.latest.js"

echo "Created stable link: main.latest.js -> $(basename $MAIN_JS)"
echo ""
echo "Use this URL in WXCC Desktop Layout:"
echo "https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/static/js/main.latest.js"
