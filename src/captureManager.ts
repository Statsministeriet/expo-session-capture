import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type {
  CapturedFrame,
  DeviceInfo,
  NavigationEvent,
  ScrollEvent,
  TapEvent,
  UploadPayload,
} from './types';

/**
 * Configuration options for the {@link CaptureManager}.
 *
 * Typically constructed internally by `<SessionCaptureProvider>` from
 * the provider props — not set directly by consumers.
 *
 * @internal
 */
export interface CaptureManagerOptions {
  sessionId: string;
  userId: string;
  endpointUrl: string;
  apiKey: string;
  maxFrames: number;
  throttleMs: number;
  imageQuality: number;
  imageWidth: number;
  imageHeight: number;
  device: string;
  appVersion: string;
  flushIntervalMs: number;
  periodicCaptureMs: number;
  idleTimeoutMs: number;
}

/**
 * Core engine for Expo Session Capture.
 *
 * Manages the full capture lifecycle:
 *
 * 1. **Throttled screenshots** via `react-native-view-shot`, respecting
 *    `throttleMs` and a hard `maxFrames` cap.
 * 2. **Event buffering** — tap, scroll, and navigation events are
 *    accumulated in memory between flushes.
 * 3. **Periodic flush** — uploads buffered data to
 *    `{endpointUrl}/ingest` every `flushIntervalMs`.
 * 4. **Periodic background capture** — takes a screenshot every
 *    `periodicCaptureMs`, pausing when idle (`idleTimeoutMs`).
 * 5. **Non-blocking** — all capture and upload operations are
 *    fire-and-forget; errors are silently swallowed so the SDK
 *    **never** crashes the host app.
 *
 * Accessed via `useSessionCapture().manager` in consumer code.
 *
 * @see SessionCaptureProvider — creates and manages this instance.
 * @see useSessionCapture — hook to access the manager from child components.
 */
export class CaptureManager {
  private frameCount = 0;
  private lastCaptureTs = 0;
  private frames: CapturedFrame[] = [];
  private taps: TapEvent[] = [];
  private scrolls: ScrollEvent[] = [];
  private navigations: NavigationEvent[] = [];
  private deviceInfo: DeviceInfo | null = null;
  private isActive = false;
  private isFlushing = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private periodicCaptureTimer: ReturnType<typeof setInterval> | null = null;
  private periodicCaptureRef: RefObject<View | null> | null = null;
  private lastInteractionTs = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isIdle = false;

  constructor(private opts: CaptureManagerOptions) {}

  // ── Identity ────────────────────────────────────────────────────────

  /** Update the user ID for all subsequent uploads in this session. */
  setUserId(userId: string): void {
    this.opts.userId = userId;
  }

  /** Return the current user ID. */
  getUserId(): string {
    return this.opts.userId;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  /** Activate capturing and start the periodic flush timer. */
  start(): void {
    this.isActive = true;
    this.lastInteractionTs = Date.now();
    this.isIdle = false;
    this.startPeriodicFlush();
  }

  /**
   * Start periodic background screenshot capture.
   *
   * A screenshot is taken every `periodicCaptureMs` as long as the
   * user is not idle.  Pauses automatically after `idleTimeoutMs`
   * of inactivity and resumes on the next interaction.
   *
   * Must be called after `start()` with the root View ref.
   */
  startPeriodicCapture(ref: RefObject<View | null>): void {
    this.periodicCaptureRef = ref;
    this.stopPeriodicCapture();
    if (this.opts.periodicCaptureMs <= 0) return;
    this.periodicCaptureTimer = setInterval(() => {
      if (this.isActive && this.periodicCaptureRef && !this.isIdle) {
        this.capture(this.periodicCaptureRef).catch(() => {});
      }
    }, this.opts.periodicCaptureMs);
    this.resetIdleTimer();
  }

  private stopPeriodicCapture(): void {
    if (this.periodicCaptureTimer !== null) {
      clearInterval(this.periodicCaptureTimer);
      this.periodicCaptureTimer = null;
    }
  }

  /**
   * Deactivate capturing, stop all timers, and flush remaining
   * buffered data to the backend.
   */
  stop(): void {
    this.isActive = false;
    this.stopPeriodicFlush();
    this.stopPeriodicCapture();
    this.clearIdleTimer();
    this.flush();
  }

  /** Whether the manager is currently capturing. */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Number of screenshot frames captured so far in this session.
   *
   * Stops incrementing once `maxFrames` is reached.
   */
  get capturedFrames(): number {
    return this.frameCount;
  }

  // ── Periodic flush ─────────────────────────────────────────────────

  private startPeriodicFlush(): void {
    this.stopPeriodicFlush();
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.opts.flushIntervalMs);
  }

