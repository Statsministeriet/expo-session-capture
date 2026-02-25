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

export { useSessionCapture } from './useSessionCapture';

export { shouldSample } from './sampler';

export { CaptureManager } from './captureManager';

export type {
  SessionCaptureConfig,
  CapturedFrame,
  TapEvent,
  ScrollEvent,
  DeviceInfo,
  UploadPayload,
  CaptureContextValue,
} from './types';
