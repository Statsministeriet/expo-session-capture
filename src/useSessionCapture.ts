import { useContext } from 'react';
import { CaptureContext } from './SessionCaptureProvider';
import type { CaptureContextValue } from './types';

/**
 * Access the session-capture context.
 *
 * Must be called inside a `<SessionCaptureProvider>`.
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
