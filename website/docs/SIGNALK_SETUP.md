# Signal K Integration for Matariki III

This guide explains how to configure Signal K on your Cerbo GX to send live position data to the Matariki III website.

## Integration Options

There are two main approaches to get Signal K data to the website:

| Approach | Best For | Requires Public IP? |
|----------|----------|---------------------|
| **Push (Webhook)** | Most boats - Signal K pushes to your website | No |
| **Pull (Streaming API)** | Direct real-time connection to Signal K | Yes |

This guide covers both approaches.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          On Matariki III                             │
│                                                                      │
│  ┌─────────────┐    NMEA 2000    ┌──────────────┐                   │
│  │   GPS       │ ───────────────▶│  Cerbo GX    │                   │
│  │  (Chartplotter)                │  + Signal K  │                   │
│  └─────────────┘                  └──────┬───────┘                   │
│                                          │                           │
└──────────────────────────────────────────┼───────────────────────────┘
                                           │ HTTP POST
                                           │ via Starlink
                                           ▼
                              ┌────────────────────────┐
                              │   matariki3.nz         │
                              │   /api/position        │
                              └────────────────────────┘
```

## Prerequisites

1. Cerbo GX with Signal K plugin installed
2. Starlink or satellite internet connection
3. GPS connected via NMEA 2000 or NMEA 0183

## Step 1: Install Signal K on Cerbo GX

The Cerbo GX can run Signal K through Venus OS Large or via a custom installation.

### Option A: Venus OS Large (Recommended)

1. Install Venus OS Large on your Cerbo GX
2. Signal K comes pre-installed
3. Access Signal K at: `http://venus.local:3000`

### Option B: Manual Installation

Follow Victron's documentation for installing Signal K on Venus OS.

## Step 2: Configure Signal K Data Sources

Ensure your GPS data is flowing into Signal K:

1. Open Signal K dashboard: `http://cerbo-ip:3000`
2. Go to **Server** → **Data Connections**
3. Verify you see position data under `navigation.position`

Test your data is available:
```bash
curl http://cerbo-ip:3000/signalk/v1/api/vessels/self/navigation/position
```

Expected response:
```json
{
  "value": {
    "latitude": -35.7275,
    "longitude": 174.3278
  },
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

## Step 3: Create Webhook Secret

Generate a secure token to authenticate requests:

```bash
openssl rand -hex 32
```

Save this token - you'll need it for both the Cerbo and website configuration.

## Step 4: Configure Website Environment

Add to your Vercel environment variables (or `.env.local` for development):

```env
SIGNALK_WEBHOOK_SECRET=your-generated-token-here
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

## Step 5: Set Up Position Webhook on Cerbo

### Option 1: msp-webhook Plugin (Recommended)

The [msp-webhook](https://github.com/50North4West/msp-webhook) plugin is ideal for boat use:
- Stores position data locally when offline (Starlink drops)
- Sends queued data when connection is restored
- Supports authentication tokens

1. In Signal K, go to **Appstore** → Search for **msp-webhook** → Install
2. Configure the plugin:
   - **Webhook URL**: `https://matariki3.nz/api/position?token=your-webhook-secret`
   - **Send Interval**: 60 (seconds)
   - **Paths to monitor**: `navigation.position`, `navigation.speedOverGround`, `navigation.courseOverGroundTrue`

### Option 2: @marinminds/signalk-notification-publisher

This plugin can publish data to an API when notification status changes.

1. In Signal K, go to **Appstore** → Search for **marinminds notification-publisher** → Install
2. Configure with your webhook URL and authentication

### Option 3: signalk-simple-webhook

1. In Signal K, go to **Appstore** → Install **signalk-simple-webhook**
2. Configure the plugin:
   - **URL**: `https://matariki3.nz/api/position`
   - **Method**: POST
   - **Headers**:
     ```json
     {
       "Authorization": "Bearer your-generated-token-here",
       "Content-Type": "application/json"
     }
     ```
   - **Paths to send**:
     - `navigation.position`
     - `navigation.courseOverGroundTrue`
     - `navigation.speedOverGround`
     - `navigation.headingTrue`
   - **Send interval**: 60000 (1 minute)

### Using Cron Script Alternative

Create a script on the Cerbo to POST position data:

```bash
#!/bin/bash
# /data/scripts/send-position.sh

SIGNALK_URL="http://localhost:3000/signalk/v1/api/vessels/self"
WEBHOOK_URL="https://matariki3.nz/api/position"
WEBHOOK_SECRET="your-generated-token-here"

# Fetch current position from Signal K
POSITION=$(curl -s "$SIGNALK_URL/navigation/position/value")
COG=$(curl -s "$SIGNALK_URL/navigation/courseOverGroundTrue/value")
SOG=$(curl -s "$SIGNALK_URL/navigation/speedOverGround/value")

LAT=$(echo $POSITION | jq -r '.latitude')
LNG=$(echo $POSITION | jq -r '.longitude')

# Send to website
curl -X POST "$WEBHOOK_URL" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $LAT,
    \"longitude\": $LNG,
    \"courseOverGround\": $COG,
    \"speedOverGround\": $SOG,
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

Add to crontab to run every minute:
```bash
* * * * * /data/scripts/send-position.sh
```

## Step 6: Test the Integration

### Test Position Endpoint

```bash
# Send a test position
curl -X POST https://matariki3.nz/api/position \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -35.7275,
    "longitude": 174.3278,
    "speedOverGround": 2.5,
    "courseOverGround": 180
  }'

