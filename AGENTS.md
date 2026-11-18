# AGENTS.md: Convertly

## What this is
A static React + Vite unit-converter SPA. The same `dist/` build is:
- deployed to Netlify as an installable PWA (`netlify.toml`, `public/manifest.webmanifest`, `public/sw.js`)
- wrapped as an Android app with Capacitor (`capacitor.config.ts`, `webDir: dist`)
- compiled to an APK by `.github/workflows/android-apk.yml` on GitHub

There is deliberately **no server and no SSR framework**. Capacitor needs a purely static bundle, so keep it that way. `vite.config.ts` uses `base: './'` so assets resolve inside the Android WebView. Don't change it to `/`.

## Layout
- `src/units.ts`: all categories and units. Linear units use `lin(id, name, symbol, factorToBase)`. Non-linear ones (temperature, L/100km) use `fn(...)`. Number bases (`kind: 'base'`) go through `convertBase` (BigInt, string in/out).
- `src/currency.ts`: Frankfurter API (no key) with a localStorage cache and hard-coded fallback rates. Currency units are injected at runtime in `App.tsx`.
- `src/App.tsx`: the whole UI. It uses hash routing (`#/`, `#/saved`, `#/c/<cat>/<from>/<to>`) so the Android hardware back button works through WebView history. Screens: Home (category grid + search + pinned), Converter (custom keypad, unit bottom sheet, all-units list), Saved (pins + history).
- `src/styles.css`: a single stylesheet. Each category's accent comes from `--h` (its hue).
- `scripts/make-icons.mjs`: a dependency-free PNG generator for `public/icons/*` and `assets/*`. The `assets/` files are consumed by `@capacitor/assets` in CI.

## Conventions
- All persistence is on-device `localStorage` (`convertly.*` keys). There are no user accounts and no backend.
- The `android/` folder is gitignored and regenerated in CI (`npx cap add android`). If native customization is ever needed, commit `android/` and remove the `cap add` step.
- Add a unit by appending to the category's `units` array. Add a category by appending to `CATEGORIES` with a unique `hue` and two `defaults`.
