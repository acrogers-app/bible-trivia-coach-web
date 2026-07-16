# Releasing Bible Study Coach to the app stores

Both release flows start the same way — build the web bundle and sync it
into the native projects:

```sh
npm run cap:sync
```

## Versioning (bump before every store upload)

| Where | Keys |
|---|---|
| `android/app/build.gradle` | `versionCode` (must increase every upload) + `versionName` |
| Xcode → App target → General | Version (marketing) + Build (must increase) |

## Android (Google Play)

One-time setup:

1. Generate an upload keystore — pick your own passwords and keep the
   keystore **outside the repo** (the repo volume is exFAT):
   ```sh
   keytool -genkeypair -v \
     -keystore ~/keystores/btc-upload.jks \
     -alias btc-upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Back it up somewhere safe. With Play App Signing (the default), Google
   holds the real signing key and this is only your upload key — but losing
   it still means a support ticket.
2. `cp android/keystore.properties.example android/keystore.properties`
   and fill in the paths/passwords. This file is gitignored — never commit it.
3. Create the app in the [Play Console](https://play.google.com/console)
   ($25 one-time) with package `com.acrogers.bibletriviacoach`.

Every release:

```sh
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew bundleRelease
```

The signed bundle lands at
`~/.gradle-builds/bible-trivia-coach/_app/outputs/bundle/release/app-release.aab`
(build outputs are redirected off the exFAT volume — see android/build.gradle).
Upload the `.aab` in Play Console → your app → Production (or Internal
testing first, recommended).

## iOS (App Store)

One-time setup:

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/)
   ($99/yr) with the team already configured in the project (W4S9QQB434).
2. Create the app record in [App Store Connect](https://appstoreconnect.apple.com)
   with bundle ID `com.acrogers.bibletriviacoach`.

Every release — either use Xcode (Product → Archive → Distribute App), or
from the terminal:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath ~/Library/Developer/Xcode/Archives/App.xcarchive archive

xcodebuild -exportArchive \
  -archivePath ~/Library/Developer/Xcode/Archives/App.xcarchive \
  -exportOptionsPlist ios/App/ExportOptions.plist \
  -exportPath ~/Library/Developer/Xcode/Archives/export
```

Upload the exported `.ipa` with Xcode's Organizer or
`xcrun altool`/Transporter. Run a TestFlight round before submitting for
review.

## Pre-submission checklist

- [ ] `npm run check` passes
- [ ] `npm run cap:sync` run after the last web change
- [ ] Version/build numbers bumped on the platform you're uploading
- [ ] Tested on a real device (haptics + notifications)
- [ ] Play data-safety / App Store privacy forms reflect the analytics
      opt-out (anonymous quiz analytics via Langfuse, no PII)
- [ ] Store listing copy stays in the coach voice — warm, no guilt
