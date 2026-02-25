// ── Public API ────────────────────────────────────────────────────────

export { SessionCaptureProvider } from './SessionCaptureProvider';
export type { SessionCaptureProviderProps } from './SessionCaptureProvider';

export { TrackedPressable } from './TrackedPressable';
export type { TrackedPressableProps } from './TrackedPressable';

export {
  TrackedScrollView,
  DEFAULT_SCROLL_THRESHOLD,
} from './TrackedScrollView';
export type { TrackedScrollViewProps } from './TrackedScrollView';

export { NavigationTracker } from './NavigationTracker';

export { useSessionCapture } from './useSessionCapture';

export { shouldSample } from './sampler';

export { CaptureManager } from './captureManager';

export { installGlobalPressCapture } from './globalPressCapture';

export { emitTrackingEvent, onTrackingEvent } from './trackingBus';

export type {
  SessionCaptureConfig,
  CapturedFrame,
  TapEvent,
  ScrollEvent,
  NavigationEvent,
  DeviceInfo,
  UploadPayload,
  CaptureContextValue,
  TrackingEvent,
} from './types';
