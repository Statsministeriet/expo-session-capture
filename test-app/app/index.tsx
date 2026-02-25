import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { TrackedPressable, useSessionCapture } from "expo-session-capture";

export default function HomeScreen() {
  const [count, setCount] = useState(0);
  const [autoCount, setAutoCount] = useState(0);
  const { isActive, manager } = useSessionCapture();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Capture Test</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {isActive ? "● Capturing" : "○ Not sampled"}
        </Text>
        <Text style={styles.meta}>
          Frames: {manager.capturedFrames} / 30
        </Text>
      </View>

      {/* ── Explicit: TrackedPressable with enriched data ──────── */}
      <Text style={styles.sectionLabel}>Explicit (TrackedPressable)</Text>

      <TrackedPressable
        style={styles.button}
        tapScreen="HomeScreen"
        trackingLabel="Tap counter"
        trackingCategory="engagement"
        trackingMetadata={{ currentCount: count }}
        onPress={() => setCount((c) => c + 1)}
      >
        <Text style={styles.buttonText}>Tap me ({count})</Text>
      </TrackedPressable>

      <TrackedPressable
        style={[styles.button, styles.buttonSecondary]}
        tapScreen="HomeScreen"
        trackingLabel="Reset counter"
        trackingCategory="engagement"
        onPress={() => setCount(0)}
      >
        <Text style={styles.buttonTextSecondary}>Reset counter</Text>
      </TrackedPressable>

      {/* ── Auto: Regular Pressable captured globally ──────────── */}
      <Text style={styles.sectionLabel}>Auto (global capture)</Text>

      <Pressable
        style={[styles.button, styles.buttonAuto]}
        accessibilityLabel="Auto tap button"
        onPress={() => setAutoCount((c) => c + 1)}
      >
        <Text style={styles.buttonText}>Auto-tracked ({autoCount})</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.buttonAuto]}
        testID="no-label-button"
        onPress={() => setAutoCount(0)}
      >
        <Text style={styles.buttonText}>Reset auto (testID only)</Text>
      </Pressable>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <Link href="/details" asChild>
        <TrackedPressable
          style={[styles.button, styles.buttonOutline]}
          tapScreen="HomeScreen"
          trackingLabel="Open Scroll Demo"
          trackingCategory="navigation"
        >
          <Text style={styles.buttonTextOutline}>Open Scroll Demo →</Text>
        </TrackedPressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    color: "#1a1a1a",
  },
  badge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 32,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
  },
  meta: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#4285f4",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    width: 240,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    backgroundColor: "#ea4335",
  },
  buttonTextSecondary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonAuto: {
    backgroundColor: "#34a853",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#4285f4",
  },
  buttonTextOutline: {
    color: "#4285f4",
    fontSize: 16,
    fontWeight: "600",
  },
});
