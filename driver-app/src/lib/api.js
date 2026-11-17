import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set EXPO_PUBLIC_API_URL in .env (e.g. https://your-backend.onrender.com/api).
// Defaults: Android emulator reaches the host machine at 10.0.2.2; iOS simulator/web use localhost.
export const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

export const TOKEN_KEY = 'driverToken';
export const APPLICANT_KEY = 'applicantToken';

/** Error with the HTTP status and server message; `offline` when the request never reached the server. */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, offline = false } = {}) {
    super(message);
    this.status = status;
    this.data = data;
    this.offline = offline;
  }
}

export async function request(method, path, { body, token, timeoutMs = 20000 } = {}) {
  const auth = token === undefined ? await AsyncStorage.getItem(TOKEN_KEY) : token;
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } catch {
    throw new ApiError('offline', { offline: true });
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || `HTTP ${res.status}`, { status: res.status, data });
  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body })
};

/** Message to show a person for an error (translated via t). */
export const errorText = (error, t) => (error?.offline ? t('common.errorNetwork') : error?.message || t('common.errorGeneric'));
