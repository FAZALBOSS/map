import { useState, useEffect, useRef } from 'react';

export function useUserLocation() {
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setAccuracy(position.coords.accuracy);
        setError(null);
        setPermissionDenied(false);
      },
      (err) => {
        if (err.code === 1) {
          setPermissionDenied(true);
          setError('Location permission denied');
        } else if (err.code === 2) {
          setError('Location unavailable');
        } else if (err.code === 3) {
          setError('Location request timed out');
        } else {
          setError(err.message);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { userLat, userLng, accuracy, error, permissionDenied };
}
