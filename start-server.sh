#!/bin/bash

# Start the TSForms client on port 8443
# This will be accessible via Tailscale Funnel

echo "Starting TSForms Client on port 8443..."
echo "Will be accessible at: https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/"

# Start the development server
PORT=8443 npm start
