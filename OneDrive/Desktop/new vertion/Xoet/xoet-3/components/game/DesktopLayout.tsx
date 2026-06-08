// components/game/DesktopLayout.tsx
// Full desktop/tablet layout for the gameplay landing screen.
// Extracted from gameplay.tsx to reduce the parent file size.
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import { WebPressable } from "../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../components/WebModals";
import ProfileEditModal from "../../components/ProfileEditModal";
import ReferralModal from "../../components/ReferralModal";
import FriendMatchModal from "../../components/game/FriendMatchModal";
import PromotionPopup from "../../components/PromotionPopup";
import PwaInstallModal from "./PwaInstallModal";
import BoardDemo from "./BoardDemo";
import RoomSheet from "./RoomSheet";
import type { RoomConfig, SheetStep } from "./gameplayConstants";

// Helper to resolve avatar URLs
function fixUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // Try to build a full URL from the API path
  return url;
}

type LeaderboardEntry = {
  id?: string;
  username?: string;
  avatar?: string;
  wins: number;
  isMe?: boolean;
};

type DesktopLayoutProps = {
  // Auth & profile
  user: any;
  token: string | null;
  balance: number;
  language: string;
  isDesktop: boolean;
  isTablet: boolean;
  isBanned: boolean;
  isSearching: boolean;
  isEN: boolean;
  // Leaderboard
  weeklyLeaderboard: LeaderboardEntry[];
  weeklyPrizes: { rank: number; amount: number }[];
  loadingWeekly: boolean;
  secondsRemaining: number;
  // Stats
  winRate: number;
  rankMeta: { label: string; tone: string };
  // Live wins
  rawTickerList: { username: string; amount: number | string }[];
  // Room sheet
  roomSheetVisible: boolean;
  sheetStep: SheetStep;
  selectedRoom: RoomConfig;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  userCaps: any;
  // Modals
  depositVisible: boolean;
  withdrawVisible: boolean;
  friendModalVisible: boolean;
  pwaModalVisible: boolean;
  showReferralModal: boolean;
  showPromo: boolean;
  inviteResult: any;
  promoConfig: any;
  // Callbacks
  setDepositVisible: (v: boolean) => void;
  setWithdrawVisible: (v: boolean) => void;
  setFriendModalVisible: (v: boolean) => void;
  setPwaModalVisible: (v: boolean) => void;
  setShowReferralModal: (v: boolean) => void;
  setShowPromo: (v: boolean) => void;
  setInviteResult: (v: any) => void;
  openRoomSheet: () => void;
  closeRoomSheet: () => void;
  goBackToRooms: () => void;
  onSelectRoom: (id: RoomConfig["id"]) => void;
  selectAmount: (room: RoomConfig, min: number, max: number) => void;
  refreshProfile: () => void;
  handleLanguageToggle: () => void;
  handleSendInvite: (username: string, betAmount: number) => void;
  // Router
  router: any;
  // App config
  appConfig: any;
};

