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
import { installGlobalPressCapture } from './globalPressCapture';
import { onTrackingEvent } from './trackingBus';
import type { CaptureContextValue, SessionCaptureConfig, TrackingEvent } from './types';

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

  /**
   * When `true` (default), all `Pressable` / `TouchableOpacity` /
   * `TouchableHighlight` presses are captured automatically via a
   * global `React.createElement` patch.  `TrackedPressable` events
   * are never duplicated.
   *
   * @default true
   */
  enableGlobalPressCapture?: boolean;
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
  enableGlobalPressCapture = true,
}: SessionCaptureProviderProps) {
  const rootRef = useRef<View>(null);
  const sessionId = useMemo(() => uuid(), []);

  // ── Install global press capture (once, synchronously) ─────────────
  useMemo(() => {
    if (enableGlobalPressCapture) {
      installGlobalPressCapture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Bridge tracking bus → CaptureManager ──────────────────────────
  useEffect(() => {
    const unsubscribe = onTrackingEvent((event: TrackingEvent) => {
      if (!event.coordinates) return;

      manager.registerTap({
        x: event.coordinates.x,
        y: event.coordinates.y,
        timestamp: event.timestamp,
        screen: event.screen,
        label: event.label,
        category: event.category,
        source: event.source,
      });

      // Fire-and-forget screenshot – never block the UI.
      manager.capture(rootRef).catch(() => {});
    });

    return unsubscribe;
  }, [manager, rootRef]);

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
