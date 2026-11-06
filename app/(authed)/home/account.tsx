import { API_URL } from "../../../config";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Image,
  ScrollView,
  TextInput,
  Switch,
} from "react-native";
import { useAuth } from "../../../context/authContext";
import { useToast } from "../../../context/ToastContext";
import { WebPressable } from "../../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import DesktopHeader from "../../../components/game/DesktopHeader";
import DesktopSidebar from "../../../components/game/DesktopSidebar";
import ReferralModal from "../../../components/ReferralModal";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import LogoutConfirmation from "../../../components/LogoutConfirmation";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import NotificationsPopover from "../../../components/NotificationsPopover";
import { SkeletonBox, SkeletonRow } from "../../../components/SkeletonLoading";
import { haptics } from "../../../lib/haptcs";
import { playTickSound } from "../../../lib/pinTickAudio";

// Formats membership date (e.g. "July 2026")
function formatMemberSince(iso: string) {
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "July 2026";
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;

  const { user, token, language, refreshProfile, logout, switchLanguage, isSuperAdmin } = useAuth();
  const { isPlaying, toggleMusic } = useBackgroundMusic();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isEN = language === "en";

  // Sidebar navigation helpers
  const handleNavClick = (screen: string) => {
    if (screen === 'home') {
      router.push('/(authed)/home/gameplay');
    } else if (screen === 'history') {
      router.push('/(authed)/home/history');
    } else if (screen === 'leaderboard') {
      router.push('/(authed)/home/leaderboard');
    } else if (screen === 'profile') {
      router.push('/(authed)/home/account');
    } else if (screen === 'transactions') {
      router.push('/(authed)/home/transactions');
    } else if (screen === 'admin') {
      router.push('/admin');
    }
  };

  const handleLanguageToggle = useCallback(() => {
    switchLanguage?.();
  }, [switchLanguage]);

  // States
  const [referralCode, setReferralCode] = useState("");
  const [referralUrl, setReferralUrl] = useState("");
  const [notisMuted, setNotisMuted] = useState(false);

  // Edit Profile Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals visibility
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);

  const [referralEnabled, setReferralEnabled] = useState(true);

  // Auto-open Edit Profile Modal for new or incomplete users
  useEffect(() => {
    if (user) {
      const isMissing = !user.username || !user.display_name || user.new_user;
      if (isMissing) {
        setEditUsername(user.username || "");
        setEditDisplayName(user.display_name || user.username || "");
        setEditModalVisible(true);
      }
    }
  }, [user]);

  const handleAttemptCloseEditModal = () => {
    const isMissing = !user?.username || !user?.display_name || user?.new_user;
    if (isMissing) {
      toast.warning(
        isEN ? "Profile Required" : "መገለጫ መሙላት ግዴታ ነው",
        isEN ? "Please fill in your Username and Display Name to complete your profile." : "እባክዎን የተጠቃሚ ስም እና የሚታይ ስም ይሙሉ"
      );
      return;
    }
    setEditModalVisible(false);
  };

  // Fetch Referral Code
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/user/referral-link`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(d => {
          if (d.ok) {
            setReferralCode(d.referralCode);
            setReferralUrl(d.referralUrl);
            if (d.enabled !== undefined) setReferralEnabled(!!d.enabled);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  // Handle Edit Profile Save
  const handleSaveProfile = async () => {
    if (!token) return;
    const u = editUsername.trim();
    const d = editDisplayName.trim();

    if (!u || !d) {
      toast.warning(isEN ? "Inputs required" : "እባክዎ ሁሉንም ያስገቡ", isEN ? "Username and Display Name cannot be empty." : "የተጠቃሚ ስም እና የሚታይ ስም ባዶ መሆን አይችሉም።");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/account/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: u, display_name: d }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update profile");

      try {
        await refreshProfile(true);
      } catch (_) {}
      toast.success(isEN ? "Profile Saved" : "ተቀምጧል", isEN ? "Your profile has been updated successfully." : "መገለጫዎ በተሳካ ሁኔታ ተዘምኗል።");
      setEditModalVisible(false);
    } catch (e: any) {
      toast.error(isEN ? "Update Failed" : "ስህተት", e?.message || "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Copy Referral URL
  const handleCopyReferral = () => {
    const url = referralUrl || `https://xoethiopia.com/?ref=${referralCode}`;
    if (Platform.OS === "web") {
      navigator.clipboard?.writeText(url).then(() => {
        toast.success(isEN ? "Link Copied" : "ሊንክ ተቀድቷል", isEN ? "Referral link copied to clipboard!" : "የማጋሪያ ሊንክ ወደ ቅንጥብ ሰሌዳ ተቀድቷል!");
      });
    }
  };

  const confirmExit = async () => {
    setExitModalVisible(false);
    try {
      await logout();
      router.push('/(auth)/login');
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  // Setup initial values for edit modal
  useEffect(() => {
    if (user) {
      setEditUsername(user.username || "");
      setEditDisplayName(user.display_name || "");
    }
  }, [user, editModalVisible]);

  // Mask Phone Number helper
  const maskedPhone = useMemo(() => {
    const num = user?.number || "";
    if (num.length < 7) return num;
    const start = num.slice(0, 5);
    const end = num.slice(-3);
    return `${start}****${end}`;
  }, [user]);

  const memberSince = useMemo(() => {
    return user?.created_at ? formatMemberSince(user.created_at) : "July 2026";
  }, [user]);

  const stats = useMemo(() => {
    const wins = user?.total_wins || 0;
    const total = user?.total_games || 0;
    return {
      total,
      wins,
      winRate: total ? Math.round((wins / total) * 100) : 0,
      winnings: `ETB ${(wins * 100).toLocaleString()}`,
    };
  }, [user]);

  if (isLargeScreen) {
    // ─── HIGH FIDELITY DESKTOP WIDESCREEN LAYOUT ───
    return (
      <View style={s.rootContainer}>
        {/* Dark background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a0e1a" }]} />

        {/* Modals */}
        <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />
        <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
        <LogoutConfirmation visible={exitModalVisible} onCancel={() => setExitModalVisible(false)} onConfirm={confirmExit} />
        <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />

        {/* Edit Profile Dialog Modal */}
        {editModalVisible && (
          <View style={s.dialogOverlay}>
            <View style={s.dialogCard}>
              <View style={s.dialogHeader}>
                <Text style={s.dialogTitle}>{isEN ? "Edit Profile" : "መገለጫ አርትዕ"}</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#8b93a7" />
                </TouchableOpacity>
              </View>
              <View style={s.dialogBody}>
                <Text style={s.inputLabel}>{isEN ? "USERNAME" : "የተጠቃሚ ስም"}</Text>
                <TextInput value={editUsername} onChangeText={setEditUsername} style={s.dialogInput} placeholder={isEN ? "Username" : "የተጠቃሚ ስም"} placeholderTextColor="rgba(255,255,255,0.2)" />

                <Text style={[s.inputLabel, { marginTop: 14 }]}>{isEN ? "DISPLAY NAME" : "የሚታይ ስም"}</Text>
                <TextInput value={editDisplayName} onChangeText={setEditDisplayName} style={s.dialogInput} placeholder={isEN ? "Display Name" : "የሚታይ ስም"} placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
              <View style={s.dialogFooter}>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveProfile} style={s.saveBtn} disabled={savingProfile}>
                  {savingProfile ? <ActivityIndicator color="#0a0e1a" /> : <Text style={s.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── HEADER BAR ── */}
        <DesktopHeader
          user={user}
          language={language}
          handleLanguageToggle={handleLanguageToggle}
          selectedTab="XO_GAME"
          setPwaModalVisible={setPwaModalVisible}
          bgMusicPlaying={isPlaying}
          onToggleSound={toggleMusic}
          unreadCount={unreadCount}
          setNotificationsVisible={setNotificationsVisible}
          router={router}
        />

        {/* ── CORE BODY CONTAINER ── */}
        <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.pageContentWrapper}>
            <View style={s.threeColumnRow}>
              {/* 1. LEFT SIDEBAR */}
          <DesktopSidebar
            user={user}
            balance={Number(user?.available_balance || 0)}
            currentScreen="profile"
            style={{ width: 280 }}
            refreshProfile={refreshProfile}
            setDepositVisible={setDepositVisible}
            setWithdrawVisible={setWithdrawVisible}
            router={router}
          />

          {/* 2. CENTER COLUMN */}
              <View style={s.centerColumn}>
                {/* 1. Large Profile Header Card */}
                <View style={s.profileHeaderCard}>
                  <View style={s.profileCardInfoRow}>
                    {/* Big Avatar */}
                    <View style={s.profileBigAvatarShell}>
                      <Text style={s.profileBigAvatarText}>
                        {user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}
                      </Text>
                    </View>

                    {/* Meta details */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={s.profileUsernameText}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#22d3ee" />
                        <Text style={s.profileVerifiedText}>+ VERIFIED</Text>
                        <Text style={s.profileDotDivider}>•</Text>
                        <Text style={s.profileMemberSinceText}>Member since {memberSince}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 2. Stat Cards Grid */}
                <View style={s.statsGrid}>
                  {/* Games Played */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(0, 191, 255, 0.12)" }]}>
                      <Ionicons name="layers" size={20} color="#00BFFF" />
                    </View>
                    <View style={{ marginLeft: 14 }}>
                      <Text style={s.statCardLabel}>TOTAL GAMES</Text>
                      <Text style={[s.statCardVal, { color: "#FFFFFF" }]}>{stats.total}</Text>
                    </View>
                  </View>

                  {/* Win Rate */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(255, 23, 68, 0.12)" }]}>
                      <Ionicons name="trending-up" size={20} color="#FF1744" />
                    </View>
                    <View style={{ marginLeft: 14 }}>
                      <Text style={s.statCardLabel}>WIN RATE</Text>
                      <Text style={[s.statCardVal, { color: "#FF1744" }]}>{stats.winRate}%</Text>
                    </View>
                  </View>

                  {/* Total Winnings */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                      <Ionicons name="trophy" size={20} color="#10B981" />
                    </View>
                    <View style={{ marginLeft: 14 }}>
                      <Text style={s.statCardLabel}>TOTAL WINNINGS</Text>
                      <Text style={[s.statCardVal, { color: "#10B981" }]}>{stats.winnings}</Text>
                    </View>
                  </View>

                  {/* Current Balance */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(245, 182, 66, 0.12)" }]}>
                      <Ionicons name="wallet" size={20} color="#F5B642" />
                    </View>
                    <View style={{ marginLeft: 14 }}>
                      <Text style={s.statCardLabel}>CURRENT BALANCE</Text>
                      <Text style={[s.statCardVal, { color: "#F5B642" }]}>ETB {user?.available_balance ? Number(user.available_balance).toLocaleString() : "0"}</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Account Details Card */}
                <View style={s.card}>
                  <Text style={s.cardHeaderTitle}>Account Details</Text>
                  
                  <View style={s.detailRowsGroup}>
                    {/* Masked Phone */}
                    <View style={s.accountDetailRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons name="call" size={16} color="#8b93a7" />
                        <Text style={s.accountDetailLabel}>Phone Number</Text>
                      </View>
                      <Text style={s.accountDetailVal}>{maskedPhone}</Text>
                    </View>

                    {/* Verification Status */}
                    <View style={s.accountDetailRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons name="shield-checkmark" size={16} color="#8b93a7" />
                        <Text style={s.accountDetailLabel}>Verification Status</Text>
                      </View>
                      <Text style={[s.accountDetailVal, { color: "#00BFFF" }]}>Verified (Level 2)</Text>
                    </View>

                    {/* Referral Code */}
                    {referralEnabled && (
                      <View style={s.accountDetailRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Ionicons name="gift" size={16} color="#8b93a7" />
                          <Text style={s.accountDetailLabel}>Referral Code</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[s.accountDetailVal, { color: "#F5B642" }]}>{referralCode || "XO-ETH"}</Text>
                          <TouchableOpacity onPress={handleCopyReferral} style={s.copyCodeBtn} activeOpacity={0.8}>
                            <Ionicons name="copy-outline" size={13} color="#F5B642" />
                            <Text style={s.copyCodeBtnText}>COPY</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* 4. Settings List Card */}
                <View style={s.card}>
                  <Text style={s.cardHeaderTitle}>Settings & Preferences</Text>

                  <View style={{ marginTop: 10 }}>
                    {/* Row 1: Edit Profile */}
                    <TouchableOpacity onPress={() => setEditModalVisible(true)} style={s.settingsListRow} activeOpacity={0.8}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={[s.settingsIconWrap, { backgroundColor: "rgba(0, 191, 255, 0.12)" }]}>
                          <Ionicons name="create-outline" size={17} color="#00BFFF" />
                        </View>
                        <Text style={s.settingsRowLabel}>Edit Profile details</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#8b93a7" />
                    </TouchableOpacity>

                    {/* Row 3: Notification Preference */}
                    <View style={s.settingsListRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={[s.settingsIconWrap, { backgroundColor: "rgba(245, 182, 66, 0.12)" }]}>
                          <Ionicons name="notifications-outline" size={17} color="#F5B642" />
                        </View>
                        <Text style={s.settingsRowLabel}>Mute Sound & Notifications</Text>
                      </View>
                      <Switch value={notisMuted} onValueChange={(val) => {
                        setNotisMuted(val);
                        toast.success(isEN ? "Preferences Saved" : "ቅንጅቶች ተቀምጠዋል");
                      }} trackColor={{ false: "#1f2540", true: "#00BFFF" }} thumbColor={notisMuted ? "#ffffff" : "#8b93a7"} />
                    </View>
                  </View>
                </View>

                {/* 5. Logout Button */}
                <TouchableOpacity onPress={() => setExitModalVisible(true)} style={s.profileLogoutBtn} activeOpacity={0.85}>
                  <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.profileLogoutBtnText}>LOGOUT FROM ACCOUNT</Text>
                </TouchableOpacity>
              </View>

              {/* 3. RIGHT SIDEBAR — Placeholder or Leaderboard widget */}
              <View style={s.rightSidebar}>
                <View style={s.card}>
                  <Text style={s.sectionTitleSmall}>SUPPORT CHANNEL</Text>
                  <Text style={s.supportCardDesc}>If you have any questions or need verification help, please contact our support team on Telegram.</Text>
                  
                  <TouchableOpacity onPress={() => router.push('https://t.me/xoetsupport' as any)} style={s.supportChannelBtn} activeOpacity={0.85}>
                    <Ionicons name="paper-plane" size={15} color="#fff" />
                    <Text style={s.supportChannelBtnText}>TELEGRAM SUPPORT</Text>
                  </TouchableOpacity>
                </View>

                {referralEnabled && (
                  <View style={[s.card, { marginTop: 18 }]}>
                    <Text style={s.sectionTitleSmall}>REFERRAL REWARDS</Text>
                    <Text style={s.supportCardDesc}>Invite your friends to XO Ethiopia and earn a percentage reward on their wins and deposit bonuses!</Text>
                    <TouchableOpacity onPress={() => setShowReferralModal(true)} style={[s.supportChannelBtn, { backgroundColor: "#F5B642" }]} activeOpacity={0.85}>
                      <Ionicons name="gift" size={15} color="#080F17" />
                      <Text style={[s.supportChannelBtnText, { color: "#080F17" }]}>VIEW REFERRALS</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Responsible Gaming (Per Image 1 Wireframe) */}
                <View style={[s.card, { marginTop: 18 }]}>
                  <Text style={s.sectionTitleSmall}>RESPONSIBLE GAMING</Text>
                  <Text style={s.supportCardDesc}>Play responsibly. Need to set deposit limits or take a short break? Our 24/7 team is ready to assist.</Text>
                  <TouchableOpacity onPress={() => router.push('https://t.me/xoetsupport' as any)} style={[s.supportChannelBtn, { backgroundColor: "rgba(255, 23, 68, 0.12)", borderWidth: 1, borderColor: "rgba(255, 23, 68, 0.4)" }]} activeOpacity={0.85}>
                    <Ionicons name="shield" size={15} color="#FF1744" />
                    <Text style={[s.supportChannelBtnText, { color: "#FF1744" }]}>PLAYER PROTECTION</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── MOBILE VIEW LAYOUT (XOET Brand Theme & Real Gaming Features) ───
  return (
    <View style={{ flex: 1, backgroundColor: "#07090e" }}>
      {/* Modals */}
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />
      <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
      <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />

      {/* Top Header: Back Arrow + Centered "My Profile" + Language Pill */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 52 : 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.06)",
        backgroundColor: "rgba(7, 9, 14, 0.95)",
      }}>
        <TouchableOpacity
          onPress={() => {
            playTickSound();
            haptics.tap();
            router.back();
          }}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#111625",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <Text style={{
          color: "#ffffff",
          fontSize: 18,
          fontWeight: "800",
          fontFamily: "Inter, sans-serif",
          letterSpacing: -0.2,
        }}>
          {isEN ? "My Profile" : "የእኔ መገለጫ"}
        </Text>

        <TouchableOpacity
          onPress={() => {
            playTickSound();
            haptics.tap();
            handleLanguageToggle();
          }}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            height: 34,
            paddingHorizontal: 10,
            borderRadius: 17,
            backgroundColor: "#111625",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Ionicons name="globe-outline" size={14} color="#00daf3" />
          <Text style={{ color: "#ffffff", fontSize: 11.5, fontWeight: "800" }}>
            {language.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile User Card (Dark Gaming Surface) */}
        <View style={{
          backgroundColor: "#111625",
          borderRadius: 22,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 6,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
              {/* Circular Avatar with Cyan Accent */}
              <View style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: "#161c2e",
                borderWidth: 2,
                borderColor: "#00daf3",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                {(user as any)?.avatar ? (
                  <Image source={{ uri: (user as any).avatar }} style={{ width: 54, height: 54 }} />
                ) : (
                  <Text style={{ color: "#00daf3", fontSize: 20, fontWeight: "900" }}>
                    {user?.username ? user.username.slice(0, 2).toUpperCase() : "XO"}
                  </Text>
                )}
              </View>

              {/* Name & Phone */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{
                  color: "#ffffff",
                  fontSize: 17,
                  fontWeight: "800",
                  fontFamily: "Inter, sans-serif",
                }} numberOfLines={1}>
                  {user?.display_name || user?.username || "Player"}
                </Text>
                <Text style={{
                  color: "#8b93a7",
                  fontSize: 12.5,
                  fontWeight: "600",
                  marginTop: 2,
                }}>
                  {maskedPhone || user?.number || "XOET Player"}
                </Text>
              </View>
            </View>

            {/* Pencil Edit Icon Button */}
            <TouchableOpacity
              onPress={() => {
                playTickSound();
                haptics.tap();
                setEditUsername(user?.username || "");
                setEditDisplayName(user?.display_name || user?.username || "");
                setEditModalVisible(true);
              }}
              activeOpacity={0.7}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "#161c2e",
                borderWidth: 1,
                borderColor: "rgba(0, 218, 243, 0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="pencil-outline" size={17} color="#00daf3" />
            </TouchableOpacity>
          </View>

          {/* Balance Row */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.06)",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="wallet-outline" size={15} color="#10b981" />
              <Text style={{ color: "#8b93a7", fontSize: 12, fontWeight: "600" }}>{isEN ? "Balance:" : "ሂሳብ:"}</Text>
              <Text style={{ color: "#10b981", fontSize: 13.5, fontWeight: "900" }}>
                ETB {Number(user?.available_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Gaming Performance Stats Bar */}
        <View style={{
          flexDirection: "row",
          backgroundColor: "#111625",
          borderRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.06)",
          alignItems: "center",
          justifyContent: "space-around",
        }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#8b93a7", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isEN ? "Games" : "ጨዋታዎች"}
            </Text>
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900", marginTop: 2 }}>
              {stats.total}
            </Text>
          </View>

          <View style={{ width: 1, height: 26, backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#8b93a7", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isEN ? "Victories" : "ድሎች"}
            </Text>
            <Text style={{ color: "#10b981", fontSize: 17, fontWeight: "900", marginTop: 2 }}>
              {stats.wins}
            </Text>
          </View>

          <View style={{ width: 1, height: 26, backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#8b93a7", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isEN ? "Win Rate" : "የማሸነፍ መጠን"}
            </Text>
            <Text style={{ color: "#00daf3", fontSize: 17, fontWeight: "900", marginTop: 2 }}>
              {stats.winRate}%
            </Text>
          </View>
        </View>

        {/* 3. Section: "Gaming & Activities" */}
        <View>
          <Text style={{
            color: "#8b93a7",
            fontSize: 12,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 8,
            paddingHorizontal: 4,
          }}>
            {isEN ? "Gaming & Ledger" : "ጨዋታ እና ሂሳብ"}
          </Text>

          <View style={{
            backgroundColor: "#111625",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}>
            {/* Match & Game History */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                router.push("/(authed)/home/history");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(0, 218, 243, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="game-controller-outline" size={19} color="#00daf3" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Match & Game History" : "የጨዋታ ታሪክ"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>

            {/* Transactions & Financial Ledger */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                router.push("/(authed)/home/transactions");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="receipt-outline" size={19} color="#10b981" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Transactions & Receipts" : "የግብይት እና ደረሰኝ ዝርዝር"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>

            {/* Deposit Funds */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                setDepositVisible(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="add-circle-outline" size={19} color="#10b981" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Deposit Funds (Chapa / Telebirr)" : "ገንዘብ አስገባ (ቻፓ / ቴሌብር)"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>

            {/* Withdraw Earnings */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                setWithdrawVisible(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 42, 95, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="arrow-up-circle-outline" size={19} color="#ff2a5f" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Withdraw Earnings" : "ያሸነፉትን ገንዘብ አውጣ"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>

            {/* Invite Friends & Referral Rewards */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                setShowReferralModal(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(245, 182, 66, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="gift-outline" size={19} color="#f5b642" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Invite Friends & Earn Rewards" : "ጓደኞችን ጋብዝ እና ቦነስ አግኝ"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Section: "Preferences & Audio" */}
        <View>
          <Text style={{
            color: "#8b93a7",
            fontSize: 12,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 8,
            paddingHorizontal: 4,
          }}>
            {isEN ? "Preferences & Security" : "ምርጫዎች እና ደህንነት"}
          </Text>

          <View style={{
            backgroundColor: "#111625",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}>
            {/* Sound & Music Toggle */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                toggleMusic();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(0, 218, 243, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name={isPlaying ? "volume-high-outline" : "volume-mute-outline"} size={19} color="#00daf3" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? (isPlaying ? "Sound Effects (Enabled)" : "Sound Effects (Muted)") : (isPlaying ? "ድምጽ (በርቷል)" : "ድምጽ (ጠፍቷል)")}
                </Text>
              </View>
              <Text style={{ color: isPlaying ? "#00daf3" : "#64748b", fontSize: 13, fontWeight: "800" }}>
                {isPlaying ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>

            {/* Change Profile & PIN / Password */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                setEditUsername(user?.username || "");
                setEditDisplayName(user?.display_name || user?.username || "");
                setEditModalVisible(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="lock-closed-outline" size={19} color="#ffffff" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Edit Profile & Security PIN" : "መገለጫ እና የይለፍ ቃል ቀይር"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Section: "Support & Community" */}
        <View>
          <Text style={{
            color: "#8b93a7",
            fontSize: 12,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 8,
            paddingHorizontal: 4,
          }}>
            {isEN ? "Support & Community" : "ድጋፍ እና ማህበረሰብ"}
          </Text>

          <View style={{
            backgroundColor: "#111625",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}>
            {/* Telegram Support Channel */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                router.push("https://t.me/xoetsupport" as any);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(2, 132, 199, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="paper-plane" size={18} color="#00daf3" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Official Telegram Support" : "የቴሌግራም የቀጥታ ድጋፍ"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>

            {/* Provable Fairness & Rules */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTickSound();
                haptics.tap();
                toast.info(
                  isEN ? "Game Rules & Fairness" : "የጨዋታ ህጎች",
                  isEN ? "Tic-Tac-Toe & Spin outcomes are cryptographically verified and fair." : "የጨዋታ ውጤቶች ፍትሃዊ እና በቴክኖሎጂ የተረጋገጡ ናቸው።"
                );
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="shield-checkmark-outline" size={19} color="#10b981" />
                </View>
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "700" }}>
                  {isEN ? "Game Rules & Provable Fairness" : "የጨዋታ ህጎች እና ፍትሃዊነት"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Panel Button (if admin) */}
        {(user?.role === "admin" || user?.role === "superadmin" || (user as any)?.is_superadmin || isSuperAdmin) && (
          <TouchableOpacity
            onPress={() => {
              playTickSound();
              haptics.tap();
              router.push("/admin" as any);
            }}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#111625",
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderWidth: 1.2,
              borderColor: "#00daf3",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="shield-checkmark" size={20} color="#00daf3" />
              <Text style={{ color: "#00daf3", fontSize: 14.5, fontWeight: "800" }}>
                {isEN ? "Open Admin Control Panel" : "የአስተዳዳሪ ገጽ ክፈት"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#00daf3" />
          </TouchableOpacity>
        )}

        {/* 6. Bottom Button: [ ⇥ Log Out ] */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            playTickSound();
            haptics.tap();
            setExitModalVisible(true);
          }}
          style={{
            height: 52,
            borderRadius: 26,
            backgroundColor: "#111625",
            borderWidth: 1.2,
            borderColor: "rgba(255, 42, 95, 0.35)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff2a5f" />
          <Text style={{
            color: "#ff2a5f",
            fontSize: 15,
            fontWeight: "800",
            fontFamily: "Inter, sans-serif",
            letterSpacing: 0.3,
          }}>
            {isEN ? "Log Out" : "ውጣ"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Dialog Modal */}
      {editModalVisible && (
        <View style={s.dialogOverlay}>
          <View style={s.dialogCard}>
            <View style={s.dialogHeader}>
              <Text style={s.dialogTitle}>{isEN ? "Edit Profile" : "መገለጫ አርትዕ"}</Text>
              <TouchableOpacity onPress={handleAttemptCloseEditModal}>
                <Ionicons name="close" size={20} color="#8b93a7" />
              </TouchableOpacity>
            </View>
            <View style={s.dialogBody}>
              <Text style={s.inputLabel}>{isEN ? "USERNAME" : "የተጠቃሚ ስም"}</Text>
              <TextInput value={editUsername} onChangeText={setEditUsername} style={s.dialogInput} placeholder={isEN ? "Username" : "የተጠቃሚ ስም"} placeholderTextColor="rgba(255,255,255,0.2)" />

              <Text style={[s.inputLabel, { marginTop: 14 }]}>{isEN ? "DISPLAY NAME" : "የሚታይ ስም"}</Text>
              <TextInput value={editDisplayName} onChangeText={setEditDisplayName} style={s.dialogInput} placeholder={isEN ? "Display Name" : "የሚታይ ስም"} placeholderTextColor="rgba(255,255,255,0.2)" />
            </View>
            <View style={s.dialogFooter}>
              <TouchableOpacity onPress={handleAttemptCloseEditModal} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveProfile} style={s.saveBtn} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#0a0e1a" /> : <Text style={s.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation visible={exitModalVisible} onCancel={() => setExitModalVisible(false)} onConfirm={confirmExit} />
    </View>
  );
}

const s = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#0a0e1a" },

  // Header Style (Same as gameplay & history headers)
  header: {
    height: 88,
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  headerContentWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#00BFFF",
  },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  // Center toggle tabs
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#12172a",
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  toggleBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#00BFFF",
    ...(Platform.OS === 'web' ? { 
      backgroundImage: "linear-gradient(135deg, #FF1744 0%, #00BFFF 100%)",
      boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)"
    } as any : {}),
  },
  toggleBtnText: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  toggleBtnTextActive: { color: "#ffffff" },

  // Right Cluster
  utilityCluster: { flexDirection: "row", alignItems: "center", gap: 14 },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 8,
  },
  balanceLabel: { color: "#8b93a7", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginRight: 10, fontFamily: "Inter, sans-serif" },
  balanceVal: { color: "#22d3ee", fontSize: 15, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  refreshBtn: { marginLeft: 10, padding: 4 },
  
  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#12172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  utilityBtnText: { color: "#8b93a7", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", fontFamily: "Inter, sans-serif" },

  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileChipAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: { color: "#fff", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#f5b642", fontSize: 9, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  // Scroll View & Layout blueprints
  mainScrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },
  pageContentWrapper: {
    width: "100%",
    maxWidth: 1720,
    alignSelf: "center",
    gap: 20,
    ...(Platform.OS === "web" ? {
      zoom: 1.10,
    } as any : {}),
  },
  threeColumnRow: { flexDirection: "row", gap: 20, alignItems: "flex-start", width: "100%" },

  // Sidebar Layout (Same as gameplay & history left sidebars)
  leftSidebar: { width: 280, gap: 20 },
  card: {
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 20,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 30px rgba(0,0,0,0.15)" } as any : {}),
  },
  userCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  userCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  userCardAvatarText: { color: "#fff", fontSize: 16, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  userCardName: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  onlineText: { color: "#8b93a7", fontSize: 11, fontWeight: "500", fontFamily: "Inter, sans-serif" },
  
  tokensRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d1220",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  tokenLabel: { color: "#8b93a7", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  tokenVal: { color: "#f5b642", fontSize: 15, fontWeight: "800", marginTop: 2, fontFamily: "Inter, sans-serif" },
  tokenPlusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },

  // Vertical navigation
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    position: "relative",
  },
  navItemActive: { backgroundColor: "rgba(0, 191, 255, 0.08)" },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    backgroundColor: "#00BFFF",
    borderRadius: 2,
  },
  navText: { color: "#8b93a7", fontSize: 14, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  navTextActive: { color: "#e5e3ff" },

  // Wallet
  sectionTitleSmall: { color: "#8b93a7", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14, fontFamily: "Inter, sans-serif" },
  walletRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  walletLabel: { color: "#8b93a7", fontSize: 12, fontWeight: "500", fontFamily: "Inter, sans-serif" },
  walletValSmall: { fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  walletValSecond: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  walletButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  walletBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnTextSmall: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  // Sidebar bottom profile card styles
  verifiedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 218, 243, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  rechargeBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
  },
  rechargeBtnText: { color: "#0a0e1a", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)",
  },
  logoutBtnText: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "800", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" },

  // Center column
  centerColumn: { flex: 1, gap: 20 },

  // ── Profile Header Card ──
  profileHeaderCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    padding: 24,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 30px rgba(0,0,0,0.25)" } as any : {}),
  },
  profileCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  profileBigAvatarShell: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(0, 191, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#00BFFF",
    boxShadow: "0 0 15px rgba(0, 191, 255, 0.25)",
  } as any,
  profileBigAvatarText: {
    color: "#00BFFF",
    fontSize: 26,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  profileUsernameText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  vipLevelBadge: {
    backgroundColor: "rgba(245, 182, 66, 0.15)",
    borderWidth: 1.2,
    borderColor: "rgba(245, 182, 66, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  vipLevelBadgeText: {
    color: "#F5B642",
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  profileVerifiedText: {
    color: "#00BFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Space Grotesk, sans-serif",
  },
  profileDotDivider: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 14,
  },
  profileMemberSinceText: {
    color: "#8893A7",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Stat Cards Grid (Same as history page stats grid) ──
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statCard: {
    flex: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardLabel: { color: "#8893A7", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, fontFamily: "Space Grotesk, sans-serif" },
  statCardVal: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginTop: 2, fontFamily: "Space Grotesk, sans-serif" },

  // Mid-Level Highlight Cards
  cardHeaderTitleSmall: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Space Grotesk, sans-serif",
  },
  highlightLabel: {
    color: "#8893A7",
    fontSize: 12.5,
    fontWeight: "600",
  },
  highlightVal: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
  },

  // Account details card
  cardHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1E293B",
    paddingBottom: 12,
    marginBottom: 14,
  },
  detailRowsGroup: { gap: 14 },
  accountDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  accountDetailLabel: {
    color: "#8893A7",
    fontSize: 13.5,
    fontWeight: "600",
  },
  accountDetailVal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
  },
  copyCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 182, 66, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  copyCodeBtnText: {
    color: "#F5B642",
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },

  // ── Settings list rows ──
  settingsListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRowLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Logout Button
  profileLogoutBtn: {
    backgroundColor: "#FF1744", // Brand Signal Red
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 25px rgba(255, 23, 68, 0.25)" } as any : {}),
  },
  profileLogoutBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Space Grotesk, sans-serif",
  },

  // Security Bottom Banner
  securityBottomBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#111827",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#233041",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  securityBannerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  securityBannerText: {
    color: "#8893A7",
    fontSize: 11.5,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
  },
  securityBannerDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#233041",
  },

  // ── Dialog Overlay Styles ──
  dialogOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  dialogCard: {
    width: 360,
    backgroundColor: "#0d1220",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dialogTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  dialogBody: {
    marginBottom: 24,
  },
  inputLabel: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: "Inter, sans-serif",
  },
  dialogInput: {
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    borderRadius: 14,
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
  },
  dialogFooter: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#8b93a7",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#22d3ee",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#0a0e1a",
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },

  // ── RIGHT SIDEBAR ──
  rightSidebar: { width: 320 },
  supportCardDesc: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter, sans-serif",
    marginBottom: 16,
  },
  supportChannelBtn: {
    backgroundColor: "#00BFFF",
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  supportChannelBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },

  // Mobile layout helpers
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
  },
  mobileBackBtn: { padding: 8 },
  mobileTitleText: { color: "#fff", fontSize: 18, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  mobileStatCard: {
    backgroundColor: "#12172a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 12,
  },
  mobileStatLabel: { color: "#8b93a7", fontSize: 8, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  mobileStatVal: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 4, fontFamily: "Inter, sans-serif" },
});
