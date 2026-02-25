import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import type { PressableProps, GestureResponderEvent } from 'react-native';
import { emitTrackingEvent, EXPLICIT_HANDLER } from './trackingBus';

export interface TrackedPressableProps extends PressableProps {
  children?: React.ReactNode;

  /** Screen / route name attached to tap events. */
  tapScreen?: string;

  /**
   * Human-readable label for this pressable.
   * Falls back to `accessibilityLabel` / `testID` in auto-capture,
   * but setting it here gives you full control.
   */
  trackingLabel?: string;

  /** Logical category (e.g. "conversion", "navigation"). */
  trackingCategory?: string;

  /** Arbitrary extra data sent with the tracking event. */
  trackingMetadata?: Record<string, unknown>;
}

/**
 * Drop-in replacement for `<Pressable>` that emits an **explicit**
 * tracking event on every press.  The global press-capture layer
 * automatically skips handlers created by this component, so there
 * are never duplicate events.
 */
export function TrackedPressable({
  onPress,
  tapScreen,
  trackingLabel,
  trackingCategory,
  trackingMetadata,
  children,
  ...rest
}: TrackedPressableProps) {
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      const { pageX, pageY } = e.nativeEvent;

      emitTrackingEvent({
        type: 'press',
        source: 'explicit',
        label: trackingLabel,
        category: trackingCategory,
        metadata: trackingMetadata,
        screen: tapScreen,
        coordinates: { x: pageX, y: pageY },
      });

      onPress?.(e);
    },
    [onPress, tapScreen, trackingLabel, trackingCategory, trackingMetadata],
  );

  // Mark so globalPressCapture skips this handler.
  (handlePress as any)[EXPLICIT_HANDLER] = true;

  return (
    <Pressable {...rest} onPress={handlePress}>
      {children}
    </Pressable>
  );
}
