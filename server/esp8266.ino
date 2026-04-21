/*
 * ESP8266 — GPS forwarder to Railway backend
 * Board: Generic ESP8266 Module / NodeMCU 1.0
 * No extra libraries needed — uses only ESP8266 core built-ins
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>

// ── CONFIG ─────────────────────────────────────────────────
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

float readBatteryPercent() {
  return constrain((analogRead(A0) / 1023.0) * 100.0, 0.0, 100.0);
}

void sendToBackend(float lat, float lng, float battery) {
  if (WiFi.status() != WL_CONNECTED) return;

  BearSSL::WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  // Build JSON manually — no library needed
  String body = "{\"id\":\"" + String(DEVICE_ID) + "\","
                "\"type\":\"" + String(DEVICE_TYPE) + "\","
                "\"lat\":" + String(lat, 6) + ","
                "\"lng\":" + String(lng, 6) + ","
                "\"battery\":" + String(battery, 1) + ","
                "\"source\":\"esp8266\"}";

  int code = http.POST(body);
  Serial.printf("[→Backend] HTTP %d\n", code);
  http.end();
}

void handleGPS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }
  if (!server.hasArg("plain")) { server.send(400, "application/json", "{\"error\":\"no body\"}"); return; }

  String body = server.arg("plain");

  // Simple parse — extract lat and lng from JSON string
  int latIdx = body.indexOf("\"lat\":");
  int lngIdx = body.indexOf("\"lng\":");
  if (latIdx == -1 || lngIdx == -1) {
    server.send(400, "application/json", "{\"error\":\"missing lat/lng\"}");
    return;
  }

  lastLat = body.substring(latIdx + 6).toFloat();
  lastLng = body.substring(lngIdx + 6).toFloat();
  hasGPS  = true;

  Serial.printf("[GPS] %.6f, %.6f\n", lastLat, lastLng);
  sendToBackend(lastLat, lastLng, readBatteryPercent());
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleHealth() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String out = "{\"id\":\"" + String(DEVICE_ID) + "\","
               "\"ip\":\"" + WiFi.localIP().toString() + "\","
               "\"battery\":" + String(readBatteryPercent(), 1) + ","
               "\"hasGPS\":" + String(hasGPS ? "true" : "false") + "}";
  server.send(200, "application/json", out);
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }

  Serial.println("\n✅ WiFi connected!");
  Serial.print("📡 IP: "); Serial.println(WiFi.localIP());
  Serial.print("📱 Tracker ESP URL: http://"); Serial.print(WiFi.localIP()); Serial.println("/gps");

  server.on("/gps",    HTTP_POST,    handleGPS);
  server.on("/gps",    HTTP_OPTIONS, handleGPS);
  server.on("/health", HTTP_GET,     handleHealth);
  server.begin();
  Serial.println("🌐 Server started");
}

void loop() {
  server.handleClient();

  static unsigned long lastHB = 0;
  if (millis() - lastHB > 10000 && hasGPS) {
    sendToBackend(lastLat, lastLng, readBatteryPercent());
    lastHB = millis();
  }
}
