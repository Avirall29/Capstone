// Optional account: Google or email. Tracking works without signing in.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Screen from 'transit-shared/native/Screen';
import T from 'transit-shared/native/T';
import { Button, Field, Banner } from 'transit-shared/native/ui';
import { useTheme } from 'transit-shared/native/theme';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/api';
import GoogleButton from '../components/GoogleButton';

export default function SignIn() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { signIn, register, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      done();
    } catch (e) {
      setError(e.status === 401 ? t('auth.invalid') : errorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => run(() => (mode === 'login'
    ? signIn(form.email.trim().toLowerCase(), form.password)
    : register({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password })));

  const valid = /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 6 && (mode === 'login' || form.name.trim());

  return (
    <Screen>
      <Pressable onPress={done} hitSlop={12} style={{ alignSelf: 'flex-start', marginBottom: 20 }} accessibilityLabel={t('common.close')}>
        <Ionicons name="close" size={26} color={theme.ink} />
      </Pressable>
      <T variant="headline" style={{ fontSize: 30, lineHeight: 36 }}>{t('passenger.signInTitle')}</T>
      <T variant="body" color={theme.inkSoft} style={{ marginTop: 6, marginBottom: 24 }}>{t('passenger.signInBody')}</T>

      <GoogleButton onIdToken={(idToken) => run(() => signInWithGoogle(idToken))} onError={(e) => setError(errorText(e, t))} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.rule }} />
        <T variant="small" color={theme.inkFaint}>{t('passenger.or')}</T>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.rule }} />
      </View>

      {error ? <View style={{ marginBottom: 14 }}><Banner tone="danger">{error}</Banner></View> : null}
      {mode === 'register' && <Field label={t('passenger.name')} value={form.name} onChangeText={set('name')} autoCapitalize="words" />}
      <Field label={t('auth.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label={t('auth.password')} value={form.password} onChangeText={set('password')} secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'} />
      <Button title={mode === 'login' ? t('auth.signIn') : t('passenger.createAccount')} onPress={submit} loading={busy} disabled={!valid} />
      <Button
        title={mode === 'login' ? t('passenger.newAccount') : t('passenger.haveAccount')}
        variant="ghost"
        style={{ marginTop: 8 }}
        onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
      />
    </Screen>
  );
}
