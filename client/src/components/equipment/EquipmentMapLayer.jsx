import React, { useEffect, useRef } from 'react';
import {
  CATEGORY_ICONS,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../utils/equipmentConfig';

function buildEquipmentMarkerHtml(equip) {
  const icon = CATEGORY_ICONS[equip.category] || '🔧';
  const color = STATUS_COLORS[equip.status] || STATUS_COLORS.offline;

  return `
    <div style="position:relative;width:36px;height:36px;">
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:${color};
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:16px;line-height:1;
      ">${icon}</div>
      ${equip.status === 'busy' ? `
        <div style="
          position:absolute;inset:-4px;border-radius:50%;
          border:2px solid ${color};opacity:0.4;
          animation:equipPulse 2s ease-out infinite;
        "></div>
      ` : ''}
    </div>
    <style>
      @keyframes equipPulse {
        0% { transform:scale(1); opacity:0.4; }
        100% { transform:scale(1.8); opacity:0; }
      }
    </style>
  `;
}

function buildPopupHtml(equip, distanceKm) {
  const statusLabel = STATUS_LABELS[equip.status] || 'Unknown';
  const statusColor = STATUS_COLORS[equip.status] || '#6b7280';
  const icon = CATEGORY_ICONS[equip.category] || '🔧';
  const distText = distanceKm != null
    ? (distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`)
    : null;

  let bookingHtml = '';
  if (equip.status === 'busy' && equip.currentBooking) {
    const endTime = new Date(equip.currentBooking.endTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    bookingHtml = `
      <div style="margin-top:8px;padding:6px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:11px;color:#dc2626;">
        Booked by: ${equip.currentBooking.bookedBy}<br/>
        Until: ${endTime}<br/>
        Purpose: ${equip.currentBooking.purpose || 'N/A'}
      </div>
    `;
  }

  return `
    <div style="font-family:system-ui,sans-serif;min-width:220px;padding:4px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:24px;">${icon}</span>
        <div>
          <div style="font-weight:700;font-size:14px;color:#111;">${equip.name}</div>
          <div style="font-size:12px;color:#666;">${equip.category}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="
          display:inline-flex;align-items:center;gap:4px;
          padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;
          color:${statusColor};background:${statusColor}15;
        ">
          <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};"></span>
          ${statusLabel}
        </span>
        ${distText ? `<span style="font-size:11px;color:#2563eb;font-weight:500;">📍 ${distText}</span>` : ''}
      </div>
      <div style="font-size:12px;color:#555;line-height:1.6;">
        <div>👤 ${equip.owner}</div>
        <div>📞 <a href="tel:${equip.contact}" style="color:#2563eb;text-decoration:none;">${equip.contact}</a></div>
        <div>💰 ₹${equip.pricePerHour}/hr</div>
      </div>
      ${bookingHtml}
      ${equip.status === 'available' ? `
        <button
          onclick="window.__equipBookFromMap && window.__equipBookFromMap('${equip.id}')"
          style="
            margin-top:8px;width:100%;padding:8px;
            background:#22c55e;color:white;border:none;border-radius:8px;
            font-weight:600;font-size:12px;cursor:pointer;
          "
        >Book Now</button>
      ` : ''}
    </div>
  `;
}

/**
 * Manages equipment markers on a Leaflet map.
 * Call updateMarkers() to add/update/remove markers.
 * Call setVisible() to show/hide the layer.
 * Call destroy() to clean up.
 */
export function createEquipmentLayer() {
  let layerGroup = null;
  let markers = {};
  let isVisible = false;

  function ensureLayerGroup(map) {
    if (!layerGroup && window.L) {
      layerGroup = window.L.layerGroup();
    }
    return layerGroup;
  }

  function setVisible(map, visible) {
    if (!map || !window.L) return;
    const lg = ensureLayerGroup(map);
    if (!lg) return;

    try {
      if (visible && !map.hasLayer(lg)) {
        lg.addTo(map);
        isVisible = true;
      } else if (!visible && map.hasLayer(lg)) {
        map.removeLayer(lg);
        isVisible = false;
      }
    } catch (e) {
      console.warn('EquipmentLayer: visibility toggle error', e);
    }
  }

  function updateMarkers(map, equipment, userLat, userLng) {
    if (!map || !window.L) return;
    const lg = ensureLayerGroup(map);
    if (!lg) return;

    try {
      // Remove stale markers
      const currentIds = new Set(equipment.map(e => e.id));
      Object.keys(markers).forEach(id => {
        if (!currentIds.has(id)) {
          try { lg.removeLayer(markers[id]); } catch (e) { /* ignore */ }
          delete markers[id];
        }
      });

      // Add/update markers
      equipment.forEach(equip => {
        if (!equip.lat || !equip.lng) return;

        let distanceKm = null;
        if (userLat != null && userLng != null) {
          const R = 6371;
          const dLat = ((equip.lat - userLat) * Math.PI) / 180;
          const dLng = ((equip.lng - userLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((userLat * Math.PI) / 180) *
              Math.cos((equip.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          distanceKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
        }

        const icon = window.L.divIcon({
          className: 'equipment-leaflet-icon',
          html: buildEquipmentMarkerHtml(equip),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        let marker = markers[equip.id];
        if (!marker) {
          marker = window.L.marker([equip.lat, equip.lng], { icon }).addTo(lg);
          markers[equip.id] = marker;
        } else {
          marker.setLatLng([equip.lat, equip.lng]);
          marker.setIcon(icon);
        }

        marker.bindPopup(buildPopupHtml(equip, distanceKm), {
          maxWidth: 280,
          offset: [0, -12],
        });
      });
    } catch (err) {
      console.warn('EquipmentLayer: marker update error', err);
    }
  }

  function destroy(map) {
    try {
      if (layerGroup && map) {
        map.removeLayer(layerGroup);
      }
    } catch (e) { /* ignore */ }
    markers = {};
    layerGroup = null;
    isVisible = false;
  }

  return { setVisible, updateMarkers, destroy };
}

/**
 * React component wrapper — uses imperative API internally.
 * Renders nothing to the DOM; all rendering is via Leaflet.
 */
export default function EquipmentMapLayer({
  mapRef,
  equipment,
  visible,
  userLat,
  userLng,
  onBookFromMap,
}) {
  const layerRef = useRef(null);

  // Expose book function globally for popup button
  useEffect(() => {
    window.__equipBookFromMap = (id) => {
      const equip = equipment.find((e) => e.id === id);
      if (equip && onBookFromMap) onBookFromMap(equip);
    };
    return () => { delete window.__equipBookFromMap; };
  }, [equipment, onBookFromMap]);

  // Create/destroy the equipment layer
  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = createEquipmentLayer();
    }
    return () => {
      if (layerRef.current) {
        layerRef.current.destroy(mapRef);
        layerRef.current = null;
      }
    };
  }, []);

  // Update visibility
  useEffect(() => {
    if (!mapRef || !window.L || !layerRef.current) return;
    layerRef.current.setVisible(mapRef, visible);
  }, [mapRef, visible]);

  // Update markers
  useEffect(() => {
    if (!mapRef || !window.L || !layerRef.current || !visible) return;
    layerRef.current.updateMarkers(mapRef, equipment || [], userLat, userLng);
  }, [mapRef, equipment, visible, userLat, userLng]);

  return null;
}
