# Tailscale Funnel Configuration

## Overview

This client is configured to run on port **8443** and be accessible via Tailscale Funnel at:

```
https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/
```

## Configuration

### Environment Variables
- **PORT**: 8443
- **API Base URL**: https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net

Both `.env.development` and `.env.production` are configured to use the Tailscale URL.

## Running the Client

### Option 1: Development Mode
```bash
npm start
# Or use the helper script:
./start-server.sh
```

The development server will start on port 8443.

### Option 2: Production Build
```bash
# Build the app
npm run build

# Serve the production build
npm run serve
```

## Tailscale Funnel Setup

### 1. Enable Tailscale Funnel

```bash
# Enable funnel for port 8443 (HTTPS)
tailscale funnel 8443
```

This will expose your local port 8443 to the internet via HTTPS at:
```
https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/
```

### 2. Check Funnel Status

```bash
tailscale serve status
```

### 3. Stop Funnel (when needed)

```bash
tailscale funnel --remove 8443
```

## Serve Production Build with Tailscale Funnel

For production, you'll want to serve the built files:

```bash
# Build the production version
npm run build

# Serve on port 8443
npm run serve

# In another terminal, enable Tailscale Funnel
tailscale funnel 8443
```

## WXCC Desktop Integration

When configuring the widget in Webex Contact Center Desktop Layout, use:

**Widget URL:**
```
https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/
```

**Script URL (if needed):**
```
https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/static/js/main.js
```

## Desktop Layout JSON Example

```json
{
  "comp": "md-tab",
  "attributes": {
    "slot": "tabs",
    "label": "TS Forms"
  },
  "children": [
    {
      "comp": "md-tab-panel",
      "attributes": {
        "slot": "panels",
        "visibility": "TS_FORMS"
      },
      "children": [
        {
          "comp": "webex-tsforms-widget",
          "script": "https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/static/js/main.js"
        }
      ]
    }
  ]
}
```

## Testing

### Local Testing (without Tailscale)
```bash
npm start
# Access at: http://localhost:8443
```

### Remote Testing (with Tailscale Funnel)
```bash
# Terminal 1: Start the app
npm start

# Terminal 2: Enable Tailscale Funnel
tailscale funnel 8443

# Access at: https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/
```

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 8443
sudo lsof -i :8443

# Kill the process if needed
sudo kill -9 <PID>
```

### Tailscale Funnel Not Working
```bash
# Check Tailscale status
tailscale status

# Check if funnel is enabled
tailscale serve status

# Restart Tailscale if needed
sudo systemctl restart tailscaled
```

### CORS Issues
If you encounter CORS errors, ensure your backend API (if separate) has proper CORS headers configured to allow requests from your Tailscale domain.

## Security Notes

- ✅ Tailscale Funnel provides automatic HTTPS
- ✅ No need for SSL certificates
- ✅ Traffic is encrypted end-to-end
- ⚠️ The URL is publicly accessible when Funnel is enabled
- 🔒 Consider using Tailscale ACLs to restrict access if needed

## Running as a Service

To keep the client running permanently, consider using systemd:

```bash
# Create a systemd service file
sudo nano /etc/systemd/system/tsforms-client.service
```

Add:
```ini
[Unit]
Description=TSForms Client
After=network.target

[Service]
Type=simple
User=zjwalsh
WorkingDirectory=/home/zjwalsh/Projects/TSMiddleware/client
ExecStart=/usr/bin/npm start
Restart=always
Environment=PORT=8443

[Install]
WantedBy=multi-user.target
```

Then:
```bash
# Enable and start the service
sudo systemctl enable tsforms-client
sudo systemctl start tsforms-client

# Check status
sudo systemctl status tsforms-client
```

## Quick Reference

| Purpose | Command |
|---------|---------|
| Start dev server | `npm start` or `./start-server.sh` |
| Build production | `npm run build` |
| Serve production | `npm run serve` |
| Enable Tailscale Funnel | `tailscale funnel 8443` |
| Check Funnel status | `tailscale serve status` |
| Stop Funnel | `tailscale funnel --remove 8443` |
| Access URL | https://ubuntu-vmware-virtual-platform.tail4794a2.ts.net/ |
