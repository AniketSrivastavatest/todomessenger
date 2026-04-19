# TodoMessenger Android

Native Android wrapper for the live TodoMessenger web app.

The app loads:

```text
https://todomessenger26.netlify.app/
```

## Build With Android Studio

1. Install Android Studio.
2. Open the `android-app` folder.
3. Let Android Studio sync Gradle.
4. Select a device or emulator.
5. Click Run.

## Build Debug APK

In Android Studio:

```text
Build -> Build Bundle(s) / APK(s) -> Build APK(s)
```

The APK will be created under:

```text
android-app/app/build/outputs/apk/
```

## Build Play Store App Bundle

Create a private release keystore:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore todomessenger-release.jks -alias todomessenger -keyalg RSA -keysize 2048 -validity 10000
```

Copy `keystore.properties.example` to `keystore.properties` and fill in the real passwords. Then build the Play Store bundle:

```powershell
.\gradlew.bat :app:bundleRelease
```

The upload file will be created at:

```text
android-app/app/build/outputs/bundle/release/app-release.aab
```

## Firebase Cloud Messaging

1. Open Firebase Console and create or select a project.
2. Add an Android app with package name:

```text
com.todomessenger.app
```

3. Download `google-services.json`.
4. Place it here:

```text
android-app/app/google-services.json
```

5. Sync Gradle in Android Studio and rebuild.

The file is ignored by Git because it is environment-specific. After Firebase is configured, the native app asks for notification permission, receives an FCM token, registers it directly with the Render backend, and also passes it into the TodoMessenger WebView for the web UI.

## Notes

- This is a WebView app, so it uses the deployed Netlify frontend and Render backend.
- JavaScript and localStorage are enabled.
- Non-web links, such as `mailto:`, `sms:`, and custom URL schemes, open externally.
- The release build uses code shrinking and resource shrinking.
- See `PLAY_STORE_CHECKLIST.md` before uploading to Google Play.
