// After SOS: the alert is already sent with the location. The driver can add a reason and note,
// sees when the control room acknowledges, and can call 112 at any time.
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DRIVER_PANIC_REASONS, EMERGENCY_NUMBER } from 'transit-shared/incidents.js';
import Sheet from './Sheet';
import T from './T';
import { Button, Stamp } from './ui';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function PanicSheet({ incident, error, onClose, reasons = DRIVER_PANIC_REASONS, identity = {}, children }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [sentDetails, setSentDetails] = useState(false);
  const [status, setStatus] = useState('open');
  const [busy, setBusy] = useState(false);

  // Poll for acknowledgement while the sheet is open.
  useEffect(() => {
    if (!incident?.id) return undefined;
    const q = identity.deviceId ? `?deviceId=${encodeURIComponent(identity.deviceId)}` : '';
    const poll = () => api.get(`/incidents/${incident.id}/status${q}`, identity.token !== undefined ? { token: identity.token } : undefined)
      .then((s) => setStatus(s.status)).catch(() => {});
    poll();
    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [incident?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendDetails = async () => {
    setBusy(true);
    try {
      await api.patch(`/incidents/${incident.id}/details`, { reason, note, ...(identity.deviceId && { deviceId: identity.deviceId }) },
        identity.token !== undefined ? { token: identity.token } : undefined);
      setSentDetails(true);
    } catch {
      // keep the sheet; the alert itself is already with the control room
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={Boolean(incident || error)} onClose={onClose} dismissable>
      {error ? (
        <View style={{ gap: 14 }}>
          <T variant="headline" color={theme.signal}>{t('panic.failed')}</T>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Stamp kind="emergency">{t('panic.sent')}</Stamp>
            {status !== 'open' && <Stamp kind="approved">{status === 'resolved' ? t('panic.resolved') : t('panic.acknowledged')}</Stamp>}
          </View>
          <T variant="body" color={theme.inkSoft}>{t('panic.sentBody')}</T>
          {children}
          {!sentDetails ? (
            <>
              <T variant="title" style={{ marginTop: 12, marginBottom: 6 }}>{t('panic.chooseReason')}</T>
              <View style={styles.reasons}>
                {reasons.map((r) => {
                  const active = reason === r.id;
                  return (
                    <Pressable key={r.id} onPress={() => setReason(r.id)} accessibilityRole="radio" accessibilityState={{ checked: active }}
                      style={[styles.reason, { borderColor: active ? theme.signal : theme.rule, backgroundColor: active ? theme.signalStock : theme.surface }]}>
                      <T variant="bodyStrong" color={active ? theme.signal : theme.ink}>{t(`panic.reasons.${r.id}`, { defaultValue: r.label })}</T>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('panic.notePlaceholder')}
                placeholderTextColor={theme.inkFaint}
                multiline
                maxLength={500}
                style={[styles.note, { borderColor: theme.rule, color: theme.ink, backgroundColor: theme.bg }]}
              />
              <Button title={t('panic.sendDetails')} onPress={sendDetails} loading={busy} disabled={!reason && !note.trim()} />
            </>
          ) : (
            <T variant="bodyStrong" style={{ marginTop: 10 }}>{t('panic.detailsSent')}</T>
          )}
        </View>
      )}
      <Button
        title={t('common.call112')}
        variant="danger"
        style={{ marginTop: 12 }}
        onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
      />
      <Button title={t('common.close')} variant="ghost" onPress={onClose} style={{ marginTop: 4 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  reason: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, justifyContent: 'center' },
  note: { borderWidth: 1.5, borderRadius: 8, minHeight: 64, padding: 12, fontSize: 16, marginBottom: 12, textAlignVertical: 'top' }
});
