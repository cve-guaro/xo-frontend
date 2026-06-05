// components/game/ExitModal.tsx
// "Exit app?" confirmation sheet for Android back button.
import React, { memo } from "react";
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const ExitModal = memo(function ExitModal({
  language,
  onCancel,
  onConfirm,
}: {
  language: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isEN = language === "en";
  return (
    <View style={styles.modalOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.exitSheet}>
        <View style={styles.exitHeader}>
          <View style={styles.exitIcon}>
            <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={StyleSheet.absoluteFill} />
            <Ionicons name="alert-circle-outline" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exitTitle}>{isEN ? "Exit app?" : "መተግበሪያውን አጥፋ?"}</Text>
            <Text style={styles.exitSub}>{isEN ? "Are you sure you want to close the app?" : "መተግበሪያውን መዝጋት ይፈልጋሉ?"}</Text>
          </View>
        </View>
        <View style={styles.exitActions}>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.9} style={styles.exitGhost}>
            <Text style={styles.exitGhostText}>{isEN ? "Cancel" : "አይ"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} activeOpacity={0.9} style={styles.exitDanger}>
            <LinearGradient colors={["rgba(239,68,68,0.95)", "rgba(124,58,237,0.85)"]} style={styles.exitDangerInner}>
              <Text style={styles.exitDangerText}>{isEN ? "Exit" : "አዎ"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default ExitModal;

const styles = StyleSheet.create({
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  exitSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
    paddingBottom: 18,
  },
  exitHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  exitIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exitTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  exitSub: { marginTop: 2, color: "rgba(255,255,255,0.60)", fontSize: 12, fontWeight: "600" },
  exitActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  exitGhost: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  exitGhostText: { color: "rgba(255,255,255,0.88)", fontWeight: "900" },
  exitDanger: { flex: 1, borderRadius: 16, overflow: "hidden" },
  exitDangerInner: { paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  exitDangerText: { color: "#fff", fontWeight: "900" },
});
