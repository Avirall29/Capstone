// Map configuration shared by all apps. One place to switch tile provider.
// OpenFreeMap: free, no API key, no usage limits, OpenStreetMap data, vector tiles.
// For a public launch in India, consider Ola Maps or Mappls (official boundaries) — change the style URL here.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors · OpenFreeMap';

// Whole-India view used when we know nothing better (no GPS, no buses).
export const INDIA_VIEW = { center: [78.9629, 22.5937], zoom: 4.1 };
export const INDIA_BOUNDS = [[68.1, 6.5], [97.5, 35.7]];
