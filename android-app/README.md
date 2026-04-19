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

## Build APK

In Android Studio:

```text
Build -> Build Bundle(s) / APK(s) -> Build APK(s)
```

The APK will be created under:

```text
android-app/app/build/outputs/apk/
```

## Notes

- This is a WebView app, so it uses the deployed Netlify frontend and Render backend.
- JavaScript and localStorage are enabled.
- Non-web links, such as `mailto:`, `sms:`, and custom URL schemes, open externally.
- For Play Store release, create a signed release build in Android Studio.
