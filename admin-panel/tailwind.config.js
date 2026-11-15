import { colors, stocks, radius } from '../shared/theme/tokens.js';

const stockColors = Object.fromEntries(
  Object.entries(stocks).flatMap(([name, s]) => [[`${name}`, s.stock], [`${name}-ink`, s.ink]])
);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: colors.ink, soft: colors.inkSoft, faint: colors.inkFaint },
        paper: colors.paper,
        counterfoil: colors.counterfoil,
        rule: colors.rule,
        signal: { DEFAULT: colors.signal, stock: colors.signalStock },
        ...stockColors
      },
      fontFamily: {
        sans: ['"Anek Latin"', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`
      },
      boxShadow: {
        rest: '0 1px 0 rgba(22,33,62,.06), 0 2px 6px -2px rgba(22,33,62,.14)',
        lifted: '0 10px 24px -8px rgba(22,33,62,.28)'
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        stamp: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    }
  },
  plugins: []
};