export default function DesktopLayout(props: DesktopLayoutProps) {
  const {
    user, token, balance, language, isDesktop, isTablet, isBanned, isSearching, isEN,
    weeklyLeaderboard, weeklyPrizes, loadingWeekly, secondsRemaining,
    winRate, rankMeta, rawTickerList,
    roomSheetVisible, sheetStep, selectedRoom, backdropOpacity, sheetTranslateY, userCaps,
    depositVisible, withdrawVisible, friendModalVisible, pwaModalVisible, showReferralModal, showPromo,
    inviteResult, promoConfig,
    setDepositVisible, setWithdrawVisible, setFriendModalVisible, setPwaModalVisible,
    setShowReferralModal, setShowPromo, setInviteResult,
    openRoomSheet, closeRoomSheet, goBackToRooms, onSelectRoom, selectAmount,
    refreshProfile, handleLanguageToggle, handleSendInvite,
    router, appConfig,
  } = props;

  const isDesktopRow = isDesktop && !isTablet;
  const ContainerComponent = isDesktopRow ? View : ScrollView;
  const containerProps: any = isDesktopRow
    ? { style: { flex: 1, paddingTop: 24, paddingBottom: 24 } }
    : { showsVerticalScrollIndicator: false, contentContainerStyle: { paddingTop: isDesktop ? 24 : 20, paddingBottom: 40 } };

  const RightColumnWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isDesktopRow) {
      return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 24 }}>
          {children}
        </ScrollView>
      );
    }
    return <>{children}</>;
  };

  return (
    <View style={styles.desktopHubRoot}>
      <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFill} />

      {/* Modals & Profile */}
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <ProfileEditModal visible={!user?.username} onClose={() => {}} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />
      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />

      {roomSheetVisible && (
        <RoomSheet
          language={language}
          balance={balance}
          visible={roomSheetVisible}
          step={sheetStep}
          selectedRoom={selectedRoom}
          backdropOpacity={backdropOpacity}
          sheetTranslateY={sheetTranslateY}
          onClose={closeRoomSheet}
          onBack={goBackToRooms}
          onSelectRoom={onSelectRoom}
          onSelectAmount={selectAmount}
          isDesktop={isDesktop}
          userCaps={userCaps}
        />
      )}

      {/* Ambient Glows & Watermarks */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="none" style={[styles.blob, styles.blob1, { width: 600, height: 600, borderRadius: 300, opacity: 0.14 }]} />
        <View pointerEvents="none" style={[styles.blob, styles.blob2, { width: 600, height: 600, borderRadius: 300, opacity: 0.14 }]} />
        <View pointerEvents="none" style={[styles.blob, styles.blob3, { width: 700, height: 700, borderRadius: 350, opacity: 0.10 }]} />

        {/* Rotated soft blurry Tic-Tac-Toe graphic */}
        <View style={{
          position: 'absolute', top: '22%', left: '6%', width: 480, height: 480,
          transform: [{ rotate: '-18deg' }, { scale: 1.15 }], opacity: 0.035,
          ...Platform.select({ web: { filter: "blur(2px)" } as any }),
        }} pointerEvents="none">
          <View style={{ position: 'absolute', top: 160, left: 0, right: 0, height: 3, backgroundColor: '#a855f7', shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8 }} />
          <View style={{ position: 'absolute', top: 320, left: 0, right: 0, height: 3, backgroundColor: '#a855f7', shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8 }} />
          <View style={{ position: 'absolute', left: 160, top: 0, bottom: 0, width: 3, backgroundColor: '#a855f7', shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8 }} />
          <View style={{ position: 'absolute', left: 320, top: 0, bottom: 0, width: 3, backgroundColor: '#a855f7', shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8 }} />
          <Text style={{ position: 'absolute', top: 25, left: 45, fontSize: 80, fontWeight: '900', color: '#8b5cf6', textShadowColor: 'rgba(139, 92, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}>X</Text>
          <Text style={{ position: 'absolute', top: 185, left: 205, fontSize: 80, fontWeight: '900', color: '#a855f7', textShadowColor: 'rgba(168, 85, 247, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}>O</Text>
          <Text style={{ position: 'absolute', top: 345, left: 365, fontSize: 80, fontWeight: '900', color: '#8b5cf6', textShadowColor: 'rgba(139, 92, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }}>X</Text>
        </View>
      </View>

      <ContainerComponent {...containerProps}>
        <View style={[{
          flexDirection: 'row', alignItems: 'flex-start', gap: 32, maxWidth: 1600,
          alignSelf: 'center', paddingHorizontal: 32, width: '100%',
        }, isTablet && { flexDirection: 'column', gap: 40 }, isDesktopRow && { flex: 1, height: '100%' }]}>

          {/* ── LEFT COLUMN (8/12) ── */}
          <View style={{ flex: 2.5, maxWidth: 1100, gap: 24 }}>

            {/* The Arena Header */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 }}>
                  {isEN ? "THE ARENA" : "የጨዋታ ሜዳው"}
                </Text>
              </View>
              <Text style={{ color: 'rgba(229, 227, 255, 0.4)', fontSize: 12, fontWeight: '600', letterSpacing: 0.2 }}>
                {isEN ? "Global skill-based competitive matchmaking" : "አለምአቀፍ ክህሎትን መሰረት ያደረገ ተወዳዳሪ ግጥሚያ"}
              </Text>
            </View>

            {/* Horizontal Quick Actions Row */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setDepositVisible(true)} activeOpacity={0.85} style={styles.desktopQuickAction}>
                <View style={styles.desktopQuickActionIcon}><Ionicons name="card-outline" size={24} color="#00daf3" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desktopQuickActionTitle}>{isEN ? "DEPOSIT" : "ማስገቢያ"}</Text>
                  <Text style={styles.desktopQuickActionSub}>{isEN ? "Fast Local" : "ፈጣን አማራጮች"}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWithdrawVisible(true)} activeOpacity={0.85} style={styles.desktopQuickAction}>
                <View style={styles.desktopQuickActionIcon}><Ionicons name="arrow-up-circle-outline" size={24} color="#00daf3" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desktopQuickActionTitle}>{isEN ? "WITHDRAW" : "ማውጫ"}</Text>
                  <Text style={styles.desktopQuickActionSub}>{isEN ? "Instant" : "ፈጣን ክፍያ"}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(authed)/games' as any)} activeOpacity={0.85} style={styles.desktopQuickAction}>
                <View style={styles.desktopQuickActionIcon}><Ionicons name="time-outline" size={24} color="#00daf3" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desktopQuickActionTitle}>{isEN ? "TRANSACTION" : "ግብይቶች"}</Text>
                  <Text style={styles.desktopQuickActionSub}>{isEN ? "Recent Logs" : "የቅርብ ጊዜ ታሪክ"}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Main Game Card */}
            <View style={{ backgroundColor: '#111115', borderRadius: 36, padding: isDesktop ? 32 : 40, alignSelf: 'stretch' }}>
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: isDesktop ? 40 : 20, width: '100%' }}>
                {/* Board Demo */}
                <View style={{ flex: isDesktop ? 1.2 : undefined, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={styles.hubBoardContainer}>
                    <BoardDemo isDesktop={true} />
                  </View>
                </View>

                {/* Controls */}
                <View style={{ flex: isDesktop ? 1 : undefined, alignSelf: isDesktop ? 'stretch' : 'center', justifyContent: 'center', alignItems: 'center', width: isDesktop ? '100%' : 320 }}>
                  {/* START MATCH */}
                  <WebPressable
                    onPress={isBanned || isSearching ? undefined : openRoomSheet}
                    disabled={isBanned || isSearching}
                    style={({ hovered }: { pressed: boolean; hovered: boolean }) => [{
                      borderRadius: 30, overflow: 'hidden', shadowColor: '#00daf3',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: hovered && !isBanned && !isSearching ? 0.8 : 0.5,
                      shadowRadius: 24, alignSelf: 'stretch', transition: 'all 0.15s ease-in-out',
                    }, (isBanned || isSearching) && { opacity: 0.45 }]}
                  >
                    <LinearGradient
                      colors={isBanned ? ['#203a3a', '#152a2a'] : ['#00daf3', '#00e5ff']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isBanned && <Ionicons name="lock-closed" size={16} color="#00daf3" style={{ marginRight: 6 }} />}
                      {isSearching && <ActivityIndicator size="small" color="#000" style={{ marginRight: 6 }} />}
                      <Text style={{ color: '#000', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>
                        {isBanned ? (isEN ? 'SUSPENDED' : 'ታግዷል') : isSearching ? (isEN ? 'SEARCHING...' : 'እየፈለገ ነው...') : (isEN ? 'START MATCH' : 'ግጥሚያ ጀምር')}
                      </Text>
                    </LinearGradient>
                  </WebPressable>

                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 }}>
                    {isEN ? "ENTRY: ETB 10.00" : "መግቢያ፡ 10.00 ብር"}
                  </Text>

                  {/* Play with Friend */}
                  <WebPressable
                    onPress={() => setFriendModalVisible(true)}
                    style={({ hovered }: { pressed: boolean; hovered: boolean }) => [{
                      marginTop: 16, alignSelf: 'stretch', backgroundColor: 'transparent',
                      borderWidth: 1.5, borderColor: '#3b82f6', borderRadius: 30, transition: 'all 0.15s ease-in-out',
                    }]}
                  >
                    <View style={{ paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="people-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>
                        {isEN ? 'PLAY WITH FRIEND' : 'ከጓደኛ ጋር ይጫወቱ'}
                      </Text>
                    </View>
                  </WebPressable>

                  {isBanned && (
                    <Text style={{ color: 'rgba(0,218,243,0.6)', fontSize: 11, textAlign: 'center', marginTop: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                      {isEN ? 'Your account is suspended · Contact support' : 'መለያዎ ታግዷል · ድጋፍን ያነጋግሩ'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* ── RIGHT COLUMN (4/12) ── */}
          <View style={{ flex: 1, minWidth: 320, maxWidth: 400, gap: isDesktopRow ? undefined : 24, alignSelf: isDesktopRow ? 'stretch' : undefined, height: isDesktopRow ? '100%' : undefined }}>
            <RightColumnWrapper>

              {/* Support Widget */}
              <View style={[styles.glassCard, { padding: 24, borderRadius: 24, borderColor: '#27272a', backgroundColor: '#18181b' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00daf3' }} />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>{isEN ? "SUPPORT" : "ድጋፍ"}</Text>
                  </View>
                  <TouchableOpacity onPress={handleLanguageToggle} style={{ flexDirection: 'row', height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#18181b', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#27272a' }}>
                    <Ionicons name="globe-outline" size={12} color="#00daf3" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{language === 'am' ? 'AM' : 'EN'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ gap: 14 }}>
                  <TouchableOpacity onPress={() => Linking.openURL('https://t.me/xoet_support').catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.supportIcon}><Ionicons name="chatbubbles-outline" size={16} color="rgba(0,218,243,0.6)" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isEN ? "XO SUPPORT" : "ኤክስኦ ድጋፍ"}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{isEN ? "AVAILABLE 24/7" : "ቀኑን ሙሉ ይገኛል"}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.openURL('https://t.me/xoethiopia1').catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.supportIcon}><Ionicons name="paper-plane-outline" size={16} color="rgba(0,218,243,0.6)" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isEN ? "TELEGRAM" : "ቴሌግራም"}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{isEN ? "OFFICIAL CHANNEL" : "ኦፊሴላዊ ቻናል"}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Leaderboard Widget */}
              <View style={[styles.glassCard, { padding: 24, borderRadius: 24, borderColor: '#27272a', backgroundColor: '#18181b', marginTop: 16 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00daf3' }} />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>{isEN ? "LEADERBOARD" : "ደረጃዎች"}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
                    <Ionicons name="time-outline" size={12} color="#00daf3" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{secondsRemaining > 0 ? `${Math.floor(secondsRemaining / 86400)}d ${Math.floor((secondsRemaining % 86400) / 3600)}h ${Math.floor((secondsRemaining % 3600) / 60)}m` : "00d 00h 00m"}</Text>
                  </View>
                </View>

                <View style={{ gap: 16, marginBottom: 20 }}>
                  {loadingWeekly && weeklyLeaderboard.length === 0 ? (
                    <ActivityIndicator size="small" color="#00daf3" />
                  ) : weeklyLeaderboard.slice(0, 3).map((item, index) => {
                    const rank = index + 1;
                    const borderColor = rank === 1 ? '#ffb84d' : (rank === 2 ? '#b9cacb' : '#fb923c');
                    const rankBgColor = rank === 1 ? 'rgba(255, 184, 77, 0.05)' : (rank === 2 ? 'rgba(185, 202, 203, 0.03)' : 'rgba(251, 146, 60, 0.03)');
                    const prize = weeklyPrizes.find(p => p.rank === rank)?.amount || 0;
                    return (
                      <View key={item.id || rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor, backgroundColor: rankBgColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: borderColor, fontSize: 11, fontWeight: '900' }}>{rank}</Text>
                        </View>
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: item.isMe ? 1 : 0, borderColor: '#00daf3' }}>
                          {item.avatar ? (
                            <Image source={{ uri: fixUrl(item.avatar) || undefined }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Ionicons name="person" size={18} color={item.isMe ? '#00daf3' : 'rgba(255,255,255,0.6)'} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: item.isMe ? '#00daf3' : '#fff', fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
                            @{item.username || 'user'}{item.isMe ? ' (You)' : ''}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 }}>{item.wins} {isEN ? 'Wins' : 'ድሎች'}</Text>
                        </View>
                        <Text style={{ color: rank === 1 ? '#ffb84d' : '#fff', fontSize: 13, fontWeight: '900' }}>{prize} ETB</Text>
                      </View>
                    );
                  })}
                  {!loadingWeekly && weeklyLeaderboard.length === 0 && (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>No rankings yet</Text>
                  )}
                </View>

                <TouchableOpacity onPress={() => router.push('/(authed)/home/leaderboard' as any)} style={styles.viewStandingsBtn}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>{isEN ? "VIEW FULL STANDINGS" : "ሙሉ ደረጃዎችን ይመልከቱ"}</Text>
                </TouchableOpacity>
              </View>

              {/* Stats & Progress */}
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
                <View style={styles.statCard}>
                  <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                    <Svg width={44} height={44} viewBox="0 0 44 44">
                      <Circle cx="22" cy="22" r="18" stroke="#27272a" strokeWidth="3.5" fill="transparent" />
                      <Circle cx="22" cy="22" r="18" stroke="#00daf3" strokeWidth="3.5" fill="transparent" strokeDasharray={`${2 * Math.PI * 18}`} strokeDashoffset={`${2 * Math.PI * 18 * (1 - winRate / 100)}`} strokeLinecap="round" transform="rotate(-90 22 22)" />
                    </Svg>
                    <View style={{ position: 'absolute' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{winRate}%</Text></View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>{isEN ? "WIN RATE" : "የድል መጠን"}</Text>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 }}>{isEN ? "Active Stats" : "ንቁ አኃዝ"}</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 218, 243, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.2)' }}>
                    <Ionicons name="trophy-outline" size={16} color="#00daf3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>{isEN ? "RANK" : "ደረጃ"}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rankMeta.tone === 'platinum' ? '#00daf3' : (rankMeta.tone === 'gold' ? '#d4af37' : '#c0c0c0') }} />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{rankMeta.label}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Recent Winners */}
              <View style={[styles.glassCard, { padding: 24, borderRadius: 24, borderColor: '#27272a', backgroundColor: '#18181b', marginTop: 16 }]}>
                <View style={styles.txHeader}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{isEN ? "Recent Winners" : "የቅርብ ጊዜ አሸናፊዎች"}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 218, 243, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00daf3' }} />
                    <Text style={{ color: '#00daf3', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>{isEN ? "LIVE" : "ቀጥታ"}</Text>
                  </View>
                </View>

                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, gap: 12, marginTop: 16 }}>
                  {rawTickerList.length === 0 ? (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20 }}>
                      {isEN ? "Waiting for live wins..." : "የቀጥታ ድሎችን በመጠባበቅ ላይ..."}
                    </Text>
                  ) : rawTickerList.map((tx, i) => {
                    const amount = Number(tx.amount || 0);
                    let emoji = '⚡', col = '#fd6f85', bg = 'rgba(253,111,133,0.1)';
                    if (amount >= 500) { emoji = '👑'; col = '#ffb84d'; bg = 'rgba(255,184,77,0.1)'; }
                    else if (amount >= 200) { emoji = '🔥'; col = '#fb923c'; bg = 'rgba(251,146,60,0.1)'; }
                    else if (amount >= 100) { emoji = '🏆'; col = '#00daf3'; bg = 'rgba(0,218,243,0.1)'; }
                    return (
                      <View key={i} style={styles.txItem}>
                        <View style={[styles.txIcon, { backgroundColor: bg }]}><Text style={{ fontSize: 16 }}>{emoji}</Text></View>
                        <View style={styles.txMain}>
                          <Text style={styles.txLabel}>@{tx.username.toUpperCase()}</Text>
                          <Text style={styles.txTime}>{isEN ? 'Match Won' : 'አሸንፏል'}</Text>
                        </View>
                        <Text style={[styles.txAmount, { color: col }]}>ETB {amount}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

            </RightColumnWrapper>
          </View>

        </View>
        {!isDesktopRow && <View style={{ height: 60 }} />}
      </ContainerComponent>

      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || ""} onSuccess={refreshProfile} language={language} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || ""} onSuccess={refreshProfile} language={language} />
      <ProfileEditModal visible={!user?.username} onClose={() => {}} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />

      <FriendMatchModal
        visible={friendModalVisible}
        onClose={() => { setFriendModalVisible(false); setInviteResult(null); }}
        onSendInvite={handleSendInvite}
        inviteResult={inviteResult}
      />
      <PromotionPopup config={promoConfig} visible={showPromo} onClose={() => setShowPromo(false)} />
      <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  desktopHubRoot: { flex: 1, backgroundColor: 'transparent' },
  blob: { position: "absolute", width: 450, height: 450, borderRadius: 225, opacity: 0.12, ...Platform.select({ web: { filter: "blur(80px)" } as any }) },
  blob1: { top: "5%", left: "-20%", backgroundColor: "#ff4766" },
  blob2: { bottom: "15%", right: "-30%", backgroundColor: "#00daf3" },
  blob3: { top: "45%", left: "15%", backgroundColor: "#1b1a24", opacity: 0.08, width: 500, height: 500, borderRadius: 250 },
  glassCard: { backgroundColor: 'rgba(24, 24, 27, 0.75)', borderRadius: 36, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', padding: 40, overflow: 'hidden' },
  hubBoardContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  desktopQuickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#151518', borderWidth: 1, borderColor: '#27272a', borderRadius: 24, paddingVertical: 22, paddingHorizontal: 24 },
  desktopQuickActionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 218, 243, 0.1)', alignItems: 'center', justifyContent: 'center' },
  desktopQuickActionTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  desktopQuickActionSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  supportIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' },
  viewStandingsBtn: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: '#27272a', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  statCard: { flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(24, 24, 27, 0.4)', padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  txIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txMain: { flex: 1 },
  txLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
  txTime: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 3 },
  txAmount: { fontSize: 16, fontWeight: '900' },
});
