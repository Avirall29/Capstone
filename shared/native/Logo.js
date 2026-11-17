import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from './theme';

/** The ticket mark. */
export default function Logo({ size = 44 }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path fill={theme.ink} d="M4 7a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v6a3 3 0 0 0 0 6v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 0 0-6z" />
      <Circle cx="21" cy="16" r="3.2" fill="#BFE6CF" />
      <Path stroke={theme.bg} strokeWidth="2.4" strokeLinecap="round" d="M9 11h7M9 16h5M9 21h7" />
    </Svg>
  );
}
