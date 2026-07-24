import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";

import { API_URL } from "../config";
import { useAuth } from "../context/authContext";

export type ProfileEditModalProps = {
  visible: boolean;
  onClose: () => void;
  initialUsername?: string | null;
  initialDisplayName?: string | null;
  initialAvatar?: string | null;
  onSaved?: () => void; // called after successful save
  language?: string;
  isNewUser?: boolean;
};


export default function ProfileEditModal({
  visible,
  onClose,
  initialUsername = "",
  initialDisplayName = "",
  initialAvatar = null,
  onSaved,
  language,
  isNewUser = false,
}: ProfileEditModalProps) {
  const isEN = language === "en";
  const { token, refreshProfile } = useAuth();
  const router = useRouter();


  const [username, setUsername] = useState(initialUsername ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialAvatar ?? null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);
  
  const { width } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slide.setValue(0);
    }
  }, [visible, slide]);

  useEffect(() => {
    if (visible) {
      setUsername(initialUsername ?? "");
      setDisplayName(initialDisplayName ?? "");
      setAvatar(initialAvatar ?? null);
      setBanner(null);
    }
  }, [visible, initialUsername, initialDisplayName, initialAvatar]);

  const saveProfile = useCallback(async () => {
    if (!token) {
      setBanner({ type: "error", text: "You must be logged in." });
      return;
    }
    if (!username?.trim()) {
      setBanner({ type: "info", text: "Username cannot be empty." });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/account/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName?.trim?.() ?? "",
          avatar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Update failed");
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate FIRST before closing modal to prevent layout redirect from intercepting
      router.replace("/(authed)/home/gameplay");
      onSaved?.();
      onClose();
    } catch (e: any) {
      setBanner({ type: "error", text: e?.message || "Could not save profile." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [token, username, displayName, avatar, refreshProfile, onSaved, onClose, router]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const opacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const isForced = !initialUsername || isNewUser;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={isForced ? () => {} : onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.overlay, isDesktop && { justifyContent: 'center' }]}>
        <Animated.View style={[styles.backdrop, { opacity }]} />

        <Animated.View style={[styles.sheet, isDesktop && styles.sheetDesktop, { transform: [{ translateY }], opacity }]}>
          <LinearGradient colors={["#181B24", "#121420"]} style={styles.sheetInner}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconBtn} />
              <Text style={styles.title}>
                {isForced 
                  ? (isEN ? "Set Your Username" : "ስምዎን ያስገቡ") 
                  : (isEN ? "Edit Profile" : "መለያዎን ያስተካክሉ")}
              </Text>
              {!isForced ? (
                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconBtn} />
              )}
            </View>

            {/* Banner */}
            {banner && (
              <View style={[styles.banner, banner.type === "error" ? styles.bannerError : styles.bannerInfo]}>
                <Ionicons name={banner.type === "error" ? "warning" : "information-circle"} size={14} color="#fff" />
                <Text style={styles.bannerText}>{banner.text}</Text>
                <TouchableOpacity onPress={() => setBanner(null)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Avatar (click does nothing now) */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => {}} style={{ borderRadius: 42 }}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={30} color="#94A3B8" />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.cameraBtn}>
                  <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.cameraInner}>
                    <Ionicons name="camera" size={16} color="#0c0c1f" />
                  </LinearGradient>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.hint}>{isEN ? "Avatar upload is disabled" : "የምስል መቀየሪያው ለጊዜው አይሰራም"}</Text>
              </View>
            </View>


            {/* Fields */}
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.label}>{isEN ? "Username" : "የተጠቃሚ ስም"}</Text>
                <TextInput

                  value={username}
                  onChangeText={setUsername}
                  placeholder="Unique handle"
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text style={styles.label}>{isEN ? "Display Name" : "የሚታይ ስም"}</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={isEN ? "How should we show your name?" : "ስምዎ እንዲ እንዴት እንዲታይ ይፈልጋሉ?"}
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                />
              </View>

            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>{isEN ? "Cancel" : "አይ"}</Text>
              </TouchableOpacity>


              <TouchableOpacity
                disabled={saving}
                onPress={saveProfile}
                style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.7 }]}
              >
                <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.btnPrimaryInner}>
                  {saving ? (
                    <ActivityIndicator color="#0c0c1f" />
                  ) : (
                    <>
                      <Ionicons name="save" size={16} color="#0c0c1f" />
                      <Text style={styles.btnPrimaryText}>{isEN ? "Save" : "አስቀምጥ"}</Text>
                    </>
                  )}

                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { marginHorizontal: 12, marginBottom: 12, borderRadius: 18, overflow: "hidden" },
  sheetDesktop: { width: '100%', maxWidth: 440, alignSelf: 'center', marginBottom: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  sheetInner: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { color: "#fff", fontSize: 16, fontWeight: "900" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },

  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  bannerError: { backgroundColor: "#7f1d1d", borderColor: "#fca5a5" },
  bannerInfo: { backgroundColor: "#1f2937", borderColor: "#93c5fd" },
  bannerText: { color: "#fff", fontSize: 12, flex: 1 },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatarWrap: { width: 84, height: 84 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#0B0B0F" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  cameraBtn: { position: "absolute", bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "#121420" },
  cameraInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { color: "#94A3B8" },

  label: { color: "#9CA3AF", marginBottom: 6, fontWeight: "700" },
  input: { backgroundColor: "#0B0B0F", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", color: "#fff", paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  btnGhost: { borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  btnGhostText: { color: "#e5e7eb", fontWeight: "800" },
  btnPrimary: {},
  btnPrimaryInner: { paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnPrimaryText: { color: "#0c0c1f", fontWeight: "900" },
});
