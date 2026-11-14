import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

            {/* Avatar Row */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar || removingAvatar}
                  accessibilityLabel="Change profile photo"
                >
                  <Avatar
                    uri={avatar}
                    name={displayName || username}
                    size="2xl"
                  />
                  {(uploadingAvatar || removingAvatar) && (
                    <View style={[styles.avatar, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }]}>
                      <ActivityIndicator size="small" color="#00daf3" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar || removingAvatar}
                  style={styles.cameraBtn}
                  accessibilityLabel="Pick photo"
                >
                  <View style={styles.cameraInner}>
                    <Ionicons name="camera" size={16} color="#0c0c1f" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.label}>{isEN ? "Profile Photo" : "የመለያ ፎቶ"}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  {/* Upload / Replace Photo Icon Button */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handlePickAvatar}
                    disabled={uploadingAvatar || removingAvatar}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.07)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={isEN ? "Upload or replace photo" : "ፎቶ ቀይር"}
                  >
                    <Ionicons name="camera-outline" size={16} color="#e5e3ff" />
                    <Text style={{ color: '#e5e3ff', fontSize: 12, fontWeight: '600' }}>
                      {uploadingAvatar ? (isEN ? "Uploading..." : "እየተጫነ...") : (isEN ? "Replace" : "ቀይር")}
                    </Text>
                  </TouchableOpacity>

                  {/* Remove Photo Icon Button */}
                  {Boolean(avatar) && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={confirmRemoveAvatar}
                      disabled={uploadingAvatar || removingAvatar}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 7,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(239, 68, 68, 0.25)',
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={isEN ? "Remove photo" : "ፎቶ ሰርዝ"}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>
                        {removingAvatar ? (isEN ? "..." : "...") : (isEN ? "Delete" : "ሰርዝ")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>


            {/* Fields */}
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.label}>{isEN ? "Username" : "የተጠቃሚ ስም"}</Text>
                <TextInput

                  value={username}
                  onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                  maxLength={20}
                  placeholder="Unique handle (3-20 chars)"
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text style={styles.label}>{isEN ? "Display Name" : "የሚታይ ስም"}</Text>
                <TextInput
                  value={displayName}
                  onChangeText={(t) => setDisplayName(t.slice(0, 30))}
                  maxLength={30}
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
