import type { RefObject } from 'react';
import type { View } from 'react-native';

// ── Config ──────────────────────────────────────────────────────────────

/**
 * Configuration for the Expo Session Capture SDK.
 *
 * Passed as props to `<SessionCaptureProvider>`.  Only `apiKey` and
 * `endpointUrl` are required — everything else has sensible defaults.
 *
 * @example
 * ```tsx
 * <SessionCaptureProvider
 *   apiKey="sc_live_xxxxxxxxxxxxx"
 *   endpointUrl="https://api.server-less.com"
 *   samplingRate={0.1}
 * />
 * ```
 */
export interface SessionCaptureConfig {
  /**
   * Unique user identifier used for **deterministic sampling**.
   *
   * The same `userId` always maps to the same sampled / not-sampled
   * bucket, so a user is either always captured or never captured
   * within a given `samplingRate`.
   *
   * If omitted, an anonymous UUID is generated automatically.
   * Call `identify(userId)` later to associate the session with a
   * real user after login.
   */
  userId?: string;

  /**
   * API key obtained from the Session Capture dashboard.
   *
   * Used to authenticate uploads and associate sessions with your
   * organisation.  Sent as the `x-api-key` header on every upload.
   */
  apiKey: string;

  /**
   * Base URL of your Session Capture backend
   * (e.g. `"https://api.server-less.com"`).
   *
   * The SDK appends `/ingest` automatically — do **not** include it
   * in this URL.
   */
  endpointUrl: string;

  /**
   * Fraction of users that will be sampled (`0` – `1`).
   *
   * - `0`   → no users captured
   * - `0.1` → 10 % of users captured (default)
   * - `1`   → every user captured
   *
   * Sampling is deterministic: the same `userId` always produces the
   * same result for a given rate.
   *
   * @default 0.1
   */
  samplingRate?: number;

  /**
   * Hard cap on the number of screenshots per session.
   *
   * Once this limit is reached the manager stops capturing and
   * flushes remaining data.  Prevents runaway storage for very
   * long sessions.
   *
   * @default 500
   */
  maxFrames?: number;

  /**
   * Minimum milliseconds between two interaction-triggered captures.
   *
   * Prevents excessive screenshots when the user taps rapidly.
   * Does **not** affect `captureImmediate()` (used for navigation).
   *
   * @default 200
   */
  throttleMs?: number;

  /**
   * JPEG quality for captured screenshots (`0` – `1`).
   *
   * Lower values produce smaller payloads but blurrier images.
   * A value around `0.1` – `0.3` is usually sufficient for replay.
   *
   * @default 0.3
   */
  imageQuality?: number;

  /**
   * Width in pixels for captured screenshots.
   *
   * Defaults to the device's screen width (`Dimensions.get('window').width`).
   *
   * @default Dimensions.get('window').width
   */
  imageWidth?: number;

  /**
   * Height in pixels for captured screenshots.
   *
   * Defaults to the device's screen height (`Dimensions.get('window').height`).
   *
   * @default Dimensions.get('window').height
   */
  imageHeight?: number;

  /**
   * Interval in milliseconds for periodic batch uploads.
   *
   * Buffered frames, taps, scrolls, and navigation events are
   * uploaded to `{endpointUrl}/ingest` on this cadence.  A flush
   * also fires automatically when the app moves to background
   * (`AppState` change).
   *
   * @default 10000
   */
  flushIntervalMs?: number;

  /**
   * Interval in milliseconds for automatic periodic screenshots.
   *
   * A background screenshot is taken on this cadence regardless of
   * user interaction, ensuring continuous visual coverage during
   * idle periods (until `idleTimeoutMs` kicks in).
   *
   * Set to `0` to disable periodic capture entirely.
   *
   * @default 1000
   */
  periodicCaptureMs?: number;

