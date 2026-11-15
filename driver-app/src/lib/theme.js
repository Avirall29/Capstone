import { useColorScheme } from 'react-native';
import { colors, stocks, stamps, radius, space, routeStock } from 'transit-shared/theme/tokens.js';

export { stocks, stamps, radius, space, routeStock, colors };

const day = {
  night: false,
  bg: colors.paper,
  surface: colors.counterfoil,
  ink: colors.ink,
  inkSoft: colors.inkSoft,
  inkFaint: colors.inkFaint,
  rule: colors.rule,
  primary: colors.ink,
  onPrimary: colors.counterfoil,
  signal: colors.signal,
  signalStock: colors.signalStock
};

// Night stock: the driver app follows the phone's dark mode — a white screen in a dark cab is a hazard.
const night = {
  night: true,
  bg: colors.night.paper,
  surface: colors.night.counterfoil,
  ink: colors.night.ink,
  inkSoft: colors.night.inkSoft,
  inkFaint: '#8E97AB',
  rule: colors.night.rule,
  primary: colors.night.ink,
  onPrimary: colors.night.paper,
  signal: '#FF4757',
  signalStock: '#3A1A22'
};

export function useTheme() {
  return useColorScheme() === 'dark' ? night : day;
}

export const FONT_FILES = {
  latin: { 400: 'AnekLatin_400Regular', 600: 'AnekLatin_600SemiBold', 700: 'AnekLatin_700Bold', 800: 'AnekLatin_800ExtraBold' },
  devanagari: { 400: 'AnekDevanagari_400Regular', 600: 'AnekDevanagari_600SemiBold', 700: 'AnekDevanagari_700Bold', 800: 'AnekDevanagari_800ExtraBold' },
  gurmukhi: { 400: 'AnekGurmukhi_400Regular', 600: 'AnekGurmukhi_600SemiBold', 700: 'AnekGurmukhi_700Bold', 800: 'AnekGurmukhi_800ExtraBold' }
};
