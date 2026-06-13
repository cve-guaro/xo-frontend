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
            transform: [{ scale: backdropOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            opacity: backdropOpacity
          }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          {/* Header with back button for AMOUNTS step */}
          {step === "AMOUNTS" ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 }}>
              <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sheetTitle}>{isEN ? `${selectedRoom.titleEn} amount` : `${selectedRoom.titleAm} መጠን`}</Text>
                <Text style={styles.sheetSubTitle}>Commission {selectedRoom.cut}% • {selectedRoom.time}s</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{isEN ? "Select room" : "ክፍል ይምረጡ"}</Text>
                <Text style={styles.sheetSubTitle}>{isEN ? "Tap a room to see amounts." : "መጠኖችን ለማየት ክፍሉን ይጫኑ"}</Text>
              </View>
            </>
          )}


          {step === "ROOMS" ? (
            <View style={styles.roomList}>
              {/* Global rooms lock banner */}
              {userCaps?.rooms_locked && (
                <View style={{
                  backgroundColor: 'rgba(253,111,133,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(253,111,133,0.3)',
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  marginBottom: 16,
                  gap: 8,
                }}>
                  <Ionicons name="lock-closed" size={32} color="#fd6f85" />
                  <Text style={{ color: '#fd6f85', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>
                    {isEN ? 'Rooms Locked' : 'ክፍሎች ተዘግተዋል'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                    {isEN
                      ? 'All game rooms are temporarily locked by the admin. Please check back later.'
                      : 'ሁሉም የጨዋታ ክፍሎች በጊዜያዊነት ተዘግተዋል። ቆይተው ይሞክሩ።'}
                  </Text>
                </View>
              )}
              {ROOMS.map((room) => {
                const isR1 = room.id === "R1";
                const isR2 = room.id === "R2";
                const isR3 = room.id === "R3";
                
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
                    <LinearGradient colors={roomLocked || globalLocked ? ['#444', '#222'] : room.colors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.roomInner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{isEN ? room.titleEn : room.titleAm} {roomLocked && "(MAXED)"}{globalLocked && "🔐"}</Text>
                        <Text style={styles.roomDetail}>
                          {isEN ? `ETB ${room.rangeLabel} • ${room.cut}% Commission • ${room.time}s` : `ETB ${room.rangeLabel} • ${room.cut}% ክፍያ • ${room.time} ሰ`}
                        </Text>
                      </View>
                      <View style={styles.roomAction}>
                        <Text style={styles.viewText}>{isEN ? "View" : "ይሂዱ"}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#fff" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )
              })}

              <View style={styles.fairPlayBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#8193f8ff" />
                <Text style={styles.fairPlayText}>
                  {isEN ? "Fair play is enforced. Any cheating results in a permanent ban." : "ትክክለኛ ጨዋታ ተፈጻሚ ይሆናል። ማንኛውም ማጭበርበር ለዘለቄታው እገዳ ያስከትላል።"}
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
                    currentWins = userCaps?.r1_10_wins || 0;
                    if (currentWins >= CAP_LIMIT) capReached = true;
                  }
                  if (selectedRoom.id === "R1" && opt.amount === 15) {
                    currentWins = userCaps?.r1_15_wins || 0;
                    if (currentWins >= CAP_LIMIT) capReached = true;
                  }

                  const disabled = (balance < opt.amount) || capReached;
                  const isSelected = localAmount === opt.amount;
                  const pillColors = disabled
                    ? ['rgba(60,60,80,0.6)', 'rgba(40,40,60,0.4)'] as [string, string]
                    : opt.colors as [string, string];

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
                        { width: '48%', marginBottom: 16, borderRadius: 16, overflow: 'hidden', opacity: disabled ? 0.45 : 1 },
                        pressed && !disabled ? { transform: [{ scale: 0.98 }] } : null,
                        isSelected && { transform: [{ scale: 1.01 }] },
                      ]}
                    >
                      <LinearGradient
                        colors={pillColors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 18,
                          paddingHorizontal: 16,
                          paddingBottom: showCapBadge ? 28 : 18,
                          borderRadius: 16,
                          borderWidth: isSelected ? 2 : 0,
                          borderColor: isSelected ? '#fff' : 'transparent',
                          height: '100%',
                          position: 'relative',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 0.3 }}>
                            ETB {opt.rangeLabel ? opt.rangeLabel : opt.amount.toLocaleString()}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                            Commission {selectedRoom.cut}% • {selectedRoom.time}s
                            {capReached ? ' • LOCKED' : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />

                        {/* Win cap progress badge */}
                        {showCapBadge && (
                          <View style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: capReached ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.12)',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                          }}>
                            <Ionicons
                              name={capReached ? 'lock-closed' : 'trophy-outline'}
                              size={10}
                              color={capReached ? '#f87171' : 'rgba(255,255,255,0.7)'}
                            />
                            <Text style={{
                              color: capReached ? '#f87171' : 'rgba(255,255,255,0.8)',
                              fontSize: 10,
                              fontWeight: '900',
                              letterSpacing: 0.3,
                            }}>
                              {currentWins}/{CAP_LIMIT}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>


              {/* Balance indicator — always shown at the bottom (matches img 5) */}
              <View style={[styles.balanceNote, { marginTop: 16 }]}>
                <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.balanceNoteText}>
                  {isEN ? `Balance: ETB ${balance.toLocaleString()}` : `ቀሪ ገንዘብ: ETB ${balance.toLocaleString()}`}
                </Text>
              </View>

              {/* Desktop: Confirm button */}
              {isDesktop && (
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={handleConfirmDesktop}
                    disabled={localAmount === null}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={localAmount !== null ? ['#00daf3', '#00a3ff'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.confirmBtn}
                    >
                      <Text style={[styles.confirmText, localAmount === null && { color: 'rgba(255,255,255,0.2)' }]}>
                        {isEN ? "CONFIRM AMOUNT" : "መጠኑን አረጋግጥ"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onBack} style={{ marginTop: 12, alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold' }}>{isEN ? "BACK TO ROOMS" : "ይመለሱ"}</Text>
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
    backgroundColor: "rgba(10,12,24,0.6)",
    zIndex: -1,
  },
  desktopModal: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#18181b',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 20,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    zIndex: 10001,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#18181b",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    minHeight: 420,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 24,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    zIndex: 10001,
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  sheetHeader: {
    paddingHorizontal: 28,
    marginTop: 24,
    marginBottom: 28,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.4
  },
  sheetSubTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600"
  },
  sheetContent: {
    paddingBottom: 100
  },
  roomList: {
    paddingHorizontal: 24,
    gap: 12
  },
  roomBtn: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  roomInner: {
    paddingVertical: 22,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  roomName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  roomDetail: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 3,
    fontWeight: "700"
  },
  roomAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  viewText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  fairPlayBanner: {
    marginTop: 24,
    backgroundColor: "rgba(129,140,248,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.15)",
  },
  fairPlayText: {
    flex: 1,
    color: "rgba(129,140,248,0.8)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  balanceNote: {
    marginTop: 16,
    alignItems: 'center',
  },
  balanceNoteText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
});
