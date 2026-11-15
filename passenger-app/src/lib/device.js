// Anonymous device id: lets a passenger send an SOS (and update it) without signing in.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

let cached = null;

export async function getDeviceId() {
  if (cached) return cached;
  cached = await AsyncStorage.getItem('deviceId');
  if (!cached) {
    cached = Crypto.randomUUID();
    await AsyncStorage.setItem('deviceId', cached);
  }
  return cached;
}
