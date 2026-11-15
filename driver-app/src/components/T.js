// Text in the Ticket Stock type system. Picks the Anek family for the current language's script
// (Latin, Devanagari, Gurmukhi are bundled; other scripts use the phone's own font).
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { languageInfo } from 'transit-shared/i18n/languages.js';
import { useTheme, FONT_FILES } from '../lib/theme';

const VARIANTS = {
  display: { fontSize: 52, weight: 800, lineHeight: 50, letterSpacing: -1.5, numeric: true },
  displaySm: { fontSize: 34, weight: 800, lineHeight: 34, letterSpacing: -0.8, numeric: true },
  headline: { fontSize: 26, weight: 700, lineHeight: 31 },
  title: { fontSize: 19, weight: 600, lineHeight: 25 },
  body: { fontSize: 16, weight: 400, lineHeight: 24 },
  bodyStrong: { fontSize: 16, weight: 600, lineHeight: 24 },
  small: { fontSize: 14, weight: 400, lineHeight: 20 },
  label: { fontSize: 12, weight: 600, lineHeight: 15, letterSpacing: 0.96, serial: true }
};

const INDIC_LINE_HEIGHT = 1.18; // matras and descenders need room

export default function T({ variant = 'body', color, weight, style, children, serial, ...rest }) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const v = VARIANTS[variant];
  const script = languageInfo(i18n.language).script;
  const w = weight || v.weight;
  const files = FONT_FILES[script];
  const indic = script !== 'latin';
  const isSerial = (serial ?? v.serial) && !indic; // never uppercase Indic text

  return (
    <Text
      {...rest}
      style={[
        {
          color: color || theme.ink,
          fontSize: v.fontSize,
          lineHeight: indic && !v.numeric ? Math.round(v.lineHeight * INDIC_LINE_HEIGHT) : v.lineHeight,
          letterSpacing: v.letterSpacing,
          ...(files ? { fontFamily: files[w] || files[400] } : { fontWeight: String(w) }),
          ...(v.numeric && { fontVariant: ['tabular-nums'], fontFamily: FONT_FILES.latin[800] }),
          ...(isSerial && { textTransform: 'uppercase' })
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}
