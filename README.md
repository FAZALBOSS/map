# 📡 Live GPS Tracker

A real-time GPS tracking dashboard. Track your phone's location live on a map — no fake data, no clutter. Just your real position.

**Live demo:**
- Dashboard → [map-rouge-one.vercel.app](https://map-rouge-one.vercel.app)
- Tracker → [map-rouge-one.vercel.app/tracker.html](https://map-rouge-one.vercel.app/tracker.html)
- Backend → [map-xmu3.onrender.com](https://map-xmu3.onrender.com)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Map | Leaflet.js (OpenStreetMap tiles) |
| Realtime | Socket.io (WebSocket) |
| Backend | Node.js, Express |
| Hosting | Vercel (client) + Render (server) |

---

## Project Structure

```
├── client/                  # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx       # Leaflet map with live tracking
│   │   │   ├── Sidebar.jsx       # Device list panel
│   │   │   ├── DeviceCard.jsx    # Individual device card
│   │   │   ├── AlertsPanel.jsx   # Low battery / idle alerts
│   │   │   └── Navbar.jsx        # Top bar
│   │   ├── hooks/
│   │   │   └── useDevices.js     # Socket.io + REST data hook
│   │   └── utils/
│   │       └── statusConfig.js   # Status → color/label mapping
│   └── public/
│       └── tracker.html          # Mobile GPS sender page
│
├── server/                  # Node.js backend
│   ├── controllers/
│   │   ├── deviceController.js   # GET /devices
│   │   └── trackingController.js # POST /location, POST /status
│   ├── data/
│   │   └── devices.js            # In-memory device store
│   ├── routes/
│   │   ├── deviceRoutes.js
│   │   └── trackingRoutes.js
│   ├── services/
│   │   └── simulationService.js  # Status updater (idle detection)
│   └── index.js                  # Express + Socket.io server
│
├── server/esp8266.ino       # ESP8266 firmware (optional hardware)
└── server/esp32_full.ino    # ESP32 firmware (optional hardware)
```

---

## How It Works

```
Phone (tracker.html)
    │
    │  POST /location  {id, lat, lng, accuracy, speed}
    ▼
Backend (Render)
    │
    │  Socket.io emit  devices:update
    ▼
Dashboard (Vercel)
    │
    └─ Leaflet map updates marker + trail in real time
```

---

## Running Locally

### 1. Clone

```bash
git clone https://github.com/Adi6tnine/map.git
cd map
```

### 2. Start the server

```bash
cd server
npm install
npm run dev
# Runs on http://localhost:4000
```

### 3. Start the client

```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

### 4. Open tracker on your phone

Open `http://<your-pc-ip>:5173/tracker.html` on your phone (must be on same WiFi).

Set Server URL to `http://<your-pc-ip>:4000` and tap **Start Tracking**.

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=4000
CLIENT_ORIGIN=*
SIMULATION_INTERVAL_MS=2500
```

### Client (`client/.env`)

```env
VITE_SERVER_URL=http://localhost:4000
```

For production, `client/.env.production`:

```env
VITE_SERVER_URL=https://map-xmu3.onrender.com
```

---

## API Endpoints

### `POST /location`
Send GPS coordinates from phone or ESP device.

```json
{
  "id": "TRANSPORT-001",
  "type": "Transport",
  "lat": 28.6139,
  "lng": 77.2090,
  "accuracy": 5,
  "speed": 12.5,
  "source": "mobile"
}
```

### `POST /status`
Send device status (battery, etc.).

```json
{
  "id": "TRANSPORT-001",
  "battery": 85,
  "source": "esp8266"
}
```

### `GET /devices`
Returns all currently tracked devices.

### `GET /health`
Returns `{ "status": "ok", "time": "..." }`

---

## Mobile Tracker (`tracker.html`)

Open `https://map-rouge-one.vercel.app/tracker.html` on any phone browser.

- Set **Device ID** — any name you want (e.g. `MY-PHONE`)
- Set **Server URL** — `https://map-xmu3.onrender.com`
- Tap **Start Tracking** and allow location permission
- Your position appears live on the dashboard

Works on Android Chrome and iOS Safari. Add to home screen for a native-like experience.

---

## ESP8266 Hardware (Optional)

Flash `server/esp8266.ino` to an ESP8266 module.

**What it does:**
1. Connects to WiFi
2. Runs a tiny HTTP server on port 80
3. Phone browser POSTs GPS to ESP8266 at `POST /gps`
4. ESP8266 forwards GPS + battery reading to the backend

**Required libraries:** None — uses only ESP8266 core built-ins.

**Config in the sketch:**
```cpp
const char* WIFI_SSID     = "YourWiFi";
const char* WIFI_PASSWORD = "YourPassword";
const char* BACKEND_URL   = "https://map-xmu3.onrender.com/location";
const char* DEVICE_ID     = "TRANSPORT-001";
```

**Board setup:**
- Board: `Generic ESP8266 Module` or `NodeMCU 1.0`
- Board URL: `https://arduino.esp8266.com/stable/package_esp8266com_index.json`

---

## Deployment

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect `Adi6tnine/map` repo
3. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
4. Deploy → copy the URL

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect `Adi6tnine/map` repo
3. Set:
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable: `VITE_SERVER_URL` = your Render URL
5. Deploy

---

## Map Features

- **Auto-follow** — map pans smoothly as your device moves
- **GPS trail** — dashed blue line shows your path (last 200 points)
- **Fly-to** — click a device card to zoom in on it
- **Follow button** — re-enables auto-follow after manual pan
- **Waiting overlay** — shown when no devices are connected

---

## License

MIT
