# 🚜 Smart Farm Tracking & Equipment Availability System

An IoT-powered **GPS Tracking + Farm Equipment Availability** platform built for agricultural operations. This system provides **real-time location tracking** for farm vehicles via mobile browsers and a complete **equipment rental/booking system** that helps farmers find, view, and book nearby agricultural machinery.

The platform uses **WebSocket-based real-time updates**, a **responsive React dashboard** with Leaflet maps, and a **mobile-optimized GPS tracker** — all running entirely on phones and browsers with no specialized hardware required.

---

## 🌐 Live Demo

| Component | URL |
|-----------|-----|
| **Dashboard** | [https://map-rouge-one.vercel.app/](https://map-rouge-one.vercel.app/) |
| **Mobile Tracker** | [https://map-rouge-one.vercel.app/tracker.html](https://map-rouge-one.vercel.app/tracker.html) |
| **Backend API** | [https://map-xmu3.onrender.com](https://map-xmu3.onrender.com) |

---

## ✨ Key Features

| 📡 Live GPS Tracking | 🚜 Farm Equipment System |
|----------------------|--------------------------|
| Real-time GPS from phone browser | 12+ equipment items across Punjab region |
| Live map with animated markers | Category-based filtering & search |
| GPS trail visualization | Distance-based equipment discovery |
| Auto-follow moving devices | Real-time booking with conflict detection |
| Battery & speed monitoring | Haversine distance calculation |
| Multi-device support | Auto-status updates (busy/available) |
| WebSocket real-time sync | Equipment detail drawer with mini-map |
| Dark-themed mobile tracker | Availability timeline visualization |
| Works on any smartphone | Equipment markers on shared map |
| No hardware required | Mobile-friendly Equipment Finder |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Map** | Leaflet.js (OpenStreetMap tiles) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Real-time** | Socket.io (WebSocket) |
| **Backend** | Node.js, Express |
| **Client Hosting** | Vercel |
| **Server Hosting** | Render |

---

## 📁 Project Structure

```
├── client/
│   ├── src/
│   │   ├── App.jsx                          # Main app with tab routing
│   │   ├── main.jsx                         # React entry point
│   │   ├── index.css                        # Tailwind imports
│   │   ├── components/
│   │   │   ├── MapView.jsx                  # Leaflet map with device + equipment layers
│   │   │   ├── Sidebar.jsx                  # Device tracking sidebar
│   │   │   ├── DeviceCard.jsx               # Individual device card
│   │   │   ├── AlertsPanel.jsx              # System alerts
│   │   │   ├── Navbar.jsx                   # Top nav with tab switcher
│   │   │   └── equipment/
│   │   │       ├── EquipmentPanel.jsx       # Equipment sidebar with filters
│   │   │       ├── EquipmentCard.jsx        # Equipment card with status/distance
│   │   │       ├── EquipmentMapLayer.jsx    # Leaflet markers for equipment
│   │   │       ├── EquipmentStats.jsx       # Stats cards + donut chart
│   │   │       ├── BookingModal.jsx         # Booking form with validation
│   │   │       └── EquipmentDetailDrawer.jsx # Full equipment detail view
│   │   ├── hooks/
│   │   │   ├── useDevices.js                # Device tracking hook (Socket.io)
│   │   │   ├── useEquipment.js              # Equipment data hook (Socket.io)
│   │   │   └── useUserLocation.js           # Browser geolocation hook
│   │   └── utils/
│   │       ├── statusConfig.js              # Device status config
│   │       ├── equipmentConfig.js           # Equipment categories, colors, labels
│   │       └── injectStyles.js              # Dynamic style injection
│   └── public/
│       └── tracker.html                     # Mobile GPS sender + Equipment Finder
│
├── server/
│   ├── index.js                             # Express + Socket.io entry point
│   ├── controllers/
│   │   ├── deviceController.js              # Device CRUD handlers
│   │   ├── trackingController.js            # GPS location receiver
│   │   └── equipmentController.js           # Equipment API handlers
│   ├── data/
│   │   ├── devices.js                       # In-memory device store
│   │   └── equipment.js                     # Pre-seeded equipment (12 items)
│   ├── routes/
│   │   ├── deviceRoutes.js                  # /devices routes
│   │   ├── trackingRoutes.js                # /location, /status routes
│   │   └── equipmentRoutes.js               # /equipment routes
│   └── services/
│       ├── simulationService.js             # Device status simulation
│       └── equipmentService.js              # Haversine, booking logic, auto-updater
│
└── README.md
```

---

## 🔄 How It Works

### GPS Tracking Flow

```
📱 Phone Browser                    🖥️ Server                    🗺️ Dashboard
     │                                  │                              │
     │  navigator.geolocation           │                              │
     │  watchPosition()                 │                              │
     │                                  │                              │
     ├──── POST /location ─────────────►│                              │
     │     { id, lat, lng,              │                              │
     │       speed, battery }           │  upsertDevice()              │
     │                                  │  io.emit('devices:update')   │
     │                                  ├─────── WebSocket ───────────►│
     │                                  │                              │  Update marker
     │                                  │                              │  on Leaflet map
     │◄──── { ok: true } ──────────────┤                              │
```

### Equipment Availability Flow

```
👨‍🌾 Farmer                         🖥️ Server                    🗺️ Dashboard
     │                                  │                              │
     ├──── GET /equipment/nearby ──────►│                              │
     │     ?lat=X&lng=Y&radius=10       │  haversineKm()               │
     │                                  │  sort by distance            │
     │◄──── { equipment: [...] } ──────┤                              │
     │                                  │                              │
     ├──── POST /equipment/:id/book ───►│                              │
     │     { bookedBy, startTime,       │  validate overlaps           │
     │       endTime, purpose }         │  update status               │
     │                                  │  io.emit('equipment:booked') │
     │                                  ├─────── WebSocket ───────────►│
     │◄──── { success: true } ─────────┤                              │  Update card/marker
     │                                  │                              │
     │                           ⏰ Every 60s:                         │
     │                           autoStatusUpdater()                   │
     │                           checks booking times                  │
     │                           updates busy ↔ available              │
```

---

## 🚜 Equipment System

The equipment module provides a complete marketplace for agricultural machinery:

- **12 pre-seeded items** spread across the Punjab/Amritsar region (lat ~31.6, lng ~74.8)
- **10 equipment categories**: Tractor, Harvester, Plough, Seeder, Sprayer, Thresher, Rotavator, Water Pump, Generator, Other
- **4 status types**: Available (green), Busy (red), Maintenance (yellow), Offline (gray)
- **Real-time booking** with time overlap validation and automatic status transitions
- **Haversine distance** calculation to find nearest equipment from user's GPS position
- **Auto-status updater** runs every 60 seconds to transition equipment between busy/available based on booking times

---

## 🚀 Running Locally

### Prerequisites

- Node.js 18+ and npm

### 1. Clone the repository

```bash
git clone https://github.com/Adi6tnine/map.git
cd map
```

### 2. Start the backend server

```bash
cd server
npm install
npm run dev    # starts on http://localhost:4000
```

### 3. Start the frontend

```bash
cd client
npm install
npm run dev    # starts on http://localhost:5173
```

### 4. Open the dashboard

- **Dashboard**: http://localhost:5173
- **Mobile Tracker**: http://localhost:5173/tracker.html
- **API Health**: http://localhost:4000/health
- **Equipment API**: http://localhost:4000/equipment
- **Nearby Equipment**: http://localhost:4000/equipment/nearby?lat=31.634&lng=74.872&radius=10

---

## 🔐 Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origins (comma-separated) |
| `SIMULATION_INTERVAL_MS` | `2500` | Device status check interval |

### Client (`client/.env.production`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | `http://localhost:4000` | Backend API URL |

---

## 📡 Full API Reference

### Existing Device Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/location` | Receive GPS data from phone |
| `POST` | `/status` | Receive battery/status from device |
| `GET` | `/devices` | Return all tracked devices |
| `GET` | `/devices/:id` | Return single device by ID |
| `POST` | `/devices/update` | Update a device (partial) |
| `GET` | `/health` | Health check |

### Equipment Endpoints

#### `GET /equipment`

Returns all equipment. Supports optional query filters.

```
GET /equipment?category=Tractor&status=available
```

**Response:**
```json
{
  "equipment": [...],
  "total": 12,
  "available": 7,
  "busy": 3
}
```

#### `GET /equipment/:id`

Returns a single equipment item.

```
GET /equipment/EQUIP-001
```

#### `GET /equipment/nearby`

Returns equipment sorted by distance from user location.

```
GET /equipment/nearby?lat=31.634&lng=74.872&radius=10
```

**Response:**
```json
{
  "equipment": [
    {
      "id": "EQUIP-005",
      "name": "MB Plough (3-Furrow)",
      "distanceKm": 0.45,
      ...
    }
  ],
  "userLocation": { "lat": 31.634, "lng": 74.872 },
  "radiusKm": 10,
  "count": 8
}
```

#### `GET /equipment/stats`

Returns dashboard statistics.

```json
{
  "total": 12,
  "available": 7,
  "busy": 3,
  "maintenance": 1,
  "offline": 1,
  "byCategory": { "Tractor": 2, "Harvester": 2, ... },
  "utilization": "25%"
}
```

#### `POST /equipment/:id/book`

Create a new booking with time overlap validation.

```json
POST /equipment/EQUIP-001/book
{
  "bookedBy": "Farmer Name",
  "phone": "+91-98765-43210",
  "startTime": "2025-04-27T08:00:00Z",
  "endTime": "2025-04-27T14:00:00Z",
  "purpose": "Field ploughing"
}
```

**Response:**
```json
{
  "success": true,
  "booking": { "id": "BOOK-xxx", ... },
  "equipment": { ... }
}
```

#### `DELETE /equipment/:id/book/:bookingId`

Cancel a booking and re-evaluate equipment status.

#### `POST /equipment/:id/location`

Update equipment GPS location (from phone tracking it).

```json
{ "lat": 31.634, "lng": 74.872, "accuracy": 5 }
```

#### `PUT /equipment/:id/status`

Manually update equipment status (admin).

```json
{ "status": "maintenance" }
```

---

## 🏷️ Equipment Categories

| Icon | Category | Typical Price Range (₹/hr) |
|------|----------|---------------------------|
| 🚜 | Tractor | ₹400 – ₹500 |
| 🌾 | Harvester | ₹1,000 – ₹1,200 |
| ⚒️ | Plough | ₹200 – ₹300 |
| 🌱 | Seeder | ₹400 – ₹500 |
| 💧 | Sprayer | ₹250 – ₹350 |
| 🏭 | Thresher | ₹500 – ₹700 |
| 🔄 | Rotavator | ₹300 – ₹400 |
| 💦 | Water Pump | ₹150 – ₹250 |
| ⚡ | Generator | ₹300 – ₹400 |
| 🔧 | Other | ₹500 – ₹1,000 |

---

## 📱 Mobile Usage

### GPS Tracker (`/tracker.html`)

1. Open tracker.html on your phone browser
2. Enter your Device ID and Server URL
3. Tap **"Start Tracking"** — your GPS streams to the dashboard in real-time
4. View your position on the dashboard map with live trail

### Equipment Finder (bottom of tracker.html)

1. Scroll to the **"Equipment Finder"** section
2. Tap **"Find Equipment Near Me"**
3. Browse nearby equipment cards with distance, price, and status
4. Tap **"Call Owner"** to dial directly or **"Open in Maps"** for directions

---

## 🌍 Deployment

### Backend (Render)

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`
5. Add environment variable: `CLIENT_ORIGIN=https://your-vercel-url.vercel.app`

### Frontend (Vercel)

1. Import project on [Vercel](https://vercel.com)
2. Set root directory to `client`
3. Set environment variable: `VITE_SERVER_URL=https://your-render-url.onrender.com`
4. Deploy

---

## 📸 Screenshots

> Screenshots will be added after deployment verification.

---

## 🗺️ Future Roadmap

- [ ] **Payment Integration** — UPI/Razorpay for booking payments
- [ ] **Reviews & Ratings** — Farmers can rate equipment after use
- [ ] **Push Notifications** — Alerts for booking confirmations and reminders
- [ ] **Equipment Owner Dashboard** — Owners manage their equipment fleet
- [ ] **Booking History** — Past bookings with usage analytics
- [ ] **Multi-language Support** — Hindi, Punjabi, and regional languages
- [ ] **Weather Integration** — Show weather for farming activity planning
- [ ] **AI Recommendations** — Suggest best equipment based on crop/field size

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**Built with ❤️ for Indian Farmers** 🇮🇳
