import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  TrackedPressable,
  TrackedScrollView,
  useSessionCapture,
} from "expo-session-capture";

const ITEMS = [
  { id: 1, label: "Dashboard", color: "#4285f4" },
  { id: 2, label: "Profile", color: "#34a853" },
  { id: 3, label: "Settings", color: "#fbbc04" },
  { id: 4, label: "Notifications", color: "#ea4335" },
  { id: 5, label: "Messages", color: "#8e24aa" },
  { id: 6, label: "Analytics", color: "#00897b" },
];

const FEED_ROWS = Array.from({ length: 36 }, (_, index) => ({
  id: index + 1,
  title: `Feed item #${index + 1}`,
  body: "Scroll, stop, and inspect replay markers. Small scrolls should be ignored.",
}));

export default function DetailsScreen() {
  const router = useRouter();
  const { manager } = useSessionCapture();
  const [selected, setSelected] = useState<number | null>(null);
  const [likedRows, setLikedRows] = useState<Record<number, boolean>>({});

  return (
    <TrackedScrollView
      contentContainerStyle={styles.container}
      scrollThreshold={200}
    >
      <Text style={styles.title}>Details Screen</Text>
      <Text style={styles.subtitle}>
        Scroll demo: screenshot capture only triggers on scroll end when movement
        is over 200px.
      </Text>

      <Text style={styles.meta}>
        Frames captured: {manager.capturedFrames}
      </Text>

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>How to demo</Text>
        <Text style={styles.instructionsText}>1) Scroll ~600px and release → capture.</Text>
        <Text style={styles.instructionsText}>2) Scroll ~20px and release → no capture.</Text>
        <Text style={styles.instructionsText}>3) Scroll ~300px and release → capture.</Text>
      </View>

      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <TrackedPressable
            key={item.id}
            style={[
              styles.card,
              { borderColor: item.color },
              selected === item.id && { backgroundColor: item.color + "20" },
            ]}
            onPress={() => setSelected(item.id)}
          >
            <View
              style={[styles.dot, { backgroundColor: item.color }]}
            />
            <Text style={styles.cardLabel}>{item.label}</Text>
            {selected === item.id && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TrackedPressable>
        ))}
      </View>

      <View style={styles.feedWrap}>
        <Text style={styles.feedTitle}>Scrollable Feed</Text>

        {FEED_ROWS.map((row) => (
          <View key={row.id} style={styles.feedRow}>
            <View style={styles.feedTextWrap}>
              <Text style={styles.feedRowTitle}>{row.title}</Text>
              <Text style={styles.feedRowBody}>{row.body}</Text>
            </View>

            <TrackedPressable
              style={[
                styles.likeButton,
                likedRows[row.id] && styles.likeButtonActive,
              ]}
              onPress={() =>
                setLikedRows((prev) => ({
                  ...prev,
                  [row.id]: !prev[row.id],
                }))
              }
            >
              <Text
                style={[
                  styles.likeButtonText,
                  likedRows[row.id] && styles.likeButtonTextActive,
                ]}
              >
                {likedRows[row.id] ? "Liked" : "Like"}
              </Text>
            </TrackedPressable>
          </View>
        ))}
      </View>

      <TrackedPressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back to Home</Text>
      </TrackedPressable>

      <TrackedPressable
        style={styles.flushButton}
        onPress={() => manager.flush()}
      >
        <Text style={styles.flushText}>Force Upload Frames</Text>
      </TrackedPressable>
    </TrackedScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  meta: {
    fontSize: 13,
    color: "#999",
    fontFamily: "monospace",
    marginBottom: 16,
  },
  instructionsBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7e3fc",
    backgroundColor: "#eef4ff",
    padding: 12,
    marginBottom: 18,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f4ea3",
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: "#2c4b84",
    marginBottom: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  feedWrap: {
    width: "100%",
    marginBottom: 24,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  feedRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 8,
  },
  feedTextWrap: {
    flex: 1,
  },
  feedRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  feedRowBody: {
    fontSize: 13,
    color: "#6b7280",
  },
  likeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  likeButtonActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  likeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  likeButtonTextActive: {
    color: "#15803d",
  },
  card: {
    width: "47%",
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "700",
    color: "#34a853",
  },
  backButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  flushButton: {
    backgroundColor: "#34a853",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  flushText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
