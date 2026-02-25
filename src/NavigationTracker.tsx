import { useEffect, useRef, useCallback } from 'react';
import { emitTrackingEvent } from './trackingBus';
import type { NavigationEvent } from './types';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Walk a nested React Navigation state tree to find the deepest
 * active route name.
 */
function getActiveRouteName(state: any): string | undefined {
  if (!state || !state.routes) return undefined;
  const route = state.routes[state.index ?? 0];
  // If the route has its own nested state, recurse.
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

function inferNavigationTrigger(
  action: { type?: string; payload?: Record<string, unknown> } | undefined,
  prevScreen: string | undefined,
  nextScreen: string | undefined,
  prevDepth: number,
  nextDepth: number,
): NavigationEvent['trigger'] {
  if (!action?.type) {
    // No explicit action was dispatched – this typically happens when the
    // user swipes back on iOS (the native gesture completes and pops the
    // route without emitting an action through the JS bridge).
    if (nextDepth < prevDepth) return 'swipe-back';
    return 'unknown';
  }

  const type = action.type.toUpperCase();

  if (type === 'GO_BACK' || type === 'POP') return 'back-button';
  if (type === 'POP_TO_TOP') return 'pop';
  if (type === 'PUSH') return 'push';
  if (type === 'REPLACE') return 'replace';

  // NAVIGATE can be a tab switch, push, etc.
  if (type === 'NAVIGATE') return 'push';

  return 'unknown';
}

function buildLabel(
  trigger: NavigationEvent['trigger'],
  from: string | undefined,
  to: string | undefined,
): string {
  const triggerLabels: Record<NavigationEvent['trigger'], string> = {
    'back-button': 'Back button',
    'swipe-back': 'Swipe back',
    tab: 'Tab switch',
    push: 'Navigate',
    pop: 'Pop',
    replace: 'Replace',
    unknown: 'Navigate',
  };

  const fromStr = from ?? '?';
  const toStr = to ?? '?';
  return `${triggerLabels[trigger]}: ${fromStr} → ${toStr}`;
}

/** Count the depth of the deepest active route in the state tree. */
function getRouteDepth(state: any): number {
  if (!state || !state.routes) return 0;
  const route = state.routes[state.index ?? 0];
  if (route.state) return 1 + getRouteDepth(route.state);
  return 1;
}

// ── Component ────────────────────────────────────────────────────────

export interface NavigationTrackerProps {
  /**
   * A React Navigation `NavigationContainerRef` (the ref returned by
   * `useNavigationContainerRef()` from expo-router, or the `ref` prop
   * on `<NavigationContainer>`).
   *
   * If omitted the component will try to import
   * `useNavigationContainerRef` from `@react-navigation/native` at
   * render-time.  This works when the tracker is rendered **inside** a
   * `<NavigationContainer>`.
   */
  navigationRef?: { current: any };
}

/**
 * Drop-in component that tracks **all** navigation events
 * (back button, swipe-back gesture, programmatic navigation, tab
 * switches) and emits them onto the tracking bus so they are captured
 * as part of the session.
 *
 * Place it **inside** a `<SessionCaptureProvider>` and inside (or next
 * to) the navigator:
 *
 * ```tsx
 * <SessionCaptureProvider …>
 *   <Stack />
 *   <NavigationTracker />
 * </SessionCaptureProvider>
 * ```
 */
export function NavigationTracker({ navigationRef }: NavigationTrackerProps): null {
  const prevRouteRef = useRef<string | undefined>(undefined);
  const prevDepthRef = useRef<number>(0);
  const pendingActionRef = useRef<{
    type?: string;
    payload?: Record<string, unknown>;
  } | undefined>(undefined);

  // ── Resolve the navigation container ────────────────────────────
  // We lazily try to require @react-navigation/native so the SDK has
  // no hard compile-time dependency on it.
  const resolvedRef = useRef<{ current: any } | null>(navigationRef ?? null);

  useEffect(() => {
    if (resolvedRef.current) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const reactNav = require('@react-navigation/native');
      // When used inside a NavigationContainer the `navigation` object
      // is in context.  We fall back to the global ref exposed by some
      // setups.
      if (reactNav.navigationRef) {
        resolvedRef.current = reactNav.navigationRef;
      }
    } catch {
      // @react-navigation/native not installed – events won't fire.
    }
  }, []);

  // ── Listen for dispatched actions ────────────────────────────────
  useEffect(() => {
    const nav = navigationRef?.current ?? resolvedRef.current?.current;
    if (!nav?.addListener) return;

    const unsubAction = nav.addListener('__unsafe_action__', (e: any) => {
      pendingActionRef.current = e?.data?.action;
    });

    return () => {
      if (typeof unsubAction === 'function') unsubAction();
      else if (unsubAction?.remove) unsubAction.remove();
    };
  }, [navigationRef]);

  // ── Listen for state changes ─────────────────────────────────────
  const handleStateChange = useCallback((state: any) => {
    const nextRoute = getActiveRouteName(state);
    const nextDepth = getRouteDepth(state);
    const prevRoute = prevRouteRef.current;
    const prevDepth = prevDepthRef.current;

    // Skip if route didn't actually change.
    if (nextRoute === prevRoute) {
      prevDepthRef.current = nextDepth;
      return;
    }

    // Skip the very first state (initial render).
    if (prevRoute === undefined) {
      prevRouteRef.current = nextRoute;
      prevDepthRef.current = nextDepth;
      return;
    }

    const action = pendingActionRef.current;
    pendingActionRef.current = undefined;

    const trigger = inferNavigationTrigger(action, prevRoute, nextRoute, prevDepth, nextDepth);

    emitTrackingEvent({
      type: 'navigation',
      source: 'auto',
      screen: nextRoute,
      fromScreen: prevRoute,
      navigationTrigger: trigger,
      label: buildLabel(trigger, prevRoute, nextRoute),
      category: 'navigation',
    });

    prevRouteRef.current = nextRoute;
    prevDepthRef.current = nextDepth;
  }, []);

  useEffect(() => {
    const nav = navigationRef?.current ?? resolvedRef.current?.current;
    if (!nav?.addListener) return;

    const unsubState = nav.addListener('state', (e: any) => {
      handleStateChange(e?.data?.state);
    });

    // Initialise with current state.
    if (nav.getRootState) {
      const initial = nav.getRootState();
      prevRouteRef.current = getActiveRouteName(initial);
      prevDepthRef.current = getRouteDepth(initial);
    }

    return () => {
      if (typeof unsubState === 'function') unsubState();
      else if (unsubState?.remove) unsubState.remove();
    };
  }, [navigationRef, handleStateChange]);

  return null;
}

