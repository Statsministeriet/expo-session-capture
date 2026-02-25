import React from 'react';
import { Pressable } from 'react-native';
import type { PressableProps, GestureResponderEvent } from 'react-native';
import { useSessionCapture } from './useSessionCapture';

export interface TrackedPressableProps extends PressableProps {
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for `<Pressable>` that triggers a screenshot
 * capture on every press (subject to throttle & frame cap).
 */
export function TrackedPressable({
  onPress,
  children,
  ...rest
}: TrackedPressableProps) {
  const { manager, rootRef } = useSessionCapture();

  const handlePress = async (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;

    manager.registerTap({
      x: pageX,
      y: pageY,
      timestamp: Date.now(),
    });

    // Fire-and-forget – never block the UI.
    manager.capture(rootRef).catch(() => {});

    onPress?.(e);
  };

  return (
    <Pressable {...rest} onPress={handlePress}>
      {children}
    </Pressable>
  );
}
