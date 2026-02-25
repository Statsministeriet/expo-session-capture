import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { AppState, Dimensions, Platform, View } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { CaptureManager } from './captureManager';
import { shouldSample } from './sampler';
import type { CaptureContextValue, SessionCaptureConfig } from './types';

// ── Context ───────────────────────────────────────────────────────────

export const CaptureContext = createContext<CaptureContextValue | null>(null);

// ── Simple UUID v4 (no native dep) ───────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Device info helpers ──────────────────────────────────────────────

function getDeviceName(): string {
  if (Device.modelName) return Device.modelName;
  return `${Platform.OS}-${Platform.Version}`;
}

function getAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    '0.0.0'
  );
}

// ── Provider ─────────────────────────────────────────────────────────

export interface SessionCaptureProviderProps extends SessionCaptureConfig {
  children: React.ReactNode;
}

export function SessionCaptureProvider({
  children,
  userId,
  uploadUrl,
  samplingRate = 0.1,
  maxFrames = 30,
  throttleMs = 400,
  imageQuality = 0.3,
  imageWidth = Dimensions.get('window').width,
  imageHeight = Dimensions.get('window').height,
  uploadHeaders,
}: SessionCaptureProviderProps) {
  const rootRef = useRef<View>(null);
  const sessionId = useMemo(() => uuid(), []);

  const isActive = useMemo(
    () => shouldSample(userId, samplingRate),
    [userId, samplingRate],
  );

  const manager = useMemo(
    () =>
      new CaptureManager({
        sessionId,
        userId,
        uploadUrl,
        maxFrames,
        throttleMs,
        imageQuality,
        imageWidth,
        imageHeight,
        device: getDeviceName(),
        appVersion: getAppVersion(),
        uploadHeaders,
      }),
    // Intentionally created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Activate if this user is sampled.
  useEffect(() => {
    const { width, height } = Dimensions.get('window');
    manager.setDeviceInfo({
      deviceWidth: width,
      deviceHeight: height,
    });

    if (isActive) manager.start();
    return () => manager.stop();
  }, [isActive, manager]);

  // Flush on background / inactive.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        manager.flush();
      }
    });

    return () => subscription.remove();
  }, [manager]);

  const contextValue = useMemo<CaptureContextValue>(
    () => ({ manager, rootRef, isActive }),
    [manager, isActive],
  );

  return (
    <CaptureContext.Provider value={contextValue}>
      <View ref={rootRef} style={{ flex: 1 }} collapsable={false}>
        {children}
      </View>
    </CaptureContext.Provider>
  );
}
