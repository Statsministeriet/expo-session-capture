// ── Public API ────────────────────────────────────────────────────────

export { SessionCaptureProvider } from './SessionCaptureProvider';
export type { SessionCaptureProviderProps } from './SessionCaptureProvider';

export { TrackedPressable } from './TrackedPressable';
export type { TrackedPressableProps } from './TrackedPressable';

export { useSessionCapture } from './useSessionCapture';

export { shouldSample } from './sampler';

export { CaptureManager } from './captureManager';

export type {
  SessionCaptureConfig,
  CapturedFrame,
  UploadPayload,
  CaptureContextValue,
} from './types';
