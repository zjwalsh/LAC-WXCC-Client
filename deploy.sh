#!/bin/bash

# Update and restart the TSForms widget

echo "🔨 Building application..."
cd /home/zjwalsh/Projects/TSMiddleware/client
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "📦 Creating stable bundle links..."
cp build/static/js/main.*.js build/static/js/widget.bundle.js 2>/dev/null
cp build/static/css/main.*.css build/static/css/widget.styles.css 2>/dev/null

echo "🔄 Restarting server..."
pkill -f "serve.*8443"
sleep 2

nohup npx serve -s build -l 8443 --cors > server.log 2>&1 &

echo "⏳ Waiting for server to start..."
sleep 3

# Verify server is running
if lsof -i :8443 >/dev/null 2>&1; then
    echo "✅ Server restarted successfully on port 8443"
    echo ""
    echo "📍 Widget URL: https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/static/js/widget.bundle.js"
    echo "📍 Stylesheet URL: https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/static/css/widget.styles.css"
else
    echo "❌ Failed to start server"
    exit 1
fi
