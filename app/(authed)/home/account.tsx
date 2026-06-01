// app/(authed)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Linking,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import { API_URL } from "../../../config";
import LogoutConfirmation from "../../../components/LogoutConfirmation";
import ReferralModal from "../../../components/ReferralModal";
import RulesModal from "../../../components/RulesModal";
import { useToast } from "../../../context/ToastContext";

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, refreshProfile, logout, language, t, fixUrl } = useAuth();
  const isEN = language === "en";
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';

  const [showReferralModal, setShowReferralModal] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(false);

  // mounted guard (prevents setState after unmount)
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSet = useCallback((
    setter: React.Dispatch<React.SetStateAction<any>>,
    value: any
  ) => {
    if (!mountedRef.current) return;
    setter(value);
  }, []);

  // exit modal
  const [exitModalVisible, setExitModalVisible] = useState<boolean>(false);
  const openExitModal = useCallback(() => setExitModalVisible(true), []);
  const cancelExit = useCallback(() => setExitModalVisible(false), []);

  const confirmExit = useCallback(async () => {
    safeSet(setExitModalVisible, false);
    try {
      await logout();
    } catch (error) {
      console.log("Logout error:", error);
    }
  }, [logout, safeSet]);

  const [appConfig, setAppConfig] = useState<{ referral_enabled?: boolean }>({ referral_enabled: false });
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/account/config`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => safeSet(setAppConfig, data))
        .catch(() => {});
    }
  }, [token, safeSet]);

  // form state
  const [username, setUsername] = useState<string>((user as any)?.username ?? "");
  const [displayName, setDisplayName] = useState<string>((user as any)?.display_name ?? "");
  const [avatar, setAvatar] = useState<string | null>((user as any)?.avatar ?? null);

  const lastUserSigRef = useRef<string>("");
  useEffect(() => {
    const sig = JSON.stringify({
      u: (user as any)?.username ?? "",
      d: (user as any)?.display_name ?? "",
      a: (user as any)?.avatar ?? null,
    });
    if (sig === lastUserSigRef.current) return;
    lastUserSigRef.current = sig;

    safeSet(setUsername, (user as any)?.username ?? "");
    safeSet(setDisplayName, (user as any)?.display_name ?? "");
    safeSet(setAvatar, (user as any)?.avatar ?? null);
  }, [user, safeSet]);

  const [saving, setSaving] = useState<boolean>(false);

  // stats
  const gamesPlayed = (user as any)?.total_games ?? 0;
  const wins = (user as any)?.total_wins ?? 0;

  const winRate = useMemo(() => (gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0), [wins, gamesPlayed]);

  const rank = useMemo(() => {
    if (winRate >= 70 || wins >= 200) return isEN ? "Platinum" : "ፕላቲኒም";
    if (winRate >= 50 || wins >= 100) return isEN ? "Gold" : "ወርቅ";
    return isEN ? "Silver" : "ብር";
  }, [winRate, wins, isEN]);

  const rankMeta = useMemo(() => {
    const isPlat = rank.includes("Platinum") || rank.includes("ፕላቲኒም");
    const isGold = rank.includes("Gold") || rank.includes("ወርቅ");
    if (isPlat) return { icon: "diamond-outline" as const, label: rank, tone: "platinum" as const };
    if (isGold) return { icon: "trophy-outline" as const, label: rank, tone: "gold" as const };
    return { icon: "medal-outline" as const, label: rank, tone: "silver" as const };
  }, [rank]);

  const rankBadgeColors = useMemo(() => {
    if (rankMeta.tone === "platinum") return ["rgba(0, 229, 255, 0.95)", "rgba(0, 180, 220, 0.85)"] as const;
    if (rankMeta.tone === "gold") return ["rgba(255, 184, 77, 0.95)", "rgba(217, 119, 6, 0.85)"] as const;
    return ["rgba(148, 163, 184, 0.25)", "rgba(255, 255, 255, 0.1)"] as const;
  }, [rankMeta.tone]);

  const meNumber = useMemo(() => {
    const raw = (user as any)?.number ?? "";
    if (!raw) return "";
    return String(raw).startsWith("+") ? String(raw) : `+${raw}`;
  }, [user]);

  const meName =
    displayName?.trim() ||
    (user as any)?.username ||
    (isEN ? "New Player" : "አዲስ ተጫዋች");

  const headerSubtitle = useMemo(() => {
    if (!gamesPlayed) return isEN ? "Start your first match" : "መጀመሪያ ጨዋታዎን ጀምሩ";
    const wr = clamp(winRate, 0, 100);
    return isEN ? `${wins} wins • ${wr}% win rate` : `${wins} ድሎች • ${wr}% የድል መጠን`;
  }, [gamesPlayed, wins, winRate, isEN]);

  // save profile (kept minimal; avatar upload removed)
  const saveProfile = useCallback(async () => {
    if (!token) {
      toast.error(
        isEN ? "Not Logged In" : "ገብተው አይደለም",
        isEN ? "Please log in to continue." : "እባክዎ ለመቀጠል ግቡ።"
      );
      return;
    }
    if (saving) return;

    const u = username.trim();
    const d = displayName.trim();

    if (!u) {
      toast.warning(
        isEN ? "Missing Username" : "የተጠቃሚ ስም ይጎድላል",
        isEN ? "Enter a username." : "የተጠቃሚ ስም ያስገቡ።"
      );
      return;
    }

    try {
      safeSet(setSaving, true);

      const res = await fetch(`${API_URL}/account/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // avatar stays as current value; no picker/upload here
        body: JSON.stringify({ username: u, display_name: d, avatar }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.message || "Update failed");

      await refreshProfile();
      toast.success(isEN ? "Profile Saved" : "ተቀምጧል", isEN ? "Your profile has been updated." : "መገለጫዎ ተዘምኗል።");
      
      // If the user just completed their missing profile, redirect to gameplay
      if (!user?.username || !user?.display_name) {
        router.replace('/(authed)/home/gameplay' as any);
      }
    } catch (e: any) {
      toast.error(
        isEN ? "Save Failed" : "ስህተት",
        e?.message || (isEN ? "Could not save profile." : "መገለጫውን ማስቀመጥ አልተሳካም።")
      );
    } finally {
      safeSet(setSaving, false);
    }
  }, [token, saving, username, displayName, avatar, refreshProfile, safeSet, isEN]);

  const goHistory = useCallback(() => {
    router.push("/(authed)/games" as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={[styles.blob, styles.blob1]} />
      <View pointerEvents="none" style={[styles.blob, styles.blob2]} />

      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={toast} />
      <LogoutConfirmation visible={exitModalVisible} onCancel={cancelExit} onConfirm={confirmExit} />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        {/* Top bar - ONLY on mobile (Desktop has global top bar) */}
        {!isDesktop && (
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.topIconBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.92)" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.topTitle}>{isEN ? "Profile" : "መገለጫ"}</Text>
              <Text style={styles.topSub}>{headerSubtitle}</Text>
            </View>

            <TouchableOpacity onPress={openExitModal} style={styles.topIconBtn} hitSlop={10}>
              <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.92)" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={[
            styles.content,
            isDesktop && { maxWidth: 720, alignSelf: 'center', width: '100%', paddingVertical: 24 }
          ]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Missing Profile Notice */}
          {(user && (!user.username || !user.display_name)) && (
            <LinearGradient
              colors={["rgba(0, 218, 243, 0.15)", "rgba(0, 218, 243, 0.03)"]}
              style={styles.onboardingNotice}
            >
              <View style={styles.onboardingIcon}>
                <Ionicons name="sparkles" size={20} color="#00daf3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.onboardingTitle}>{isEN ? "Complete your Profile" : "መገለጫዎን ያጠናቅቁ"}</Text>
                <Text style={styles.onboardingSub}>
                  {isEN 
                    ? "Welcome! Please choose a username and display name to unlock all platform features." 
                    : "እንኳን ደህና መጡ! ሁሉንም የፕላትፎርሙን ጥቅሞች ለማግኘት እባክዎ መለያ ስም እና የሚታይ ስም ይምረጡ።"}
                </Text>
              </View>
            </LinearGradient>
          )}

          {/* Hero section */}
          <View style={[styles.heroCard, isDesktop && styles.heroCardDesktop]}>
            <LinearGradient colors={["rgba(0, 229, 255, 0.08)", "rgba(0, 229, 255, 0.03)", "rgba(10, 10, 15, 0.6)"]} style={styles.glass} />

            <View style={[styles.heroRow, isDesktop && { gap: 28 }]}>
              <View style={[styles.avatarShell, isDesktop && { width: 100, height: 100 }]}>
                <LinearGradient
                  colors={["#00daf3", "#00e5ff"]}
                  style={[styles.avatarRing, isDesktop && { width: 100, height: 100 }]}
                />
                <View style={[styles.avatarInner, isDesktop && { width: 90, height: 90 }]}>
                  {avatar ? (
                    <Image source={{ uri: fixUrl(avatar) || undefined }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons name="person-outline" size={isDesktop ? 40 : 34} color="rgba(255,255,255,0.65)" />
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => {}}
                  style={[styles.fab, isDesktop && { width: 36, height: 36, borderRadius: 12 }]}
                  disabled
                  activeOpacity={1}
                >
                  <LinearGradient colors={["#00daf3", "#00e5ff"]} style={styles.fabInner}>
                    <Ionicons name="camera-outline" size={isDesktop ? 16 : 16} color="#0a0a0f" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.name, isDesktop && { fontSize: 22 }]}>{meName}</Text>

                {!!meNumber && (
                  <View style={styles.inlineRow}>
                    <Ionicons name="call-outline" size={14} color="rgba(168,167,212,0.8)" />
                    <Text style={styles.mutedText}>{meNumber}</Text>
                  </View>
                )}

                <View style={styles.badgeRow}>
                  <LinearGradient colors={rankBadgeColors as any} style={styles.badge}>
                    <Ionicons name={rankMeta.icon} size={14} color="#fff" />
                    <Text style={styles.badgeText}>{rankMeta.label}</Text>
                  </LinearGradient>

                  <View style={styles.dotDivider} />

                  <View style={styles.inlineRow}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="rgba(168, 85, 247, 0.8)" />
                    <Text style={styles.mutedText}>{isEN ? "Verified" : "የተረጋገጠ"}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats strip */}
            <View style={[styles.statsStrip, isDesktop && styles.statsStripDesktop]}>
              <MiniStat icon="game-controller-outline" label={t("games_played")} value={String(gamesPlayed)} />
              <View style={styles.stripSep} />
              <MiniStat icon="trophy-outline" label={t("wins")} value={String(wins)} />
              <View style={styles.stripSep} />
              <MiniStat icon="stats-chart-outline" label={t("win_rate")} value={`${winRate}%`} />
            </View>
          </View>

          {/* Account form & Actions */}
          <View style={[styles.desktopGrid, isDesktop && { flexDirection: 'row', gap: 16, marginTop: 16 }]}>
             <View style={isDesktop ? { flex: 1.5 } : { width: '100%' }}>
                <View style={[styles.panel, isDesktop && { marginTop: 0 }]}>
                  <View style={styles.panelHeader}>
                    <View style={styles.panelTitleRow}>
                      <Ionicons name="person-circle-outline" size={18} color="#a855f7" />
                      <Text style={styles.panelTitle}>{isEN ? "Account Info" : "የመለያ መረጃ"}</Text>
                    </View>
                  </View>

                  <InputRow
                    icon="at-outline"
                    label={isEN ? "Username" : "የተጠቃሚ ስም"}
                    value={username}
                    onChangeText={setUsername}
                    placeholder={isEN ? "Enter a unique username" : "ልዩ የተጠቃሚ ስም ያስገቡ"}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <InputRow
                    icon="sparkles-outline"
                    label={isEN ? "Display name" : "የሚታይ ስም"}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={isEN ? "How should we show your name?" : "ስምዎን እንዴት እናሳይ?"}
                  />

                  <ReadOnlyRow
                    icon="call-outline"
                    label={isEN ? "Phone" : "ስልክ"}
                    value={meNumber || (isEN ? "Not set" : "አልተዘጋጀም")}
                  />

                  <TouchableOpacity disabled={saving} onPress={saveProfile} activeOpacity={0.9} style={styles.primaryBtn}>
                    <LinearGradient colors={["#00daf3", "#00daf3"]} style={styles.primaryBtnInner}>
                      {saving ? (
                        <ActivityIndicator color="#0a0a0f" />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={18} color="#0a0a0f" />
                          <Text style={styles.primaryBtnText}>{isEN ? "Save Changes" : "ለውጦችን አስቀምጥ"}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
             </View>

             <View style={isDesktop ? { flex: 1, gap: 12 } : { width: '100%', gap: 12 }}>
                {!isDesktop && (
                  <View style={[styles.quickRow, { marginTop: 16 }]}>
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                      <QuickAction
                        title={isEN ? "Admin Dashboard" : "አድሚን ዳሽቦርድ"}
                        subtitle={isEN ? "Manage platform" : "ፕላትፎርሙን አስተዳድር"}
                        icon="shield-checkmark"
                        onPress={() => router.push('/admin' as any)}
                      />
                    )}
                    <QuickAction
                      title={isEN ? "Privacy & Rules" : "የግላዊነት ፖሊሲ"}
                      subtitle={isEN ? "Terms and conditions" : "ህጎች እና መመሪያዎች"}
                      icon="document-text-outline"
                      onPress={() => setRulesVisible(true)}
                    />
                    <QuickAction
                      title={isEN ? "Telegram Support" : "የቴሌግራም ድጋፍ"}
                      subtitle={isEN ? "Get support" : "ድጋፍ ያግኙ"}
                      icon="chatbubbles-outline"
                      onPress={() => Linking.openURL("https://t.me/xoetsupport").catch(() => {})}
                    />
                    <QuickAction
                      title={isEN ? "Community" : "ማህበረሰብ"}
                      subtitle={isEN ? "Join our Telegram channel" : "የቴሌግራም ቻናላችንን ይቀላቀሉ"}
                      icon="paper-plane-outline"
                      onPress={() => Linking.openURL("https://t.me/xoethiopia1").catch(() => {})}
                    />
                  </View>
                )}
                
                {isDesktop && (
                   <>
                     <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                          <View style={styles.panelTitleRow}>
                            <Ionicons name="settings-outline" size={18} color="#a855f7" />
                            <Text style={styles.panelTitle}>{isEN ? "Preferences" : "ምርጫዎች"}</Text>
                          </View>
                        </View>
                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                          <TouchableOpacity onPress={() => router.push('/admin' as any)} style={[styles.secondaryBtn, { borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.05)' }]}>
                            <Ionicons name="shield-checkmark" size={18} color="#34d399" />
                            <Text style={[styles.secondaryBtnText, { color: '#34d399' }]}>{isEN ? "Admin Dashboard" : "አድሚን ዳሽቦርድ"}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setRulesVisible(true)} style={styles.secondaryBtn}>
                           <Ionicons name="document-text-outline" size={18} color="#e5e3ff" />
                           <Text style={styles.secondaryBtnText}>{isEN ? "Privacy & Rules" : "የግላዊነት ፖሊሲ"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openExitModal} style={[styles.secondaryBtn, { borderColor: 'rgba(239,68,68,0.2)' }]}>
                          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                          <Text style={[styles.secondaryBtnText, { color: '#ef4444' }]}>{t("logout")}</Text>
                        </TouchableOpacity>
                     </View>
                   </>
                )}
             </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Exit modal */}
        <LogoutConfirmation
          visible={exitModalVisible}
          onCancel={cancelExit}
          onConfirm={confirmExit}
        />
        <RulesModal
          visible={rulesVisible}
          onClose={() => setRulesVisible(false)}
          language={language}
        />
      </SafeAreaView>
    </View>
  );
}

