require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const deviceRoutes = require('./routes/deviceRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const { startSimulation } = require('./services/simulationService');
const { autoStatusUpdater } = require('./services/equipmentService');
const { equipment } = require('./data/equipment');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const SIMULATION_INTERVAL_MS = parseInt(process.env.SIMULATION_INTERVAL_MS, 10) || 2500;

const app = express();
const httpServer = http.createServer(app);

const ALLOWED_ORIGINS = CLIENT_ORIGIN === '*'
  ? true  // allow all
  : CLIENT_ORIGIN.split(',').map(o => o.trim());

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// Allow configured origins (mobile on same WiFi needs this)
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Attach io to every request so controllers can emit
app.use((req, _, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/devices', deviceRoutes);
app.use('/', trackingRoutes);   // POST /location  and  POST /status
app.use('/equipment', equipmentRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// WebSocket
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send initial equipment data to newly connected client
  socket.emit('equipment:all', equipment);

  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// Simulation tick — only moves simulated devices, not mobile/esp32 ones
startSimulation(SIMULATION_INTERVAL_MS, (updatedDevices) => {
  io.emit('devices:update', updatedDevices);
});

// Equipment auto-status updater — checks booking times every 60s
autoStatusUpdater(io);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Mobile GPS endpoint : POST http://localhost:${PORT}/location`);
  console.log(`🔌 ESP32 status endpoint: POST http://localhost:${PORT}/status`);
  console.log(`📊 Devices API         : GET  http://localhost:${PORT}/devices`);
  console.log(`🚜 Equipment API       : GET  http://localhost:${PORT}/equipment`);
  console.log(`📍 Nearby Equipment    : GET  http://localhost:${PORT}/equipment/nearby?lat=31.634&lng=74.872&radius=10\n`);
});
