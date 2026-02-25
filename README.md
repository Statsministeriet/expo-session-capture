# expo-session-capture

Plug-and-play visual session capture for **Expo / React Native** apps.

Captures low-resolution screenshots, taps, and scrolls with deterministic sampling, throttle, hard frame cap, periodic flush, and automatic background flush – without any native code.

---

## Install

```bash
npx expo install react-native-view-shot expo-constants expo-device
npm install expo-session-capture
```

> No config plugins. No custom dev client. Works in Expo Go and EAS managed builds.

---

## Quick start

### 1. Get your API key

Sign up at [sessioncapture.io](https://sessioncapture.io) and create an organisation. Copy your API key from the dashboard.

### 2. Wrap your app

```tsx
import { SessionCaptureProvider } from 'expo-session-capture';

export default function App() {
  return (
    <SessionCaptureProvider
      userId={user.id}
      apiKey="sc_live_xxxxxxxxxxxxx"
      endpointUrl="https://api.sessioncapture.io"
      samplingRate={0.1} // 10 % of users
      maxFrames={30}     // hard cap per session
    >
      <Navigation />
    </SessionCaptureProvider>
  );
}
```

That's it! Sessions are automatically captured and uploaded.

### 3. (Optional) Use `TrackedPressable` for richer data

```tsx
import { TrackedPressable } from 'expo-session-capture';

<TrackedPressable
  trackingLabel="Buy now"
  trackingCategory="conversion"
  tapScreen="ProductScreen"
  onPress={handlePress}
>
  <Text>Buy now</Text>
</TrackedPressable>
```

### 4. (Optional) Track scroll-heavy screens

```tsx
import { TrackedScrollView } from 'expo-session-capture';

<TrackedScrollView scrollThreshold={200}>
  {/* long list content */}
</TrackedScrollView>
```

---

## Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | — | Stable user identifier for deterministic sampling |
| `apiKey` | `string` | — | API key from your SessionCapture dashboard |
| `endpointUrl` | `string` | — | Base URL of your SessionCapture backend |
| `samplingRate` | `number` | `0.1` | Fraction of users to sample (0–1) |
| `maxFrames` | `number` | `30` | Hard cap on screenshots per session |
| `throttleMs` | `number` | `400` | Minimum ms between captures |
| `imageQuality` | `number` | `0.3` | JPEG quality (0–1) |
| `flushIntervalMs` | `number` | `10000` | Periodic flush interval in ms |
| `enableGlobalPressCapture` | `boolean` | `true` | Auto-capture all Pressable taps |

---

## How it works

- **Deterministic sampling**: same user always sampled or not based on `userId`
- **Global press capture**: monkey-patches `React.createElement` to intercept all `Pressable`/`TouchableOpacity`/`TouchableHighlight` presses
- **Periodic flush**: uploads buffered data every 10 seconds (configurable)
- **Background flush**: automatically flushes when the app moves to background or becomes inactive
- **Non-blocking**: all capture and upload operations are fire-and-forget; never crashes your app

---

## License

MIT