// ---------- memo components ----------
const MiniStat = memo(function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.85)" />
      <Text style={styles.miniLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
});

const QuickAction = memo(function QuickAction({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.quickCard}>
      <LinearGradient colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.quickIcon}>
        <LinearGradient colors={["#00daf3", "#00e5ff"]} style={styles.quickIconInner}>
          <Ionicons name={icon} size={18} color="#0a0a0f" />
        </LinearGradient>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.quickSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
    </TouchableOpacity>
  );
});

const InputRow = memo(function InputRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  autoCorrect,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.rowBlock}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowInputWrap}>
        <Ionicons name={icon} size={16} color="rgba(255,255,255,0.55)" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.rowInput}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />
      </View>
    </View>
  );
});

const ReadOnlyRow = memo(function ReadOnlyRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.rowBlock}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.rowInputWrap, { opacity: 0.75 }]}>
        <Ionicons name={icon} size={16} color="rgba(255,255,255,0.55)" />
        <Text style={styles.readOnlyText} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },

  blob: {
    position: "absolute",
    width: 450,
    height: 450,
    borderRadius: 225,
    opacity: 0.12,
    ...Platform.select({
      web: {
        filter: "blur(80px)",
      } as any,
    }),
  },
  blob1: {
    top: "5%",
    left: "-20%",
    backgroundColor: "#ff4766", // Glowing Coral Red
  },
  blob2: {
    bottom: "15%",
    right: "-30%",
    backgroundColor: "#00daf3", // Glowing Cyan
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 218, 243, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.14)",
  },
  topTitle: {
    color: "#e5e3ff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  topSub: {
    marginTop: 2,
    color: "rgba(168,167,212,0.6)",
    fontSize: 12,
    fontWeight: "700",
  },

  content: { paddingHorizontal: 16, paddingBottom: 24 },

  onboardingNotice: {
    padding: 18,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.25)",
    overflow: "hidden",
  },
  onboardingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingTitle: {
    color: "#e5e3ff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 2,
  },
  onboardingSub: {
    color: "rgba(168,167,212,0.7)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  heroCard: {
    borderRadius: 28,
    overflow: "hidden",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  heroCardDesktop: {
    borderRadius: 20,
    padding: 24,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  statsStripDesktop: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  glass: { ...StyleSheet.absoluteFillObject },

  heroRow: { flexDirection: "row", gap: 16, alignItems: "center" },

  avatarShell: { width: 92, height: 92, justifyContent: "center", alignItems: "center" },
  avatarRing: { position: "absolute", width: 92, height: 92, borderRadius: 46, opacity: 0.95 },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(12,16,28,0.4)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { flex: 1, alignItems: "center", justifyContent: "center" },

  fab: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },

  name: { color: "#e5e3ff", fontSize: 20, fontWeight: "900", letterSpacing: 0.3 },
  mutedText: { color: "rgba(168,167,212,0.8)", fontSize: 13, fontWeight: "600" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },

  badgeRow: { marginTop: 12, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  dotDivider: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0, 218, 243, 0.2)" },

  statsStrip: {
    marginTop: 20,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stripSep: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.08)" },
  miniStat: { flex: 1, alignItems: "center", gap: 4 },
  miniLabel: { color: "rgba(168,167,212,0.6)", fontSize: 11, fontWeight: "700", textTransform: 'uppercase' },
  miniValue: { color: "#fff", fontSize: 16, fontWeight: "900" },

  quickRow: { marginTop: 4, gap: 10, flexDirection: 'column' },
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
  },
  quickIconInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  quickTitle: { color: "#e5e3ff", fontSize: 15, fontWeight: "900" },
  quickSub: { marginTop: 2, color: "rgba(168,167,212,0.6)", fontSize: 13, fontWeight: "600" },

  panel: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  panelHeader: { marginBottom: 16 },
  panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  panelTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  panelHint: { marginTop: 4, color: "rgba(168,167,212,0.6)", fontSize: 12, fontWeight: "600" },

  rowBlock: { marginBottom: 16 },
  rowLabel: { color: "rgba(168,167,212,0.8)", fontSize: 12, fontWeight: "800", marginBottom: 8, textTransform: 'uppercase' },
  rowInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 14, android: 12, default: 14 }) as any,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  rowInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  readOnlyText: { flex: 1, color: "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: "700" },

  primaryBtn: { marginTop: 8, borderRadius: 18, overflow: "hidden" },
  primaryBtnInner: { paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  primaryBtnText: { color: "#0a0a0f", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },

  secondaryBtn: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtnText: { color: "#e3e0f8", fontWeight: "900", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: "#111118",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", gap: 16, alignItems: "center" },
  sheetIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(253,111,133,0.15)",
    borderWidth: 1,
    borderColor: "rgba(253,111,133,0.3)",
  },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  sheetSub: { marginTop: 4, color: "rgba(168,167,212,0.6)", fontSize: 14, fontWeight: "600" },

  sheetActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  sheetBtnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(10, 12, 28, 0.88)",
  },
  sheetGhostText: { color: "rgba(255,255,255,0.88)", fontWeight: "900" },

  sheetBtnDanger: { flex: 1, borderRadius: 18, overflow: "hidden" },
  sheetDangerInner: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  sheetDangerText: { color: "#fff", fontWeight: "900" },

  desktopGrid: {
    // Desktop grid settings handled by inline style conditionals
  },
});
