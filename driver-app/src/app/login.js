import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Screen from 'transit-shared/native/Screen';
import Logo from 'transit-shared/native/Logo';
import T from 'transit-shared/native/T';
import { Button, Field, Banner } from 'transit-shared/native/ui';
import { useAuth } from '../lib/auth';
import { useTheme } from 'transit-shared/native/theme';
import { errorText } from '../lib/api';

export default function Login() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(e.status === 401 ? t('auth.invalid') : e.data?.code === 'SUSPENDED' ? t('auth.suspended') : errorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel={t('common.language')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="language" size={22} color={theme.ink} />
          <T variant="bodyStrong">{t('common.language')}</T>
        </Pressable>
      </View>

      <View style={{ marginTop: 48, marginBottom: 28 }}>
        <T variant="label" color={theme.inkFaint}>{t('common.driverAppName')}</T>
        <T variant="headline" style={{ fontSize: 32, lineHeight: 38, marginTop: 6 }}>{t('auth.driverWelcome')}</T>
        <T variant="body" color={theme.inkSoft} style={{ marginTop: 8 }}>{t('auth.driverWelcomeBody')}</T>
      </View>

      {error ? <View style={{ marginBottom: 16 }}><Banner tone="danger">{error}</Banner></View> : null}

      <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
      <Button title={busy ? t('auth.signingIn') : t('auth.signIn')} onPress={submit} loading={busy} disabled={!email || !password} />

      <View style={{ flex: 1, minHeight: 40 }} />
      <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: theme.rule, paddingTop: 20, alignItems: 'center', gap: 8 }}>
        <T variant="body" color={theme.inkSoft}>{t('auth.newDriver')}</T>
        <Link href="/register" asChild>
          <Button title={t('auth.applyToDrive')} variant="secondary" style={{ alignSelf: 'stretch' }} />
        </Link>
      </View>
    </Screen>
  );
}
