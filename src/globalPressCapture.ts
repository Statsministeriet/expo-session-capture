import React from 'react';
import {
  Pressable,
  TouchableOpacity,
  TouchableHighlight,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { emitTrackingEvent, EXPLICIT_HANDLER } from './trackingBus';

// ── Internal helpers ──────────────────────────────────────────────────

/** Symbol used to prevent double-wrapping an `onPress` handler. */
const ALREADY_PATCHED = Symbol('already-patched');

/**
 * Try to infer a human-readable label from common component props.
 *
 * Checks (in order): `accessibilityLabel`, `aria-label`, `testID`.
 * Returns `undefined` if none are set.
 */
function getAccessibilityLabel(props: Record<string, unknown>): string | undefined {
  return (
    (props?.accessibilityLabel as string) ??
    (props?.['aria-label'] as string) ??
    (props?.testID as string) ??
    undefined
  );
}

/**
 * Wrap an `onPress` handler so it emits an `auto` tracking event
 * **before** calling the original handler.
 *
 * Skips wrapping if:
 * - The handler is already patched (`ALREADY_PATCHED` symbol).
 * - The handler was created by `<TrackedPressable>` (`EXPLICIT_HANDLER`
 *   symbol) — prevents duplicate events.
 */
function wrapOnPress(
  originalOnPress: ((e: GestureResponderEvent) => void),
  inferredLabel?: string,
): (e: GestureResponderEvent) => void {
  if ((originalOnPress as any)[ALREADY_PATCHED]) return originalOnPress;

  // If the handler was created by TrackedPressable, skip wrapping –
  // the explicit event is emitted inside TrackedPressable itself.
  if ((originalOnPress as any)[EXPLICIT_HANDLER]) return originalOnPress;

  const wrapped = (e: GestureResponderEvent) => {
    const coords =
      e?.nativeEvent != null
        ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
        : undefined;

    emitTrackingEvent({
      type: 'press',
      source: 'auto',
      label: inferredLabel,
      coordinates: coords,
    });

    return originalOnPress(e);
  };

  (wrapped as any)[ALREADY_PATCHED] = true;
  return wrapped;
}

// ── Public API ────────────────────────────────────────────────────────

let installed = false;

/**
 * Monkey-patches `React.createElement` to automatically intercept
 * `onPress` on all pressable components:
 *
 * - `Pressable`
 * - `TouchableOpacity`
 * - `TouchableHighlight`
 *
 * Labels are inferred from `accessibilityLabel`, `aria-label`, or
 * `testID`.  Handlers created by `<TrackedPressable>` are
 * automatically skipped so there are **never** duplicate events.
 *
 * Called automatically by `<SessionCaptureProvider>` when
 * `enableGlobalPressCapture` is `true` (the default).  Safe to call
 * multiple times — only patches once.
 *
 * @see TrackedPressable — for explicit, labelled tap tracking.
 */
export function installGlobalPressCapture(): void {
  if (installed) return;
  installed = true;

  const originalCreateElement = React.createElement;

  const pressableTypes = new Set<unknown>([
    Pressable,
    TouchableOpacity,
    TouchableHighlight,
  ]);

  // @ts-ignore – intentional monkey-patch
  React.createElement = function patchedCreateElement(
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) {
    if (
      props?.onPress &&
      typeof props.onPress === 'function' &&
      pressableTypes.has(type)
    ) {
      const inferredLabel = getAccessibilityLabel(props);
      props = {
        ...props,
        onPress: wrapOnPress(
          props.onPress as (e: GestureResponderEvent) => void,
          inferredLabel,
        ),
      };
    }

    return (originalCreateElement as Function).apply(this, [
      type,
      props,
      ...children,
    ]);
  };
}
