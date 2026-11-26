import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import Avatar from "./ui/Avatar";

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
  const { token, refreshProfile, fixUrl } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState(initialUsername ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialAvatar ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const compressAndUploadImage = useCallback((file: any) => {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      setBanner({ type: 'error', text: isEN ? 'Please select an image file.' : 'እባክዎ የምስል ፋይል ይምረጡ።' });
      return;
    }

    setUploadingAvatar(true);
    setBanner(null);

    // If not web, upload directly via FormData
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      const formData = new FormData();
      formData.append('avatar', file, 'avatar.jpg');
      fetch(`${API_URL}/account/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
        .then((r) => r.json())
        .then(async (data) => {
          if (data?.avatar) {
            setAvatar(data.avatar);
            setBanner({ type: 'info', text: isEN ? 'Profile photo updated!' : 'የመለያ ፎቶ ተቀይሯል!' });
            await refreshProfile(true);
          } else {
            throw new Error(data?.message || 'Upload failed');
          }
        })
        .catch((err) => {
          setBanner({ type: 'error', text: err?.message || 'Could not upload avatar.' });
        })
        .finally(() => setUploadingAvatar(false));
      return;
    }

    // Web canvas compression: max 512x512, JPEG quality 0.8
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new (window as any).Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 512;
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          canvas.width = Math.min(minSide, maxDim);
          canvas.height = Math.min(minSide, maxDim);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not available');

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (!blob) {
              setUploadingAvatar(false);
              setBanner({ type: 'error', text: 'Image compression failed.' });
              return;
            }

            try {
              const formData = new FormData();
              formData.append('avatar', blob, 'avatar.jpg');

              const res = await fetch(`${API_URL}/account/avatar`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });

              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data?.message || 'Avatar upload failed');

              setAvatar(data.avatar);
              setBanner({ type: 'info', text: isEN ? 'Profile photo updated!' : 'የመለያ ፎቶ ተቀይሯል!' });
              await refreshProfile(true);
            } catch (err: any) {
              console.error('Avatar upload err:', err);
              setBanner({ type: 'error', text: err?.message || 'Could not upload avatar.' });
            } finally {
              setUploadingAvatar(false);
            }
          }, 'image/jpeg', 0.8);
        } catch (err: any) {
          console.error('Compression err:', err);
          setUploadingAvatar(false);
          setBanner({ type: 'error', text: 'Could not process image.' });
        }
      };
      img.onerror = () => {
        setUploadingAvatar(false);
        setBanner({ type: 'error', text: 'Could not load image.' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setUploadingAvatar(false);
      setBanner({ type: 'error', text: 'Could not read file.' });
    };
    reader.readAsDataURL(file);
  }, [token, isEN, refreshProfile]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!token) return;
    try {
      setRemovingAvatar(true);
      const res = await fetch(`${API_URL}/account/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to remove avatar');
      setAvatar(null);
      setBanner({ type: 'info', text: isEN ? 'Profile photo removed.' : 'የመለያ ፎቶ ተሰርዟል።' });
      await refreshProfile(true);
    } catch (err: any) {
      console.error('Avatar delete error:', err);
      setBanner({ type: 'error', text: err?.message || 'Could not remove avatar.' });
    } finally {
      setRemovingAvatar(false);
    }
  }, [token, isEN, refreshProfile]);

  const confirmRemoveAvatar = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(isEN ? 'Are you sure you want to remove your profile photo?' : 'እርግጠኛ ነዎት የመለያ ፎቶዎን መሰረዝ ይፈልጋሉ?')) {
        handleRemoveAvatar();
      }
    } else {
      Alert.alert(
        isEN ? 'Remove Photo' : 'ፎቶ ሰርዝ',
        isEN ? 'Are you sure you want to remove your profile photo?' : 'እርግጠኛ ነዎት የመለያ ፎቶዎን መሰረዝ ይፈልጋሉ?',
        [
          { text: isEN ? 'Cancel' : 'አይ', style: 'cancel' },
          { text: isEN ? 'Remove' : 'ሰርዝ', style: 'destructive', onPress: handleRemoveAvatar },
        ]
      );
    }
  };

  const handlePickAvatar = () => {
    if (uploadingAvatar) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) compressAndUploadImage(file);
      };
      input.click();
    }
  };
  
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
    const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    if (!cleanUsername) {
      setBanner({ type: "info", text: "Username cannot be empty." });
      return;
    }
    if (cleanUsername.length < 3) {
      setBanner({ type: "info", text: "Username must be at least 3 characters." });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/account/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: cleanUsername,
          display_name: (displayName?.trim?.() ?? "").slice(0, 30),
          avatar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.details?.[0]?.message ||
          data?.message ||
          data?.error ||
          "Update failed";
        throw new Error(msg);
      }
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isForced) {
        // Navigate FIRST before closing modal during forced onboarding
        router.replace("/(authed)/home/gameplay");
      }
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
          <View style={styles.sheetInner}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {isForced
                  ? (isEN ? "Set your username" : "ስምዎን ያስገቡ")
                  : (isEN ? "Edit profile" : "መለያዎን ያስተካክሉ")}
              </Text>
              {!isForced && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  activeOpacity={0.75}
                  accessibilityLabel={isEN ? "Close modal" : "ዝጋ"}
                >
                  <Ionicons name="close" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>

            {/* Banner */}
            {banner && (
              <View style={[styles.banner, banner.type === "error" ? styles.bannerError : styles.bannerInfo]}>
                <Ionicons name={banner.type === "error" ? "warning" : "information-circle"} size={15} color="#fff" />
                <Text style={styles.bannerText}>{banner.text}</Text>
                <TouchableOpacity onPress={() => setBanner(null)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Avatar Inset Panel */}
            <View style={styles.avatarCard}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar || removingAvatar}
                accessibilityLabel="Change profile photo"
                style={styles.avatarWrap}
              >
                <Avatar
                  uri={avatar}
                  name={displayName || username}
                  size="xl"
                />
                {(uploadingAvatar || removingAvatar) && (
                  <View style={styles.avatarOverlayLoader}>
                    <ActivityIndicator size="small" color="#00DAF3" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.avatarCardTitle}>{isEN ? "Profile photo" : "የመለያ ፎቶ"}</Text>

                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handlePickAvatar}
                    disabled={uploadingAvatar || removingAvatar}
                    style={styles.photoReplaceBtn}
                    accessibilityRole="button"
                    accessibilityLabel={isEN ? "Upload or replace photo" : "ፎቶ ቀይር"}
                  >
                    <Ionicons name="camera-outline" size={15} color="#E2E8F0" />
                    <Text style={styles.photoReplaceText}>
                      {uploadingAvatar ? (isEN ? "Uploading..." : "እየተጫነ...") : (isEN ? "Replace" : "ቀይር")}
                    </Text>
                  </TouchableOpacity>

                  {Boolean(avatar) && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={confirmRemoveAvatar}
                      disabled={uploadingAvatar || removingAvatar}
                      style={styles.photoDeleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={isEN ? "Remove photo" : "ፎቶ ሰርዝ"}
                    >
                      <Ionicons name="trash-outline" size={14} color="#F87171" />
                      <Text style={styles.photoDeleteText}>
                        {removingAvatar ? "..." : (isEN ? "Delete" : "ሰርዝ")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Fields */}
            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.label}>{isEN ? "Username" : "የተጠቃሚ ስም"}</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>@</Text>
                  <TextInput
                    value={username}
                    onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                    maxLength={20}
                    placeholder="Unique handle"
                    placeholderTextColor="#475569"
                    style={styles.inputRowField}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View>
                <Text style={styles.label}>{isEN ? "Display name" : "የሚታይ ስም"}</Text>
                <TextInput
                  value={displayName}
                  onChangeText={(t) => setDisplayName(t.slice(0, 30))}
                  maxLength={30}
                  placeholder={isEN ? "How should we show your name?" : "ስምዎ እንዴት እንዲታይ ይፈልጋሉ?"}
                  placeholderTextColor="#475569"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {!isForced && (
                <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnGhost]} activeOpacity={0.8}>
                  <Text style={styles.btnGhostText}>{isEN ? "Cancel" : "አይ"}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                disabled={saving}
                onPress={saveProfile}
                style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.7 }]}
                activeOpacity={0.85}
              >
                <View style={styles.btnPrimaryInner}>
                  {saving ? (
                    <ActivityIndicator color="#07090E" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#07090E" />
                      <Text style={styles.btnPrimaryText}>{isEN ? "Save changes" : "አስቀምጥ"}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.72)" },
  sheet: { marginHorizontal: 12, marginBottom: 12, borderRadius: 20, overflow: "hidden" },
  sheetDesktop: { width: "100%", maxWidth: 440, alignSelf: "center", marginBottom: 0 },
  sheetInner: {
    padding: 22,
    borderRadius: 20,
    backgroundColor: "#0E111A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  subtitle: { color: "#94A3B8", fontSize: 12.5, fontWeight: "500", marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, marginBottom: 14, borderWidth: 1 },
  bannerError: { backgroundColor: "rgba(239, 68, 68, 0.16)", borderColor: "rgba(248, 113, 113, 0.4)" },
  bannerInfo: { backgroundColor: "rgba(59, 130, 246, 0.16)", borderColor: "rgba(147, 197, 253, 0.35)" },
  bannerText: { color: "#F8FAFC", fontSize: 12, flex: 1, fontWeight: "500" },

  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#141926",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 18,
  },
  avatarWrap: { position: "relative" },
  avatarOverlayLoader: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCardTitle: { color: "#F8FAFC", fontSize: 13.5, fontWeight: "700" },
  avatarCardHint: { color: "#64748B", fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  photoReplaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  photoReplaceText: { color: "#E2E8F0", fontSize: 12, fontWeight: "600" },
  photoDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  photoDeleteText: { color: "#F87171", fontSize: 12, fontWeight: "600" },

  label: { color: "#94A3B8", fontSize: 12, marginBottom: 6, fontWeight: "700" },
  fieldHint: { color: "#64748B", fontSize: 11, marginTop: 5, fontWeight: "500" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#090C14",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    height: 46,
    gap: 6,
  },
  inputPrefix: { color: "#64748B", fontSize: 15, fontWeight: "700" },
  inputRowField: { flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "600", paddingVertical: 0 },
  input: {
    backgroundColor: "#090C14",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
    fontWeight: "600",
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: { flex: 1, borderRadius: 12, overflow: "hidden", height: 46, justifyContent: "center" },
  btnGhost: { backgroundColor: "#141926", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.12)", alignItems: "center", justifyContent: "center" },
  btnGhostText: { color: "#CBD5E1", fontSize: 13.5, fontWeight: "700" },
  btnPrimary: { backgroundColor: "#00DAF3" },
  btnPrimaryInner: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  btnPrimaryText: { color: "#07090E", fontSize: 13.5, fontWeight: "800" },
});
