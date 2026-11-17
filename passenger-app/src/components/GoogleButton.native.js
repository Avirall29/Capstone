// Native Google Sign-In (needs a development build and a Google OAuth web client id).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { Button } from 'transit-shared/native/ui';
import { useTheme } from 'transit-shared/native/theme';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function GoogleButton({ onIdToken, onError }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (WEB_CLIENT_ID) GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  }, []);

  if (!WEB_CLIENT_ID) return null; // hidden until Google sign-in is configured

  const signIn = async () => {
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (isSuccessResponse(res) && res.data.idToken) await onIdToken(res.data.idToken);
    } catch (e) {
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button title={t('passenger.continueGoogle')} variant="secondary" loading={busy} onPress={signIn}
      icon={<Ionicons name="logo-google" size={19} color={theme.ink} />} />
  );
}
