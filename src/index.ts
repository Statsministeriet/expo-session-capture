/**
 * @module expo-session-capture
 *
 * Plug-and-play visual session capture for Expo / React Native apps.
 *
 * ## Quick start
 *
 * ```tsx
 * import { SessionCaptureProvider, NavigationTracker } from 'expo-session-capture';
 *
 * <SessionCaptureProvider
 *   apiKey="sc_live_xxxxxxxxxxxxx"
 *   endpointUrl="https://api.sessioncapture.io"
 *   samplingRate={0.1}
 * >
 *   <Stack />
 *   <NavigationTracker navigationRef={navigationRef} />
 * </SessionCaptureProvider>
 * ```
 *
 * ## Exports at a glance
 *
 * | Export                     | Kind       | Purpose                                         |
 * |----------------------------|------------|--------------------------------------------------|
 * | `SessionCaptureProvider`   | Component  | Root provider — wrap your app in this            |
 * | `useSessionCapture`        | Hook       | Access context (manager, identify, isActive)     |
 * | `NavigationTracker`        | Component  | Tracks screen transitions                        |
 * | `TrackedPressable`         | Component  | Enriched tap tracking (label, category)          |
 * | `TrackedScrollView`        | Component  | Screenshot on meaningful scroll                  |
 * | `CaptureManager`           | Class      | Low-level capture engine                         |
 * | `shouldSample`             | Function   | Deterministic sampling check                     |
 * | `installGlobalPressCapture`| Function   | Auto-capture all pressable taps                  |
 * | `emitTrackingEvent`        | Function   | Emit a custom event onto the bus                 |
 * | `onTrackingEvent`          | Function   | Subscribe to all tracking events                 |
 *
 * @packageDocumentation
 */

// ── Components ────────────────────────────────────────────────────────

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

// ── Hooks ─────────────────────────────────────────────────────────────

export { useSessionCapture } from './useSessionCapture';

// ── Utilities ─────────────────────────────────────────────────────────

export { shouldSample } from './sampler';

export { CaptureManager } from './captureManager';

export { installGlobalPressCapture } from './globalPressCapture';

export { emitTrackingEvent, onTrackingEvent } from './trackingBus';

// ── Types ─────────────────────────────────────────────────────────────

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
