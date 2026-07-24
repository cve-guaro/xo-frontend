// components/game/RoomSheet.tsx
// Bottom sheet / modal for room selection and bet amount picking.
import React, { memo, useEffect, useState } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ROOMS, type RoomConfig, type SheetStep } from "./gameplayConstants";

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
  userCaps,
}: {
  language: string;
  balance: number;
  visible: boolean;
  step: SheetStep;
  selectedRoom: RoomConfig;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  onClose: () => void;
  onBack: () => void;
  onSelectRoom: (roomId: RoomConfig["id"]) => void;
  onSelectAmount: (room: RoomConfig, min: number, max: number) => void;
  isDesktop?: boolean;
  userCaps?: any;
}) {
  const isEN = language === "en";
  const [localAmount, setLocalAmount] = useState<number | null>(null);

  useEffect(() => {
    if (visible) setLocalAmount(null);
  }, [visible, step]);

  const handleConfirmDesktop = () => {
    if (localAmount !== null) {
      const opt = selectedRoom.amountOptions.find(o => o.amount === localAmount);
      if (opt) {
        onSelectAmount(selectedRoom, opt.min, opt.max);
      }
    }
  };

  return (
    <View style={[{ ...(Platform.OS === 'web' ? { position: 'fixed' } : { position: 'absolute' }), top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }, isDesktop && { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="box-none">
      <Animated.View style={[styles.sheetBackdrop, { opacity: backdropOpacity }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <Animated.View
        style={[
          isDesktop ? styles.desktopModal : styles.sheet,
          !isDesktop && { transform: [{ translateY: sheetTranslateY }] },
          isDesktop && {
            transform: [{ scale: backdropOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            opacity: backdropOpacity
          }
        ]}
      >
        {/* Glow accent pill */}
        <View style={styles.topAccentBar} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          {/* Header with back button for AMOUNTS step */}
          {step === "AMOUNTS" ? (
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onBack} style={styles.iconCircleBtn} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={20} color="#00daf3" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sheetTitle}>{isEN ? `${selectedRoom.titleEn} amount` : `${selectedRoom.titleAm} መጠን`}</Text>
                <View style={styles.subTitleBadge}>
                  <Ionicons name="time-outline" size={12} color="#a78bfa" />
                  <Text style={styles.sheetSubTitleText}>
                    Commission {selectedRoom.id === "R1" ? "20% / 10%" : `${selectedRoom.cut}%`} • {selectedRoom.time}s
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{isEN ? "Select Room" : "ክፍል ይምረጡ"}</Text>
                <Text style={styles.sheetSubTitleText}>{isEN ? "Tap a room to choose stake amount" : "መጠኖችን ለማየት ክፍሉን ይጫኑ"}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          )}

          {step === "ROOMS" ? (
            <View style={styles.roomList}>
              {/* Global rooms lock banner */}
              {userCaps?.rooms_locked && (
                <View style={styles.lockedBanner}>
                  <Ionicons name="lock-closed" size={28} color="#fd6f85" />
                  <Text style={styles.lockedTitle}>
                    {isEN ? 'Rooms Temporarily Locked' : 'ክፍሎች ተዘግተዋል'}
                  </Text>
                  <Text style={styles.lockedSub}>
                    {isEN
                      ? 'All game rooms are temporarily locked by the admin. Please check back later.'
                      : 'ሁሉም የጨዋታ ክፍሎች በጊዜያዊነት ተዘግተዋል። ቆይተው ይሞክሩ።'}
                  </Text>
                </View>
              )}
              {ROOMS.map((room) => {
                const isR1 = room.id === "R1";
                let roomLocked = false;
                const globalLocked = !!userCaps?.rooms_locked;
                return (
                  <TouchableOpacity 
                    key={room.id} 
                    activeOpacity={0.88} 
                    disabled={roomLocked || globalLocked} 
                    onPress={() => onSelectRoom(room.id)} 
                    style={[styles.roomBtn, (roomLocked || globalLocked) && { opacity: 0.4 }]}
                  >
                    <LinearGradient colors={roomLocked || globalLocked ? ['#2a2a38', '#1a1a24'] : (room.colors as [string, string])} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.roomInner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{isEN ? room.titleEn : room.titleAm} {roomLocked && "(MAXED)"}{globalLocked && " 🔐"}</Text>
                        <Text style={styles.roomDetail}>
                          {isEN 
                            ? `ETB ${room.rangeLabel} • ${isR1 ? '20% / 10%' : `${room.cut}%`} Commission • ${room.time}s` 
                            : `ETB ${room.rangeLabel} • ${isR1 ? '20% / 10%' : `${room.cut}%`} ክፍያ • ${room.time} ሰ`}
                        </Text>
                      </View>
                      <View style={styles.roomAction}>
                        <Text style={styles.viewText}>{isEN ? "Choose" : "ይምረጡ"}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )
              })}

              <View style={styles.fairPlayBanner}>
                <Ionicons name="shield-checkmark" size={18} color="#38bdf8" />
                <Text style={styles.fairPlayText}>
                  {isEN ? "Fair play is strictly enforced. Anti-cheat system active." : "ትክክለኛ ጨዋታ ተፈጻሚ ይሆናል።"}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.amountGrid}>
                {selectedRoom.amountOptions.map((opt) => {
                  let capReached = false;
                  let currentWins: number | null = null;
                  const CAP_LIMIT = 15;
                  if (selectedRoom.id === "R1" && opt.amount === 10) {
                    const wins = userCaps?.r1_10_wins || 0;
                    currentWins = wins;
                    if (wins >= CAP_LIMIT) capReached = true;
                  }
                  if (selectedRoom.id === "R1" && opt.amount === 15) {
                    const wins = userCaps?.r1_15_wins || 0;
                    currentWins = wins;
                    if (wins >= CAP_LIMIT) capReached = true;
                  }

                  const disabled = (balance < opt.amount) || capReached;
                  const isSelected = localAmount === opt.amount;

                  // Curated premium gradients
                  const defaultGradients: Record<number, [string, string]> = {
                    10: ['#4f46e5', '#3b82f6'],
                    15: ['#7c3aed', '#6366f1'],
                    25: ['#0284c7', '#06b6d4'],
                    50: ['#0d9488', '#10b981'],
                    100: ['#d97706', '#f59e0b'],
                    250: ['#c026d3', '#db2777'],
                    500: ['#e11d48', '#f43f5e'],
                    1000: ['#4f46e5', '#9333ea'],
                  };

                  const pillColors = disabled
                    ? ['rgba(40,44,68,0.6)', 'rgba(25,28,45,0.4)'] as [string, string]
                    : (defaultGradients[opt.amount] || opt.colors) as [string, string];

                  const showCapBadge = currentWins !== null;

                  return (
                    <Pressable
                      key={opt.amount}
                      onPress={() => {
                        if (disabled) return;
                        if (isDesktop) setLocalAmount(opt.amount);
                        else onSelectAmount(selectedRoom, opt.min, opt.max);
                      }}
                      style={({ pressed }) => [
                        styles.amountCardWrap,
                        disabled && { opacity: 0.45 },
                        pressed && !disabled ? { transform: [{ scale: 0.97 }] } : null,
                        isSelected && styles.amountCardSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={pillColors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.amountCardInner}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.amountValText}>
                            ETB {opt.rangeLabel ? opt.rangeLabel : opt.amount.toLocaleString()}
                          </Text>
                          <Text style={styles.amountMetaText}>
                            Commission {opt.amount === 10 ? 20 : selectedRoom.cut}% • {selectedRoom.time}s
                            {capReached ? ' • LOCKED' : ''}
                          </Text>
                        </View>

                        <View style={styles.amountArrowCircle}>
                          <Ionicons name="chevron-forward" size={16} color="#ffffff" />
                        </View>

                        {/* Win cap progress badge */}
                        {showCapBadge && (
                          <View style={[
                            styles.capBadge,
                            capReached && { backgroundColor: 'rgba(239,68,68,0.3)', borderColor: '#ef4444' }
                          ]}>
                            <Ionicons
                              name={capReached ? 'lock-closed' : 'trophy-outline'}
                              size={10}
                              color={capReached ? '#f87171' : '#fbbf24'}
                            />
                            <Text style={[styles.capBadgeText, capReached && { color: '#f87171' }]}>
                              {currentWins}/{CAP_LIMIT}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>

              {/* Balance Card Footer */}
              <View style={styles.balanceContainer}>
                <View style={styles.balanceBadge}>
                  <Ionicons name="wallet-outline" size={16} color="#00daf3" />
                  <Text style={styles.balanceNoteText}>
                    {isEN ? `Available Balance:` : `ቀሪ ገንዘብ:`}
                  </Text>
                  <Text style={styles.balanceValText}>ETB {balance.toLocaleString()}</Text>
                </View>
              </View>

              {/* Desktop: Confirm button */}
              {isDesktop && (
                <View style={{ marginTop: 18, width: '100%' }}>
                  <TouchableOpacity
                    onPress={handleConfirmDesktop}
                    disabled={localAmount === null}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={localAmount !== null ? ['#00daf3', '#3b82f6'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.confirmBtn}
                    >
                      <Text style={[styles.confirmText, localAmount === null && { color: 'rgba(255,255,255,0.3)' }]}>
                        {isEN ? "CONFIRM AMOUNT" : "መጠኑን አረጋግጥ"}
                      </Text>
                      {localAmount !== null && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={onBack} style={styles.backLinkBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.backLinkText}>{isEN ? "BACK TO ROOMS" : "ይመለሱ"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
});

export default RoomSheet;

const styles = StyleSheet.create({
  sheetBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(5, 7, 18, 0.75)",
    zIndex: -1,
  },
  topAccentBar: {
    height: 3,
    width: "100%",
    backgroundColor: "#6366f1",
  },
  desktopModal: {
    width: '92%',
    maxWidth: 440,
    backgroundColor: '#0f1222',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 24,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    zIndex: 10001,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#0f1222",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    minHeight: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 24,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(99, 102, 241, 0.3)",
    zIndex: 10001,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  subTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sheetSubTitleText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 12,
    fontWeight: "700",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  roomList: {
    gap: 12,
    marginTop: 8,
  },
  lockedBanner: {
    backgroundColor: 'rgba(253, 111, 133, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(253, 111, 133, 0.35)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  lockedTitle: {
    color: '#fd6f85',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  lockedSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  roomBtn: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  roomInner: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  roomName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  roomDetail: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  roomAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  fairPlayBanner: {
    marginTop: 14,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  fairPlayText: {
    flex: 1,
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  amountCardWrap: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  amountCardSelected: {
    borderWidth: 2,
    borderColor: '#00daf3',
    shadowColor: '#00daf3',
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  amountCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 82,
    position: 'relative',
  },
  amountValText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  amountMetaText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  amountArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capBadge: {
    position: 'absolute',
    bottom: 6,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  capBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  balanceContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 26, 48, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  balanceNoteText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceValText: {
    color: '#00daf3',
    fontSize: 14,
    fontWeight: '900',
  },
  confirmBtn: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  backLinkBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backLinkText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '800',
  },
});
