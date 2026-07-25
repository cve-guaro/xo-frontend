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
import ReferralModal from "../../../components/ReferralModal";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import LogoutConfirmation from "../../../components/LogoutConfirmation";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import NotificationsPopover from "../../../components/NotificationsPopover";

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

  const { user, token, language, refreshProfile, logout, switchLanguage } = useAuth();
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
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update profile");

      await refreshProfile();
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
        <View style={s.header}>
          <View style={s.headerContentWrapper}>
            {/* Left: Logo */}
            <View style={s.logoContainer}>
              <Image source={require("../../../assets/images/icon.jpg")} style={s.logoImage} />
              <Text style={s.logoText}>XO ETHIOPIA</Text>
            </View>

            {/* Center: Toggle Pill */}
            <View style={s.toggleContainer}>
              <TouchableOpacity
                style={s.toggleBtn}
                onPress={() => router.push('/(authed)/home/gameplay')}
                activeOpacity={0.85}
              >
                <Text style={s.toggleBtnText}>SPIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, s.toggleBtnActive]}
                onPress={() => router.push('/(authed)/home/gameplay')}
                activeOpacity={0.85}
              >
                <Text style={[s.toggleBtnText, s.toggleBtnTextActive]}>XO GAME</Text>
              </TouchableOpacity>
            </View>

            {/* Right: Utility Cluster */}
            <View style={s.utilityCluster}>

              <TouchableOpacity onPress={() => setPwaModalVisible(true)} style={s.utilityBtn} activeOpacity={0.8}>
                <Ionicons name="cloud-download-outline" size={16} color="#8b93a7" />
                <Text style={s.utilityBtnText}>APP</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLanguageToggle} style={s.utilityBtn} activeOpacity={0.8}>
                <Ionicons name="globe-outline" size={15} color="#8b93a7" />
                <Text style={s.utilityBtnText}>{language.toUpperCase()}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleMusic} style={s.utilityBtn} activeOpacity={0.8}>
                <Ionicons name={isPlaying ? "volume-high-outline" : "volume-mute-outline"} size={16} color="#8b93a7" />
                <Text style={s.utilityBtnText}>{isPlaying ? "SOUND" : "MUTED"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setNotificationsVisible(true)} style={s.bellBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadCount}</Text></View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.profileChip} activeOpacity={0.85}>
                <View style={s.profileChipAvatar}>
                  <Text style={s.profileChipAvatarText}>{user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}</Text>
                </View>
                <View style={{ marginRight: 6 }}>
                  <Text style={s.profileChipName}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                  <Text style={s.profileChipVip}>VIP 24</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── CORE BODY CONTAINER ── */}
        <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.pageContentWrapper}>
            <View style={s.threeColumnRow}>
              {/* 1. LEFT SIDEBAR (fixed width 280px) */}
              <View style={s.leftSidebar}>
                <View style={s.card}>
                  <View style={s.userCardHeader}>
                    <View style={s.userCardAvatar}>
                      <Text style={s.userCardAvatarText}>{user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}</Text>
                    </View>
                    <View>
                      <Text style={s.userCardName} numberOfLines={1}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                      <View style={s.onlineRow}>
                        <View style={s.onlineDot} />
                        <Text style={s.onlineText}>Online</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Available Balance card */}
                  <View style={s.tokensRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tokenLabel}>AVAILABLE BALANCE</Text>
                      <Text style={[s.tokenVal, { color: "#22d3ee" }]}>ETB {user?.available_balance ? Number(user.available_balance).toLocaleString() : "0"}</Text>
                    </View>
                    <TouchableOpacity onPress={refreshProfile} style={[s.tokenPlusBtn, { backgroundColor: "rgba(34, 211, 238, 0.15)", borderColor: "rgba(34, 211, 238, 0.3)", borderWidth: 1 }]} activeOpacity={0.8}>
                      <Ionicons name="refresh" size={12} color="#22d3ee" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Vertical Navigation Links */}
                <View style={s.card}>
                  <TouchableOpacity onPress={() => handleNavClick('home')} style={s.navItem} activeOpacity={0.8}>
                    <Ionicons name="home-outline" size={18} color="#8b93a7" />
                    <Text style={s.navText}>Home</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleNavClick('history')} style={s.navItem} activeOpacity={0.8}>
                    <Ionicons name="time-outline" size={18} color="#8b93a7" />
                    <Text style={s.navText}>History</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleNavClick('leaderboard')} style={s.navItem} activeOpacity={0.8}>
                    <Ionicons name="trophy-outline" size={18} color="#8b93a7" />
                    <Text style={s.navText}>Leaderboard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleNavClick('transactions')} style={s.navItem} activeOpacity={0.8}>
                    <Ionicons name="receipt-outline" size={18} color="#8b93a7" />
                    <Text style={s.navText}>Transactions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleNavClick('profile')} style={[s.navItem, s.navItemActive]} activeOpacity={0.8}>
                    <View style={s.navItemActiveBar} />
                    <Ionicons name="person" size={18} color="#8b5cf6" />
                    <Text style={[s.navText, s.navTextActive]}>Profile</Text>
                  </TouchableOpacity>

                  {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                    <TouchableOpacity onPress={() => handleNavClick('admin')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Admin</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Wallet Summary Panel */}
                <View style={s.card}>
                  <Text style={s.sectionTitleSmall}>WALLET</Text>
                  
                  <View style={s.walletRow}>
                    <Text style={s.walletLabel}>Deposit</Text>
                    <Text style={[s.walletValSmall, { color: "#22c55e" }]}>+ 3,420 ETB</Text>
                  </View>
                  
                  <View style={s.walletRow}>
                    <Text style={s.walletLabel}>Withdraw</Text>
                    <Text style={[s.walletValSmall, { color: "#ef4444" }]}>- 420 ETB</Text>
                  </View>
                  
                  <View style={s.walletRow}>
                    <Text style={s.walletLabel}>Transactions</Text>
                    <Text style={s.walletValSecond}>12 today</Text>
                  </View>

                  <View style={s.walletButtons}>
                    <TouchableOpacity onPress={() => setDepositVisible(true)} style={[s.walletBtnSmall, { borderColor: "#22d3ee" }]} activeOpacity={0.8}>
                      <Text style={[s.walletBtnTextSmall, { color: "#22d3ee" }]}>DEPOSIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setWithdrawVisible(true)} style={[s.walletBtnSmall, { borderColor: "#7c3aed" }]} activeOpacity={0.8}>
                      <Text style={[s.walletBtnTextSmall, { color: "#7c3aed" }]}>WITHDRAW</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Redundant Profile card removed */}
              </View>

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
                        <View style={s.vipLevelBadge}>
                          <Text style={s.vipLevelBadgeText}>VIP 24</Text>
                        </View>
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
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(34, 211, 238, 0.1)" }]}>
                      <Ionicons name="layers" size={18} color="#22d3ee" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>TOTAL GAMES</Text>
                      <Text style={s.statCardVal}>{stats.total}</Text>
                    </View>
                  </View>

                  {/* Win Rate */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(168, 85, 247, 0.1)" }]}>
                      <Ionicons name="trending-up" size={18} color="#a855f7" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>WIN RATE</Text>
                      <Text style={s.statCardVal}>{stats.winRate}%</Text>
                    </View>
                  </View>

                  {/* Total Winnings */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(34, 197, 94, 0.1)" }]}>
                      <Ionicons name="trophy" size={18} color="#22c55e" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>TOTAL WINNINGS</Text>
                      <Text style={[s.statCardVal, { color: "#22c55e", fontSize: 18 }]}>{stats.winnings}</Text>
                    </View>
                  </View>

                  {/* Current Balance */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(245, 182, 66, 0.1)" }]}>
                      <Ionicons name="wallet" size={18} color="#f5b642" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>CURRENT BALANCE</Text>
                      <Text style={[s.statCardVal, { color: "#f5b642", fontSize: 18 }]}>ETB {user?.available_balance ? Number(user.available_balance).toLocaleString() : "0"}</Text>
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
                        <Ionicons name="call" size={15} color="#8b93a7" />
                        <Text style={s.accountDetailLabel}>Phone Number</Text>
                      </View>
                      <Text style={s.accountDetailVal}>{maskedPhone}</Text>
                    </View>

                    {/* Verification Status */}
                    <View style={s.accountDetailRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons name="shield-checkmark" size={15} color="#8b93a7" />
                        <Text style={s.accountDetailLabel}>Verification Status</Text>
                      </View>
                      <Text style={[s.accountDetailVal, { color: "#22d3ee" }]}>Verified (Level 2)</Text>
                    </View>

                    {/* Referral Code */}
                    {referralEnabled && (
                      <View style={s.accountDetailRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Ionicons name="gift" size={15} color="#8b93a7" />
                          <Text style={s.accountDetailLabel}>Referral Code</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[s.accountDetailVal, { color: "#f5b642" }]}>{referralCode || "XO-ETH"}</Text>
                          <TouchableOpacity onPress={handleCopyReferral} style={s.copyCodeBtn} activeOpacity={0.8}>
                            <Ionicons name="copy-outline" size={12} color="#f5b642" />
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
                        <View style={[s.settingsIconWrap, { backgroundColor: "rgba(124, 58, 237, 0.1)" }]}>
                          <Ionicons name="create-outline" size={16} color="#7c3aed" />
                        </View>
                        <Text style={s.settingsRowLabel}>Edit Profile details</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#8b93a7" />
                    </TouchableOpacity>

                    {/* Row 3: Notification Preference */}
                    <View style={s.settingsListRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={[s.settingsIconWrap, { backgroundColor: "rgba(245, 182, 66, 0.1)" }]}>
                          <Ionicons name="notifications-outline" size={16} color="#f5b642" />
                        </View>
                        <Text style={s.settingsRowLabel}>Mute Sound & Notifications</Text>
                      </View>
                      <Switch value={notisMuted} onValueChange={(val) => {
                        setNotisMuted(val);
                        toast.success(isEN ? "Preferences Saved" : "ቅንጅቶች ተቀምጠዋል");
                      }} trackColor={{ false: "#1f2540", true: "#7c3aed" }} thumbColor={notisMuted ? "#ffffff" : "#8b93a7"} />
                    </View>
                  </View>
                </View>

                {/* 5. Logout Button */}
                <TouchableOpacity onPress={() => setExitModalVisible(true)} style={s.profileLogoutBtn} activeOpacity={0.85}>
                  <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
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

                <View style={[s.card, { marginTop: 20 }]}>
                  <Text style={s.sectionTitleSmall}>REFERRAL REWARDS</Text>
                  <Text style={s.supportCardDesc}>Invite your friends to XO Ethiopia and earn a percentage reward on their wins and deposit bonuses!</Text>
                  <TouchableOpacity onPress={() => setShowReferralModal(true)} style={[s.supportChannelBtn, { backgroundColor: "#f5b642" }]} activeOpacity={0.85}>
                    <Ionicons name="gift" size={15} color="#0a0e1a" />
                    <Text style={[s.supportChannelBtnText, { color: "#0a0e1a" }]}>VIEW REFERRALS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── MOBILE VIEW LAYOUT ───
  return (
    <View style={s.rootContainer}>
      <LinearGradient colors={["#0c0c1f", "#070714"]} style={StyleSheet.absoluteFill} />

      {/* Mobile Header */}
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.mobileBackBtn}>
          <Ionicons name="arrow-back" size={20} color="#00daf3" />
        </TouchableOpacity>
        <Text style={s.mobileTitleText}>Profile Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* Mobile Header Card */}
        <View style={[s.profileHeaderCard, { padding: 18 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={[s.profileBigAvatarShell, { width: 48, height: 48 }]}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "900" }}>ME</Text>
            </View>
            <View>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
              <Text style={{ color: "#22d3ee", fontSize: 10, marginTop: 4 }}>Verified • VIP 24</Text>
            </View>
          </View>
        </View>

        {/* Mobile Stats Row */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <View style={[s.mobileStatCard, { width: "47%" }]}>
            <Text style={s.mobileStatLabel}>GAMES</Text>
            <Text style={s.mobileStatVal}>{stats.total}</Text>
          </View>
          <View style={[s.mobileStatCard, { width: "47%" }]}>
            <Text style={s.mobileStatLabel}>WIN RATE</Text>
            <Text style={s.mobileStatVal}>{stats.winRate}%</Text>
          </View>
          <View style={[s.mobileStatCard, { width: "47%" }]}>
            <Text style={s.mobileStatLabel}>WINNINGS</Text>
            <Text style={[s.mobileStatVal, { color: "#22c55e" }]}>{stats.winnings}</Text>
          </View>
          <View style={[s.mobileStatCard, { width: "47%" }]}>
            <Text style={s.mobileStatLabel}>BALANCE</Text>
            <Text style={[s.mobileStatVal, { color: "#f5b642" }]}>ETB {user?.available_balance}</Text>
          </View>
        </View>

        {/* Mobile Account Details */}
        <View style={s.card}>
          <Text style={s.cardHeaderTitle}>Account</Text>
          <View style={s.detailRowsGroup}>
            <View style={s.accountDetailRow}>
              <Text style={s.accountDetailLabel}>Phone</Text>
              <Text style={s.accountDetailVal}>{maskedPhone}</Text>
            </View>
            {referralEnabled && (
              <View style={s.accountDetailRow}>
                <Text style={s.accountDetailLabel}>Referral</Text>
                <TouchableOpacity onPress={handleCopyReferral}>
                  <Text style={[s.accountDetailVal, { color: "#f5b642" }]}>{referralCode || "Copy"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Mobile Settings List */}
        <View style={s.card}>
          <Text style={s.cardHeaderTitle}>Settings</Text>
          <TouchableOpacity onPress={() => setEditModalVisible(true)} style={s.settingsListRow}>
            <Text style={s.settingsRowLabel}>Edit Name</Text>
            <Ionicons name="chevron-forward" size={16} color="#8b93a7" />
          </TouchableOpacity>
        </View>

        {/* Mobile Admin Panel Button (visible to admins) */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <TouchableOpacity onPress={() => router.push('/(authed)/admin' as any)} style={[s.profileLogoutBtn, { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.4)', marginBottom: 10 }]}>
            <Ionicons name="shield-checkmark" size={18} color="#06b6d4" style={{ marginRight: 6 }} />
            <Text style={[s.profileLogoutBtnText, { color: '#06b6d4' }]}>OPEN ADMIN PANEL</Text>
          </TouchableOpacity>
        )}

        {/* Mobile Logout */}
        <TouchableOpacity onPress={() => setExitModalVisible(true)} style={s.profileLogoutBtn}>
          <Text style={s.profileLogoutBtnText}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>
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
    borderColor: "#7c3aed",
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
    backgroundColor: "#7c3aed",
    ...(Platform.OS === 'web' ? { 
      background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
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
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: { color: "#fff", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#f5b642", fontSize: 9, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  // Scroll View & Layout blueprints
  mainScrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 40, paddingVertical: 24, gap: 24 },
  pageContentWrapper: {
    width: "100%",
    gap: 24,
  },
  threeColumnRow: { flexDirection: "row", gap: 28, alignItems: "flex-start", width: "100%" },

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
    backgroundColor: "#8b5cf6",
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
  navItemActive: { backgroundColor: "rgba(124, 58, 237, 0.08)" },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    backgroundColor: "#7c3aed",
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
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 24,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 30px rgba(0,0,0,0.15)" } as any : {}),
  },
  profileCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  profileBigAvatarShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1f2540",
  },
  profileBigAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  profileUsernameText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  vipLevelBadge: {
    backgroundColor: "rgba(245, 182, 66, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  vipLevelBadgeText: {
    color: "#f5b642",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  profileVerifiedText: {
    color: "#22d3ee",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  profileDotDivider: {
    color: "rgba(255, 255, 255, 0.2)",
    fontSize: 12,
    fontFamily: "Inter, sans-serif",
  },
  profileMemberSinceText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
  },

  // ── Stat Cards Grid (Same as history page stats grid) ──
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statCard: {
    flex: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardLabel: { color: "#8b93a7", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  statCardVal: { color: "#22d3ee", fontSize: 22, fontWeight: "900", marginTop: 2, fontFamily: "Inter, sans-serif" },

  // Account details card
  cardHeaderTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  detailRowsGroup: { gap: 14 },
  accountDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  accountDetailLabel: {
    color: "#8b93a7",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
  },
  accountDetailVal: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  copyCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 182, 66, 0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(245, 182, 66, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  copyCodeBtnText: {
    color: "#f5b642",
    fontSize: 9,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },

  // ── Settings list rows ──
  settingsListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  settingsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRowLabel: {
    color: "#e5e3ff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
  },

  // Logout Button
  profileLogoutBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 25px rgba(239, 68, 68, 0.15)" } as any : {}),
  },
  profileLogoutBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Inter, sans-serif",
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
    backgroundColor: "#7c3aed",
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
