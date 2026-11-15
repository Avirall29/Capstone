// "From" / "Where to?" search: our bus stops first (instant), then places (OpenStreetMap / Photon).
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import T from 'transit-shared/native/T';
import { useTheme } from 'transit-shared/native/theme';
import { api } from '../lib/api';
import { tripStore } from '../lib/tripStore';
import { usePosition } from '../lib/position';
import { Row } from '../components/Journey';

export default function Search() {
  const { field = 'to' } = useLocalSearchParams();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { position } = usePosition();
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ stops: [], places: [] });
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults({ stops: [], places: [] }); return undefined; }
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      // Bias places to where the person is (or to the chosen start / destination when GPS is off).
      const bias = position || tripStore.get().from || tripStore.get().to;
      const near = bias ? `&lat=${bias.lat}&lng=${bias.lng}` : '';
      try {
        const res = await api.get(`/public/search?q=${encodeURIComponent(query)}${near}`, { token: null });
        if (id === seq.current) setResults(res);
      } catch {
        if (id === seq.current) setResults({ stops: [], places: [] });
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (place) => {
    tripStore.set({ [field]: place });
    router.back();
  };

  const empty = q.trim().length >= 2 && !loading && !results.stops.length && !results.places.length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 8 }}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={24} color={theme.ink} />
        </Pressable>
        <View style={[styles.inputWrap, { borderColor: theme.ink, backgroundColor: theme.bg }]}>
          <T variant="label" color={theme.inkFaint}>{field === 'from' ? t('passenger.chooseFrom') : t('passenger.chooseTo')}</T>
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder={t('passenger.searchPlaceholder')}
            placeholderTextColor={theme.inkFaint}
            returnKeyType="search"
            style={[styles.input, { color: theme.ink }]}
          />
        </View>
        {loading && <ActivityIndicator color={theme.ink} />}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        {field === 'from' && (
          <Row onPress={() => choose(null)}>
            <Ionicons name="locate" size={22} color="#1D4F8F" />
            <T variant="bodyStrong">{t('passenger.useCurrent')}</T>
          </Row>
        )}
        {results.stops.length > 0 && <T variant="label" color={theme.inkFaint} style={styles.section}>{t('passenger.busStops')}</T>}
        {results.stops.map((s) => (
          <Row key={`s${s.id}`} onPress={() => choose({ ...s, type: 'stop' })}>
            <View style={[styles.hole, { borderColor: theme.ink }]} />
            <T variant="bodyStrong" style={{ flex: 1 }}>{s.name}</T>
          </Row>
        ))}
        {results.places.length > 0 && <T variant="label" color={theme.inkFaint} style={styles.section}>{t('passenger.places')}</T>}
        {results.places.map((p, i) => (
          <Row key={`p${i}`} onPress={() => choose({ name: p.name, lat: p.lat, lng: p.lng, type: 'place' })}>
            <Ionicons name="location-outline" size={22} color={theme.inkSoft} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" numberOfLines={1}>{p.name}</T>
              <T variant="small" color={theme.inkFaint} numberOfLines={1}>{p.label}</T>
            </View>
          </Row>
        ))}
        {empty && <T variant="body" color={theme.inkSoft} style={{ marginTop: 20 }}>{t('passenger.noResults')}</T>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  inputWrap: { flex: 1, borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingTop: 6 },
  input: { fontSize: 17, paddingVertical: 6, fontFamily: 'AnekLatin_600SemiBold', outlineStyle: 'none' },
  section: { marginTop: 18, marginBottom: 2 },
  hole: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, marginHorizontal: 3 }
});
