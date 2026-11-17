# City Bus Tracker — passenger app (Android, iOS and web)

One Expo app replaces the old `user-app` (web) and `user-mobile-app` (mobile).

- **From / Where to** — "From" defaults to your GPS position; change it (e.g. planning for someone else) by searching any stop or place.
- **Nearest stop + best bus** — the backend's journey planner (Dijkstra over the stop network, live-aware) returns up to 3 options with walking, waiting, transfers and the live bus to catch.
- **Live map** — every bus glides in as drivers report; tap one for its next stops and minutes.
- **Arrival alerts** — "tell me when the bus is 2 stops away" (needs an account; in-app + push).
- **SOS** — hold 2 s; works without an account; shares your live location with the control room for 15 minutes; Call 112.
- **Languages** — 11 Indian languages, picked in Settings (defaults to the phone's language).
- **Google sign-in** — optional; browsing never needs an account.

## Run

```bash
npm install
cp .env.example .env
npx expo start          # a = Android, w = web
```

Web production build: `npx expo export --platform web` → static files in `dist/` (deploy to Vercel/Netlify).
Google Sign-In and push notifications on phones need a development build (`npx eas-cli@latest build --profile development`).

## Structure

- `src/app/` — `index` (map + sheet), `search`, `signin`, `settings`
- `src/lib/live.js` — one socket subscribed to every route; refetches and resubscribes on reconnect
- `src/components/PassengerMap.js` — MapLibre (OpenFreeMap) as an Expo DOM component
- Shared UI kit, theme and i18n live in `../shared/native` (imported as `transit-shared/native/...`)
