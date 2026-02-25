import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { CapturedFrame, UploadPayload } from './types';

export interface CaptureManagerOptions {
  sessionId: string;
  userId: string;
  uploadUrl: string;
  maxFrames: number;
  throttleMs: number;
  imageQuality: number;
  imageWidth: number;
  imageHeight: number;
  device: string;
  appVersion: string;
  uploadHeaders?: Record<string, string>;
}

/**
 * Manages throttled screenshot capture, enforces a hard frame cap,
 * buffers frames, and batch-uploads them to the backend.
 */
export class CaptureManager {
  private frameCount = 0;
  private lastCaptureTs = 0;
  private frames: CapturedFrame[] = [];
  private isActive = false;
  private isFlushing = false;

  constructor(private readonly opts: CaptureManagerOptions) {}

  // ── Lifecycle ───────────────────────────────────────────────────────

  /** Activate capturing. */
  start(): void {
    this.isActive = true;
  }

  /** Deactivate and flush remaining frames. */
  stop(): void {
    this.isActive = false;
    this.flush();
  }

  /** Whether the manager is currently capturing. */
  get active(): boolean {
    return this.isActive;
  }

  /** Number of frames captured so far. */
  get capturedFrames(): number {
    return this.frameCount;
  }

  // ── Capture ─────────────────────────────────────────────────────────

  /**
   * Take a screenshot of the referenced View.
   *
   * Respects:
   * - Active state
   * - Hard frame cap
   * - Throttle interval
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

  /** Batch-upload buffered frames to the configured endpoint. */
  async flush(): Promise<void> {
    if (this.frames.length === 0) return;
    if (this.isFlushing) return;

    this.isFlushing = true;

    const payload: UploadPayload = {
      sessionId: this.opts.sessionId,
      userId: this.opts.userId,
      device: this.opts.device,
      appVersion: this.opts.appVersion,
      frames: [...this.frames],
    };

    // Clear local buffer immediately so new captures aren't lost during upload.
    this.frames = [];

    try {
      await fetch(this.opts.uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.opts.uploadHeaders,
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
