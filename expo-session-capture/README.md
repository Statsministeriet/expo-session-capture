# expo-session-capture

Sampled visual session capture for **Expo managed** apps.

Captures low-resolution screenshots on press events with deterministic sampling, throttle, hard frame cap, and batch upload – without any native code.

---

## Install

```bash
npx expo install react-native-view-shot
npm install expo-session-capture
```

> No config plugins. No custom dev client. Works in Expo Go and EAS managed builds.

---

## Quick start

### 1. Wrap your app

```tsx
import { SessionCaptureProvider } from 'expo-session-capture';

export default function App() {
  return (
    <SessionCaptureProvider
      userId={user.id}
      uploadUrl="https://api.example.com/session-upload"
      samplingRate={0.1}   // 10 % of users
      maxFrames={30}       // hard cap per session
    >
      <Navigation />
    </SessionCaptureProvider>
  );
}
```

### 2. Use `TrackedPressable`

Replace `Pressable` with `TrackedPressable` on buttons you want to track:

```tsx
import { TrackedPressable } from 'expo-session-capture';

<TrackedPressable onPress={handlePress}>
  <Text>Buy now</Text>
</TrackedPressable>
```

**That's it.** No other integration needed.

---

## Props

### `SessionCaptureProvider`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | *required* | Stable user ID for deterministic sampling |
| `uploadUrl` | `string` | *required* | Backend endpoint that receives frame batches |
| `samplingRate` | `number` | `0.1` | Fraction of users captured (0–1) |
| `maxFrames` | `number` | `30` | Max screenshots per session |
| `throttleMs` | `number` | `400` | Min interval between captures (ms) |
| `imageQuality` | `number` | `0.3` | JPEG quality (0–1) |
| `imageWidth` | `number` | `360` | Screenshot width (px) |
| `imageHeight` | `number` | `640` | Screenshot height (px) |
| `uploadHeaders` | `Record<string, string>` | – | Extra headers for upload requests |

### `TrackedPressable`

Drop-in replacement for React Native's `<Pressable>`. Same props, same behaviour – plus automatic screenshot on press.

---

## How it works

1. **Sampling** – `shouldSample(userId, rate)` deterministically hashes the user ID. The same user is always either captured or not, ensuring consistent experience across sessions.

2. **Capture** – On every `TrackedPressable` press, the root `<View>` is screenshotted via `react-native-view-shot` (low-res JPEG, base-64).

3. **Throttle** – At most one capture per 400 ms (configurable).

4. **Hard cap** – After `maxFrames` captures, the session stops recording and flushes.

5. **Upload** – Frames are batch-uploaded as JSON to your endpoint on:
   - `maxFrames` reached
   - App going to background
   - Session end (provider unmount)

---

## Backend payload

```json
{
  "sessionId": "a1b2c3d4-...",
  "userId": "user_42",
  "device": "iPhone 15 Pro",
  "appVersion": "1.2.3",
  "frames": [
    {
      "timestamp": 1700000000000,
      "image": "/9j/4AAQ..."
    }
  ]
}
```

---

## Hooks

### `useSessionCapture()`

Access the capture context from any component inside the provider:

```tsx
import { useSessionCapture } from 'expo-session-capture';

const { manager, rootRef, isActive } = useSessionCapture();
```

Useful for manual capture triggers or checking sampling status.

---

## Expo compliance

- No native modules
- Only peer-dep on `react-native-view-shot` (Expo-compatible)
- Works in managed workflow
- No config plugins
- No custom build required

---

## License

MIT
