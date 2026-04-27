import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export function useEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/equipment`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setEquipment(data.equipment || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/equipment/stats`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      // Stats fetch failure is non-critical
      console.warn('Failed to fetch equipment stats:', err.message);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchEquipment();
    fetchStats();
  }, [fetchEquipment, fetchStats]);

  useEffect(() => {
    let cancelled = false;

    // Initial fetch
    fetchEquipment();
    fetchStats();

    // Socket.io for real-time updates
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('equipment:all', (allEquipment) => {
      if (!cancelled) {
        setEquipment(allEquipment);
        setLoading(false);
      }
    });

    socket.on('equipment:update', (updatedEquipment) => {
      if (!cancelled) {
        setEquipment((prev) => {
          const idx = prev.findIndex((e) => e.id === updatedEquipment.id);
          if (idx === -1) return [...prev, updatedEquipment];
          const next = [...prev];
          next[idx] = updatedEquipment;
          return next;
        });
        // Refresh stats after any update
        fetchStats();
      }
    });

    socket.on('equipment:booked', (equip) => {
      if (!cancelled) {
        setEquipment((prev) => {
          const idx = prev.findIndex((e) => e.id === equip.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = equip;
          return next;
        });
        fetchStats();
      }
    });

    socket.on('equipment:available', (equip) => {
      if (!cancelled) {
        setEquipment((prev) => {
          const idx = prev.findIndex((e) => e.id === equip.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = equip;
          return next;
        });
        fetchStats();
      }
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [fetchEquipment, fetchStats]);

  return { equipment, stats, loading, error, refetch, serverUrl: SERVER_URL };
}
