/*
 * ============================================================
 *  ESP8266 — GPS Bridge + Status Reporter
 *
 *  Libraries needed (install via Arduino Library Manager):
 *  - ArduinoJson  by Benoit Blanchon
 *  - ESP8266WiFi  (built-in with ESP8266 board package)
 *  - ESP8266WebServer (built-in)
 *  - ESP8266HTTPClient (built-in)
 *
 *  Board: "Generic ESP8266 Module" or "NodeMCU 1.0"
 *  Board URL: https://arduino.esp8266.com/stable/package_esp8266com_index.json
 * ============================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ── CONFIG — change these ──────────────────────────────────
const char* WIFI_SSID     = "Redmi K50i";
const char* WIFI_PASSWORD = "12345678";
const char* BACKEND_URL   = "https://map-production-5cdd.up.railway.app/location";

const char* DEVICE_ID     = "TRANSPORT-001";
const char* DEVICE_TYPE   = "Transport";
// ──────────────────────────────────────────────────────────

ESP8266WebServer server(80);

float lastLat = 0.0;
float lastLng = 0.0;
bool  hasGPS  = false;

// ESP8266 has one ADC pin (A0), 0–1023, 0–1V (or 0–3.3V on some boards)
float readBatteryPercent() {
  int raw = analogRead(A0);
  float percent = (raw / 1023.0) * 100.0;
  return constrain(percent, 0.0, 100.0);
}

void sendToBackend(float lat, float lng, float battery) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // skip SSL cert verification

  HTTPClient http;
  http.begin(client, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["id"]      = DEVICE_ID;
  doc["type"]    = DEVICE_TYPE;
  doc["lat"]     = lat;
  doc["lng"]     = lng;
  doc["battery"] = battery;
  doc["source"]  = "esp8266";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("[ESP8266→Backend] HTTP %d\n", code);
  http.end();
}

void handleGPS() {
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

  Serial.printf("[GPS] lat=%.6f lng=%.6f\n", lastLat, lastLng);

  float battery = readBatteryPercent();
  sendToBackend(lastLat, lastLng, battery);

  server.send(200, "application/json", "{\"ok\":true}");
}

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

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("✅ WiFi connected!");
  Serial.print("📡 ESP8266 IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("📱 Set ESP URL in tracker.html to: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/gps");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  server.on("/gps",    HTTP_POST,    handleGPS);
  server.on("/gps",    HTTP_OPTIONS, handleGPS);
  server.on("/health", HTTP_GET,     handleHealth);
  server.begin();

  Serial.println("🌐 HTTP server started on port 80");
}

void loop() {
  server.handleClient();

  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 10000 && hasGPS) {
    sendToBackend(lastLat, lastLng, readBatteryPercent());
    lastHeartbeat = millis();
  }
}
