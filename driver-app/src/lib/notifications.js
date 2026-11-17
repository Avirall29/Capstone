import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

let ready = null;

/** Android channel + permission. Safe to call repeatedly. */
export function setupNotifications() {
  ready ||= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Trip alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#D0202F'
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  })().catch(() => {});
  return ready;
}

/** Immediate local notification (works without push setup and in Expo Go). */
export async function notify(title, body, data = {}) {
  await setupNotifications();
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true, ...(Platform.OS === 'android' && { channelId: 'alerts' }) },
    trigger: null
  }).catch(() => null);
}

/** Expo push token for server-sent notifications (needs a development build + EAS project). */
export async function getPushToken() {
  try {
    await setupNotifications();
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId || Platform.OS === 'web') return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}
