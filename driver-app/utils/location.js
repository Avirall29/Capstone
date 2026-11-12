import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { locationAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        const tripId = await AsyncStorage.getItem('activeTripId');
        if (tripId) {
          await locationAPI.send(
            {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            },
            tripId,
            location.coords.speed || 0,
            location.coords.heading || 0
          );
          console.log('Location sent:', location.coords);
        }
      } catch (error) {
        const msg = error?.message || '';
        if (!msg.includes('timeout') && !msg.includes('Network')) {
          console.warn('Background location send skipped:', msg);
        }
      }
    }
  }
});

export const requestLocationPermissions = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    return false;
  }

  return true;
};

export const startLocationTracking = async () => {
  // Background GPS is unreliable on Android emulator; foreground interval handles updates.
  if (!Constants.isDevice) {
    return;
  }

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) {
    throw new Error('Location permission not granted');
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000, // 5 seconds
    distanceInterval: 10, // 10 meters
    foregroundService: {
      notificationTitle: 'Bus Tracking Active',
      notificationBody: 'Your location is being tracked',
    },
  });
};

/** True when the background task is already sending updates (real devices with permission). */
export const isBackgroundTracking = () =>
  Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);

export const stopLocationTracking = async () => {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    // Silently ignore "task not found" errors - this is expected if tracking wasn't started
    const errorMessage = error.message || error.toString() || '';
    if (!errorMessage.includes('not found')) {
      console.error('Error stopping location tracking:', error);
    }
  }
};

async function ensureForegroundPermission() {
  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Location.requestForegroundPermissionsAsync());
  }
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }
}

/** Fast read for map UI — tries last known position first (works better on emulator). */
export const getCurrentLocation = async () => {
  await ensureForegroundPermission();

  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
  if (lastKnown?.coords) {
    return {
      lat: lastKnown.coords.latitude,
      lng: lastKnown.coords.longitude,
    };
  }

  const location = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Location timeout')), 20000);
    }),
  ]);

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
};

const toUpdate = ({ coords }) => ({
  lat: coords.latitude,
  lng: coords.longitude,
  speed: coords.speed || 0,
  heading: coords.heading || 0,
});

/**
 * Used while trip is active — never throws; uses a recent cached fix, then GPS.
 * Returns null when no fix is available: never send a made-up position to the server.
 */
export const getLocationForUpdate = async () => {
  try {
    await ensureForegroundPermission();

    // Short maxAge: this position is broadcast as the bus's live location.
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 30000 });
    if (lastKnown?.coords) {
      return toUpdate(lastKnown);
    }

    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Location timeout')), 8000);
      }),
    ]);

    return toUpdate(location);
  } catch {
    return null;
  }
};

