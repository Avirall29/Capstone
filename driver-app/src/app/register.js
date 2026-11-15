// Driver application: 4 steps. Progress is a punched stage strip.
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Screen from '../components/Screen';
import T from '../components/T';
import { Button, Field, StageStrip, Banner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useTheme, stocks } from '../lib/theme';
import { errorText } from '../lib/api';

const STEPS = ['personal', 'licence', 'documents', 'review'];
const ID_TYPES = ['voter', 'maskedAadhaar', 'pan', 'passport'];
const ID_TYPE_LABEL = { voter: 'Voter ID', maskedAadhaar: 'Masked Aadhaar', pan: 'PAN card', passport: 'Passport' };
const MIN_AGE = 21;

/** "DD/MM/YYYY" while typing. */
const maskDate = (text) => {
  const d = text.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};
const parseDate = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  if (!m) return null;
  const date = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return date.getUTCDate() === +m[1] && date.getUTCMonth() === +m[2] - 1 ? date : null;
};
const ageOf = (dob) => {
  const now = new Date();
  let a = now.getFullYear() - dob.getUTCFullYear();
  if (now.getMonth() < dob.getUTCMonth() || (now.getMonth() === dob.getUTCMonth() && now.getDate() < dob.getUTCDate())) a--;
  return a;
};
const digits = (s) => (s || '').replace(/\D/g, '');