  /**
   * Milliseconds of user inactivity after which periodic screenshots
   * are **paused**.
   *
   * Captures resume automatically when the user interacts again
   * (tap, scroll, or navigation).  This saves bandwidth and storage
   * for sessions where the user leaves the app open but idle.
   *
   * Set to `0` to disable idle detection (screenshots run forever).
   *
   * @default 10000
   */
  idleTimeoutMs?: number;
}

// ── Frame ───────────────────────────────────────────────────────────────

/** A single captured screenshot with its timestamp. */
export interface CapturedFrame {
  /** Unix timestamp (ms) when the screenshot was taken. */
  timestamp: number;

  /** Base-64 encoded JPEG image data. */
  image: string;
}

/**
 * A recorded tap / press event.
 *
 * Generated either **automatically** by the global press-capture layer
 * or **explicitly** via `<TrackedPressable>`.  Both sources are merged
 * into the same upload payload.
 */
export interface TapEvent {
  /** Tap X coordinate in page-space pixels. */
  x: number;
  /** Tap Y coordinate in page-space pixels. */
  y: number;
  /** Unix timestamp (ms) when the tap occurred. */
  timestamp: number;
  /** X coordinate normalised to 0 – 1 (computed from `deviceWidth`). */
  normalizedX?: number;
  /** Y coordinate normalised to 0 – 1 (computed from `deviceHeight`). */
  normalizedY?: number;
  /** Screen / route name where the tap occurred. */
  screen?: string;
  /** Human-readable label (from `TrackedPressable` or `accessibilityLabel`). */
  label?: string;
  /** Logical category (e.g. `"conversion"`, `"navigation"`, `"cart"`). */
  category?: string;
  /**
   * How the tap was recorded:
   * - `'auto'`     — captured by the global press-capture layer
   * - `'explicit'` — recorded via `<TrackedPressable>`
   */
  source?: 'auto' | 'explicit';
}

// ── Tracking event (central bus) ────────────────────────────────────────

/**
 * A unified event emitted onto the internal tracking bus.
 *
 * Both press and navigation events flow through this type.  The
 * `SessionCaptureProvider` subscribes to the bus and routes events
 * to the `CaptureManager` for buffering and upload.
 *
 * @see emitTrackingEvent
 * @see onTrackingEvent
 */
export interface TrackingEvent {
  /** Event kind. */
  type: 'press' | 'navigation';
  /** Unix timestamp (ms) when the event occurred. */
  timestamp: number;
  /** Human-readable label — inferred from `accessibilityLabel` or set explicitly via `TrackedPressable`. */
  label?: string;
  /** Logical category (e.g. `"conversion"`, `"navigation"`). */
  category?: string;
  /** Arbitrary extra data attached via `TrackedPressable.trackingMetadata`. */
  metadata?: Record<string, unknown>;
  /**
   * How the event was captured:
   * - `'auto'`     — global press capture or navigation listener
   * - `'explicit'` — via `<TrackedPressable>`
   */
  source: 'auto' | 'explicit';
  /** Component display name (auto-capture only). */
  componentName?: string;
  /** Tap coordinates in page space (press events only). */
  coordinates?: { x: number; y: number };
  /** Screen / route name the event is associated with. */
  screen?: string;
  /** Route the user navigated **away from** (navigation events only). */
  fromScreen?: string;
  /**
   * How the navigation was triggered (navigation events only).
   * @see NavigationEvent['trigger']
   */
  navigationTrigger?: NavigationEvent['trigger'];
}

/**
 * A recorded screen navigation event.
 *
 * Captured automatically by `<NavigationTracker>`, which listens to
 * React Navigation state changes and infers the trigger type.
 *
 * @see NavigationTracker
 */
export interface NavigationEvent {
  /** Unix timestamp (ms) when the navigation occurred. */
  timestamp: number;
  /** Route the user navigated **away from**. */
  from?: string;
  /** Route the user navigated **to**. */
  to?: string;
  /**
   * How the navigation was triggered.
   *
   * | Value          | Meaning                                          |
   * |----------------|--------------------------------------------------|
   * | `push`         | Programmatic navigation or `NAVIGATE` action     |
   * | `back-button`  | `GO_BACK` or `POP` action                        |
   * | `swipe-back`   | iOS swipe-back gesture (no explicit action)      |
   * | `tab`          | Tab switch                                       |
   * | `pop`          | `POP_TO_TOP`                                     |
   * | `replace`      | `REPLACE` action                                 |
   * | `unknown`      | Could not be determined                          |
   */
  trigger: 'back-button' | 'swipe-back' | 'tab' | 'push' | 'pop' | 'replace' | 'unknown';
}

