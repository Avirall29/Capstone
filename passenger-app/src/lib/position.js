import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/** The passenger's position while the app is open (asks permission once). */
export function usePosition() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('pending'); // pending | granted | denied
  useEffect(() => {
    let sub;
    let cancelled = false;
    (async () => {
      const { status: s } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (cancelled) return;
      setStatus(s === 'granted' ? 'granted' : 'denied');
      if (s !== 'granted') return;
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last && !cancelled) setPosition({ lat: last.coords.latitude, lng: last.coords.longitude });
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 5000 },
        (loc) => setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude }), () => {}).catch(() => null);
      if (cancelled) sub?.remove();
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, []);
  return { position, status };
}
