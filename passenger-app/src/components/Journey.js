// Journey options as tickets: total minutes on the stub, the legs as a printed line.
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import T from 'transit-shared/native/T';
import { Ticket, RouteBadge, Stamp } from 'transit-shared/native/ui';
import { useTheme, routeStock, stocks } from 'transit-shared/native/theme';
import { formatDistance } from 'transit-shared/geo.js';

/** Wait line for the first bus: live / timetable / estimate. */
export function waitText(leg, t, language) {
  if (leg.waitSource === 'live' && leg.bus) return t('passenger.busLive', { bus: leg.bus.busNumber, count: leg.waitMinutes });
  if (leg.waitSource === 'schedule' && leg.waitMinutes > 60) {
    // Far away (e.g. after the last bus): a clock time reads better than "365 min".
    const at = new Date(Date.now() + leg.waitMinutes * 60000);
    return t('passenger.busAt', { time: at.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) });
  }
  if (leg.waitSource === 'schedule') return t('passenger.busSchedule', { count: leg.waitMinutes });
  return t('passenger.busEstimate', { count: leg.waitMinutes });
}

export function JourneyTicket({ option, best, selected, onPress }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const rides = option.legs.filter((l) => l.type === 'ride');
  const first = rides[0];
  const stock = first ? routeStock(first.route) : stocks.sky;
  return (
    <Ticket
      onPress={onPress}
      stubStock={stock}
      notchColor={theme.surface}
      style={selected ? { borderColor: theme.ink, borderWidth: 2 } : null}
      stub={(
        <View style={{ alignItems: 'center' }}>
          <T variant="displaySm" color={stock.ink}>{option.totalMinutes}</T>
          <T variant="bodyStrong" color={stock.ink}>{t('common.min')}</T>
        </View>
      )}
    >
      <View style={styles.legRow}>
        {option.legs.map((leg, i) => (
          <View key={i} style={styles.legItem}>
            {i > 0 && <Ionicons name="chevron-forward" size={14} color={theme.inkFaint} />}
            {leg.type === 'walk' ? (
              <View style={styles.walk}><Ionicons name="walk" size={17} color={theme.inkSoft} /><T variant="small" color={theme.inkSoft}>{leg.minutes}</T></View>
            ) : <RouteBadge route={leg.route} />}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        {best && <Stamp kind="live">{t('passenger.best')}</Stamp>}
        <T variant="small" color={theme.inkSoft}>
          {option.walkOnly ? t('passenger.walkOnly') : rides.length === 1 ? t('passenger.direct') : t('passenger.changes', { count: rides.length - 1 })}
        </T>
      </View>
      {first && <T variant="bodyStrong" style={{ marginTop: 6 }} numberOfLines={2}>{waitText(first, t, i18n.language)}</T>}
    </Ticket>
  );
}

/** Step-by-step legs: walk / board / ride / get off. */
export function LegList({ option }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ marginTop: 6 }}>
      {option.legs.map((leg, i) => {
        const last = i === option.legs.length - 1;
        if (leg.type === 'walk') {
          return (
            <View key={i} style={styles.step}>
              <View style={styles.rail}><Ionicons name="walk" size={20} color={theme.inkSoft} />{!last && <View style={[styles.railLine, { borderColor: theme.rule, borderStyle: 'dashed' }]} />}</View>
              <View style={{ flex: 1, paddingBottom: 16 }}>
                <T variant="bodyStrong">{t('passenger.walkLeg', { count: Math.max(1, leg.minutes) })} · {formatDistance(leg.meters)}</T>
                {leg.to?.name && <T variant="small" color={theme.inkSoft}>{t('passenger.toPlace', { place: leg.to.name })}</T>}
              </View>
            </View>
          );
        }
        const stock = routeStock(leg.route);
        return (
          <View key={i} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.hole, { borderColor: stock.ink }]} />
              <View style={[styles.railLine, { borderColor: stock.ink, borderLeftWidth: 4 }]} />
              <View style={[styles.hole, { borderColor: stock.ink }]} />
            </View>
            <View style={{ flex: 1, paddingBottom: 16, gap: 4 }}>
              <T variant="bodyStrong">{t('passenger.boardAt', { stop: leg.from.name })}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <RouteBadge route={leg.route} />
                <T variant="small" color={theme.inkSoft} style={{ flex: 1 }} numberOfLines={1}>{leg.route.name}</T>
              </View>
              <T variant="small" color={leg.waitSource === 'live' ? stock.ink : theme.inkSoft} weight={600}>{waitText(leg, t, i18n.language)}</T>
              <T variant="small" color={theme.inkSoft}>{t('passenger.stops', { count: leg.stops })} · {t('common.minutes', { count: leg.rideMinutes })}</T>
              <T variant="bodyStrong">{t('passenger.getOffAt', { stop: leg.to.name })}</T>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Row({ onPress, children, style }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderColor: theme.rule, backgroundColor: pressed ? theme.bg : 'transparent' }, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  legRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walk: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  step: { flexDirection: 'row', gap: 12 },
  rail: { width: 22, alignItems: 'center' },
  railLine: { flex: 1, borderLeftWidth: 2, marginVertical: 2 },
  hole: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: '#FBFBF8' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 }
});