# Retrieve the position
curl https://matariki3.nz/api/position
```

### Verify on Website

Visit `https://matariki3.nz/track` to see your position displayed on the map.

## Troubleshooting

### Position Not Updating

1. Check Starlink connectivity
2. Verify Signal K is receiving GPS data: `curl http://cerbo:3000/signalk/v1/api/vessels/self/navigation/position`
3. Check webhook secret matches between Cerbo and website
4. Check Vercel function logs for errors

### CORS Errors (Development)

When testing locally, you may need to add CORS headers. The API route handles this automatically.

### Rate Limiting

The API accepts one update per second maximum. For production, send updates every 30-60 seconds to conserve bandwidth.

## Data Format Reference

### Signal K Delta Format (Native)

```json
{
  "updates": [{
    "values": [
      { "path": "navigation.position", "value": { "latitude": -35.7275, "longitude": 174.3278 } },
      { "path": "navigation.courseOverGroundTrue", "value": 3.14159 },
      { "path": "navigation.speedOverGround", "value": 2.57 }
    ]
  }]
}
```

Note: Signal K uses radians for angles and m/s for speed.

### Simplified Format

```json
{
  "latitude": -35.7275,
  "longitude": 174.3278,
  "courseOverGround": 180,
  "speedOverGround": 5.0,
  "heading": 175,
  "timestamp": "2026-03-01T12:00:00Z"
}
```

## Security Notes

- Always use HTTPS for the webhook URL
- Rotate the webhook secret periodically
- Consider IP allowlisting if your Starlink has a static IP
- The webhook endpoint validates the Bearer token on every request

---

## Alternative: Direct Streaming API Connection

If your Signal K server is publicly accessible (e.g., through port forwarding or a VPN), you can use the Signal K Streaming API for real-time updates.

### Signal K Streaming API

Connect via WebSocket for real-time position updates:

```javascript
const ws = new WebSocket('wss://your-signalk-server:3000/signalk/v1/stream?subscribe=self');

ws.onmessage = (event) => {
  const delta = JSON.parse(event.data);
  // Handle position updates
  delta.updates?.forEach(update => {
    update.values?.forEach(v => {
      if (v.path === 'navigation.position') {
        console.log('Position:', v.value);
      }
    });
  });
};
```

### Subscription Options

Subscribe to specific paths:
```
wss://server:3000/signalk/v1/stream?subscribe=navigation.position,navigation.speedOverGround
```

Subscribe to all self data:
```
wss://server:3000/signalk/v1/stream?subscribe=self
```

### REST API Endpoints

Get current position:
```bash
curl https://your-server:3000/signalk/v1/api/vessels/self/navigation/position
```

Get full vessel state:
```bash
curl https://your-server:3000/signalk/v1/api/vessels/self
```

### References

- [Signal K Streaming API Documentation](https://demo.signalk.org/documentation/Connection/Streaming.html)
- [Signal K REST API](https://demo.signalk.org/documentation/rest-api/)

---

## Support

For issues with the Matariki III website integration, see the main repository documentation.
