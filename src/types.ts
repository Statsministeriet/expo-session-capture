import type { RefObject } from 'react';
import type { View } from 'react-native';

// ── Config ──────────────────────────────────────────────────────────────

export interface SessionCaptureConfig {
  /**
   * Unique user identifier – used for deterministic sampling.
   * If omitted, an anonymous UUID is generated automatically.
   * Call `identify(userId)` later to associate the session with a real user.
   */
  userId?: string;

  /**
   * API key obtained from the SessionCapture dashboard.
   * Used to authenticate uploads and associate sessions with your organisation.
   */
  apiKey: string;

  /**
   * Base URL of your SessionCapture backend
   * (e.g. "https://api.sessioncapture.io").
   * The SDK appends `/ingest` automatically.
   */
  endpointUrl: string;

  /**
   * Fraction of users that will be sampled (0–1).
   * @default 0.1
   */
  samplingRate?: number;

  /**
   * Hard cap on screenshots per session.
   * @default 500
   */
  maxFrames?: number;

  /**
   * Minimum milliseconds between two captures.
   * @default 200
   */
  throttleMs?: number;

  /**
   * JPEG quality (0–1).
   * @default 0.3
   */
  imageQuality?: number;

  /**
   * Capture width in px.
   * @default Dimensions.get('window').width
   */
  imageWidth?: number;

  /**
   * Capture height in px.
   * @default Dimensions.get('window').height
   */
  imageHeight?: number;

  /**
   * Interval in milliseconds for automatic periodic flushing.
   * @default 10000
   */
  flushIntervalMs?: number;

  /**
   * Interval in milliseconds for periodic background screenshots.
   * Set to `0` to disable periodic capture.
   * @default 1000
   */
  periodicCaptureMs?: number;

  /**
   * Milliseconds of user inactivity after which periodic screenshots
   * are paused.  Captures resume automatically when the user interacts
   * again (tap, scroll, or navigation).
   *
   * Set to `0` to disable idle detection (screenshots run forever).
   * @default 10000
   */
  idleTimeoutMs?: number;
}

// ── Frame ───────────────────────────────────────────────────────────────

export interface CapturedFrame {
  /** Unix timestamp (ms) when the capture happened. */
  timestamp: number;

  /** Base-64 encoded JPEG. */
  image: string;
}

export interface TapEvent {
  x: number;
  y: number;
  timestamp: number;
  normalizedX?: number;
  normalizedY?: number;
  screen?: string;
  /** Human-readable label (from TrackedPressable or accessibilityLabel). */
  label?: string;
  /** Logical category (e.g. "conversion", "navigation"). */
  category?: string;
  /** Whether this tap was recorded automatically or via TrackedPressable. */
  source?: 'auto' | 'explicit';
}

// ── Tracking event (central bus) ────────────────────────────────────────

export interface TrackingEvent {
  type: 'press' | 'navigation';
  timestamp: number;
  /** Human-readable label – inferred from accessibilityLabel or set explicitly. */
  label?: string;
  /** Logical category (e.g. "conversion", "navigation"). */
  category?: string;
  /** Arbitrary extra data attached via TrackedPressable. */
  metadata?: Record<string, unknown>;
  /** `auto` = captured by global press capture, `explicit` = via TrackedPressable. */
  source: 'auto' | 'explicit';
  /** Component display name (auto-capture only). */
  componentName?: string;
  /** Tap coordinates in page space. */
  coordinates?: { x: number; y: number };
  /** Screen / route name. */
  screen?: string;
  /** Route the user navigated away from (navigation events only). */
  fromScreen?: string;
  /** How the navigation was triggered (navigation events only). */
  navigationTrigger?: NavigationEvent['trigger'];
}

export interface NavigationEvent {
  /** Unix timestamp (ms) when the navigation occurred. */
  timestamp: number;
  /** Route the user navigated away from. */
  from?: string;
  /** Route the user navigated to. */
  to?: string;
  /** How the navigation was triggered. */
  trigger: 'back-button' | 'swipe-back' | 'tab' | 'push' | 'pop' | 'replace' | 'unknown';
}

export interface ScrollEvent {
  offsetY: number;
  timestamp: number;
}

export interface DeviceInfo {
  deviceWidth: number;
  deviceHeight: number;
}

// ── Upload payload ──────────────────────────────────────────────────────

export interface UploadPayload {
  sessionId: string;
  userId: string;
  device: string;
  appVersion: string;
  deviceWidth?: number;
  deviceHeight?: number;
  frames: CapturedFrame[];
  taps: TapEvent[];
  scrolls: ScrollEvent[];
  navigations: NavigationEvent[];
}

// ── Context value ───────────────────────────────────────────────────────

export interface CaptureContextValue {
  /** The CaptureManager instance for the current session. */
  manager: import('./captureManager').CaptureManager;

  /** Ref attached to the root View that will be screenshotted. */
  rootRef: RefObject<View | null>;

  /** Whether capture is active for this user. */
  isActive: boolean;

  /**
   * Associate the current session with a known user.
   *
   * Call this after the user logs in to replace the anonymous
   * identifier with their real user ID.  The new ID is used for
   * all subsequent uploads within the same session.
   */
  identify: (userId: string) => void;

  /** The current user ID (anonymous or identified). */
  userId: string;

  /** Whether the current user ID is anonymous (auto-generated). */
  isAnonymous: boolean;
}
