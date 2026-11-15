// Expo push notifications via the public HTTPS API (free; no SDK needed).
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const isExpoPushToken = (token) => typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token);

export async function sendPush(tokens, { title, body, data = {} }) {
  const valid = [...new Set(tokens || [])].filter(isExpoPushToken);
  if (!valid.length || process.env.DISABLE_PUSH === 'true') return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(valid.map((to) => ({ to, title, body, data, sound: 'default', priority: 'high' }))),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    console.warn('Push notification failed:', error.message);
  }
}
