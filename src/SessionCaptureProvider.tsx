import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  apiKey,
  endpointUrl,
  samplingRate = 0.1,
  maxFrames = 500,
  throttleMs = 200,
  imageQuality = 0.1,
  imageWidth = Dimensions.get('window').width,
  imageHeight = Dimensions.get('window').height,
  flushIntervalMs = 10_000,
  periodicCaptureMs = 1000,
  idleTimeoutMs = 10_000,
  enableGlobalPressCapture = true,
}: SessionCaptureProviderProps) {
  const rootRef = useRef<View>(null);
  const sessionId = useMemo(() => uuid(), []);

  // ── Anonymous / identified user ID ─────────────────────────────────
  const anonymousId = useMemo(() => `anon-${uuid()}`, []);
  const [currentUserId, setCurrentUserId] = useState<string>(
    userId ?? anonymousId,
  );
  const [isAnonymous, setIsAnonymous] = useState<boolean>(!userId);

  // Sync if the parent passes a new userId prop.
  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId);
      setIsAnonymous(false);
    }
  }, [userId]);

  // ── Install global press capture (once, synchronously) ─────────────
  useMemo(() => {
    if (enableGlobalPressCapture) {
      installGlobalPressCapture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = useMemo(
    () => shouldSample(currentUserId, samplingRate),
    [currentUserId, samplingRate],
  );

  const manager = useMemo(
    () =>
      new CaptureManager({
        sessionId,
        userId: currentUserId,
        endpointUrl,
        apiKey,
        maxFrames,
        throttleMs,
        imageQuality,
        imageWidth,
        imageHeight,
        device: getDeviceName(),
        appVersion: getAppVersion(),
        flushIntervalMs,
        periodicCaptureMs,
        idleTimeoutMs,
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

    if (isActive) {
      manager.start();

      // Take an initial screenshot once the first frame has rendered.
      const initialTimer = setTimeout(() => {
        manager.captureImmediate(rootRef).catch(() => {});
        // Start periodic background captures after the initial one.
        manager.startPeriodicCapture(rootRef);
      }, 500);

      return () => {
        clearTimeout(initialTimer);
        manager.stop();
      };
    }

    return () => manager.stop();
  }, [isActive, manager]);

  // ── Bridge tracking bus → CaptureManager ──────────────────────────
  useEffect(() => {
    const unsubscribe = onTrackingEvent((event: TrackingEvent) => {
      if (event.type === 'navigation') {
        // Screenshot BEFORE navigation (capture departure screen).
        manager.captureImmediate(rootRef).catch(() => {});

        manager.registerNavigation({
          timestamp: event.timestamp,
          from: event.fromScreen,
          to: event.screen,
          trigger: event.navigationTrigger ?? 'unknown',
        });

        // Screenshot AFTER navigation with increasing delays so the
        // new screen is fully rendered (animations, data loading, etc.).
        setTimeout(() => {
          manager.captureImmediate(rootRef).catch(() => {});
        }, 200);
        setTimeout(() => {
          manager.captureImmediate(rootRef).catch(() => {});
        }, 600);
        return;
      }

      // Press events
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

      // Screenshot immediately on tap (captures the pressed state).
      manager.captureImmediate(rootRef).catch(() => {});

      // And a follow-up to capture the result of the tap.
      setTimeout(() => {
        manager.capture(rootRef).catch(() => {});
      }, 300);
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

  // ── Identify API ───────────────────────────────────────────────────
  const identify = useCallback(
    (newUserId: string) => {
      setCurrentUserId(newUserId);
      setIsAnonymous(false);
      manager.setUserId(newUserId);
    },
    [manager],
  );

  // Keep manager in sync when currentUserId changes (e.g. from prop).
  useEffect(() => {
    manager.setUserId(currentUserId);
  }, [currentUserId, manager]);

  const contextValue = useMemo<CaptureContextValue>(
    () => ({ manager, rootRef, isActive, identify, userId: currentUserId, isAnonymous }),
    [manager, isActive, identify, currentUserId, isAnonymous],
  );

  return (
    <CaptureContext.Provider value={contextValue}>
      <View ref={rootRef} style={{ flex: 1 }} collapsable={false}>
        {children}
      </View>
    </CaptureContext.Provider>
  );
}