function Chips({ options, value, onChange, label }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <T variant="bodyStrong" style={{ marginBottom: 6, fontSize: 15 }}>{label}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(([key, text]) => {
          const active = value === key;
          return (
            <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="radio" accessibilityState={{ checked: active }}
              style={[styles.chip, { borderColor: active ? theme.ink : theme.rule, backgroundColor: active ? theme.ink : theme.surface }]}>
              <T variant="bodyStrong" color={active ? theme.onPrimary : theme.ink}>{text}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PhotoSlot({ label, value, onChange, error }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pick = async (camera) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('register.cameraDenied'));
      return;
    }
    const opts = { mediaTypes: ['images'], quality: 0.85 };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return;
    // Resize + compress so a photo is ~200–400 KB, not several MB.
    const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 1400 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    onChange({ uri: out.uri, dataUrl: `data:image/jpeg;base64,${out.base64}` });
  };
  return (
    <View style={[styles.slot, { borderColor: error ? theme.signal : theme.rule, backgroundColor: theme.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {value ? <Image source={{ uri: value.uri }} style={styles.thumb} /> : (
          <View style={[styles.thumb, { borderWidth: 2, borderStyle: 'dashed', borderColor: theme.rule, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="card-outline" size={26} color={theme.inkFaint} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{label}</T>
          {error ? <T variant="small" color={theme.signal}>{error}</T> : value ? <Ionicons name="checkmark-circle" size={20} color={stocks.mint.ink} /> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button size="sm" title={value ? t('register.retake') : t('register.takePhoto')} variant="secondary" style={{ flex: 1 }}
          icon={<Ionicons name="camera-outline" size={18} color={theme.ink} />} onPress={() => pick(true)} />
        <Button size="sm" title={t('register.fromGallery')} variant="ghost" style={{ flex: 1 }} onPress={() => pick(false)} />
      </View>
    </View>
  );
}

export default function Register() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: '', dob: '', gender: '', phone: '', email: '', password: '', address: '', city: '', state: '',
    emergencyName: '', emergencyPhone: '', licenseNumber: '', licenseClass: '', licenseExpiry: '', experienceYears: '', idType: 'voter',
    licenseFront: null, licenseBack: null, idProof: null
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const set = (key) => (value) => setF((prev) => ({ ...prev, [key]: value }));

  const validate = (s) => {
    const e = {};
    const req = (k) => { if (!String(f[k] || '').trim()) e[k] = t('register.required'); };
    if (s === 0) {
      ['name', 'dob', 'phone', 'email', 'password', 'address', 'city', 'state', 'emergencyName', 'emergencyPhone'].forEach(req);
      const dob = parseDate(f.dob);
      if (f.dob && !dob) e.dob = t('register.invalidDate');
      else if (dob && ageOf(dob) < MIN_AGE) e.dob = t('register.tooYoung');
      if (f.phone && (digits(f.phone).length < 10 || digits(f.phone).length > 12)) e.phone = t('register.invalidPhone');
      if (f.emergencyPhone && (digits(f.emergencyPhone).length < 10 || digits(f.emergencyPhone).length > 12)) e.emergencyPhone = t('register.invalidPhone');
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = t('register.invalidEmail');
      if (f.password && f.password.length < 8) e.password = t('register.shortPassword');
    }
    if (s === 1) {
      ['licenseNumber', 'licenseClass', 'licenseExpiry', 'experienceYears'].forEach(req);
      const exp = parseDate(f.licenseExpiry);
      if (f.licenseExpiry && !exp) e.licenseExpiry = t('register.invalidDate');
      else if (exp && exp <= new Date()) e.licenseExpiry = t('register.expired');
    }
    if (s === 2) ['licenseFront', 'licenseBack', 'idProof'].forEach((k) => { if (!f[k]) e[k] = t('register.missingPhoto'); });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate(step) && setStep(step + 1);
  const back = () => (step ? setStep(step - 1) : router.back());

  const submit = async () => {
    setBusy(true);
    setSubmitError('');
    try {
      await register({
        name: f.name.trim(),
        email: f.email.trim().toLowerCase(),
        phone: f.phone.trim(),
        password: f.password,
        dateOfBirth: parseDate(f.dob).toISOString().slice(0, 10),
        gender: f.gender || undefined,
        address: f.address.trim(),
        city: f.city.trim(),
        state: f.state.trim(),
        emergencyContact: { name: f.emergencyName.trim(), phone: f.emergencyPhone.trim() },
        licenseNumber: f.licenseNumber.trim().toUpperCase(),
        licenseClass: f.licenseClass.trim(),
        licenseExpiry: parseDate(f.licenseExpiry).toISOString().slice(0, 10),
        experienceYears: Number(f.experienceYears),
        idType: ID_TYPE_LABEL[f.idType],
        documents: { licenseFront: f.licenseFront.dataUrl, licenseBack: f.licenseBack.dataUrl, idProof: f.idProof.dataUrl }
      });
    } catch (e) {
      setSubmitError(errorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  const stepStops = STEPS.map((s) => ({ id: s, name: t(`register.steps.${s}`) }));
  const field = (key, extra = {}) => ({ label: t(`register.${extra.labelKey || key}`), value: f[key], onChangeText: set(key), error: errors[key], ...extra });

  return (
    <Screen>
      <Pressable onPress={back} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }} accessibilityRole="button">
        <Ionicons name="chevron-back" size={22} color={theme.ink} />
        <T variant="bodyStrong">{t('common.back')}</T>
      </Pressable>
      <T variant="headline" style={{ fontSize: 30, lineHeight: 36 }}>{t('register.title')}</T>
      {step === 0 && <T variant="body" color={theme.inkSoft} style={{ marginTop: 6 }}>{t('register.subtitle')}</T>}

      <View style={{ marginTop: 22, marginBottom: 6 }}>
        <StageStrip stops={stepStops} nextIndex={step} route={{ color: stocks.buff.ink }} labels={false} />
      </View>
      <T variant="label" color={theme.inkFaint}>{t('register.stepOf', { step: step + 1, total: STEPS.length })}</T>
      <T variant="title" style={{ marginTop: 4, marginBottom: 18 }}>{t(`register.steps.${STEPS[step]}`)}</T>

      {step === 0 && (
        <>
          <Field {...field('name')} autoCapitalize="words" autoComplete="name" />
          <Field {...field('dob')} onChangeText={(v) => set('dob')(maskDate(v))} keyboardType="number-pad" placeholder={t('register.dobHint')} maxLength={10} />
          <Chips label={t('register.gender')} value={f.gender} onChange={set('gender')}
            options={['male', 'female', 'other'].map((g) => [g, t(`register.genders.${g}`)])} />
          <Field {...field('phone')} keyboardType="phone-pad" autoComplete="tel" placeholder="98765 43210" />
          <Field {...field('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field {...field('password')} secureTextEntry hint={t('register.passwordHint')} autoComplete="new-password" />
          <Field {...field('address')} autoCapitalize="sentences" multiline inputStyle={{ height: 76, paddingTop: 12, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field {...field('city')} style={{ flex: 1 }} autoCapitalize="words" />
            <Field {...field('state')} style={{ flex: 1 }} autoCapitalize="words" />
          </View>
          <Field {...field('emergencyName')} autoCapitalize="words" />
          <Field {...field('emergencyPhone')} keyboardType="phone-pad" />
        </>
      )}

      {step === 1 && (
        <>
          <Field {...field('licenseNumber')} autoCapitalize="characters" placeholder="PB65 20190012345" />
          <Field {...field('licenseClass')} hint={t('register.licenseClassHint')} />
          <Field {...field('licenseExpiry')} onChangeText={(v) => set('licenseExpiry')(maskDate(v))} keyboardType="number-pad" placeholder={t('register.dobHint')} maxLength={10} />
          <Field {...field('experienceYears', { labelKey: 'experience' })} onChangeText={(v) => set('experienceYears')(digits(v).slice(0, 2))} keyboardType="number-pad" />
          <Chips label={t('register.idType')} value={f.idType} onChange={set('idType')} options={ID_TYPES.map((k) => [k, t(`register.idTypes.${k}`)])} />
          {f.idType === 'maskedAadhaar' && <Banner tone="warn">{t('register.aadhaarNote')}</Banner>}
        </>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          <T variant="small" color={theme.inkSoft}>{t('register.photoHint')}</T>
          {['licenseFront', 'licenseBack', 'idProof'].map((k) => (
            <PhotoSlot key={k} label={t(`register.${k}`)} value={f[k]} onChange={set(k)} error={errors[k]} />
          ))}
        </View>
      )}

      {step === 3 && (
        <View style={[styles.review, { borderColor: theme.rule, backgroundColor: theme.surface }]}>
          {[
            [t('register.name'), f.name], [t('register.dob'), f.dob], [t('register.phone'), f.phone], [t('register.email'), f.email],
            [t('register.city'), `${f.city}, ${f.state}`], [t('register.licenseNumber'), f.licenseNumber.toUpperCase()],
            [t('register.licenseExpiry'), f.licenseExpiry], [t('register.experience'), f.experienceYears], [t('register.idType'), t(`register.idTypes.${f.idType}`)]
          ].map(([label, value]) => (
            <View key={label} style={[styles.reviewRow, { borderColor: theme.rule }]}>
              <T variant="small" color={theme.inkFaint} style={{ flex: 1 }}>{label}</T>
              <T variant="bodyStrong" style={{ flex: 1.3, textAlign: 'right' }}>{value}</T>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
            {['licenseFront', 'licenseBack', 'idProof'].map((k) => f[k] && <Image key={k} source={{ uri: f[k].uri }} style={[styles.thumb, { flex: 1 }]} />)}
          </View>
        </View>
      )}

      {submitError ? <View style={{ marginTop: 16 }}><Banner tone="danger">{submitError}</Banner></View> : null}

      <View style={{ marginTop: 24, gap: 10 }}>
        {step < 3 ? <Button title={t('common.next')} onPress={next} /> : (
          <Button title={busy ? t('register.submitting') : t('register.submit')} onPress={submit} loading={busy} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  slot: { borderWidth: 1.5, borderRadius: 8, padding: 12 },
  thumb: { width: 72, height: 46, borderRadius: 4 },
  review: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 }
});