  private stopPeriodicFlush(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ── Structured events ──────────────────────────────────────────────

  /** Set the device dimensions, used to compute normalised tap coordinates. */
  setDeviceInfo(deviceInfo: DeviceInfo): void {
    this.deviceInfo = deviceInfo;
  }

  /**
   * Buffer a tap event.
   *
   * If raw page-space coordinates are provided without normalised
   * values, they are automatically normalised using the device
   * dimensions (if available).
   */
  registerTap(tap: TapEvent): void {
    if (!this.isActive) return;
    this.notifyInteraction();

    const hasNormalizedCoordinates =
      typeof tap.normalizedX === 'number' && typeof tap.normalizedY === 'number';

    if (hasNormalizedCoordinates || !this.deviceInfo) {
      this.taps.push(tap);
      return;
    }

    this.taps.push({
      ...tap,
      normalizedX: tap.x / this.deviceInfo.deviceWidth,
      normalizedY: tap.y / this.deviceInfo.deviceHeight,
    });
  }

  /** Buffer a scroll event with the current vertical offset. */
  registerScroll(scroll: ScrollEvent): void {
    if (!this.isActive) return;
    this.notifyInteraction();
    this.scrolls.push(scroll);
  }

  /** Buffer a navigation event (screen transition). */
  registerNavigation(nav: NavigationEvent): void {
    if (!this.isActive) return;
    this.notifyInteraction();
    this.navigations.push(nav);
  }

  // ── Idle detection ─────────────────────────────────────────────────

  /**
   * Signal that the user interacted with the app.
   * Resets the idle timer and resumes periodic captures if paused.
   */
  notifyInteraction(): void {
    this.lastInteractionTs = Date.now();

    if (this.isIdle) {
      this.isIdle = false;
      // Resume periodic captures that were paused due to idle.
      if (this.periodicCaptureRef) {
        this.startPeriodicCapture(this.periodicCaptureRef);
      }
    }

    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (this.opts.idleTimeoutMs <= 0) return;

    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
    }, this.opts.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // ── Capture ─────────────────────────────────────────────────────────

  /**
   * Take a screenshot of the root `<View>` ref.
   *
   * Respects:
   * - **Active state** — no-op if capture is not running.
   * - **Hard frame cap** — stops and flushes if `maxFrames` reached.
   * - **Throttle** — skips if called within `throttleMs` of the last
   *   capture (use `captureImmediate()` to bypass).
   */
  async capture(ref: RefObject<View | null>): Promise<void> {
    if (!this.isActive) return;
    if (this.frameCount >= this.opts.maxFrames) {
      // Cap reached – flush and stop.
      this.stop();
      return;
    }

    const now = Date.now();
    if (now - this.lastCaptureTs < this.opts.throttleMs) return;

    return this._doCapture(ref, now);
  }

  /**
   * Take a screenshot immediately, **bypassing the throttle**.
   *
   * Used for navigation events where capturing both the departure and
   * arrival screens is important.  Still respects active state and
   * the hard frame cap.
   */
  async captureImmediate(ref: RefObject<View | null>): Promise<void> {
    if (!this.isActive) return;
    if (this.frameCount >= this.opts.maxFrames) {
      this.stop();
      return;
    }

    return this._doCapture(ref, Date.now());
  }

  private async _doCapture(ref: RefObject<View | null>, now: number): Promise<void> {
    this.lastCaptureTs = now;
    this.frameCount++;

    try {
      const base64 = await captureRef(ref, {
        format: 'jpg',
        quality: this.opts.imageQuality,
        result: 'base64',
        width: this.opts.imageWidth,
        height: this.opts.imageHeight,
      });

      this.frames.push({
        image: base64,
        timestamp: now,
      });
    } catch {
      // Screenshot can fail silently – never crash the host app.
      this.frameCount--; // don't penalise on failure
    }
  }

  // ── Upload ──────────────────────────────────────────────────────────

  /**
   * Batch-upload all buffered data to `{endpointUrl}/ingest`.
   *
   * The local buffer is cleared immediately so new captures during
   * upload are not lost.  If the upload fails, the frames are
   * discarded (non-blocking / fire-and-forget).
   */
  async flush(): Promise<void> {
    if (
      this.frames.length === 0 &&
      this.taps.length === 0 &&
      this.scrolls.length === 0 &&
      this.navigations.length === 0
    ) {
      return;
    }
    if (this.isFlushing) return;

    this.isFlushing = true;

    const payload: UploadPayload = {
      sessionId: this.opts.sessionId,
      userId: this.opts.userId,
      device: this.opts.device,
      appVersion: this.opts.appVersion,
      deviceWidth: this.deviceInfo?.deviceWidth,
      deviceHeight: this.deviceInfo?.deviceHeight,
      frames: [...this.frames],
      taps: [...this.taps],
      scrolls: [...this.scrolls],
      navigations: [...this.navigations],
    };

    // Clear local buffer immediately so new captures aren't lost during upload.
    this.frames = [];
    this.taps = [];
    this.scrolls = [];
    this.navigations = [];

    try {
      const url = this.opts.endpointUrl.replace(/\/+$/, '') + '/ingest';
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.opts.apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Upload failure is non-fatal – frames are lost, but the app stays stable.
    } finally {
      this.isFlushing = false;
    }
  }
}
