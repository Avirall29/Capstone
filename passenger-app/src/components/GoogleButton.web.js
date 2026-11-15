// Web Google Sign-In with Google Identity Services (the native library's web build is sponsor-only).
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const SCRIPT = 'https://accounts.google.com/gsi/client';

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function GoogleButton({ onIdToken, onError }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!WEB_CLIENT_ID) return;
    loadScript().then(() => {
      window.google.accounts.id.initialize({
        client_id: WEB_CLIENT_ID,
        callback: ({ credential }) => Promise.resolve(onIdToken(credential)).catch(onError)
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    }).catch(onError);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!WEB_CLIENT_ID) return null;
  return <View style={{ alignItems: 'center', minHeight: 44 }}><div ref={ref} /></View>;
}
