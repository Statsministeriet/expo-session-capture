import { useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { TrackedPressable, useSessionCapture } from "expo-session-capture";

const ITEMS = [
  { id: 1, label: "Dashboard", color: "#4285f4" },
  { id: 2, label: "Profile", color: "#34a853" },
  { id: 3, label: "Settings", color: "#fbbc04" },
  { id: 4, label: "Notifications", color: "#ea4335" },
  { id: 5, label: "Messages", color: "#8e24aa" },
  { id: 6, label: "Analytics", color: "#00897b" },
];

export default function DetailsScreen() {
  const router = useRouter();
  const { manager } = useSessionCapture();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Details Screen</Text>
      <Text style={styles.subtitle}>
        Tap cards to simulate navigation. Each tap captures a frame.
      </Text>

      <Text style={styles.meta}>
        Frames captured: {manager.capturedFrames}
      </Text>

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
    </ScrollView>
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
    marginBottom: 20,
  },
  meta: {
    fontSize: 13,
    color: "#999",
    fontFamily: "monospace",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
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
