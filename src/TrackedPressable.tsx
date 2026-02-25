import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import type { PressableProps, GestureResponderEvent } from 'react-native';
import { emitTrackingEvent, EXPLICIT_HANDLER } from './trackingBus';

/**
 * Props for `<TrackedPressable>`.
 *
 * Extends all standard `PressableProps` with optional tracking metadata
 * that is attached to the tap event for richer replay data.
 */
export interface TrackedPressableProps extends PressableProps {
  children?: React.ReactNode;

  /**
   * Screen / route name attached to tap events.
   *
   * Gives context about *where* in the app this press occurred.
   *
   * @example `"ProductScreen"`, `"CartScreen"`
   */
  tapScreen?: string;

  /**
   * Human-readable label for this pressable.
   *
   * Displayed in the replay dashboard alongside the tap indicator.
   * Falls back to `accessibilityLabel` / `testID` in auto-capture,
   * but setting it here gives you full control.
   *
   * @example `"Buy now"`, `"Add to cart: Wireless Headphones"`
   */
  trackingLabel?: string;

  /**
   * Logical category for grouping related tap events.
   *
   * Useful for filtering in the dashboard (e.g. show only
   * conversion-related taps).
   *
   * @example `"conversion"`, `"navigation"`, `"cart"`
   */
  trackingCategory?: string;

  /**
   * Arbitrary extra data sent with the tracking event.
   *
   * Included in the {@link TrackingEvent.metadata} field.
   *
   * @example `{ productId: 42, price: 79.99 }`
   */
  trackingMetadata?: Record<string, unknown>;
}

/**
 * Drop-in replacement for React Native's `<Pressable>` that emits an
 * **explicit** tracking event on every press.
 *
 * Use this component when you want fine-grained control over the label,
 * category, and metadata attached to a tap event.  The global
 * press-capture layer automatically skips handlers created by this
 * component, so there are **never** duplicate events.
 *
 * @example
 * ```tsx
 * <TrackedPressable
 *   trackingLabel="Buy now"
 *   trackingCategory="conversion"
 *   tapScreen="ProductScreen"
 *   onPress={handleBuy}
 * >
 *   <Text>Buy now</Text>
 * </TrackedPressable>
 * ```
 *
 * @see SessionCaptureProvider — the provider that consumes these events.
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
