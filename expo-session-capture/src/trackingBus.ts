import { DeviceEventEmitter } from 'react-native';
import type { TrackingEvent } from './types';

// ── Constants ─────────────────────────────────────────────────────────

const EVENT_NAME = 'expo-session-capture:tracking-event';

/**
 * Symbol used by TrackedPressable to mark its handler so the global
 * capture layer can skip wrapping it (avoids duplicate events).
 */
export const EXPLICIT_HANDLER = Symbol('expo-session-capture:explicit');

// ── Bus API ───────────────────────────────────────────────────────────

/** Emit a tracking event onto the central bus. */
export function emitTrackingEvent(
  event: Omit<TrackingEvent, 'timestamp'>,
): void {
  DeviceEventEmitter.emit(EVENT_NAME, {
    ...event,
    timestamp: Date.now(),
  } satisfies TrackingEvent);
}

/**
 * Subscribe to all tracking events.
 * Returns an unsubscribe function.
 */
export function onTrackingEvent(
  handler: (event: TrackingEvent) => void,
): () => void {
  const subscription = DeviceEventEmitter.addListener(EVENT_NAME, handler);
  return () => subscription.remove();
}
