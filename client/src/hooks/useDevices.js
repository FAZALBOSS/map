import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1. Fetch initial snapshot via REST
    fetch(`${SERVER_URL}/devices`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setDevices(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    // 2. Socket.io — websocket only (Render free tier doesn't support sticky sessions for polling)
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      if (!cancelled) setConnected(true);
    });

    socket.on('disconnect', () => {
      if (!cancelled) setConnected(false);
    });

    socket.on('devices:update', (updatedDevices) => {
      if (!cancelled) {
        setDevices(updatedDevices);
        setLoading(false); // covers case where WS arrives before fetch
      }
    });

    socket.on('connect_error', () => {
      // silently retry — reconnection handles it
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return { devices, loading, error, connected };
}
