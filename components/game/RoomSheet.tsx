// components/game/RoomSheet.tsx
// XO Matchmaking & Friend Challenge Modal / Bottom Sheet
// Conforms strictly to user specification, live backend integration, and zero-layout-reflow GPU motion
import React, { memo, useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ROOMS, type RoomConfig, type SheetStep } from "./gameplayConstants";
import { haptics } from "../../lib/haptcs";
import { playClickSound, playTickSound, playNotificationSound } from "../../lib/pinTickAudio";
import { useAuth } from "../../context/authContext";
import { API_URL } from "../../config";

export type RoomSheetMode = "STAKES" | "FRIENDS";

export interface FriendUserItem {
  id: string;
  username: string;
  displayName: string;
  isOnline: boolean;
  isFriend: boolean;
  avatar?: string | null;
}

const STAKE_PRESETS = [
  { amount: 25, roomId: "R1" as const, min: 25, max: 25 },
  { amount: 50, roomId: "R1" as const, min: 50, max: 50 },
  { amount: 100, roomId: "R2" as const, min: 100, max: 100 },
  { amount: 250, roomId: "R2" as const, min: 250, max: 250 },
];

const RoomSheet = memo(function RoomSheet({
  language,
  balance,
  step,
  selectedRoom,
  backdropOpacity,
  sheetTranslateY,
  onClose,
  onBack,
  onSelectRoom,
  onSelectAmount,
  isDesktop = false,
  visible,
  initialView = "STAKES",
  userCaps,
  onSendFriendInvite,
  inviteResult,
}: {
  language: string;
  balance: number;
  visible: boolean;
  initialView?: RoomSheetMode;
  step?: SheetStep;
  selectedRoom: RoomConfig;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  onClose: () => void;
  onBack: () => void;
  onSelectRoom: (roomId: RoomConfig["id"]) => void;
  onSelectAmount: (room: RoomConfig, min: number, max: number) => void;
  isDesktop?: boolean;
  userCaps?: any;
  onSendFriendInvite?: (username: string, betAmount: number) => void;
  inviteResult?: any;
}) {
  const isEN = language === "en";
  const { token } = useAuth();
  const { height: screenHeight } = useWindowDimensions();

  // Modal screen flow: "STAKES" -> "FRIENDS"
  const [currentView, setCurrentView] = useState<RoomSheetMode>(initialView || "STAKES");
  const [selectedStake, setSelectedStake] = useState<number | null>(25); // Defaults to first stake (25 ETB)
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedUsers, setInvitedUsers] = useState<Record<string, boolean>>({});

  // Real backend friends and suggestions
  const [friendsList, setFriendsList] = useState<FriendUserItem[]>([]);
  const [suggestionsList, setSuggestionsList] = useState<FriendUserItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Height Control: 90% fixed container, translateY GPU motion for 55% peek vs 90% expansion
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current; // 0 = 55% peek, 1 = 90% expanded

  const toggleExpand = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    const next = !isExpanded;
    setIsExpanded(next);
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };

  // PanResponder strictly on the top handle bar only so it doesn't fight list scrolling
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -40) {
            // Dragged up -> Expand to 90%
            setIsExpanded(true);
            Animated.spring(expandAnim, {
              toValue: 1,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else if (gesture.dy > 60) {
            // Dragged down -> Collapse or close
            if (isExpanded) {
              setIsExpanded(false);
              Animated.spring(expandAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
              }).start();
            } else {
              onClose();
            }
          }
        },
      }),
    [isExpanded, onClose, expandAnim]
  );

  // Fetch real friends on modal open
  useEffect(() => {
    if (visible) {
      setCurrentView(initialView || "STAKES");
      setSelectedStake(25);
      setSearchQuery("");
      setInvitedUsers({});
      setIsExpanded(false);
      expandAnim.setValue(0);

      if (token) {
        setIsLoadingFriends(true);
        fetch(`${API_URL}/friends`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.ok && Array.isArray(data.friends)) {
              setFriendsList(
                data.friends.map((f: any) => ({
                  id: f.id,
                  username: f.username,
                  displayName: f.display_name || f.username,
                  isOnline: Boolean(f.is_online),
                  isFriend: true,
                  avatar: f.avatar || null,
                }))
              );
            }
          })
          .catch((err) => console.error("[RoomSheet] Friends fetch error:", err))
          .finally(() => setIsLoadingFriends(false));

        // Also fetch general active suggestions
        fetch(`${API_URL}/friends/search?q=`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.ok && Array.isArray(data.users)) {
              setSuggestionsList(
                data.users
                  .filter((u: any) => !u.is_friend)
                  .map((s: any) => ({
                    id: s.id,
                    username: s.username,
                    displayName: s.display_name || s.username,
                    isOnline: false, // Privacy protection: strangers do not leak presence
                    isFriend: false,
                    avatar: s.avatar || null,
                  }))
              );
            }
          })
          .catch((err) => console.error("[RoomSheet] Suggestions fetch error:", err));
      }
    }
  }, [visible, token, expandAnim]);

  // Debounced search for live users
  useEffect(() => {
    if (!token || !visible) return;
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    const timer = setTimeout(() => {
      fetch(`${API_URL}/friends/search?q=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok && Array.isArray(data.users)) {
            const friends = data.users
              .filter((u: any) => u.is_friend)
              .map((f: any) => ({
                id: f.id,
                username: f.username,
                displayName: f.display_name || f.username,
                isOnline: Boolean(f.is_online),
                isFriend: true,
                avatar: f.avatar || null,
              }));
            const suggestions = data.users
              .filter((u: any) => !u.is_friend)
              .map((s: any) => ({
                id: s.id,
                username: s.username,
                displayName: s.display_name || s.username,
                isOnline: false,
                isFriend: false,
                avatar: s.avatar || null,
              }));

            setFriendsList(friends);
            setSuggestionsList(suggestions);
          }
        })
        .catch((err) => console.error("[RoomSheet] Search query error:", err))
        .finally(() => setIsSearching(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, token, visible]);

  // Handle Play Now click
  const handlePlayNow = () => {
    if (!selectedStake) return;
    try { playClickSound(); } catch {}
    haptics.impact();

    const targetPreset = STAKE_PRESETS.find((p) => p.amount === selectedStake) || STAKE_PRESETS[0];
    const targetRoom = ROOMS.find((r) => r.id === targetPreset.roomId) || selectedRoom;

    onSelectAmount(targetRoom, targetPreset.min, targetPreset.max);
  };

  // Switch to Play with Friend view
  const handleOpenPlayWithFriend = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    setCurrentView("FRIENDS");
  };

  // Add suggestion to friends list via live API
  const handleAddFriend = async (userItem: FriendUserItem) => {
    try { playTickSound(); } catch {}
    haptics.tap();
    if (!token) return;

    // Optimistically update UI
    setSuggestionsList((prev) => prev.filter((u) => u.id !== userItem.id));
    setFriendsList((prev) => [...prev, { ...userItem, isFriend: true }]);

    try {
      await fetch(`${API_URL}/friends/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friendId: userItem.id, username: userItem.username }),
      });
    } catch (e) {
      console.error("[RoomSheet] Add friend API error:", e);
    }
  };

  // Send friend match invite
  const handleInviteUser = (username: string) => {
    if (!selectedStake) return;
    try { playNotificationSound(); } catch {}
    haptics.impact();

    setInvitedUsers((prev) => ({ ...prev, [username]: true }));

    if (onSendFriendInvite) {
      onSendFriendInvite(username, selectedStake);
    }
  };

  // Calculate Peek offset (55% visible means offset is screenHeight * 0.35)
  const peekOffset = useMemo(() => {
    const totalSheetH = screenHeight * 0.9;
    const peekH = screenHeight * 0.55;
    return Math.max(160, totalSheetH - peekH);
  }, [screenHeight]);

  const animatedTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [peekOffset, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.rootModalContainer,
          isDesktop && styles.desktopCenterOverlay,
        ]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheetBackdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            isDesktop
              ? styles.desktopModal
              : [
                  styles.sheet,
                  {
                    height: "90%",
                    maxHeight: "90%",
                    transform: [
                      { translateY: sheetTranslateY },
                      { translateY: animatedTranslateY },
                    ],
                  },
                ],
            isDesktop && {
              transform: [
                {
                  scale: backdropOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
              opacity: backdropOpacity,
            },
          ]}
        >
          {/* Top Handle: Swipable / Tappable on Mobile */}
          {!isDesktop ? (
            <View {...panResponder.panHandlers} style={styles.expandHandleWrapper}>
              <TouchableOpacity activeOpacity={0.8} onPress={toggleExpand} style={{ alignItems: "center" }}>
                <View style={styles.topAccentBar} />
                <View style={styles.expandHintRow}>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-up"}
                    size={12}
                    color="rgba(0, 218, 243, 0.7)"
                  />
                  <Text style={styles.expandHintText}>
                    {isExpanded
                      ? (isEN ? "Collapse (55%)" : "ያሳንሱ (55%)")
                      : (isEN ? "Swipe up / Tap to expand (90%)" : "ለማሳደግ ወደ ላይ ይጎትቱ (90%)")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.topAccentBar} />
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            {/* ═══════════════════════════════════════════════════════════
                VIEW 1: 4-STAKE SELECTION (25, 50, 100, 250 Birr)
                ═══════════════════════════════════════════════════════════ */}
            {currentView === "STAKES" ? (
              <>
                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>{isEN ? "Choose Your Stake" : "መጠን ይምረጡ"}</Text>
                    <Text style={styles.sheetSubTitleText}>
                      {isEN ? "Select your entry bet to play" : "ለመጫወት የውርርድ መጠን ይምረጡ"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>

                {/* 2x2 Stakes Grid (Diagram Specification: Floating lift animation when selected) */}
                <View style={styles.stakesGrid}>
                  {STAKE_PRESETS.map((item) => {
                    const isSelected = selectedStake === item.amount;
                    const isInsufficient = balance < item.amount;

                    return (
                      <TouchableOpacity
                        key={item.amount}
                        activeOpacity={0.85}
                        onPress={() => {
                          try { playTickSound(); } catch {}
                          haptics.tap();
                          setSelectedStake(item.amount);
                        }}
                        style={[
                          styles.stakeCard,
                          isSelected && styles.stakeCardSelected,
                          isInsufficient && styles.stakeCardInsufficient,
                        ]}
                      >
                        <View style={styles.stakeCardContent}>
                          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                            <Text style={[styles.stakeAmountText, isSelected && styles.stakeAmountTextSelected]}>
                              {item.amount}
                            </Text>
                            <Text style={[styles.stakeUnitText, isSelected && styles.stakeUnitTextSelected]}>
                              Birr
                            </Text>
                          </View>
                          <Text style={[styles.stakeFeeText, isSelected && styles.stakeFeeTextSelected]}>
                            Commission 20% / 30s
                          </Text>
                        </View>

                        {/* Image 4 Specification: 3D under-box base narrower than card */}
                        {isSelected && (
                          <View style={styles.card3DBase} pointerEvents="none" />
                        )}

                        {isSelected && (
                          <View style={styles.selectedTick}>
                            <Ionicons name="checkmark" size={12} color="#080F17" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Available Balance Row */}
                <View style={styles.balanceRow}>
                  <Ionicons name="wallet-outline" size={15} color="#00daf3" />
                  <Text style={styles.balanceLabel}>{isEN ? "Wallet Balance:" : "ቀሪ ሂሳብ:"}</Text>
                  <Text style={styles.balanceValue}>ETB {balance.toLocaleString()}</Text>
                </View>

                {/* Action Buttons: [ PLAY NOW ] & [ PLAY WITH FRIEND ] */}
                <View style={styles.actionBtnGroup}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    disabled={selectedStake === null}
                    onPress={handlePlayNow}
                    style={[
                      styles.primaryPlayBtn,
                      selectedStake === null && styles.primaryPlayBtnDisabled,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        selectedStake !== null
                          ? ["#00daf3", "#0284c7"]
                          : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.05)"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradInner}
                    >
                      <Ionicons
                        name="game-controller"
                        size={18}
                        color={selectedStake !== null ? "#080F17" : "rgba(255,255,255,0.3)"}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.primaryPlayText,
                          selectedStake === null && styles.primaryPlayTextDisabled,
                        ]}
                      >
                        {isEN ? `PLAY NOW (${selectedStake || 25} ETB)` : `አሁን ይጫወቱ (${selectedStake || 25} ብር)`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleOpenPlayWithFriend}
                    style={styles.outlineFriendBtn}
                  >
                    <Ionicons name="people-outline" size={17} color="#00daf3" style={{ marginRight: 8 }} />
                    <Text style={styles.outlineFriendText}>
                      {isEN ? "PLAY WITH FRIEND" : "ከጓደኛ ጋር ይጫወቱ"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ═══════════════════════════════════════════════════════════
                 VIEW 2: PLAY WITH FRIEND & SUGGESTIONS (Exact Diagram Specs)
                 ═══════════════════════════════════════════════════════════ */
              <>
                {/* Header with Back Chevron */}
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    onPress={() => {
                      try { playTickSound(); } catch {}
                      haptics.tap();
                      setCurrentView("STAKES");
                    }}
                    style={styles.iconCircleBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-back" size={20} color="#00daf3" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.sheetTitle}>{isEN ? "Play with Friend" : "ከጓደኛ ጋር ይጫወቱ"}</Text>
                    <Text style={styles.sheetSubTitleText}>
                      {isEN ? `Stake: ${selectedStake} Birr • 20% Comm.` : `ውርርድ: ${selectedStake} ብር`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>

                {/* Search Bar Input */}
                <View style={styles.searchBarWrapper}>
                  <Ionicons name="search-outline" size={17} color="#8893a7" style={{ marginRight: 8 }} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={isEN ? "Search username..." : "የተጠቃሚ ስም ይፈልጉ..."}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={styles.searchInput}
                    autoCapitalize="none"
                  />
                  {isSearching && <ActivityIndicator size="small" color="#00daf3" style={{ marginRight: 6 }} />}
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={16} color="#8893a7" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── SECTION 1: Friend List ── */}
                <View style={styles.listSection}>
                  <Text style={styles.sectionHeading}>{isEN ? "Friend" : "ጓደኞች"}</Text>

                  {isLoadingFriends ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color="#00daf3" />
                      <Text style={styles.loadingText}>{isEN ? "Loading friends..." : "ጓደኞች በመጫን ላይ..."}</Text>
                    </View>
                  ) : friendsList.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="people-outline" size={24} color="rgba(255,255,255,0.2)" />
                      <Text style={styles.emptyNote}>
                        {isEN ? "No friends added yet. Search players below to invite!" : "ምንም ጓደኛ የለም። ተጫዋቾችን ለመጋበዝ ከታች ይፈልጉ!"}
                      </Text>
                    </View>
                  ) : (
                    friendsList.map((userItem) => {
                      const isOffline = !userItem.isOnline;
                      const canInvite = userItem.isOnline;
                      const isAlreadyInvited = !!invitedUsers[userItem.username];

                      return (
                        <View key={userItem.id} style={styles.playerRow}>
                          {/* Avatar & Red Online Dot */}
                          <View style={styles.avatarShell}>
                            <Text style={styles.avatarLetter}>
                              {userItem.username.slice(0, 1).toUpperCase()}
                            </Text>
                            {userItem.isOnline && <View style={styles.onlineStatusDotRed} />}
                          </View>

                          {/* Username & Online Status */}
                          <View style={styles.playerInfo}>
                            <View style={styles.nameRow}>
                              <Text numberOfLines={1} style={styles.rowUsername}>{userItem.username}</Text>
                            </View>
                            <Text style={styles.rowStatusText}>
                              {isOffline ? (isEN ? "Offline" : "ከመስመር ውጭ") : (isEN ? "Online" : "መስመር ላይ")}
                            </Text>
                          </View>

                          {/* Invite Button (Active Cyan if Online, else Gray Disabled) */}
                          <TouchableOpacity
                            disabled={!canInvite || isAlreadyInvited}
                            onPress={() => handleInviteUser(userItem.username)}
                            style={[
                              styles.inviteBtn,
                              canInvite ? styles.inviteBtnActive : styles.inviteBtnDisabled,
                            ]}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.inviteBtnText,
                                canInvite ? styles.inviteBtnTextActive : styles.inviteBtnTextDisabled,
                              ]}
                            >
                              {isAlreadyInvited
                                ? (isEN ? "Sent" : "ተልኳል")
                                : (isEN ? "Invite" : "ጋብዝ")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* ── SECTION 2: Suggestions List ── */}
                <View style={[styles.listSection, { marginTop: 14 }]}>
                  <Text style={styles.sectionHeading}>{isEN ? "Suggestion" : "የሚመከሩ ተጫዋቾች"}</Text>

                  {suggestionsList.length === 0 ? (
                    <Text style={styles.emptyNote}>
                      {isEN ? "No other players found." : "ምንም ተጨማሪ ተጫዋች አልተገኘም"}
                    </Text>
                  ) : (
                    suggestionsList.map((userItem) => {
                      const isAlreadyInvited = !!invitedUsers[userItem.username];

                      return (
                        <View key={userItem.id} style={styles.playerRow}>
                          {/* Avatar */}
                          <View style={styles.avatarShell}>
                            <Text style={styles.avatarLetter}>
                              {userItem.username.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>

                          {/* Username & Subtitle */}
                          <View style={styles.playerInfo}>
                            <View style={styles.nameRow}>
                              <Text numberOfLines={1} style={styles.rowUsername}>{userItem.username}</Text>
                            </View>
                            <Text style={styles.rowStatusText}>
                              {isEN ? "Player" : "ተጫዋች"}
                            </Text>
                          </View>

                          {/* Action Buttons: [ Invite ] + [ + ] */}
                          <View style={styles.actionRowRight}>
                            <TouchableOpacity
                              disabled={isAlreadyInvited}
                              onPress={() => handleInviteUser(userItem.username)}
                              style={[
                                styles.inviteBtn,
                                !isAlreadyInvited ? styles.inviteBtnActive : styles.inviteBtnDisabled,
                              ]}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.inviteBtnText,
                                  !isAlreadyInvited ? styles.inviteBtnTextActive : styles.inviteBtnTextDisabled,
                                ]}
                              >
                                {isAlreadyInvited
                                  ? (isEN ? "Sent" : "ተልኳል")
                                  : (isEN ? "Invite" : "ጋብዝ")}
                              </Text>
                            </TouchableOpacity>

                            {/* [+] Add Friend Button (Diagram Requirement) */}
                            <TouchableOpacity
                              onPress={() => handleAddFriend(userItem)}
                              style={styles.addFriendPlusBtn}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="add" size={17} color="#00daf3" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

export default RoomSheet;

const styles = StyleSheet.create({
  rootModalContainer: {
    flex: 1,
    position: "relative",
    zIndex: 99999999,
  },
  desktopCenterOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(5, 7, 18, 0.78)",
  },
  desktopModal: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#0d1326",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    overflow: "hidden",
    boxShadow: "0 18px 48px rgba(0, 0, 0, 0.65)",
    maxHeight: "90%",
    zIndex: 99999999,
  } as any,
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0d1326",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(0, 218, 243, 0.3)",
    zIndex: 99999999,
  },
  expandHandleWrapper: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    cursor: "pointer",
  } as any,
  topAccentBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignSelf: "center",
  },
  expandHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  expandHintText: {
    color: "rgba(0, 218, 243, 0.7)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sheetContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    fontFamily: "Space Grotesk, sans-serif",
  },
  sheetSubTitleText: {
    color: "#8893a7",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  // 2x2 Stakes Grid (Diagram Specification: Floating lift animation when selected)
  stakesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  stakeCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web" ? {
      transition: "all 250ms cubic-bezier(0.16, 1, 0.3, 1)",
      cursor: "pointer",
    } as any : {}),
  },
  stakeCardSelected: {
    backgroundColor: "rgba(0, 218, 243, 0.14)",
    borderColor: "#00daf3",
    borderWidth: 2,
    transform: [{ translateY: -5 }],
  } as any,
  card3DBase: {
    position: "absolute",
    bottom: -6,
    left: 12,
    right: 12,
    height: 10,
    backgroundColor: "rgba(0, 218, 243, 0.22)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#00daf3",
    zIndex: -1,
  },
  stakeCardInsufficient: {
    opacity: 0.5,
  },
  stakeCardContent: {
    alignItems: "center",
  },
  stakeAmountText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  stakeAmountTextSelected: {
    color: "#00daf3",
  },
  stakeUnitText: {
    color: "#8893a7",
    fontSize: 13,
    fontWeight: "800",
  },
  stakeUnitTextSelected: {
    color: "#00daf3",
  },
  stakeFeeText: {
    color: "#8893a7",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  stakeFeeTextSelected: {
    color: "#99f6e4",
  },
  selectedTick: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#00daf3",
    alignItems: "center",
    justifyContent: "center",
  },

  // Balance Row
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0, 218, 243, 0.06)",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.18)",
    marginBottom: 18,
  },
  balanceLabel: {
    color: "#8893a7",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceValue: {
    color: "#00daf3",
    fontSize: 13,
    fontWeight: "900",
  },

  // Action Buttons
  actionBtnGroup: {
    gap: 10,
  },
  primaryPlayBtn: {
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryPlayBtnDisabled: {
    opacity: 0.5,
  },
  btnGradInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryPlayText: {
    color: "#080F17",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Space Grotesk, sans-serif",
  },
  primaryPlayTextDisabled: {
    color: "rgba(255, 255, 255, 0.3)",
  },
  outlineFriendBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#00daf3",
    backgroundColor: "rgba(0, 218, 243, 0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineFriendText: {
    color: "#00daf3",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
    fontFamily: "Space Grotesk, sans-serif",
  },

  // Play with Friend view
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  listSection: {
    marginBottom: 6,
  },
  sectionHeading: {
    color: "#8893a7",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: {
    color: "#8893a7",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 6,
  },
  emptyNote: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 8,
  },
  avatarShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 218, 243, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
  },
  avatarLetter: {
    color: "#00daf3",
    fontSize: 14,
    fontWeight: "900",
  },
  onlineStatusDotRed: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444", // Red dot for online user (Image 2 specification)
    borderWidth: 1.5,
    borderColor: "#0d1326",
  },
  playerInfo: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowUsername: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "800",
  },
  rowStatusText: {
    color: "#8893a7",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 1,
  },
  actionRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  inviteBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inviteBtnActive: {
    borderWidth: 1.5,
    borderColor: "#00daf3",
    backgroundColor: "rgba(0, 218, 243, 0.12)",
  },
  inviteBtnDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: "900",
  },
  inviteBtnTextActive: {
    color: "#00daf3",
  },
  inviteBtnTextDisabled: {
    color: "rgba(255, 255, 255, 0.3)",
  },
  addFriendPlusBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#00daf3",
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
