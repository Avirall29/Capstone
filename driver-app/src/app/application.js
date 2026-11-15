// Status of a driver application: pending -> approved / rejected.
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import T from '../components/T';
import { Button, Stamp, Ticket, Banner } from '../components/ui';
import { api, APPLICANT_KEY, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme, stocks } from '../lib/theme';

const STAMP = { pending: 'pending', approved: 'approved', rejected: 'rejected' };

export default function Application() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { application: initial, signOut } = useAuth();
  const [app, setApp] = useState(initial);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem(APPLICANT_KEY);
      setApp(await api.get('/auth/driver/application', { token }));
      setError('');
    } catch (e) {
      if (e.status === 401 || e.status === 404) signOut();
      else setError(errorText(e, t));
    } finally {
      setRefreshing(false);
    }
  }, [signOut, t]);

  useEffect(() => { load(); }, [load]);

  const status = app?.status || 'pending';
  const stock = { pending: stocks.buff, approved: stocks.mint, rejected: stocks.rose }[status];
  const date = app?.submittedAt ? new Date(app.submittedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <Screen style={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Logo />
      <View style={{ marginTop: 36 }}>
        <Ticket stubStock={stock} stub={<Stamp kind={STAMP[status]}>{status}</Stamp>}>
          {app?.name ? <T variant="label" color={theme.inkFaint}>{app.name}</T> : null}
          <T variant="headline" style={{ marginTop: 4 }}>{t(`application.${status}Title`)}</T>
          {date ? <T variant="small" color={theme.inkFaint} style={{ marginTop: 4 }}>{t('application.submitted', { date })}</T> : null}
        </Ticket>
      </View>

      <T variant="body" color={theme.inkSoft} style={{ marginTop: 20 }}>{t(`application.${status}Body`)}</T>
      {status === 'rejected' && app?.reviewNote ? (
        <View style={{ marginTop: 10 }}><Banner tone="danger">{app.reviewNote}</Banner></View>
      ) : null}
      {error ? <View style={{ marginTop: 12 }}><Banner tone="warn">{error}</Banner></View> : null}

      <View style={{ flex: 1, minHeight: 32 }} />
      <View style={{ gap: 10 }}>
        {status === 'pending' && <Button title={t('application.checkAgain')} variant="secondary" onPress={load} loading={refreshing} />}
        {status === 'approved' && <Button title={t('application.signInNow')} onPress={signOut} />}
        {status === 'rejected' && <Button title={t('application.applyAgain')} onPress={signOut} />}
        {status === 'pending' && <Button title={t('common.signOut')} variant="ghost" onPress={signOut} />}
      </View>
    </Screen>
  );
}
