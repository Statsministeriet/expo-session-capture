import { useContext } from 'react';
import { CaptureContext } from './SessionCaptureProvider';
import type { CaptureContextValue } from './types';

/**
 * Access the Expo Session Capture context from any child component.
 *
 * Must be called inside a `<SessionCaptureProvider>`.  Throws if the
 * provider is missing.
 *
 * @returns The {@link CaptureContextValue} containing:
 *  - `manager`     — the `CaptureManager` instance (e.g. `manager.capturedFrames`)
 *  - `rootRef`     — ref to the root `<View>` being captured
 *  - `isActive`    — whether this user is being sampled
 *  - `identify`    — link this session to a real user after login
 *  - `userId`      — current user ID (anonymous or identified)
 *  - `isAnonymous` — `true` until `identify()` is called
 *
 * @example
 * ```tsx
 * const { isActive, manager, identify } = useSessionCapture();
 *
 * // Check if capturing
 * if (isActive) {
 *   console.log(`Captured ${manager.capturedFrames} frames`);
 * }
 *
 * // Identify user after login
 * identify('user-42');
 * ```
 *
 * @throws Error if used outside of `<SessionCaptureProvider>`.
 *
 * @see SessionCaptureProvider
 */
export function useSessionCapture(): CaptureContextValue {
  const ctx = useContext(CaptureContext);

  if (!ctx) {
    throw new Error(
      'useSessionCapture must be used within a <SessionCaptureProvider>',
    );
  }

  return ctx;
}
