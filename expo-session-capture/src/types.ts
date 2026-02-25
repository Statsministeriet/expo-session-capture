import type { RefObject } from 'react';
import type { View } from 'react-native';

// ── Config ──────────────────────────────────────────────────────────────

export interface SessionCaptureConfig {
  /** Unique user identifier – used for deterministic sampling. */
  userId: string;

  /** Backend endpoint that receives the frame batch. */
  uploadUrl: string;

  /**
   * Fraction of users that will be sampled (0–1).
   * @default 0.1
   */
  samplingRate?: number;

  /**
   * Hard cap on screenshots per session.
   * @default 30
   */
  maxFrames?: number;

  /**
   * Minimum milliseconds between two captures.
   * @default 400
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
   * Optional extra headers for the upload request.
   */
  uploadHeaders?: Record<string, string>;
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
}

// ── Context value ───────────────────────────────────────────────────────

export interface CaptureContextValue {
  /** The CaptureManager instance for the current session. */
  manager: import('./captureManager').CaptureManager;

  /** Ref attached to the root View that will be screenshotted. */
  rootRef: RefObject<View | null>;

  /** Whether capture is active for this user. */
  isActive: boolean;
}
