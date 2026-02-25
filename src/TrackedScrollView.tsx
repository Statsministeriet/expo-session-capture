import React, { useRef } from 'react';
import { ScrollView } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
} from 'react-native';
import { useSessionCapture } from './useSessionCapture';

/**
 * Default minimum vertical offset change (in pixels) that triggers a
 * screenshot after scrolling ends.
 */
export const DEFAULT_SCROLL_THRESHOLD = 200;

/**
 * Props for `<TrackedScrollView>`.
 *
 * Extends all standard `ScrollViewProps` with an optional
 * `scrollThreshold`.
 */
export interface TrackedScrollViewProps extends ScrollViewProps {
  /**
   * Minimum vertical offset change (in pixels) since the last capture
   * before a new screenshot is taken when scrolling ends.
   *
   * Higher values reduce the number of frames captured during scroll;
   * lower values provide more granular visual coverage.
   *
   * @default 200
   */
  scrollThreshold?: number;
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for React Native's `<ScrollView>` that captures
 * a screenshot when scrolling ends and the vertical offset has changed
 * by more than `scrollThreshold` pixels since the last capture.
 *
 * Also records a `ScrollEvent` with the final `offsetY` and timestamp,
 * which is included in the upload payload for replay.
 *
 * Must be rendered inside a `<SessionCaptureProvider>`.
 *
 * @example
 * ```tsx
 * <TrackedScrollView scrollThreshold={150}>
 *   {articles.map(a => <ArticleCard key={a.id} article={a} />)}
 * </TrackedScrollView>
 * ```
 *
 * @see SessionCaptureProvider
 */
export function TrackedScrollView({
  scrollThreshold = DEFAULT_SCROLL_THRESHOLD,
  onScroll,
  onMomentumScrollEnd,
  onScrollEndDrag,
  children,
  ...rest
}: TrackedScrollViewProps) {
  const { manager, rootRef, isActive } = useSessionCapture();

  const lastOffset = useRef(0);
  const lastCapturedOffset = useRef(0);
  const lastRegisteredOffset = useRef<number | null>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastOffset.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  const tryCaptureAfterScrollEnd = () => {
    if (lastRegisteredOffset.current !== lastOffset.current) {
      manager.registerScroll({
        offsetY: lastOffset.current,
        timestamp: Date.now(),
      });
      lastRegisteredOffset.current = lastOffset.current;
    }

    const diff = Math.abs(lastOffset.current - lastCapturedOffset.current);
    if (diff <= scrollThreshold) return;
    if (!isActive) return;

    const previousFrames = manager.capturedFrames;

    manager
      .capture(rootRef)
      .then(() => {
        if (manager.capturedFrames > previousFrames) {
          lastCapturedOffset.current = lastOffset.current;
        }
      })
      .catch(() => {});
  };

  const handleMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    onMomentumScrollEnd?.(e);
    tryCaptureAfterScrollEnd();
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollEndDrag?.(e);
    tryCaptureAfterScrollEnd();
  };

  return (
    <ScrollView
      {...rest}
      onScroll={handleScroll}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      {children}
    </ScrollView>
  );
}
