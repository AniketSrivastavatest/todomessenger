# TodoMessenger Play Store Checklist

## Android App Bundle

Build the upload bundle from Android Studio:

```text
Build > Generate Signed Bundle / APK > Android App Bundle
```

Or from the terminal:

```powershell
.\gradlew.bat :app:bundleRelease
```

The Play Store upload file is created at:

```text
android-app/app/build/outputs/bundle/release/app-release.aab
```

## Release Signing

Create the upload key once:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore todomessenger-release.jks -alias todomessenger -keyalg RSA -keysize 2048 -validity 10000
```

Copy `keystore.properties.example` to `keystore.properties`, then replace the passwords. Keep both `keystore.properties` and the `.jks` file private.

## Store Listing Draft

App name:

```text
TodoMessenger
```

Short description:

```text
Chat, assign tasks, and turn conversations into action.
```

Full description:

```text
TodoMessenger combines familiar messaging with built-in task management. Chat with your team, create tasks from conversations, assign work, and use AI assistance to turn discussions into clear next steps.

The app supports recent chats, private chat screens, task tabs, task assignment, contact invites, AI task suggestions, and integrations planned for tools like Asana and Jira.
```

## Data Safety Notes

- The Android app loads the secure TodoMessenger web app at `https://todomessenger26.netlify.app/`.
- Messages and tasks can be stored in browser/WebView storage for the user experience.
- AI features may send selected chat context to the backend when the user asks for AI help or task suggestions.
- Contact sync and invite flows should only request real contact access after native contact permissions are implemented and disclosed.
- The app currently requests only internet and network state permissions.

## Before Production

- Add a public privacy policy URL to the Play Console.
- Confirm the Render backend URL is reachable from Android devices.
- Add `android-app/app/google-services.json` from Firebase before building the push-enabled release.
- Set Firebase backend environment variables on Render before testing push notifications.
- Confirm OpenAI billing/quota before advertising Blu AI chat features.
- Replace demo/sample data with real account-backed data before public launch.
- Test login, chats, tasks, invite flow, file picker, and AI task suggestion on at least one real Android device.
- Upload screenshots for phone, 7-inch tablet, and 10-inch tablet if you want broader device coverage.
