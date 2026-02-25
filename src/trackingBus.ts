import { DeviceEventEmitter } from 'react-native';
import type { TrackingEvent } from './types';

// ── Constants ─────────────────────────────────────────────────────────

/** @internal Event name used on the React Native `DeviceEventEmitter`. */
const EVENT_NAME = 'expo-session-capture:tracking-event';

/**
 * Symbol used by `<TrackedPressable>` to mark its `onPress` handler
 * so the global press-capture layer can skip wrapping it.
 *
 * This prevents duplicate events when both the global auto-capture and
 * explicit `<TrackedPressable>` are active simultaneously.
 *
 * @internal
 */
export const EXPLICIT_HANDLER = Symbol('expo-session-capture:explicit');

// ── Bus API ───────────────────────────────────────────────────────────

/**
 * Emit a tracking event onto the central bus.
 *
 * Called by `<TrackedPressable>`, `<NavigationTracker>`, and the
 * global press-capture layer.  The `SessionCaptureProvider` subscribes
 * to this bus and routes events to the `CaptureManager`.
 *
 * A `timestamp` is added automatically — callers should **not**
 * include one.
 *
 * @param event  The tracking event (without `timestamp`).
 *
 * @example
 * ```ts
 * emitTrackingEvent({
 *   type: 'press',
 *   source: 'explicit',
 *   label: 'Buy now',
 *   category: 'conversion',
 *   coordinates: { x: 120, y: 450 },
 * });
 * ```
 */
export function emitTrackingEvent(
  event: Omit<TrackingEvent, 'timestamp'>,
): void {
  DeviceEventEmitter.emit(EVENT_NAME, {
    ...event,
    timestamp: Date.now(),
  } satisfies TrackingEvent);
}

/**
 * Subscribe to all tracking events on the central bus.
 *
 * Returns an unsubscribe function.  Typically called once by the
 * `SessionCaptureProvider` to bridge events into the `CaptureManager`.
 *
 * @param handler  Callback invoked with each {@link TrackingEvent}.
 * @returns        A function that removes the subscription.
 */
export function onTrackingEvent(
  handler: (event: TrackingEvent) => void,
): () => void {
  const subscription = DeviceEventEmitter.addListener(EVENT_NAME, handler);
  return () => subscription.remove();
}
