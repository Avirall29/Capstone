// Passenger app (Android, iOS and web). Values from the previous user-mobile-app are kept
// (package name, EAS project, OTA update URL) so existing builds keep updating.
// Google Sign-In: set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and for iOS EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME) in .env.
const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

module.exports = {
  expo: {
    name: 'City Bus Tracker',
    slug: 'bus-tracker-user',
    owner: 'nitin1222',
    version: '2.0.0',
    scheme: 'citybus',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: '#16213E' },
    ios: { supportsTablet: true, bundleIdentifier: 'com.transport.usertracker' },
    android: {
      package: 'com.transport.usertracker',
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#16213E' },
      edgeToEdgeEnabled: true,
      permissions: ['CALL_PHONE', 'VIBRATE']
    },
    web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single', name: 'City Bus Tracker', themeColor: '#16213E' },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-localization',
      'expo-splash-screen',
      ['expo-location', {
        locationWhenInUsePermission: 'City Bus Tracker uses your location to find the nearest bus stop and the best bus for your trip.'
      }],
      ['expo-notifications', { color: '#16213E' }],
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }]] : [])
    ],
    runtimeVersion: { policy: 'appVersion' },
    updates: { url: 'https://u.expo.dev/5967c1b8-b87d-4f6f-ad7f-ae2e57008dac' },
    extra: { eas: { projectId: '5967c1b8-b87d-4f6f-ad7f-ae2e57008dac' } }
  }
};
