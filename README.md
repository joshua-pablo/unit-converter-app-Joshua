# Convertly: Unit Converter

Convertly is a mobile-first unit converter that feels like a native app. It works on the web as an installable PWA, and it ships as an Android **APK** that GitHub Actions builds for you automatically.

## What it converts

It has 20 categories and more than 180 units: length, weight, temperature, **currency (live ECB rates, cached for offline use)**, volume and cooking measures, area, speed, time, data size, data rate, energy, power, pressure, angle, frequency, fuel economy, force, torque, density, and **number bases** (binary, octal, decimal, hex, base 36).

## App features

- A custom on-screen keypad, so the phone keyboard never pops up, plus physical keyboard support
- A one-tap swap, tap-to-copy results, and a "see it in every unit" view
- Pin conversions to the home screen, with history of recent conversions
- Unit search across all categories ("psi", "cups", "yen"…)
- Works fully offline (service worker on the web, bundled files in the APK)
- Haptic feedback, safe-area support, and a full-screen standalone display

## Tech

- **React 19 + TypeScript + Vite**: a static single-page app, with no server needed
- **Capacitor 7**: wraps the web build into a native Android app
- **GitHub Actions**: builds the APK in the cloud (no Android Studio needed)
- **Netlify**: hosts the web/PWA version

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Get the APK through GitHub (easiest)

1. Create an empty repository on GitHub, then push this project:
   ```bash
   git remote add origin https://github.com/<you>/convertly.git
   git push -u origin main
   ```
2. Open the **Actions** tab. The **Build Android APK** workflow runs automatically.
3. When it finishes, download **Convertly-apk** from the run's *Artifacts* section, unzip it, and install `Convertly.apk` on your phone. You'll need to allow "install unknown apps".
4. For a public download link, tag a release:
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```
   The APK is attached to a GitHub Release automatically.

## Build the APK on your own machine

This needs Node 20+, JDK 21, and the Android SDK (Android Studio).

```bash
npm install
npm run build
npx cap add android            # first time only
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

To regenerate the icons after changing their design: `npm run icons`.

## Publishing to Google Play (later)

The CI workflow produces a *debug-signed* APK, which is fine for sideloading and sharing. For the Play Store, create a signing keystore and build a release AAB (`./gradlew bundleRelease`). The keystore can be stored as GitHub secrets.
