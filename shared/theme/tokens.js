// "Ticket Stock" design tokens — single source for admin (Tailwind), driver app and passenger app.
// See DESIGN.md for where and why each token is used.

export const colors = {
  ink: '#16213E',
  inkSoft: '#3D4866',
  inkFaint: '#5C647C',
  paper: '#EEF0EA',
  counterfoil: '#FBFBF8',
  rule: '#C9CDC4',
  signal: '#D0202F',
  signalStock: '#FBD5D8',
  night: {
    paper: '#0F1420',
    counterfoil: '#1A2132',
    ink: '#E9ECF3',
    inkSoft: '#B4BCCD',
    rule: '#2C3548'
  }
};

// Ticket stocks: pale fill + its own deep ink.
export const stocks = {
  rose: { stock: '#F6C9D3', ink: '#A3184A' },
  mint: { stock: '#BFE6CF', ink: '#17633F' },
  buff: { stock: '#F5DE9A', ink: '#7A5600' },
  sky: { stock: '#C3DBF3', ink: '#1D4F8F' },
  lilac: { stock: '#D9CDF2', ink: '#5B3A9E' }
};

// Semantic stamps.
export const stamps = {
  live: stocks.mint,
  onTime: stocks.mint,
  delayed: stocks.buff,
  breakdown: stocks.buff,
  offRoute: stocks.buff,
  stale: { stock: '#E2E4DE', ink: '#5C647C' },
  info: stocks.sky,
  pending: stocks.buff,
  approved: stocks.mint,
  rejected: stocks.rose,
  emergency: { stock: colors.signalStock, ink: colors.signal }
};

export const radius = { sm: 4, md: 8, lg: 14, hole: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 };

export const type = {
  family: 'Anek Latin',
  display: { size: 56, weight: '800', lineHeight: 0.9 },
  headline: { size: 26, weight: '700', lineHeight: 1.15 },
  title: { size: 18, weight: '600', lineHeight: 1.3 },
  body: { size: 15, weight: '400', lineHeight: 1.55 },
  label: { size: 12, weight: '600', letterSpacing: 0.96 } // 0.08em at 12px
};

export const motion = {
  // Exponential ease-out; default for every state change.
  easeOut: [0.16, 1, 0.3, 1],
  // Stamps land with a small overshoot.
  easeStamp: [0.34, 1.56, 0.64, 1],
  fast: 180,
  base: 280,
  slow: 420,
  markerGlide: 1000 // bus marker interpolation between GPS points
};

export const shadow = {
  rest: '0 1px 0 rgba(22,33,62,.06), 0 2px 6px -2px rgba(22,33,62,.14)',
  lifted: '0 10px 24px -8px rgba(22,33,62,.28)'
};

const STOCK_ORDER = ['mint', 'buff', 'sky', 'rose', 'lilac'];

/** Map any route color (hex from the DB) to the nearest ticket stock, so routes always render as stocks. */
export function stockForColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return stocks.mint;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  let best = 'mint';
  let bestD = Infinity;
  for (const name of STOCK_ORDER) {
    const [R, G, B] = rgb(stocks[name].ink);
    const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return stocks[best];
}

/** Stable stock for a route without a color (by route number). */
export function stockForKey(key = '') {
  let h = 0;
  for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return stocks[STOCK_ORDER[h % STOCK_ORDER.length]];
}

export const routeStock = (route) => (route?.color ? stockForColor(route.color) : stockForKey(route?.number));
