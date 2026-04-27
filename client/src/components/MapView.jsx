import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStatusConfig } from '../utils/statusConfig';
import EquipmentMapLayer from './equipment/EquipmentMapLayer';

function buildMarkerHtml(device, isFocused) {
  const pulse = device.source === 'mobile' || device.source === 'esp8266';
  const size = isFocused ? 28 : 22;
  const color = pulse ? '#2563EB' : '#6b7280';

  if (pulse) {
    return `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.2);animation:ripple 1.8s ease-out infinite;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.1);animation:ripple 1.8s ease-out 0.6s infinite;"></div>
        <div style="position:absolute;inset:${isFocused ? 5 : 4}px;border-radius:50%;background:#2563EB;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>
      </div>
      <style>
        @keyframes ripple{0%{transform:scale(0.8);opacity:0.9}100%{transform:scale(2.5);opacity:0}}
      </style>`;
  }

  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`;
}

export default function MapView({
  devices,
  focusedDevice,
  setFocusedDevice,
  equipment,
  showEquipment,
  userLat,
  userLng,
  onBookFromMap,
  flyToEquipment,
}) {
  const mapRef     = useRef(null);
  const markersRef = useRef({});
  const pathRef    = useRef(null);
  const coordsRef  = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const autoFollowRef = useRef(true);
  const initializedRef = useRef(false);

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapReady) return;
    const container = document.getElementById('leaflet-map');
    if (container._leaflet_id) container._leaflet_id = null;

    const map = window.L.map('leaflet-map', {
      zoomControl: false,
      attributionControl: true,
    }).setView([31.634, 74.872], 12);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('dragstart', () => { autoFollowRef.current = false; });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      pathRef.current = null;
      coordsRef.current = [];
      initializedRef.current = false;
    };
  }, [mapReady]);

  // Fly to equipment when requested
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToEquipment) return;
    mapRef.current.flyTo([flyToEquipment.lat, flyToEquipment.lng], 16, { duration: 1 });
  }, [flyToEquipment, mapReady]);

  // Sync markers on device update
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Remove markers for devices no longer in list
    Object.keys(markersRef.current).forEach(id => {
      if (!devices.find(d => d.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    devices.forEach((device) => {
      if (!device.lat || !device.lng) return;

      const isFocused = focusedDevice === device.id;
      const config = getStatusConfig(device.status);
      const isReal = device.source === 'mobile' || device.source === 'esp8266';

      const icon = window.L.divIcon({
        className: 'custom-leaflet-icon',
        html: buildMarkerHtml(device, isFocused),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      let marker = markersRef.current[device.id];
      if (!marker) {
        marker = window.L.marker([device.lat, device.lng], {
          icon,
          zIndexOffset: isReal ? 1000 : 0,
        }).addTo(map);
        marker.on('click', () => setFocusedDevice(device.id));
        markersRef.current[device.id] = marker;
      } else {
        marker.setLatLng([device.lat, device.lng]);
        marker.setIcon(icon);
      }

      // Popup on focus
      if (isFocused) {
        const srcLabel = device.source === 'mobile' ? '📱 Mobile GPS'
                       : device.source === 'esp8266' ? '🔌 ESP8266'
                       : '🔌 ESP32';
        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px 0;">
            <div style="font-weight:700;font-size:14px;color:#111;">${device.id}</div>
            <div style="font-size:12px;color:#666;margin:2px 0 8px;">${device.type} · ${srcLabel}</div>
            <div style="display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:8px;">
              <span style="font-size:12px;font-weight:600;color:${config.color};">${config.label}</span>
              <span style="font-size:12px;color:#666;">🔋 ${device.battery != null ? device.battery.toFixed(0) + '%' : '—'}</span>
            </div>
            <div style="font-size:11px;color:#999;margin-top:6px;font-family:monospace;">
              ${device.lat.toFixed(6)}, ${device.lng.toFixed(6)}
            </div>
          </div>
        `, { offset: [0, -10] }).openPopup();
      } else {
        marker.closePopup();
        marker.unbindPopup();
      }

      // GPS trail for real device
      if (isReal) {
        const history = coordsRef.current;
        const last = history[history.length - 1];
        const moved = !last || Math.abs(last[0] - device.lat) > 0.000005 || Math.abs(last[1] - device.lng) > 0.000005;

        if (moved) {
          history.push([device.lat, device.lng]);
          if (history.length > 200) history.shift();
        }

        if (pathRef.current) {
          pathRef.current.setLatLngs(history);
        } else if (history.length > 1) {
          pathRef.current = window.L.polyline(history, {
            color: '#2563EB',
            weight: 3,
            opacity: 0.7,
            dashArray: '8, 5',
            lineJoin: 'round',
          }).addTo(map);
        }

        // Fly to first real GPS fix
        if (!initializedRef.current) {
          map.flyTo([device.lat, device.lng], 17, { duration: 1.5 });
          initializedRef.current = true;
          autoFollowRef.current = true;
        }

        // Auto-follow
        if (autoFollowRef.current && !focusedDevice) {
          map.panTo([device.lat, device.lng], { animate: true, duration: 0.5 });
        }
      }
    });

    // Fly to focused device
    if (focusedDevice) {
      const d = devices.find(x => x.id === focusedDevice);
      if (d?.lat && d?.lng) {
        map.flyTo([d.lat, d.lng], 18, { duration: 1, easeLinearity: 0.25 });
      }
    }
  }, [devices, mapReady, focusedDevice]);

  const realDevice = devices.find(d => d.source === 'mobile' || d.source === 'esp8266');

  return (
    <section className="flex-1 relative">
      <div id="leaflet-map" className="w-full h-full" />

      {/* Equipment Map Layer */}
      {mapReady && mapRef.current && (
        <EquipmentMapLayer
          mapRef={mapRef.current}
          equipment={equipment || []}
          visible={showEquipment}
          userLat={userLat}
          userLng={userLng}
          onBookFromMap={onBookFromMap}
        />
      )}

      {/* Re-center */}
      {realDevice && (
        <button
          onClick={() => { autoFollowRef.current = true; }}
          className="absolute top-4 right-4 z-[1000] bg-white border border-gray-200 shadow-md rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
        >
          📍 Follow
        </button>
      )}

      {/* No devices placeholder */}
      {devices.length === 0 && !showEquipment && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg px-6 py-5 text-center max-w-xs">
            <div className="text-3xl mb-2">📡</div>
            <p className="text-sm font-semibold text-gray-800">Waiting for devices</p>
            <p className="text-xs text-gray-500 mt-1">Open tracker.html on your phone to start tracking</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-10 left-4 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-md px-3 py-2.5 flex flex-col gap-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-200" />
          <span>Live GPS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed border-blue-500" />
          <span>Trail</span>
        </div>
        {showEquipment && (
          <>
            <div className="w-full border-t border-gray-200 my-0.5" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Busy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Maintenance</span>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {focusedDevice && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setFocusedDevice(null)}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-white border border-gray-200 shadow-lg rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            ✕ Clear Selection
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
