# Creating a Development Build

## Option 1: Cloud Build (Recommended for First Time)

Build on EAS servers - takes ~10-15 minutes:

```bash
# Login to Expo
eas login

# Build development client for iOS
eas build --profile development --platform ios

# OR for Android
eas build --profile development --platform android

# OR both platforms
eas build --profile development --platform all
```

After build completes, you'll get a download link. Install the `.ipa` (iOS) or `.apk` (Android) on your device.

## Option 2: Local Build (Faster Iterations)

Build on your local machine:

```bash
# For iOS (requires Mac + Xcode)
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios

# For Android (requires Android Studio + Android SDK)
npx expo prebuild --clean
npx expo run:android
```

## Using the Development Build

Once you have the development client installed:

1. **Make sure your dev server is running:**
   ```bash
   npm start
   ```

2. **Open the app** on your device/simulator - it will connect to your dev server

3. The app will now work with native modules like `onnxruntime-react-native`

## Notes

- Development builds take longer to install but allow custom native code
- After the first build, subsequent updates are instant (just JavaScript)
- Use `eas update` to push OTA updates to your development build
- Production builds use the same process but with `--profile production`

