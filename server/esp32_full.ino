/*
 * ============================================================
 *  ESP32 — GPS Bridge + Status Reporter
 *  
 *  What this does:
 *  1. Connects to your WiFi
 *  2. Runs a tiny HTTP server on port 80
 *  3. Mobile browser POSTs GPS coords to ESP32 at POST /gps
 *  4. ESP32 combines GPS + its own battery reading
 *  5. ESP32 forwards everything to your Node backend
 *
 *  Wiring:
 *  - Battery voltage divider → GPIO 34 (ADC)
 *    (Use 100k + 100k resistor divider from battery+ to GND,
 *     middle point to GPIO34. Max 3.3V on pin!)
 *
 *  Libraries needed (install via Arduino Library Manager):
 *  - ArduinoJson  by Benoit Blanchon
 *  - HTTPClient   (built-in with ESP32 board package)
 *  - WebServer    (built-in with ESP32 board package)
 * ============================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── CONFIG — change these ──────────────────────────────────
const char* WIFI_SSID      = "Redmi K50i";
const char* WIFI_PASSWORD  = "12345678";
const char* BACKEND_URL    = "https://map-xmu3.onrender.com/location";

const char* DEVICE_ID      = "TRANSPORT-001";
const char* DEVICE_TYPE    = "Transport";

const int   BATTERY_PIN    = 34;   // ADC pin for battery voltage divider
const float BATTERY_MAX_V  = 4.2;  // LiPo full charge voltage
const float VOLTAGE_DIVIDER_RATIO = 2.0; // if using 100k+100k divider
// ──────────────────────────────────────────────────────────

WebServer server(80);

// Last known GPS from mobile
float lastLat = 0.0;
float lastLng = 0.0;
bool  hasGPS  = false;

// ── Read battery % from ADC ────────────────────────────────
float readBatteryPercent() {
  int raw = analogRead(BATTERY_PIN);
  float voltage = (raw / 4095.0) * 3.3 * VOLTAGE_DIVIDER_RATIO;
  float percent = ((voltage - 3.0) / (BATTERY_MAX_V - 3.0)) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

// ── Forward data to Node backend ──────────────────────────
void sendToBackend(float lat, float lng, float battery) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["id"]      = DEVICE_ID;
  doc["type"]    = DEVICE_TYPE;
  doc["lat"]     = lat;
  doc["lng"]     = lng;
  doc["battery"] = battery;
  doc["source"]  = "esp32";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("[ESP32→Backend] %s  HTTP %d\n", body.c_str(), code);
  http.end();
}

// ── ESP32 HTTP server: receive GPS from mobile ─────────────
void handleGPS() {
  // Add CORS headers so mobile browser can POST
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  if (server.method() == HTTP_OPTIONS) {
    server.send(204);
    return;
  }

  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"no body\"}");
    return;
  }

  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"bad json\"}");
    return;
  }

  lastLat = doc["lat"] | 0.0f;
  lastLng = doc["lng"] | 0.0f;
  hasGPS  = true;

  Serial.printf("[GPS received] lat=%.6f lng=%.6f\n", lastLat, lastLng);

  // Immediately forward to backend with battery reading
  float battery = readBatteryPercent();
  sendToBackend(lastLat, lastLng, battery);

  server.send(200, "application/json", "{\"ok\":true}");
}

// ── Health check endpoint ──────────────────────────────────
void handleHealth() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  StaticJsonDocument<128> doc;
  doc["id"]      = DEVICE_ID;
  doc["ip"]      = WiFi.localIP().toString();
  doc["battery"] = readBatteryPercent();
  doc["hasGPS"]  = hasGPS;
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

// ── Setup ──────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("✅ WiFi connected!");
  Serial.print("📡 ESP32 IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("📱 Open tracker on mobile and set ESP32 URL to:");
  Serial.print("   http://");
  Serial.print(WiFi.localIP());
  Serial.println("/gps");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Register routes
  server.on("/gps",    HTTP_POST,    handleGPS);
  server.on("/gps",    HTTP_OPTIONS, handleGPS);  // CORS preflight
  server.on("/health", HTTP_GET,     handleHealth);
  server.begin();

  Serial.println("🌐 ESP32 HTTP server started on port 80");
}

// ── Loop ───────────────────────────────────────────────────
void loop() {
  server.handleClient();  // Handle incoming HTTP from mobile

  // Every 10s, send a heartbeat even without new GPS
  // (keeps device visible on dashboard)
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 10000 && hasGPS) {
    float battery = readBatteryPercent();
    sendToBackend(lastLat, lastLng, battery);
    lastHeartbeat = millis();
  }
}
