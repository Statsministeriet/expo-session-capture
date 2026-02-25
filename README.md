# expo-session-capture

Plug-and-play visual session capture for **Expo / React Native** apps.

Captures low-resolution screenshots, taps, scrolls, and screen navigations with deterministic sampling, throttle, hard frame cap, periodic flush, idle detection, and automatic background flush — **without any native code**.

> Works in **Expo Go** and **EAS managed builds**. No config plugins. No custom dev client.

> **See it in action →** Check out the [demo app](https://github.com/Statsministeriet/expo-session-capture-demo) for a fully working example that exercises every SDK feature.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [SessionCaptureProvider](#sessioncaptureprovider)
  - [useSessionCapture](#usesessioncapture)
  - [NavigationTracker](#navigationtracker)
  - [TrackedPressable](#trackedpressable)
  - [TrackedScrollView](#trackedscrollview)
  - [Utility Exports](#utility-exports)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [License](#license)

---

## Installation

Install the SDK and its peer dependencies:

```bash
npx expo install react-native-view-shot expo-constants expo-device
npm install expo-session-capture
```

---

## Quick Start

### 1. Get your API key

Sign up at [sessioncapture.io](https://sessioncapture.io) and create an organisation. Copy your API key from the dashboard.

### 2. Wrap your app in `SessionCaptureProvider`

```tsx
// app/_layout.tsx  (Expo Router)
import { Stack, useNavigationContainerRef } from 'expo-router';
import { SessionCaptureProvider, NavigationTracker } from 'expo-session-capture';

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  return (
    <SessionCaptureProvider
      apiKey="sc_live_xxxxxxxxxxxxx"
      endpointUrl="https://api.sessioncapture.io"
      samplingRate={0.1}   // capture 10 % of users
    >
      <Stack />
      <NavigationTracker navigationRef={navigationRef} />
    </SessionCaptureProvider>
  );
}
```

That's it — taps, screenshots, scrolls, and navigation events are now captured and uploaded automatically.

### 3. (Optional) Identify the user after login

```tsx
import { useSessionCapture } from 'expo-session-capture';

function LoginScreen() {
  const { identify } = useSessionCapture();

  const handleLogin = async () => {
    const user = await api.login(email, password);
    identify(user.id); // link this session to the real user
  };
}
```

### 4. (Optional) Use `TrackedPressable` for enriched tap data

```tsx
import { TrackedPressable } from 'expo-session-capture';

<TrackedPressable
  trackingLabel="Buy now"
  trackingCategory="conversion"
  tapScreen="ProductScreen"
  onPress={handleBuy}
>
  <Text>Buy now</Text>
</TrackedPressable>
```

### 5. (Optional) Track scroll depth with `TrackedScrollView`

```tsx
import { TrackedScrollView } from 'expo-session-capture';

<TrackedScrollView scrollThreshold={200}>
  {/* long scrollable content */}
</TrackedScrollView>
```

---

## API Reference

### `SessionCaptureProvider`

The root context provider. Wrap your entire app (or the part you want to capture) in this component.

```tsx
import { SessionCaptureProvider } from 'expo-session-capture';
```

#### Props

All props from `SessionCaptureConfig` plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | **required** | API key from your dashboard. Used to authenticate uploads. |
| `endpointUrl` | `string` | **required** | Base URL of your backend. The SDK appends `/ingest` automatically. |
| `userId` | `string` | auto-generated | Stable user identifier for deterministic sampling. If omitted an anonymous UUID is created; call `identify()` later. |
| `samplingRate` | `number` | `0.1` | Fraction of users to sample (0 – 1). `1.0` = capture everyone. |
| `maxFrames` | `number` | `500` | Hard cap on screenshots per session. |
| `throttleMs` | `number` | `200` | Minimum ms between interaction-triggered captures. |
| `imageQuality` | `number` | `0.1` | JPEG quality (0 – 1). Lower = smaller payload. |
| `imageWidth` | `number` | screen width | Width in px for captured screenshots. |
| `imageHeight` | `number` | screen height | Height in px for captured screenshots. |
| `flushIntervalMs` | `number` | `10000` | How often (ms) buffered data is uploaded. |
| `periodicCaptureMs` | `number` | `1000` | Interval (ms) for automatic background screenshots. `0` disables. |
| `idleTimeoutMs` | `number` | `10000` | Ms of inactivity before periodic captures pause. `0` disables idle detection. |
| `enableGlobalPressCapture` | `boolean` | `true` | Auto-capture all `Pressable` / `TouchableOpacity` / `TouchableHighlight` taps. |

---

### `useSessionCapture`

React hook to access the capture context. Must be called inside a `<SessionCaptureProvider>`.

```tsx
import { useSessionCapture } from 'expo-session-capture';
```

#### Return value (`CaptureContextValue`)

| Field | Type | Description |
|---|---|---|
| `manager` | `CaptureManager` | The underlying manager instance. Use `manager.capturedFrames` to read the current frame count. |
| `rootRef` | `RefObject<View>` | Ref to the root view being screenshotted. |
| `isActive` | `boolean` | Whether this user was sampled and capture is running. |
| `identify` | `(userId: string) => void` | Associate the session with a real user after login. Replaces the anonymous ID for all future uploads. |
| `userId` | `string` | The current user ID (anonymous or identified). |
| `isAnonymous` | `boolean` | `true` until `identify()` is called or a `userId` prop is provided. |

#### Usage

```tsx
function StatusBar() {
  const { isActive, manager, userId, isAnonymous, identify } = useSessionCapture();

  return (
    <Text>
      {isActive ? `Capturing · ${manager.capturedFrames} frames` : 'Not sampled'}
      {' · '}
      {isAnonymous ? 'Anonymous' : userId}
    </Text>
  );
}
```

---

### `NavigationTracker`

A renderless component that listens to React Navigation state changes and emits navigation events (screen transitions) onto the tracking bus.

```tsx
import { NavigationTracker } from 'expo-session-capture';
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `navigationRef` | `{ current: any }` | auto-resolved | A React Navigation `NavigationContainerRef`. Pass the ref from `useNavigationContainerRef()` (expo-router) or the `ref` on `<NavigationContainer>`. If omitted, the component tries to resolve it from `@react-navigation/native` at runtime. |

#### Tracked triggers

The component automatically infers how each navigation was triggered:

| Trigger | Meaning |
|---|---|
| `push` | Programmatic navigation or `NAVIGATE` action |
| `back-button` | `GO_BACK` or `POP` action |
| `swipe-back` | iOS swipe-back gesture (no explicit action, depth decreased) |
| `tab` | Tab switch |
| `pop` | `POP_TO_TOP` |
| `replace` | `REPLACE` action |
| `unknown` | Could not be determined |

#### Placement

Place it **inside** `<SessionCaptureProvider>`, alongside your navigator:

```tsx
<SessionCaptureProvider ...>
  <Stack />
  <NavigationTracker navigationRef={navigationRef} />
</SessionCaptureProvider>
```

---

### `TrackedPressable`

Drop-in replacement for React Native's `<Pressable>` that emits an **explicit** tracking event on every press. The global press-capture layer automatically skips these handlers so there are never duplicate events.

```tsx
import { TrackedPressable } from 'expo-session-capture';
```

#### Props

All standard `PressableProps` plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `trackingLabel` | `string` | — | Human-readable label for the tap (e.g. `"Add to cart"`). |
| `trackingCategory` | `string` | — | Logical category (e.g. `"conversion"`, `"navigation"`). |
| `tapScreen` | `string` | — | Screen name to associate with the tap event. |
| `trackingMetadata` | `Record<string, unknown>` | — | Arbitrary extra data sent with the event. |

#### Example

```tsx
<TrackedPressable
  trackingLabel="Remove item"
  trackingCategory="cart"
  tapScreen="CartScreen"
  onPress={() => removeItem(id)}
>
  <Text>Remove</Text>
</TrackedPressable>
```

---

### `TrackedScrollView`

Drop-in replacement for React Native's `<ScrollView>` that captures a screenshot when scrolling ends and the vertical offset has changed by more than `scrollThreshold` pixels since the last capture.

```tsx
import { TrackedScrollView } from 'expo-session-capture';
```

#### Props

All standard `ScrollViewProps` plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `scrollThreshold` | `number` | `200` | Minimum vertical offset change (px) before a screenshot is taken. |

#### Example

```tsx
<TrackedScrollView scrollThreshold={150}>
  {articles.map(a => <ArticleCard key={a.id} article={a} />)}
</TrackedScrollView>
```

---

### Utility Exports

These are exported for advanced use cases. Most apps won't need them directly.

| Export | Description |
|---|---|
| `CaptureManager` | Class that manages throttled screenshot capture, buffering, and batch upload. Accessed via `useSessionCapture().manager`. |
| `shouldSample(userId, rate)` | Pure function — returns `true` if the user should be sampled at the given rate. Deterministic (same input → same output). |
| `installGlobalPressCapture()` | Monkey-patches `React.createElement` to auto-capture all pressable taps. Called automatically when `enableGlobalPressCapture` is `true`. |
| `emitTrackingEvent(event)` | Emit a custom tracking event onto the internal bus. |
| `onTrackingEvent(handler)` | Subscribe to all tracking events. Returns an unsubscribe function. |

#### Types

All TypeScript types are exported for use in your own code:

```tsx
import type {
  SessionCaptureConfig,
  CapturedFrame,
  TapEvent,
  ScrollEvent,
  NavigationEvent,
  TrackingEvent,
  UploadPayload,
  CaptureContextValue,
  DeviceInfo,
} from 'expo-session-capture';
```

---

## How It Works

### Deterministic sampling

The same `userId` always maps to the same sampled/not-sampled bucket (stable hash of the user ID). A user is either always captured or never captured within a given rate — no inconsistent experiences across sessions.

### Global press capture

When `enableGlobalPressCapture` is `true` (default), the SDK patches `React.createElement` at startup to intercept `onPress` on all `Pressable`, `TouchableOpacity`, and `TouchableHighlight` components. Labels are inferred from `accessibilityLabel`, `aria-label`, or `testID`. Handlers created by `TrackedPressable` are automatically skipped to avoid duplicates.

### Screenshot capture

Screenshots are taken via `react-native-view-shot` on the root `<View>` ref. Captures are triggered by:

1. **User interaction** — a tap or meaningful scroll triggers an immediate capture plus a follow-up ~300 ms later to record the resulting UI change.
2. **Periodic timer** — a background screenshot every `periodicCaptureMs` (default 1 s).
3. **Navigation** — a frame before and two frames after every screen transition.

All captures are throttled by `throttleMs` and capped at `maxFrames`.

### Idle detection

If no interaction (tap, scroll, navigation) occurs for `idleTimeoutMs`, periodic captures are paused. They resume automatically on the next interaction.

### Flush & upload

Buffered frames, taps, scrolls, and navigation events are uploaded to `{endpointUrl}/ingest` every `flushIntervalMs` (default 10 s). A flush also fires automatically when the app moves to background or becomes inactive (`AppState` change).

### Non-blocking

All capture and upload operations are fire-and-forget. Errors are silently swallowed so the SDK **never** crashes or degrades the host app.

---

## Examples

### Minimal setup (Expo Router)

```tsx
import { Stack, useNavigationContainerRef } from 'expo-router';
import { SessionCaptureProvider, NavigationTracker } from 'expo-session-capture';

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  return (
    <SessionCaptureProvider
      apiKey="sc_live_xxxxxxxxxxxxx"
      endpointUrl="https://api.sessioncapture.io"
    >
      <Stack />
      <NavigationTracker navigationRef={navigationRef} />
    </SessionCaptureProvider>
  );
}
```

### With user identification

```tsx
<SessionCaptureProvider
  apiKey="sc_live_xxxxxxxxxxxxx"
  endpointUrl="https://api.sessioncapture.io"
  userId={currentUser?.id}          // sampled deterministically
  samplingRate={0.25}               // 25 % of users
  maxFrames={200}
  flushIntervalMs={15_000}
>
  {children}
</SessionCaptureProvider>
```

### Identifying a user after login

```tsx
const { identify, isAnonymous } = useSessionCapture();

async function onLogin() {
  const user = await api.login(email, password);
  identify(user.id); // session is now linked to this user
}
```

### Reading capture status

```tsx
const { isActive, manager } = useSessionCapture();

if (isActive) {
  console.log(`Captured ${manager.capturedFrames} frames so far`);
}
```

---

## License

MIT