/**
 * A recorded scroll event with the vertical offset at the time of capture.
 *
 * Generated by `<TrackedScrollView>` when the user finishes scrolling.
 */
export interface ScrollEvent {
  /** Vertical scroll offset in pixels. */
  offsetY: number;
  /** Unix timestamp (ms) when the scroll was recorded. */
  timestamp: number;
}

/**
 * Device dimensions used to compute normalised tap coordinates.
 *
 * Set automatically by the `SessionCaptureProvider` from
 * `Dimensions.get('window')`.
 */
export interface DeviceInfo {
  /** Device screen width in pixels. */
  deviceWidth: number;
  /** Device screen height in pixels. */
  deviceHeight: number;
}

// ── Upload payload ──────────────────────────────────────────────────────

/**
 * The JSON payload sent to `{endpointUrl}/ingest` on each flush.
 *
 * Contains all buffered frames, taps, scrolls, and navigation events
 * since the last upload.  The backend uses `sessionId` to group
 * payloads into a single replayable session.
 */
export interface UploadPayload {
  /** Unique ID for this session (generated once per app mount). */
  sessionId: string;
  /** The user ID at the time of upload (may be anonymous or identified). */
  userId: string;
  /** Device model name (e.g. `"iPhone 15 Pro"`) or `"{OS}-{version}"`. */
  device: string;
  /** App version from `expo-constants`. */
  appVersion: string;
  /** Device screen width in pixels (for coordinate normalisation). */
  deviceWidth?: number;
  /** Device screen height in pixels (for coordinate normalisation). */
  deviceHeight?: number;
  /** Captured screenshot frames since the last flush. */
  frames: CapturedFrame[];
  /** Recorded tap events since the last flush. */
  taps: TapEvent[];
  /** Recorded scroll events since the last flush. */
  scrolls: ScrollEvent[];
  /** Recorded navigation events since the last flush. */
  navigations: NavigationEvent[];
}

// ── Context value ───────────────────────────────────────────────────────

/**
 * Value returned by the `useSessionCapture()` hook.
 *
 * Provides access to the capture manager, session state, and the
 * `identify()` API for linking anonymous sessions to real users.
 *
 * @example
 * ```tsx
 * const { isActive, manager, identify, userId, isAnonymous } = useSessionCapture();
 * ```
 *
 * @see useSessionCapture
 */
export interface CaptureContextValue {
  /**
   * The `CaptureManager` instance for the current session.
   *
   * Use `manager.capturedFrames` to read the current frame count.
   */
  manager: import('./captureManager').CaptureManager;

  /** Ref attached to the root `<View>` that will be screenshotted. */
  rootRef: RefObject<View | null>;

  /**
   * Whether capture is **active** for this user.
   *
   * `true` when the user was included by deterministic sampling
   * and the manager is running.  `false` means no data is being
   * captured (the SDK is a no-op for this session).
   */
  isActive: boolean;

  /**
   * Associate the current session with a known user.
   *
   * Call this after the user logs in to replace the anonymous
   * identifier with their real user ID.  The new ID is used for
   * all subsequent uploads within the same session.
   *
   * @example
   * ```tsx
   * const { identify } = useSessionCapture();
   * identify('user-42');
   * ```
   */
  identify: (userId: string) => void;

  /** The current user ID (anonymous UUID or the value passed to `identify()`). */
  userId: string;

  /**
   * `true` until `identify()` is called or a `userId` prop is
   * provided to `<SessionCaptureProvider>`.
   */
  isAnonymous: boolean;
}
