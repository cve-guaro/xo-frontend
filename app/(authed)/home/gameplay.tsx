// app/(authed)/landing.tsx
import { API_URL } from "../../../config";
import ProfileEditModal from "../../../components/ProfileEditModal";
import WelcomeTermsPopup from "../../../components/WelcomeTermsPopup";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import BonusLogsModal from "../../../components/BonusLogsModal";
import ReferralModal from "../../../components/ReferralModal";
import { WebPressable } from "../../../components/WebPressable";
import FriendMatchModal from "../../../components/game/FriendMatchModal";
import IncomingInviteModal from "../../../components/game/IncomingInviteModal";
import RematchTopPopup from "../../../components/game/RematchPopup";
import RulesModal from "../../../components/RulesModal";
import PromotionPopup from "../../../components/PromotionPopup";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import NotificationsPopover from "../../../components/NotificationsPopover";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Modal,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { useAuth, PaymentMethod } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { haptics } from "../../../lib/haptcs";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import { useToast } from "../../../context/ToastContext";
import Svg, { Circle } from 'react-native-svg';




const BOARD_SIZE = 3;

const DEMO_BOARD = ["O", "_", "X", "_", "O", "_", "X", "_", "_"] as const;

type RoomConfig = {
  id: "R1" | "R2" | "R3";
  rangeLabel: string;
  titleEn: string;
  titleAm: string;
  cut: number;
  time: number;
  colors: [string, string];
  amountOptions: { amount: number; min: number; max: number; rangeLabel?: string; colors: [string, string] }[];
};

const ROOMS: RoomConfig[] = [
  {
    id: "R1",
    rangeLabel: "10-100",
    titleEn: "Room 1",
    titleAm: "ክፍል 1",
    cut: 10,
    time: 30,
    colors: ["#8b5cf6", "#6d28d9"], // Premium Purple matching HTML
    amountOptions: [
      { amount: 25, min: 10, max: 25, rangeLabel: "10 - 25", colors: ["#8b5cf6", "#6d28d9"] },
      { amount: 50, min: 25, max: 50, rangeLabel: "25 - 50", colors: ["#8b5cf6", "#6d28d9"] },
      { amount: 100, min: 50, max: 100, rangeLabel: "50 - 100", colors: ["#8b5cf6", "#6d28d9"] },
    ],
  },
  {
    id: "R2",
    rangeLabel: "100-1000",
    titleEn: "Room 2",
    titleAm: "ክፍል 2",
    cut: 10,
    time: 30,
    colors: ["#3b82f6", "#2563eb"], // Blue
    amountOptions: [
      { amount: 250, min: 100, max: 250, rangeLabel: "100 - 250", colors: ["#3b82f6", "#2563eb"] },
      { amount: 500, min: 250, max: 500, rangeLabel: "250 - 500", colors: ["#3b82f6", "#2563eb"] },
      { amount: 1000, min: 500, max: 1000, rangeLabel: "500 - 1000", colors: ["#3b82f6", "#2563eb"] },
    ],
  },
  {
    id: "R3",
    rangeLabel: "1000-10000",
    titleEn: "Room 3",
    titleAm: "ክፍል 3",
    cut: 10,
    time: 30,
    colors: ["#06b6d4", "#0891b2"], // Cyan
    amountOptions: [
      { amount: 2500, min: 1000, max: 2500, rangeLabel: "1000 - 2500", colors: ["#06b6d4", "#0891b2"] },
      { amount: 5000, min: 2500, max: 5000, rangeLabel: "2500 - 5000", colors: ["#06b6d4", "#0891b2"] },
      { amount: 7500, min: 5000, max: 7500, rangeLabel: "5000 - 7500", colors: ["#06b6d4", "#0891b2"] },
      { amount: 10000, min: 10000, max: 10000, rangeLabel: "10000 (itself)", colors: ["#06b6d4", "#0891b2"] },
    ],
  },
];


type SheetStep = "ROOMS" | "AMOUNTS";



const HeaderPill = memo(function HeaderPill({

  onPress,
  icon,
  text,
  gradient,
}: {
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text?: string;
  gradient: [string, string];
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.pillOuter}>
      <LinearGradient colors={gradient} style={styles.pillInner}>
        <Ionicons name={icon} size={16} color="#fff" />
        {!!text && <Text style={styles.pillText}>{text}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
});

const QuickTile = memo(function QuickTile({
  icon,
  title,
  subtitle,
  onPress,
  colors = ["rgba(124,58,237,0.92)", "rgba(59,130,246,0.70)"],
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  colors?: [string, string];
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.tile}>
      <LinearGradient
        colors={["rgba(10,12,28,0.52)", "rgba(10,12,28,0.34)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tileIcon}>
        <LinearGradient
          colors={colors}
          style={styles.tileIconInner}
        >
          <Ionicons name={icon} size={16} color="#fff" />
        </LinearGradient>
      </View>
      <View style={styles.tileTextWrap}>
        <Text
          style={styles.tileTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.86}
        >
          {title}
        </Text>
        <Text
          style={styles.tileSub}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.88}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const InfoPill = memo(function InfoPill({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.78)" />
      <Text
        style={styles.infoText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {text}
      </Text>
    </View>
  );
});

const BoardDemo = memo(function BoardDemo({ isDesktop }: { isDesktop: boolean }) {
  const { width } = useWindowDimensions();
  // Adjust sizing dynamically: max 260px on desktop, scaling down based on viewport on mobile/tablet
  const BOARD_DIM = isDesktop ? 320 : Math.min(width - 90, 280);
  const FONT_SIZE = BOARD_DIM * 0.22;

  return (
    <View style={[styles.neonBoard, { width: BOARD_DIM, height: BOARD_DIM }]}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.neonBoardRow}>
          {[0, 1, 2].map((col) => {
            const idx = row * 3 + col;
            const cell = DEMO_BOARD[idx];
            return (
              <View key={col} style={styles.neonCell}>
                {cell !== "_" && (
                  <Text style={[
                    styles.cellText,
                    cell === "O" ? styles.neonOText : styles.neonXText,
                    { fontSize: FONT_SIZE }
                  ]}>{cell}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const ExitModal = memo(function ExitModal({
  language,
  onCancel,
  onConfirm,
}: {
  language: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isEN = language === "en";
  return (
    <View style={styles.modalOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.exitSheet}>
        <View style={styles.exitHeader}>
          <View style={styles.exitIcon}>
            <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={StyleSheet.absoluteFill} />
            <Ionicons name="alert-circle-outline" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exitTitle}>{isEN ? "Exit app?" : "መተግበሪያውን አጥፋ?"}</Text>
            <Text style={styles.exitSub}>{isEN ? "Are you sure you want to close the app?" : "መተግበሪያውን መዝጋት ይፈልጋሉ?"}</Text>
          </View>
        </View>
        <View style={styles.exitActions}>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.9} style={styles.exitGhost}>
            <Text style={styles.exitGhostText}>{isEN ? "Cancel" : "አይ"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} activeOpacity={0.9} style={styles.exitDanger}>
            <LinearGradient colors={["rgba(239,68,68,0.95)", "rgba(124,58,237,0.85)"]} style={styles.exitDangerInner}>
              <Text style={styles.exitDangerText}>{isEN ? "Exit" : "አዎ"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const SearchingView = memo(function SearchingView({ onCancel, isMatched }: { onCancel: () => void, isMatched?: boolean }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    const ti = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => { loop.stop(); clearInterval(ti); };
  }, []);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        {/* Single simple pulse for visual Commissiondback without being heavy */}
        <Animated.View style={{
          position: 'absolute',
          width: 200, height: 200, borderRadius: 100,
          borderWidth: 2, borderColor: 'rgba(129,236,255,0.1)',
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }],
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })
        }} />

        <LinearGradient colors={isMatched ? ['#10b981', '#059669'] : ['#81ecff', '#00daf3']} style={{
          width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
          shadowColor: '#00daf3', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
        }}>
          <Ionicons name={isMatched ? 'checkmark-circle' : 'search'} size={32} color="#000" />
        </LinearGradient>
      </View>

      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 24, letterSpacing: 1 }}>
        {isMatched ? 'MATCH FOUND!' : 'FINDING OPPONENT...'}
      </Text>

      <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={{ color: '#81ecff', fontWeight: '900', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : undefined }}>{timeStr}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 32, width: '100%' }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>ONLINE</Text>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 }}>12,402</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>LATENCY</Text>
          <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '900', marginTop: 2 }}>24ms</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onCancel} disabled={isMatched} style={{ marginTop: 40, width: '100%', borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={["rgba(253,111,133,0.2)", "rgba(253,111,133,0.1)"]} style={{ paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)', borderRadius: 18 }}>
          <Text style={{ color: '#fd6f85', fontWeight: '900', letterSpacing: 1 }}>CANCEL</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});



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
                const r1Locked = isR1 && ((userCaps?.r1_10||0)>=20 && (userCaps?.r1_25||0)>=20 && (userCaps?.r1_50||0)>=20 && (userCaps?.r1_99||0)>=20);
                const globalLocked = !!userCaps?.rooms_locked;
                return (
                  <TouchableOpacity 
                    key={room.id} 
                    activeOpacity={0.88} 
                    disabled={r1Locked || globalLocked} 
                    onPress={() => onSelectRoom(room.id)} 
                    style={[styles.roomBtn, (r1Locked || globalLocked) && { opacity: 0.4 }]}
                  >
                    <LinearGradient colors={r1Locked || globalLocked ? ['#444', '#222'] : room.colors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.roomInner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{isEN ? room.titleEn : room.titleAm} {r1Locked && "(MAXED)"}{globalLocked && "🔐"}</Text>
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
                  let plays = 0;
                  if (selectedRoom.id === "R1") {
                    if (opt.min === 10) { plays = (userCaps?.r1_10 || 0); }
                    if (opt.min === 25) { plays = (userCaps?.r1_25 || 0); }
                    if (opt.min === 50) { plays = (userCaps?.r1_50 || 0); }
                  }
                  const disabled = (balance < opt.min) || capReached;
                  const isSelected = localAmount === opt.amount;
                  const pillColors = disabled
                    ? ['rgba(60,60,80,0.6)', 'rgba(40,40,60,0.4)'] as [string, string]
                    : opt.colors as [string, string];

                  return (
                    <Pressable
                      key={opt.amount}
                      disabled={disabled}
                      onPress={() => isDesktop ? setLocalAmount(opt.amount) : onSelectAmount(selectedRoom, opt.min, opt.max)}
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
                          borderRadius: 16,
                          borderWidth: isSelected ? 2 : 0,
                          borderColor: isSelected ? '#fff' : 'transparent',
                          height: '100%' // Fix gap usage by ensuring equal height
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

const MobileQuickTile = ({ icon, iconColor, title, subtitle, onPress }: { icon: string; iconColor: string; title: string; subtitle: string; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={{
      flex: 1,
      backgroundColor: 'rgba(20, 19, 26, 0.6)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12
    }}
  >
    <Ionicons name={icon as any} size={28} color={iconColor} />
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

// Session tracker for promotion popup to prevent showing it on web page tab transitions
let hasShownPromoThisSession = false;

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  // Promotion Popup & Scrolling Ticker States
  const [promoConfig, setPromoConfig] = useState<any>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [tickerList, setTickerList] = useState<string[]>([]);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [currentWinAnnouncement, setCurrentWinAnnouncement] = useState<string | null>(null);
  const [hideInstallBanner, setHideInstallBanner] = useState(false);

  const fetchActivePromo = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/promo-popup/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.popup) {
          setPromoConfig(data.popup);
          setShowPromo(true);
        } else {
          setShowPromo(false);
        }
      }
    } catch (e) {
      console.error('[Landing] fetch active promo error:', e);
    }
  }, []);

  const fetchTickerFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/leaderboard/ticker`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ticker)) {
          setRawTickerList(data.ticker);
          const formatted = data.ticker.map((item: any) => {
            const amt = Number(item.amount) || 0;
            let emoji = '⚡';
            if (amt >= 500) emoji = '👑';
            else if (amt >= 200) emoji = '🔥';
            else if (amt >= 100) emoji = '🏆';
            return `${emoji} ${item.username.toUpperCase()} WON ${amt} Birr`;
          });
          setTickerList(formatted);
        }
      }
    } catch (e) {
      console.error('[Landing] fetch ticker error:', e);
    }
  }, []);
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;
  const { ensureConnected, findMatch, cancelFind, isSearching, onMessage, send } = useSocket();
  const { user, token, booting, refreshProfile, language, switchLanguage, t, showAlert, fixUrl } = useAuth();
  const { isPlaying: bgMusicPlaying, toggleMusic } = useBackgroundMusic();

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).deferredPrompt : null
  );
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const winTickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const checkPwaInstalled = async () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone;
      if (isStandalone) return true;

      if ((navigator as any).getInstalledRelatedApps) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            return true;
          }
        } catch (e) {
          console.log('[PWA Gameplay] getInstalledRelatedApps error:', e);
        }
      }
      return false;
    };

    const handleCheck = () => {
      checkPwaInstalled().then(installed => {
        setIsPwaInstalled(installed);
      });
    };

    handleCheck();

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPwaInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    const interval = setInterval(handleCheck, 3000);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
      clearInterval(interval);
    };
  }, []);

  const appPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!deferredPrompt) {
      appPulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(appPulseAnim, {
          toValue: 1.06,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(appPulseAnim, {
          toValue: 1.0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [deferredPrompt]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleReady = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwa-prompt-ready', handleReady);

    // Check if already available
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener('pwa-prompt-ready', handleReady);
    };
  }, []);
  const isEN = language === "en";
  const isBanned = !!(user as any)?.banned;
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, totalBonusEarned: 0 });
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [rulesVisible, setRulesVisible] = useState(false);
  const toast = useToast();
  const [incomingInvite, setIncomingInvite] = useState<any>(null);

  // Notifications and Weekly Leaderboard states
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [rawTickerList, setRawTickerList] = useState<any[]>([]);
  const [myWeeklyRank, setMyWeeklyRank] = useState<any | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weeklyPrizes, setWeeklyPrizes] = useState<any[]>([
    { rank: 1, amount: 500 },
    { rank: 2, amount: 300 },
    { rank: 3, amount: 200 },
  ]);

  // Win announcements rotation states (vertical fading ticker)
  const tickerAnim = useRef(new Animated.Value(0)).current;
  const [tickerIdx, setTickerIdx] = useState(0);

  // Collapsible Floating actions bar state
  const [floatingExpanded, setFloatingExpanded] = useState(false);
  const floatingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(floatingAnim, {
      toValue: floatingExpanded ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [floatingExpanded]);

  const fetchWeeklyLeaderboard = useCallback(async () => {
    if (!token) return;
    setLoadingWeekly(true);
    try {
      const res = await fetch(`${API_URL}/leaderboard/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyLeaderboard(data.leaderboard || []);
        setMyWeeklyRank(data.myRank || null);
        if (data.prizes) setWeeklyPrizes(data.prizes);
        if (data.secondsRemaining !== undefined) {
          setSecondsRemaining(data.secondsRemaining);
        }
      }
    } catch (e) {
      console.error("Weekly leaderboard fetch error in gameplay:", e);
    } finally {
      setLoadingWeekly(false);
    }
  }, [token]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining > 0]);

  useEffect(() => {
    fetchWeeklyLeaderboard();
  }, [fetchWeeklyLeaderboard]);

  useEffect(() => {
    if (tickerList.length === 0) return;
    const timer = setInterval(() => {
      tickerAnim.setValue(0);
      Animated.timing(tickerAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setTickerIdx((prev) => (prev + 1) % tickerList.length);
        tickerAnim.setValue(0);
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [tickerAnim, tickerList]);


  // Global rematch state — shows popup even when on home page
  const [globalRematchOffer, setGlobalRematchOffer] = useState<{ visible: boolean; fromName?: string; amount?: number; fromUserId?: string } | null>(null);

  // Friend Match — send invite via socket
  const handleSendInvite = useCallback(async (username: string, betAmount: number) => {
    if (!token) return;
    await ensureConnected(token);
    send('friend_invite', { token, targetUsername: username, betAmount });
  }, [token, send, ensureConnected]);

  // Listen for friend invite results and incoming invites
  useEffect(() => {
    const off = onMessage((msg: any) => {
      if (msg.type === 'friend_invite_result') {
        setInviteResult(msg.payload);
      } else if (msg.type === 'friend_invite_declined') {
        const declinedBy = msg.payload?.byUsername || 'Your friend';
        toast.info(`${declinedBy} declined your challenge!`);
        // Update inviteResult so FriendMatchModal shows the decline clearly
        setInviteResult((prev: any) => ({ ...prev, declined: true, declinedByUsername: declinedBy }));
      }
    });
    return () => { try { off(); } catch { } };
  }, [onMessage, toast]);

  // Listen for global real-time win announcements from the socket
  useEffect(() => {
    const off = onMessage((msg: any) => {
      if (msg.type === "global_win") {
        const payload = msg.payload || {};
        const username = String(payload.username || "User").toUpperCase();
        const amt = Number(payload.amount) || 0;
        let emoji = '⚡';
        if (amt >= 500) emoji = '👑';
        else if (amt >= 200) emoji = '🔥';
        else if (amt >= 100) emoji = '🏆';

        setCurrentWinAnnouncement(`${emoji} ${username} WON ${amt} Birr`);
      }
    });
    return () => {
      try { off(); } catch { }
    };
  }, [onMessage]);

  useEffect(() => {
    if (!currentWinAnnouncement) return;

    // Reset animation to 0 (hidden at bottom)
    winTickerAnim.setValue(0);

    // Slide in to middle (0 to 1)
    Animated.timing(winTickerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.back(1.0)),
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Slide out to top and fade out (1 to 2) after 4.1s
    const exitTimer = setTimeout(() => {
      Animated.timing(winTickerAnim, {
        toValue: 2,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setCurrentWinAnnouncement(null);
      });
    }, 4100);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [currentWinAnnouncement]);

  const handleInviteResponse = useCallback((accept: boolean) => {
    if (!incomingInvite || !token) return;
    send('friend_invite_response', {
      token,
      senderId: incomingInvite.fromUserId,
      accept,
      betAmount: incomingInvite.betAmount
    });
    setIncomingInvite(null);
  }, [incomingInvite, token, send]);

  // Auto-expire incoming friend invite popup after 45 seconds
  useEffect(() => {
    if (!incomingInvite) return;
    const timer = setTimeout(() => {
      // Auto-decline so sender gets notified
      if (incomingInvite?.fromUserId && token) {
        send('friend_invite_response', {
          token,
          senderId: incomingInvite.fromUserId,
          accept: false,
          betAmount: incomingInvite.betAmount
        });
      }
      setIncomingInvite(null);
    }, 45000);
    return () => clearTimeout(timer);
  }, [incomingInvite, token, send]);

  // Global rematch accept/decline (for when user is on home page)
  const handleGlobalRematchAccept = useCallback(() => {
    if (!globalRematchOffer?.fromUserId || !token) return;
    send('rematch_response', {
      token,
      opponentId: globalRematchOffer.fromUserId,
      amount: globalRematchOffer.amount,
      accept: true,
    });
    setGlobalRematchOffer(null);
  }, [globalRematchOffer, token, send]);

  const handleGlobalRematchDecline = useCallback(() => {
    if (!globalRematchOffer?.fromUserId || !token) return;
    send('rematch_response', {
      token,
      opponentId: globalRematchOffer.fromUserId,
      amount: globalRematchOffer.amount,
      accept: false,
    });
    setGlobalRematchOffer(null);
  }, [globalRematchOffer, token, send]);

  const [appConfig, setAppConfig] = useState<{ referral_enabled?: boolean; rooms_locked?: boolean }>({ referral_enabled: false, rooms_locked: false });
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/account/config`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setAppConfig(data))
        .catch(() => { });
    }
  }, [token]);

  const params = useLocalSearchParams();

  // Auto-connect socket on load so user appears "Online" to others
  useEffect(() => {
    if (token) {
      ensureConnected(token).catch(() => { });
    }
  }, [token, ensureConnected]);

  // Auto-open share modal from deep links
  useEffect(() => {
    if (params.modal === 'share') {
      setShowReferralModal(true);
    }
  }, [params.modal]);

  // ---------- auto-refresh balance when page gains focus ----------
  // This handles post-payment redirects from Chapa and returning from deposit/withdraw screens
  useFocusEffect(
    useCallback(() => {
      if (token && refreshProfile) {
        refreshProfile().catch(() => { });
      }
      fetchTickerFeed();
    }, [token, refreshProfile, fetchTickerFeed])
  );

  // Reset promo session tracker on logout
  useEffect(() => {
    if (!token) {
      hasShownPromoThisSession = false;
    }
  }, [token]);

  // Fetch promo popup and ticker feed only on app mount / refresh / login (not on focus shifts)
  useEffect(() => {
    if (!hasShownPromoThisSession) {
      fetchActivePromo();
      hasShownPromoThisSession = true;
    }
    fetchTickerFeed();
  }, [fetchActivePromo, fetchTickerFeed]);

  // Periodic polling for ticker wins to keep it fully real-time
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchTickerFeed();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [token, fetchTickerFeed]);

  // ---------- welcome terms ----------
  const [termsVisible, setTermsVisible] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    if (!user || !user.id || termsChecked) return;
    const checkTerms = async () => {
      try {
        const agreed = await AsyncStorage.getItem(`agreed_terms_${user.id}`);
        const welcomeShown = await AsyncStorage.getItem(`welcome_shown_${user.id}`);
        // Only show for new users who have bonus_balance > 0 AND are marked as new_user
        // and haven't agreed to terms yet AND haven't seen welcome bonus
        const isNewUser = (user as any)?.new_user === true;
        const hasBonus = (user as any)?.bonus_balance > 0;

        if (agreed !== 'true' && hasBonus && isNewUser && welcomeShown !== 'true') {
          setTermsVisible(true);
        }
        setTermsChecked(true);
      } catch { }
    };
    checkTerms();
  }, [user, termsChecked]);

  const handleAgreeTerms = useCallback(async () => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(`agreed_terms_${user.id}`, 'true');
      await AsyncStorage.setItem(`welcome_shown_${user.id}`, 'true');
      setTermsVisible(false);
      haptics.success();
    } catch { }
  }, [user]);

  // -- DESKTOP EXACT MATCH NAVIGATOR --
  useEffect(() => {
    if (!isLargeScreen) return; // Handled directly in `waiting.tsx` for smaller devices
    const off = onMessage((msg: any) => {
      try {
        if (msg.type === "match_found") {
          setMatchFound(true);
          const { matchId, symbol, opponentUsername, opponentAvatar, houseCutPercent, timerDuration, betAmount: bkAmount, youAre } = msg.payload || {};
          if (!matchId) return;
          router.replace({
            pathname: "/game/room",
            params: {
              id: String(matchId),
              symbol: String(symbol || youAre || "X"),
              vs: String(opponentUsername || "Opponent"),
              oppId: msg.payload?.opponentId || "",
              opponentAvatar: opponentAvatar || "",
              amount: String(bkAmount || 50),
              time: String(timerDuration || 30),
              _k: String(Date.now()),
            },
          } as any);
        }
      } catch { }
    });
    return () => {
      try { off(); } catch { }
    };
  }, [isLargeScreen, onMessage, router]);

  // Poll profile every 30s while banned so the UI auto-recovers when admin unbans
  useEffect(() => {
    if (!isBanned) return;
    const timer = setInterval(() => { refreshProfile().catch(() => { }); }, 30_000);
    return () => clearInterval(timer);
  }, [isBanned, refreshProfile]);

  // ---------- sound (click only — background managed by BackgroundMusicProvider) ----------
  const clickSound = useAudioPlayer(require("../../../assets/sounds/click.wav"));

  const playClick = useCallback(async () => {
    if (!bgMusicPlaying) return;
    try {
      clickSound.play();
    } catch { }
  }, [bgMusicPlaying, clickSound]);

  const handleAppDownload = useCallback(async () => {
    haptics.tap();
    await playClick();

    const isTelegram = Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent);
    if (isTelegram) {
      setPwaModalVisible(true);
      return;
    }

    if (Platform.OS === 'web' && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') (window as any).deferredPrompt = null;
      });
      return;
    }

    if (Platform.OS === 'web') {
      setPwaModalVisible(true);
      return;
    }

    const url = 'https://xoethiopia.com/xoet.apk';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL('https://xoethiopia.com');
      }
    } catch (err) {
      console.error("Failed to open app download URL", err);
      Linking.openURL('https://xoethiopia.com');
    }
  }, [playClick, deferredPrompt]);

  const renderPodiumSpot = useCallback((spot: { rank: number; prize: number; color: string; barH: number; label: string }) => {
    const userAtRank = weeklyLeaderboard.find(u => u.rank === spot.rank);
    const username = userAtRank ? userAtRank.username : "—";
    const isFirst = spot.rank === 1;
    const circleSize = isFirst ? 54 : 42;

    return (
      <View key={spot.rank} style={{ alignItems: 'center', flex: 1 }}>
        {/* Prize */}
        <Text style={{
          color: spot.color,
          fontSize: 12,
          fontWeight: '900',
          marginBottom: 8,
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2
        }}>
          {spot.prize} Birr
        </Text>

        {/* Rank Circle */}
        <View style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          borderWidth: 2,
          borderColor: spot.color,
          backgroundColor: '#0c0c1d',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: -10,
          zIndex: 2,
          position: 'relative'
        }}>
          <Text style={{ fontSize: isFirst ? 18 : 14, fontWeight: '900', color: '#fff' }}>{spot.rank}</Text>

          {isFirst && (
            <View style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: spot.color,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2
            }}>
              <Ionicons name="trophy" size={9} color="#000" />
            </View>
          )}
        </View>

        {/* Column Bar (fully rounded rectangle with border) */}
        <View style={{
          width: '100%',
          maxWidth: isFirst ? 82 : 72,
          height: spot.barH,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: spot.color,
          backgroundColor: 'rgba(255,255,255,0.02)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center' }} numberOfLines={1}>
            {username}
          </Text>
        </View>
      </View>
    );
  }, [weeklyLeaderboard]);

  const renderUserRankCard = useCallback(() => {
    const rankVal = myWeeklyRank && myWeeklyRank.rank ? `#${myWeeklyRank.rank}` : "#1";
    const scoreVal = myWeeklyRank && myWeeklyRank.wins !== undefined 
      ? `${myWeeklyRank.wins} ${isEN ? 'Wins' : 'ድሎች'}` 
      : `2 ${isEN ? 'Wins' : 'ድሎች'}`;

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginTop: 16,
        width: '100%'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '900' }}>
              {rankVal}
            </Text>
          </View>
          <View>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
              {isEN ? "You" : "እርስዎ"}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
              {isEN ? "All players" : "ሁሉም ተጫዋቾች"}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
          {scoreVal}
        </Text>
      </View>
    );
  }, [myWeeklyRank, isEN]);

  // ---------- exit modal ----------
  const [exitModalVisible, setExitModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const backAction = () => {
        setExitModalVisible(true);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => sub.remove();
    }, [])
  );

  const confirmExit = useCallback(async () => {
    await playClick();
    setExitModalVisible(false);
    if (Platform.OS === "android") BackHandler.exitApp();
  }, [playClick]);

  const cancelExit = useCallback(async () => {
    await playClick();
    setExitModalVisible(false);
  }, [playClick]);

  // ---------- header animation ----------
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [txHistory, setTxHistory] = useState<any[]>([]);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/account/history`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 4 })
    })
      .then(res => res.json())
      .then(d => {
        if (d.ok && Array.isArray(d.history)) setTxHistory(d.history);
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    const a = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: Platform.OS !== 'web' }),
    ]);
    a.start();
    return () => {
      slideAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim]);

  const balance = useMemo(() => Number(user?.available_balance ?? 0), [user]);

  // stats & rank logic (matches account.tsx)
  const gamesPlayed = (user as any)?.total_games ?? 0;
  const wins = (user as any)?.total_wins ?? 0;
  const winRate = useMemo(() => (gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0), [wins, gamesPlayed]);
  const statsLabel = useMemo(() => {
    const wr = Math.min(Math.max(winRate, 0), 100);
    return isEN ? `${wins} wins • ${wr}% win rate` : `${wins} ድሎች • ${wr}% የድል መጠን`;
  }, [wins, winRate, isEN]);

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

  const hasBonus = !!((user as any)?.bonus_balance > 0 || !(user as any)?.new_user);

  // ---------- handlers ----------
  const handleRefreshProfile = useCallback(async () => {
    haptics.tap();
    await playClick();
    try {
      await refreshProfile();
      toast.success(isEN ? "Balance Updated" : "ቀሪ ሂሳብ ተዘምኗል", undefined, 1500);
    } catch (e) {
      toast.error(isEN ? "Refresh Failed" : "ማዘመን አልተቻለም", isEN ? "Could not update your balance." : "ቀሪ ሂሳብዎን ማዘመን አልተቻለም።");
      console.log("Error refreshing profile:", e);
    }
  }, [playClick, refreshProfile]);

  const handleLanguageToggle = useCallback(async () => {
    haptics.selection("soft");
    await switchLanguage();
  }, [switchLanguage]);

  const handleToggleSound = useCallback(async () => {
    haptics.selection("soft");
    await toggleMusic();
  }, [toggleMusic]);

  const goReplace = useCallback(
    async (path: string) => {
      await playClick();
      router.replace(path as any);
    },
    [playClick, router]
  );

  // ---------- Room Sheet ----------
  const [roomSheetVisible, setRoomSheetVisible] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>("ROOMS");
  const [selectedRoomId, setSelectedRoomId] = useState<RoomConfig["id"]>("R1");

  const selectedRoom = useMemo(() => ROOMS.find((r) => r.id === selectedRoomId) || ROOMS[0], [selectedRoomId]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(520)).current;

  const openRoomSheet = useCallback(async () => {
    haptics.tap();
    await playClick();
    setSheetStep("ROOMS");
    setRoomSheetVisible(true);

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(520);

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [backdropOpacity, playClick, sheetTranslateY]);

  const closeRoomSheet = useCallback(async () => {
    haptics.tap();
    await playClick();
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sheetTranslateY, {
        toValue: 520,
        duration: 100,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setRoomSheetVisible(false);
      setSheetStep("ROOMS");
      if (params.openRooms === 'true') {
        router.setParams({ openRooms: undefined });
      }
    });
  }, [backdropOpacity, sheetTranslateY, params, router]);

  useEffect(() => {
    if (params.openRooms === "true") {
      openRoomSheet();
    }
  }, [params.openRooms, openRoomSheet]);

  const onSelectRoom = useCallback(async (roomId: RoomConfig["id"]) => {
    if (appConfig.rooms_locked) {
      showAlert('Rooms Locked', 'All game rooms are currently locked by the admin. Please try again later.');
      return;
    }
    haptics.selection("soft");
    await playClick();
    setSelectedRoomId(roomId);
    setSheetStep("AMOUNTS");
  }, [playClick]);

  const goBackToRooms = useCallback(async () => {
    haptics.selection("soft");
    await playClick();
    setSheetStep("ROOMS");
  }, [playClick]);

  const selectAmount = useCallback(
    async (room: RoomConfig, min: number, max: number) => {
      haptics.tap();
      await playClick();
      if (Number.isFinite(balance) && balance < min) {
        haptics.warning();
        toast.warning(
          isEN ? "Insufficient Balance" : "በቂ ሂሳብ የለም",
          isEN ? `You need at least ETB ${min} to play. Deposit more funds.` : `ለመጫወት ቢያንስ ETB ${min} ያስፈልጋል። ተጨማሪ ገንዘብ ያስገቡ።`
        );
        return;
      }

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(sheetTranslateY, { toValue: 520, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(async () => {
        setRoomSheetVisible(false);
        setSheetStep("ROOMS");

        if (isDesktop) {
          // Sync desktop to use the same mobile waiting screen UX 
          // to match the requested phone-size UI design
          router.replace({
            pathname: "/game/waiting",
            params: {
              betMin: String(min),
              betMax: String(max),
              amount: String(max),
              token: String(token || ""),
              roomId: room.id,
              cut: String(room.cut),
              time: String(room.time),
            },
          } as any);
        } else {
          router.replace({
            pathname: "/game/waiting",
            params: {
              betMin: String(min),
              betMax: String(max),
              amount: String(max),
              token: String(token || ""),
              roomId: room.id,
              cut: String(room.cut),
              time: String(room.time),
            },
          } as any);
        }
      });
    },
    [backdropOpacity, balance, router, sheetTranslateY, token]
  );



  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.bootText}>{t("loading")}</Text>
      </View>
    );
  }

  if (isLargeScreen) {
    const isDesktopRow = isDesktop && !isTablet;
    const ContainerComponent = isDesktopRow ? View : ScrollView;
    const containerProps = isDesktopRow
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
        <ProfileEditModal visible={!user?.username} onClose={() => { }} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />

        <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={toast} />

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
            userCaps={{ r1_10: (user as any)?.r1_10_wins, r1_25: (user as any)?.r1_25_wins, r1_50: (user as any)?.r1_50_wins, r1_99: (user as any)?.r1_99_wins, rooms_locked: appConfig.rooms_locked }}
          />
        )}

        {/* Ambient Glows & Watermarks */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={[styles.blob, styles.blob1, { width: 600, height: 600, borderRadius: 300, opacity: 0.14 }]} />
          <View pointerEvents="none" style={[styles.blob, styles.blob2, { width: 600, height: 600, borderRadius: 300, opacity: 0.14 }]} />
          <View pointerEvents="none" style={[styles.blob, styles.blob3, { width: 700, height: 700, borderRadius: 350, opacity: 0.10 }]} />

          {/* Rotated soft blurry Tic-Tac-Toe graphic in desktop background */}
          <View style={{
            position: 'absolute',
            top: '22%',
            left: '6%',
            width: 480,
            height: 480,
            transform: [{ rotate: '-18deg' }, { scale: 1.15 }],
            opacity: 0.035,
            ...Platform.select({
              web: {
                filter: "blur(2px)",
              } as any,
            }),
          }} pointerEvents="none">
            {/* Horizontal lines */}
            <View style={{
              position: 'absolute', top: 160, left: 0, right: 0, height: 3, backgroundColor: '#a855f7',
              shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8
            }} />
            <View style={{
              position: 'absolute', top: 320, left: 0, right: 0, height: 3, backgroundColor: '#a855f7',
              shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8
            }} />
            {/* Vertical lines */}
            <View style={{
              position: 'absolute', left: 160, top: 0, bottom: 0, width: 3, backgroundColor: '#a855f7',
              shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8
            }} />
            <View style={{
              position: 'absolute', left: 320, top: 0, bottom: 0, width: 3, backgroundColor: '#a855f7',
              shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8
            }} />

            {/* Illustrative faded board moves */}
            <Text style={{
              position: 'absolute', top: 25, left: 45, fontSize: 80, fontWeight: '900', color: '#8b5cf6',
              textShadowColor: 'rgba(139, 92, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8
            }}>X</Text>
            <Text style={{
              position: 'absolute', top: 185, left: 205, fontSize: 80, fontWeight: '900', color: '#a855f7',
              textShadowColor: 'rgba(168, 85, 247, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8
            }}>O</Text>
            <Text style={{
              position: 'absolute', top: 345, left: 365, fontSize: 80, fontWeight: '900', color: '#8b5cf6',
              textShadowColor: 'rgba(139, 92, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8
            }}>X</Text>
          </View>
        </View>

        <ContainerComponent {...containerProps}>
          <View style={[{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 32,
            maxWidth: 1600,
            alignSelf: 'center',
            paddingHorizontal: 32,
            width: '100%',
          }, isTablet && { flexDirection: 'column', gap: 40 }, isDesktopRow && { flex: 1, height: '100%' }]}>

            {/* ── LEFT COLUMN (8/12) ── */}
            <View style={{
              flex: 2.5,
              maxWidth: 1100,
              gap: 24,
            }}>

              {/* The Arena Header (Mockup Target) */}
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

              {/* Horizontal Quick Actions Row (Mockup Target) */}
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 20 }}>
                {/* Deposit */}
                <TouchableOpacity
                  onPress={() => setDepositVisible(true)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    backgroundColor: '#151518',
                    borderWidth: 1,
                    borderColor: '#27272a',
                    borderRadius: 24,
                    paddingVertical: 22,
                    paddingHorizontal: 24,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 218, 243, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="card-outline" size={24} color="#00daf3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>DEPOSIT</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, textTransform: 'uppercase' }}>Fast Local</Text>
                  </View>
                </TouchableOpacity>

                {/* Withdraw */}
                <TouchableOpacity
                  onPress={() => setWithdrawVisible(true)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    backgroundColor: '#151518',
                    borderWidth: 1,
                    borderColor: '#27272a',
                    borderRadius: 24,
                    paddingVertical: 22,
                    paddingHorizontal: 24,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 218, 243, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-up-circle-outline" size={24} color="#00daf3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>WITHDRAW</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, textTransform: 'uppercase' }}>Instant</Text>
                  </View>
                </TouchableOpacity>

                {/* Transaction/History */}
                <TouchableOpacity
                  onPress={() => router.push('/(authed)/games' as any)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    backgroundColor: '#151518',
                    borderWidth: 1,
                    borderColor: '#27272a',
                    borderRadius: 24,
                    paddingVertical: 22,
                    paddingHorizontal: 24,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 218, 243, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="time-outline" size={24} color="#00daf3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>TRANSACTION</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, textTransform: 'uppercase' }}>Recent Logs</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Main Game Card */}
              <View style={{
                backgroundColor: '#111115',
                borderRadius: 36,
                padding: isDesktop ? 32 : 40,
                alignSelf: 'stretch',
              }}>
                <View style={{
                  flexDirection: isDesktop ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isDesktop ? 40 : 20,
                  width: '100%',
                }}>
                  {/* Left Column: Board Demo */}
                  <View style={{
                    flex: isDesktop ? 1.2 : undefined,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <View style={styles.hubBoardContainer}>
                      <BoardDemo isDesktop={true} />
                    </View>
                  </View>

                  {/* Right Column: Controls */}
                  <View style={{
                    flex: isDesktop ? 1 : undefined,
                    alignSelf: isDesktop ? 'stretch' : 'center',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: isDesktop ? '100%' : 320,
                  }}>
                    {/* START MATCH Play Button */}
                    <WebPressable
                      onPress={isBanned || isSearching ? undefined : openRoomSheet}
                      disabled={isBanned || isSearching}
                      style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
                        {
                          borderRadius: 30,
                          overflow: 'hidden',
                          shadowColor: '#00daf3',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: hovered && !isBanned && !isSearching ? 0.8 : 0.5,
                          shadowRadius: 24,
                          alignSelf: 'stretch',
                          transition: 'all 0.15s ease-in-out',
                        },
                        (isBanned || isSearching) && { opacity: 0.45 }
                      ]}
                    >
                      <LinearGradient
                        colors={isBanned ? ['#203a3a', '#152a2a'] : ['#00daf3', '#00e5ff']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isBanned && <Ionicons name="lock-closed" size={16} color="#00daf3" style={{ marginRight: 6 }} />}
                        {isSearching && <ActivityIndicator size="small" color="#000" style={{ marginRight: 6 }} />}
                        <Text style={{ color: '#000', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>
                          {isBanned
                            ? (isEN ? 'SUSPENDED' : 'ታግዷል')
                            : isSearching
                              ? (isEN ? 'SEARCHING...' : 'እየፈለገ ነው...')
                              : (isEN ? 'START MATCH' : 'ግጥሚያ ጀምር')}
                        </Text>
                      </LinearGradient>
                    </WebPressable>

                    {/* Muted Entry Fee label */}
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 }}>
                      ENTRY: ETB 10.00
                    </Text>

                    {/* Play with Friend Action Button */}
                    <WebPressable
                      onPress={() => setFriendModalVisible(true)}
                      style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
                        {
                          marginTop: 16,
                          alignSelf: 'stretch',
                          backgroundColor: 'transparent',
                          borderWidth: 1.5,
                          borderColor: '#3b82f6',
                          borderRadius: 30,
                          transition: 'all 0.15s ease-in-out',
                        }
                      ]}
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
            <View style={{
              flex: 1,
              minWidth: 320,
              maxWidth: 400,
              gap: isDesktopRow ? undefined : 24,
              alignSelf: isDesktopRow ? 'stretch' : undefined,
              height: isDesktopRow ? '100%' : undefined,
            }}>
              <RightColumnWrapper>

              {/* Support Widget */}
              <View style={[styles.glassCard, { padding: 24, borderRadius: 24, borderColor: '#27272a', backgroundColor: '#18181b' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00daf3' }} />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>SUPPORT</Text>
                  </View>
                  {/* language toggle pill inside support card */}
                  <TouchableOpacity onPress={handleLanguageToggle} style={{ flexDirection: 'row', height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#18181b', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#27272a' }}>
                    <Ionicons name="globe-outline" size={12} color="#00daf3" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{language === 'am' ? 'AM' : 'EN'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 14 }}>
                  <TouchableOpacity onPress={() => Linking.openURL('https://t.me/xoet_support').catch(() => { })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}>
                      <Ionicons name="chatbubbles-outline" size={16} color="rgba(0,218,243,0.6)" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isEN ? "XO SUPPORT" : "ኤክስኦ ድጋፍ"}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{isEN ? "AVAILABLE 24/7" : "ቀኑን ሙሉ ይገኛል"}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.openURL('https://t.me/xoethiopia1').catch(() => { })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}>
                      <Ionicons name="paper-plane-outline" size={16} color="rgba(0,218,243,0.6)" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isEN ? "TELEGRAM" : "ቴሌግራም"}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{isEN ? "OFFICIAL CHANNEL" : "ኦፊሴላዊ ቻናል"}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Leaderboard Widget (Real Data) */}
              <View style={[styles.glassCard, { padding: 24, borderRadius: 24, borderColor: '#27272a', backgroundColor: '#18181b', marginTop: 16 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00daf3' }} />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>LEADERBOARD</Text>
                  </View>
                  {/* Timer Badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
                    <Ionicons name="time-outline" size={12} color="#00daf3" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{secondsRemaining > 0 ? `${Math.floor(secondsRemaining / 86400)}d ${Math.floor((secondsRemaining % 86400) / 3600)}h ${Math.floor((secondsRemaining % 3600) / 60)}m` : "00d 00h 00m"}</Text>
                  </View>
                </View>

                {/* Top 3 Rankings */}
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
                        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: borderColor, backgroundColor: rankBgColor, alignItems: 'center', justifyContent: 'center' }}>
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
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 }}>
                            {item.wins} Wins
                          </Text>
                        </View>
                        <Text style={{ color: rank === 1 ? '#ffb84d' : '#fff', fontSize: 13, fontWeight: '900' }}>{prize} ETB</Text>
                      </View>
                    );
                  })}
                  {!loadingWeekly && weeklyLeaderboard.length === 0 && (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>
                      No rankings yet
                    </Text>
                  )}
                </View>

                {/* View Standings Button */}
                <TouchableOpacity
                  onPress={() => router.push('/(authed)/home/leaderboard' as any)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderWidth: 1,
                    borderColor: '#27272a',
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>VIEW FULL STANDINGS</Text>
                </TouchableOpacity>
              </View>

              {/* Stats & Progress Layout */}
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
                {/* Win Rate Card with Svg progress ring */}
                <View style={{ flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                    <Svg width={44} height={44} viewBox="0 0 44 44">
                      <Circle cx="22" cy="22" r="18" stroke="#27272a" strokeWidth="3.5" fill="transparent" />
                      <Circle
                        cx="22"
                        cy="22"
                        r="18"
                        stroke="#00daf3"
                        strokeWidth="3.5"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - winRate / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 22 22)"
                      />
                    </Svg>
                    <View style={{ position: 'absolute' }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{winRate}%</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>WIN RATE</Text>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 }}>{isEN ? "Active Stats" : "ንቁ አኃዝ"}</Text>
                  </View>
                </View>

                {/* Rank Card */}
                <View style={{ flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 218, 243, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.2)' }}>
                    <Ionicons name="trophy-outline" size={16} color="#00daf3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>RANK</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rankMeta.tone === 'platinum' ? '#00daf3' : (rankMeta.tone === 'gold' ? '#d4af37' : '#c0c0c0') }} />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{rankMeta.label}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Recently Winners Card */}
              <View style={[styles.glassCard, { padding: 24, borderRadius: 24, borderColor: '#27272a', backgroundColor: '#18181b', marginTop: 16 }]}>
                <View style={styles.txHeader}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{isEN ? "Recently Winners" : "የቅርብ ጊዜ አሸናፊዎች"}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 218, 243, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00daf3' }} />
                    <Text style={{ color: '#00daf3', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>LIVE</Text>
                  </View>
                </View>

                <ScrollView
                  style={{ maxHeight: 280 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 10, gap: 12, marginTop: 16 }}
                >
                  {rawTickerList.length === 0 ? (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20 }}>
                      {isEN ? "Waiting for live wins..." : "የቀጥታ ድሎችን በመጠባበቅ ላይ..."}
                    </Text>
                  ) : rawTickerList.map((tx, i) => {
                    const amount = Number(tx.amount || 0);
                    let emoji = '⚡';
                    let col = '#fd6f85';
                    let bg = 'rgba(253,111,133,0.1)';
                    if (amount >= 500) {
                      emoji = '👑';
                      col = '#ffb84d';
                      bg = 'rgba(255,184,77,0.1)';
                    } else if (amount >= 200) {
                      emoji = '🔥';
                      col = '#fb923c';
                      bg = 'rgba(251,146,60,0.1)';
                    } else if (amount >= 100) {
                      emoji = '🏆';
                      col = '#00daf3';
                      bg = 'rgba(0,218,243,0.1)';
                    }

                    return (
                      <View key={i} style={styles.txItem}>
                        <View style={[styles.txIcon, { backgroundColor: bg }]}>
                          <Text style={{ fontSize: 16 }}>{emoji}</Text>
                        </View>
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

        <WebDepositModal
          visible={depositVisible}
          onClose={() => setDepositVisible(false)}
          user={user}
          token={token || ""}
          onSuccess={refreshProfile}
          language={language}
        />
        <WebWithdrawModal
          visible={withdrawVisible}
          onClose={() => setWithdrawVisible(false)}
          user={user}
          token={token || ""}
          onSuccess={refreshProfile}
          language={language}
        />
        <ProfileEditModal
          visible={!user?.username}
          onClose={() => { }}
          initialUsername={user?.username}
          initialDisplayName={(user as any)?.display_name}
          initialAvatar={(user as any)?.avatar}
          onSaved={refreshProfile}
        />

        {/* Friend Match Modals — must be in desktop layout too */}
        <FriendMatchModal
          visible={friendModalVisible}
          onClose={() => { setFriendModalVisible(false); setInviteResult(null); }}
          onSendInvite={handleSendInvite}
          inviteResult={inviteResult}
        />
        <PromotionPopup config={promoConfig} visible={showPromo} onClose={() => setShowPromo(false)} />

        {/* PWA Install Instructions Modal */}
        <Modal
          visible={pwaModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPwaModalVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: '#0c0c1f',
              borderWidth: 1,
              borderColor: 'rgba(0,218,243,0.2)',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Install XOET Web App</Text>
                <TouchableOpacity onPress={() => setPwaModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              {/* Device specific instructions */}
              <View style={{ marginBottom: 24 }}>
                {Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent) ? (
                  // Telegram Browser Instructions
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Telegram Browser Detected:</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 }}>
                      Telegram's in-app browser has sandbox restrictions that prevent installing web apps or downloading files directly.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Tap the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>three dots</Text> at the top right of this screen.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Open in Browser"</Text> or <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Open in Chrome/Safari"</Text>.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>3</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Once opened in your system browser, click the download button again.
                      </Text>
                    </View>
                  </View>
                ) : Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  // iOS Safari Instructions
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Instructions for iOS Safari:</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Tap the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>Share</Text> button in Safari (box with an arrow pointing up at the bottom).
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Scroll down the share menu and select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add to Home Screen"</Text>.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>3</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Tap <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add"</Text> in the top right corner to complete installation.
                      </Text>
                    </View>
                  </View>
                ) : (
                  // Android / Desktop Instructions
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>How to Install:</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Open your browser's menu (three dots icon in Chrome) and select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add to Home Screen"</Text> or <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Install App"</Text>.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        On desktop, look for the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>Install icon</Text> in the browser address bar next to the URL.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Fallback to Android APK */}
              <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
                {Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent) ? (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Android Users (Via Telegram Channel)
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Linking.openURL('https://t.me/xoethiopia1').catch(() => { });
                      }}
                      style={{
                        backgroundColor: '#0088cc',
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Get APK from Channel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Android Users (Direct APK)
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Linking.openURL('https://xoethiopia.com/xoet.apk').catch(() => { });
                      }}
                      style={{
                        backgroundColor: '#ef4444',
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Download Android APK</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>

    );
  }

  // ── Mobile return ──
  return (
    <View style={styles.bg}>
      <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={[styles.blob, styles.blob1]} />
      <View pointerEvents="none" style={[styles.blob, styles.blob2]} />
      <View pointerEvents="none" style={[styles.blob, styles.blob3]} />

      {/* Blurry illustrative Tic-Tac-Toe game board in the background */}
      <View style={{
        position: 'absolute',
        top: '28%',
        left: '-15%',
        width: 320,
        height: 320,
        transform: [{ rotate: '-18deg' }, { scale: 1.25 }],
        opacity: 0.04, // Soft, premium visibility
        zIndex: 0,
        ...Platform.select({
          web: {
            filter: "blur(1.5px)",
          } as any,
        }),
      }} pointerEvents="none">
        {/* Horizontal lines */}
        <View style={{
          position: 'absolute', top: 106, left: 0, right: 0, height: 2.5, backgroundColor: '#a855f7',
          shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        <View style={{
          position: 'absolute', top: 213, left: 0, right: 0, height: 2.5, backgroundColor: '#a855f7',
          shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        {/* Vertical lines */}
        <View style={{
          position: 'absolute', left: 106, top: 0, bottom: 0, width: 2.5, backgroundColor: '#a855f7',
          shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        <View style={{
          position: 'absolute', left: 213, top: 0, bottom: 0, width: 2.5, backgroundColor: '#a855f7',
          shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />

        {/* Illustrative faded board moves */}
        <Text style={{
          position: 'absolute', top: 15, left: 25, fontSize: 52, fontWeight: '900', color: '#8b5cf6',
          textShadowColor: 'rgba(139, 92, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6
        }}>X</Text>
        <Text style={{
          position: 'absolute', top: 125, left: 135, fontSize: 52, fontWeight: '900', color: '#a855f7',
          textShadowColor: 'rgba(168, 85, 247, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6
        }}>O</Text>
        <Text style={{
          position: 'absolute', top: 235, left: 245, fontSize: 52, fontWeight: '900', color: '#8b5cf6',
          textShadowColor: 'rgba(139, 92, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6
        }}>X</Text>
      </View>

      <SafeAreaView style={styles.safe} edges={['left', 'right', 'top']}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerTop}>
              {/* Left Side: Avatar + Welcome back */}
              <TouchableOpacity
                onPress={() => goReplace("/(authed)/home/account")}
                activeOpacity={0.85}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <View style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.8)" />
                </View>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {isEN ? "WELCOME BACK" : "እንኳን ደህና መጡ"}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>
                    {user?.username || 'bina'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Right Side: APP, Language, Bell */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* APP Download Button (Bordered dark capsule) */}
                {!isPwaInstalled && (
                  <Animated.View style={{ transform: [{ scale: appPulseAnim }] }}>
                    <TouchableOpacity
                      onPress={handleAppDownload}
                      activeOpacity={0.85}
                      style={{
                        borderWidth: 1,
                        borderColor: deferredPrompt ? '#00daf3' : 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: deferredPrompt ? 'rgba(0, 218, 243, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        // Ambient glow shadow when installable
                        shadowColor: deferredPrompt ? '#00daf3' : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: deferredPrompt ? 0.6 : 0,
                        shadowRadius: deferredPrompt ? 8 : 0,
                      }}
                    >
                      <Ionicons name="cloud-download-outline" size={14} color={deferredPrompt ? "#00daf3" : "#fff"} />
                      <Text style={{ color: deferredPrompt ? "#00daf3" : "#fff", fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>APP</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Language button */}
                <TouchableOpacity
                  onPress={handleLanguageToggle}
                  activeOpacity={0.85}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)'
                  }}
                >
                  <Ionicons name="language" size={18} color="#fff" />
                </TouchableOpacity>

                {/* Notification Bell with Badge */}
                <TouchableOpacity
                  onPress={() => setNotificationsVisible(true)}
                  activeOpacity={0.85}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    position: 'relative'
                  }}
                >
                  <Ionicons name="notifications-outline" size={18} color="#fff" />
                  {unreadCount > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ef4444',
                      borderWidth: 1,
                      borderColor: '#000'
                    }} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Available Balance Card */}
            <LinearGradient
              colors={["rgba(20, 19, 26, 0.6)", "rgba(27, 26, 36, 0.6)"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.balanceCard, { borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }]}
            >
              {/* Huge X watermark in the background */}
              <Text style={{ position: 'absolute', right: 40, bottom: -45, fontSize: 140, fontWeight: '900', color: 'rgba(0,218,243,0.06)', transform: [{ rotate: '-12deg' }], zIndex: 0 }}>X</Text>

              <View style={[styles.balanceLeft, { zIndex: 1 }]}>
                <Text style={styles.balanceLabel}>{isEN ? "AVAILABLE BALANCE" : "ቀሪ ሂሳብ"}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={[styles.balanceValue, { fontSize: 32 }]}>
                    ETB {Math.floor(balance).toLocaleString()}
                  </Text>
                  {/* Purple dot next to the number */}
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00daf3', alignSelf: 'center', marginTop: 12 }} />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRefreshProfile}
                activeOpacity={0.85}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  overflow: 'hidden',
                  zIndex: 1
                }}
              >
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="reload" size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>
                    {isEN ? "Refresh" : "አድስ"}
                  </Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* Quick Actions Grid (Mobile) */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {/* Deposit */}
            <MobileQuickTile
              icon="arrow-down"
              iconColor="#60a5fa"
              title={isEN ? "Deposit" : "ማስገቢያ"}
              subtitle="TOP UP"
              onPress={() => Platform.OS === 'web' ? setDepositVisible(true) : router.push("/(authed)/deposit")}
            />
            {/* Withdraw */}
            <MobileQuickTile
              icon="arrow-up"
              iconColor="#eab308"
              title={isEN ? "Withdraw" : "ማውጫ"}
              subtitle="CASH OUT"
              onPress={() => Platform.OS === 'web' ? setWithdrawVisible(true) : router.push("/(authed)/withdraw")}
            />
            {/* Transactions */}
            <MobileQuickTile
              icon="swap-horizontal"
              iconColor="#00daf3"
              title={isEN ? "Transactions" : "ክፍያዎች"}
              subtitle="TRANSFERS"
              onPress={() => router.push("/(authed)/home/transactions")}
            />
          </View>

          {/* Gameplay Hub Card (Podium style) */}
          <View style={styles.mainCard}>
            <LinearGradient colors={["#14131A", "#1B1A24"]} style={StyleSheet.absoluteFill} />

            {/* Header: left brand circle icon, "GAMEPLAY HUB" title, "OUTPACE. OUTSMART. WIN!" subtitle, and a "Weekly" pill on the right. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Brand circle icon (XO matching actual brand logo) */}
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                }}>
                  <Image
                    source={require("../../../assets/images/adaptive-icon.png")}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
                <View>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 }}>
                    {isEN ? "GAMEPLAY HUB" : "የጨዋታ ማዕከል"}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' }}>
                    {isEN ? "OUTPACE. OUTSMART. WIN!" : "ፍጥነት። ብልሃት። ድል!"}
                  </Text>
                </View>
              </View>

              {/* Weekly Pill */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(255,255,255,0.03)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)'
              }}>
                <Ionicons name="trophy-outline" size={10} color="rgba(255,255,255,0.8)" />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                  {isEN ? "Weekly" : "ሳምንታዊ"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 10, width: '100%', paddingHorizontal: 10 }}>
              {renderPodiumSpot({ rank: 2, prize: 300, color: '#94a3b8', barH: 52, label: "2nd" })}
              {renderPodiumSpot({ rank: 1, prize: 500, color: '#f59e0b', barH: 72, label: "1st" })}
              {renderPodiumSpot({ rank: 3, prize: 200, color: '#c2410c', barH: 42, label: "3rd" })}
            </View>
            {renderUserRankCard()}

            {/* Play Now — disabled when banned, visible always */}
            <WebPressable
              onPress={isBanned ? undefined : openRoomSheet}
              disabled={isBanned}
              style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
                styles.playBtn,
                {
                  marginTop: 20,
                  borderRadius: 16,
                  overflow: 'hidden',
                  transform: [{ scale: hovered && !isBanned ? 1.02 : 1 }],
                  shadowColor: '#00daf3',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: hovered && !isBanned ? 0.5 : 0.35,
                  shadowRadius: 12,
                  transition: 'all 0.15s ease-in-out',
                }
              ]}
            >
              <LinearGradient
                colors={isBanned ? ['#3a2020', '#2a1515'] : ['#00daf3', '#00daf3']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.playInner}
              >
                <Ionicons name={isBanned ? "lock-closed" : "flash-outline"} size={20} color={isBanned ? "#fff" : "#000"} />
                <Text style={[styles.playText, { color: isBanned ? '#fff' : '#000' }]}>
                  {isBanned ? (isEN ? 'SUSPENDED' : 'ታግዷል') : t("play_now")}
                </Text>
              </LinearGradient>
            </WebPressable>
 
            {/* Friend Match Button Mobile */}
            <WebPressable
              onPress={() => setFriendModalVisible(true)}
              style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
                styles.playBtn,
                {
                  marginTop: 10,
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: '#3b82f6',
                  borderRadius: 16,
                  transform: [{ scale: hovered ? 1.02 : 1 }],
                  transition: 'all 0.15s ease-in-out',
                }
              ]}
            >
              <View style={styles.playInner}>
                <Ionicons name="people-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.playText, { color: '#fff' }]}>
                  {isEN ? 'PLAY WITH FRIEND' : 'ከጓደኛ ጋር ይጫወቱ'}
                </Text>
              </View>
            </WebPressable>

            {isBanned && (
              <Text style={{ color: 'rgba(253,111,133,0.6)', fontSize: 11, textAlign: 'center', marginTop: 6, fontWeight: '700', letterSpacing: 0.5 }}>
                {isEN ? 'Your account is suspended · Contact support' : 'መለያዎ ታግዷል · ድጋፍን ያነጋግሩ'}
              </Text>
            )}

            {/* Rules and info row */}
            <View style={styles.infoRow}>
              <InfoPill icon="shield-checkmark-outline" text={isEN ? "Anti-cheat" : "ፀረ-ማታለል"} />
              <InfoPill icon="timer-outline" text={isEN ? "Fast rounds" : "ፈጣን ዙር"} />
              <InfoPill icon="cash-outline" text={isEN ? "Instant pay" : "ፈጣን ክፍያ"} />
              <TouchableOpacity onPress={() => setRulesVisible(true)} style={{ flex: 1 }}>
                <InfoPill icon="book-outline" text={isEN ? "Rules" : "ህጎች"} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
        {!!user?.username && <WelcomeTermsPopup visible={termsVisible} onAgree={handleAgreeTerms} language={language} />}
        <BonusLogsModal visible={bonusModalVisible} onClose={() => setBonusModalVisible(false)} language={language} />
        <RulesModal visible={rulesVisible} onClose={() => setRulesVisible(false)} language={language} />

        {Platform.OS === 'web' && (
          <>
            <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
            <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
          </>
        )}
      </SafeAreaView>
      {exitModalVisible && <ExitModal language={language} onCancel={cancelExit} onConfirm={confirmExit} />}

      <FriendMatchModal
        visible={friendModalVisible}
        onClose={() => { setFriendModalVisible(false); setInviteResult(null); }}
        onSendInvite={handleSendInvite}
        inviteResult={inviteResult}
      />
      <IncomingInviteModal
        invite={incomingInvite}
        onAccept={() => handleInviteResponse(true)}
        onDecline={() => handleInviteResponse(false)}
      />
      {/* Global Rematch Popup — shows even when winner left game room */}
      <RematchTopPopup
        visible={!!globalRematchOffer?.visible}
        fromName={globalRematchOffer?.fromName}
        amount={globalRematchOffer?.amount}
        onAccept={handleGlobalRematchAccept}
        onDecline={handleGlobalRematchDecline}
      />

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
          isDesktop={false}
          userCaps={{ r1_10: (user as any)?.r1_10_wins, r1_25: (user as any)?.r1_25_wins, r1_50: (user as any)?.r1_50_wins, r1_99: (user as any)?.r1_99_wins, rooms_locked: appConfig.rooms_locked }}
        />
      )}

      {/* Notifications Popover */}
      <NotificationsPopover
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onUnreadCountChange={setUnreadCount}
      />

      {/* Live Wins Real-time Ticker (Mobile) */}
      {!isLargeScreen && currentWinAnnouncement && (
        <Animated.View style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 76 : 64, // connect to nav top exactly
          left: 0,
          right: 0,
          zIndex: 9998,
          height: 36,
          overflow: 'hidden',
          opacity: winTickerAnim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [0, 1, 0],
          }),
          transform: [{
            translateY: winTickerAnim.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [24, 0, -24],
            })
          }],
        }} pointerEvents="none">
          {/* Real-time Ticker Item - Left Aligned */}
          <View style={{ height: 36, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 24 }}>
            <Text style={{
              color: '#00daf3',
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0, 218, 243, 0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
              textAlign: 'left',
            }} numberOfLines={1}>
              {currentWinAnnouncement}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Collapsible Floating Action Toolbar (Mobile) */}
      {!isLargeScreen && (
        <View style={{
          position: 'absolute',
          bottom: 95,
          right: 24, // push to left parallel with headers
          width: 50, // explicit width to center absolute children horizontally
          zIndex: 9998,
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: 180,
        }} pointerEvents="box-none">

          {/* Expanded State Menu */}
          <Animated.View
            pointerEvents={floatingExpanded ? 'auto' : 'none'}
            style={{
              position: 'absolute',
              bottom: 0,
              alignSelf: 'center',
              backgroundColor: 'rgba(12, 12, 31, 0.85)',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              padding: 8,
              gap: 10,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
              opacity: floatingAnim,
              transform: [
                { scale: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }
              ]
            }}
          >
            {/* Mute/Unmute */}
            <TouchableOpacity
              onPress={handleToggleSound}
              activeOpacity={0.85}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: bgMusicPlaying ? 'rgba(16,185,129,0.92)' : 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: bgMusicPlaying ? '#10b981' : 'rgba(255,255,255,0.15)',
              }}
            >
              <Ionicons name={bgMusicPlaying ? "volume-high" : "volume-mute"} size={16} color="#fff" />
            </TouchableOpacity>

            {/* Gift/Bonus logs (Cohesive Brand Purple theme matching accent) */}
            <TouchableOpacity
              onPress={() => setBonusModalVisible(true)}
              activeOpacity={0.85}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(0, 218, 243, 0.92)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#00daf3',
              }}
            >
              <Ionicons name="gift" size={16} color="#0a0a0f" />
            </TouchableOpacity>

            {/* Close 'x' button to collapse */}
            <TouchableOpacity
              onPress={() => setFloatingExpanded(false)}
              activeOpacity={0.85}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          {/* Collapsed '+' button */}
          <Animated.View
            pointerEvents={floatingExpanded ? 'none' : 'auto'}
            style={{
              position: 'absolute',
              bottom: 0,
              alignSelf: 'center',
              opacity: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { scale: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) },
                { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }
              ]
            }}
          >
            <TouchableOpacity
              onPress={() => setFloatingExpanded(true)}
              activeOpacity={0.85}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                overflow: 'hidden',
                shadowColor: '#00daf3',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 6
              }}
            >
              <LinearGradient
                colors={["#00daf3", "#00daf3"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      <PromotionPopup config={promoConfig} visible={showPromo} onClose={() => setShowPromo(false)} />

      {/* PWA Install Instructions Modal */}
      <Modal
        visible={pwaModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPwaModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#0c0c1f',
            borderWidth: 1,
            borderColor: 'rgba(0,218,243,0.2)',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Install XOET Web App</Text>
              <TouchableOpacity onPress={() => setPwaModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {/* Device specific instructions */}
            <View style={{ marginBottom: 24 }}>
              {Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent) ? (
                // Telegram Browser Instructions
                <View style={{ gap: 12 }}>
                  <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Telegram Browser Detected:</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 }}>
                    Telegram's in-app browser has sandbox restrictions that prevent installing web apps or downloading files directly.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Tap the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>three dots</Text> at the top right of this screen.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Open in Browser"</Text> or <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Open in Chrome/Safari"</Text>.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>3</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Once opened in your system browser, click the download button again.
                    </Text>
                  </View>
                </View>
              ) : Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                // iOS Safari Instructions
                <View style={{ gap: 12 }}>
                  <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Instructions for iOS Safari:</Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Tap the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>Share</Text> button in Safari (box with an arrow pointing up at the bottom).
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Scroll down the share menu and select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add to Home Screen"</Text>.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>3</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Tap <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add"</Text> in the top right corner to complete installation.
                    </Text>
                  </View>
                </View>
              ) : (
                // Android / Desktop Instructions
                <View style={{ gap: 12 }}>
                  <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>How to Install:</Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      Open your browser's menu (three dots icon in Chrome) and select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add to Home Screen"</Text> or <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Install App"</Text>.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                      On desktop, look for the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>Install icon</Text> in the browser address bar next to the URL.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Fallback to Android APK */}
            <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
              {Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent) ? (
                <>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Android Users (Via Telegram Channel)
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Linking.openURL('https://t.me/xoethiopia1').catch(() => { });
                    }}
                    style={{
                      backgroundColor: '#0088cc',
                      borderRadius: 12,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Get APK from Channel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Android Users (Direct APK)
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Linking.openURL('https://xoethiopia.com/xoet.apk').catch(() => { });
                    }}
                    style={{
                      backgroundColor: '#ef4444',
                      borderRadius: 12,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Download Android APK</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  // base
  bg: { flex: 1, width: "100%", height: "100%" },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 14, paddingBottom: 18 },

  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050816" },
  bootText: { color: "rgba(255,255,255,0.8)", marginTop: 10, fontWeight: "700" },

  // blobs
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
  blob3: {
    top: "45%",
    left: "15%",
    backgroundColor: "#1b1a24", // Glowing Stealth Grey
    opacity: 0.08,
    width: 500,
    height: 500,
    borderRadius: 250,
  },

  // floating dots
  floatingLayer: { ...StyleSheet.absoluteFillObject },
  floatDot: {
    position: "absolute",
    backgroundColor: "#ffffff",
  },

  // header
  header: { marginTop: 6 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  brandIconInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  brandTitle: { color: "rgba(255,255,255,0.96)", fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  brandSub: { marginTop: 2, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600" },

  headerBtns: { flexDirection: "row", gap: 8 },
  pillOuter: { borderRadius: 14, overflow: "hidden" },
  pillInner: { height: 38, paddingHorizontal: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  balanceCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a", // sleek NextUI border
    backgroundColor: "rgba(24,24,27,0.7)", // dark slate surface base
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabel: { color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "800" },
  balanceValue: { marginTop: 4, color: "rgba(255,255,255,0.98)", fontSize: 22, fontWeight: "900" },

  refreshInner: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  refreshText: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 12 },

  balanceLeft: { flex: 1 },
  refreshBtn: { borderRadius: 16, overflow: "hidden" },
  quickScroll: { paddingVertical: 12, paddingHorizontal: 4, gap: 10 },
  quickGrid: { flexDirection: 'row', gap: 10 },

  // Quick Tile
  tile: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a', backgroundColor: 'rgba(24,24,27,0.5)' },
  tileIcon: { padding: 12, alignItems: 'flex-start' },
  tileIconInner: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileTextWrap: { paddingHorizontal: 12, paddingBottom: 14 },
  tileTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  tileSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // Mobile Main Card Styles
  mainCard: {
    marginTop: 12,
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#18181b",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  logo: { width: "100%", height: "100%" },
  heroTitle: { color: "rgba(255,255,255,0.96)", fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  heroSub: { marginTop: 4, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600", lineHeight: 16 },
  boardWrap: {
    marginTop: 14,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: 'center',
    justifyContent: 'center'
  },
  board: { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" },
  boardRow: { flexDirection: "row" },
  cell: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  oText: { color: "#22D3EE" },
  xText: { color: "#FB7185" },

  playBtn: { marginTop: 14, borderRadius: 18, overflow: "hidden" },
  playInner: { paddingVertical: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  playText: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.2 },
  infoRow: { marginTop: 12, flexDirection: "row", flexWrap: "nowrap", gap: 6 },
  infoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  infoText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 0,
  },

  // Modern Desktop Grid Layout
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexShrink: 1,
  },
  desktopColLeft: {
    width: 280,
    gap: 16,
  },
  desktopColCenter: {
    flex: 1,
    minWidth: 0,
  },
  desktopColRight: {
    width: 260,
    gap: 12,
  },

  // Welcome Card
  desktopWelcomeCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  desktopWelcomeGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.06)',
  },
  desktopWelcomeContent: { marginBottom: 16 },
  desktopWelcomeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  desktopWelcomeSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  desktopBalanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.1)',
  },
  desktopBalanceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Stats Row
  desktopStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  desktopStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  desktopStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  desktopStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  desktopStatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bonusBadgeWeb: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bonusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  bonusBadgeText: {
    color: '#0B0B0F',
    fontSize: 11,
    fontWeight: '900',
  },

  // Activity Card
  desktopActivityCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  desktopActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  desktopActivityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopActivityText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopActivityTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Arena
  desktopArena: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  desktopArenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
  },
  desktopArenaTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  desktopArenaSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  desktopArenaLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  desktopLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  desktopLiveText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  desktopBoardWrap: {
    marginHorizontal: 28,
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  desktopPlayBtn: {
    marginTop: 20,
    marginHorizontal: 28,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  desktopPlayBtnInner: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  desktopPlayBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  desktopOnlineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    paddingBottom: 24,
  },
  desktopOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  desktopOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  desktopOnlineText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },

  // Room Cards (Desktop)
  desktopRoomCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  desktopRoomInner: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desktopRoomInfo: { flex: 1 },
  desktopRoomTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  desktopRoomMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  desktopRoomBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  desktopRoomBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  desktopRoomBadgeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Quick Deposit
  desktopQuickDeposit: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  desktopQuickDepositInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.1)',
  },
  desktopQuickDepositText: {
    flex: 1,
    color: '#00daf3',
    fontSize: 13,
    fontWeight: '800',
  },

  desktopSectionTitle: {
    color: 'rgba(167,139,250,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  searchOrbWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00daf3',
  },
  searchRings: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRing: {
    padding: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fff',
    position: 'absolute',
  },
  searchScanner: {
    position: 'absolute',
    width: 300,
    height: 300,
  },
  searchLine: {
    position: 'absolute',
    top: 0,
    left: 150,
    width: 2,
    height: 150,
    backgroundColor: 'rgba(166,139,255,0.4)',
  },
  searchDot: {
    position: 'absolute',
    top: -4,
    left: 147,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  searchAvatarWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAvatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#00daf3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#00daf3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  searchBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  searchStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 48,
    width: '100%',
    paddingHorizontal: 20,
  },
  searchStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchStatLabel: {
    color: 'rgba(229,227,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchCancelBtn: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(253,111,133,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(253,111,133,0.2)',
  },
  searchCancelText: {
    color: '#fd6f85',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  searchQuickNote: {
    marginTop: 40,
    backgroundColor: 'rgba(166,139,255,0.05)',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(166,139,255,0.1)',
  },
  searchNoteIcon: {
    marginTop: 2,
  },
  searchNoteText: {
    flex: 1,
    color: 'rgba(229,227,255,0.5)',
    fontSize: 12,
    lineHeight: 18,
  },
  txRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  txText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statPillText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 13,
  },

  // Neon Abyss Layout
  boardBgGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,12,31,0.5)',
    borderRadius: 40,
  },
  neonHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  neonTitle: {
    color: '#e5e3ff',
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 28,
  },

  neonSubTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  boardContainer: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(4,4,12,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    marginBottom: 40,
  },
  neonBoard: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 8,
  },
  neonBoardRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  neonCell: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 54,
    fontWeight: '900',
  },
  neonOText: {
    color: '#00f0ff',
    textShadowColor: 'rgba(0, 240, 255, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  neonXText: {
    color: '#ff2d55',
    textShadowColor: 'rgba(255, 45, 85, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  neonCtaOuter: {
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  neonCtaInner: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // modal / sheet
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  exitSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
    paddingBottom: 18,
  },
  exitHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  exitIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exitTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  exitSub: { marginTop: 2, color: "rgba(255,255,255,0.60)", fontSize: 12, fontWeight: "600" },

  exitActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  exitGhost: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  exitGhostText: { color: "rgba(255,255,255,0.88)", fontWeight: "900" },
  exitDanger: { flex: 1, borderRadius: 16, overflow: "hidden" },
  exitDangerInner: { paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  exitDangerText: { color: "#fff", fontWeight: "900" },

  // Sheets & Modals
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

  amountBox: {
    width: "47%",
    aspectRatio: 1.4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  amountBoxSelected: {
    backgroundColor: "rgba(166,139,255,0.12)",
    borderColor: "rgba(166,139,255,0.5)",
  },
  amountBoxContent: {
    alignItems: 'center',
    gap: 6,
  },
  amountVal: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  amountCommission: {
    color: "rgba(255,255,255,0.3)",
    fontWeight: "800",
    fontSize: 10,
    textTransform: 'uppercase',
  },
  capNote: {
    color: '#fd6f85',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
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
  balanceNote: {
    marginTop: 16,
    alignItems: 'center',
  },
  balanceNoteText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── Desktop Hub Styles ───
  desktopHubRoot: { flex: 1, backgroundColor: 'transparent' },
  hubDesktopGrid: { flexDirection: 'row', gap: 24, maxWidth: 1240, alignSelf: 'center', width: '100%', paddingHorizontal: 24, marginTop: 24 },
  desktopMainCol: { flex: 8, gap: 16 },
  desktopSideCol: { flex: 4, gap: 16 },

  // Glass Panel
  glassCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.75)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.6)',
    padding: 40,
    overflow: 'hidden',
  },

  // Gameplay Hub Specifics
  hubTitle: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 10, textAlign: 'center' },
  hubSub: { color: 'rgba(229, 227, 255, 0.5)', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 44 },

  hubBoardContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  playNowBtn: { marginTop: 24, borderRadius: 22, overflow: 'hidden', shadowColor: '#00daf3', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 28, alignSelf: 'center', width: 280 },
  playNowInner: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  playNowText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },

  // Bento Stats
  statsBento: { flexDirection: 'row', gap: 24 },
  bentoCard: { flex: 1, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderRadius: 28, padding: 28, flexDirection: 'row', alignItems: 'center', gap: 24, borderWidth: 1, borderColor: '#27272a' },
  bentoIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bentoLabel: { color: 'rgba(0, 218, 243, 0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  bentoValue: { color: '#fff', fontSize: 28, fontWeight: '900' },

  // Account Card
  accountCard: { padding: 32 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  accountTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  accountLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountValue: { color: '#fff', fontWeight: '800', fontSize: 15 },
  verifiedPill: { backgroundColor: 'rgba(0,218,243,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)' },
  verifiedText: { color: '#00daf3', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },

  // Quick Actions
  actionGrid: { flexDirection: 'row', gap: 14, marginTop: 12 },
  actionBtn: { flex: 1, height: 90, borderRadius: 22, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderWidth: 1, borderColor: '#27272a', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quick Stats
  quickStats: { marginTop: 36, paddingTop: 36, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  quickStatsTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 18 },
  quickStatsRow: { flexDirection: 'row', gap: 36 },
  quickStatItem: { flex: 1 },
  quickStatVal: { color: '#fff', fontSize: 30, fontWeight: '900' },
  quickStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginTop: 6 },

  // Transactions
  txPanel: { padding: 32 },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  txList: { gap: 18 },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(24, 24, 27, 0.4)', padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  txIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txMain: { flex: 1 },
  txLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
  txTime: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 3 },
  txAmount: { fontSize: 16, fontWeight: '900' },

  // Bonus Logs UI
  bonusPillInline: { marginLeft: 8, borderRadius: 8, overflow: 'hidden' },
  bonusPillGradient: { paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  bonusPillText: { color: '#0B0B0F', fontSize: 11, fontWeight: '900' },
  bonusSheet: {
    backgroundColor: '#121226',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bonusSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  bonusHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  bonusIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bonusSheetTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  bonusSheetSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  bonusCloseBtn: { padding: 8 },
  bonusList: { flex: 1 },
  emptyBonus: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBonusText: { color: 'rgba(255,255,255,0.3)', marginTop: 12, fontWeight: '700', fontSize: 13 },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  bonusItemLeft: { flex: 1 },
  bonusItemReason: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bonusItemDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, fontWeight: '600' },
  bonusItemAmount: { color: '#00daf3', fontSize: 15, fontWeight: '900' },
  bonusDoneBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  bonusDoneInner: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  bonusDoneText: { color: '#fff', fontWeight: '900', letterSpacing: 1.5 },

  // Promo Code
  promoInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,24,27,0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingLeft: 16,
    paddingRight: 6,
    height: 54,
    marginBottom: 8,
  },
  promoInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  promoBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoHint: {
    color: 'rgba(0,218,243,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
});

// Removed local BonusLogsModal, using imported version.

async function sendGeezSMS({ userId, phone, message }: { userId: string; phone: string; message: string }) {
  // logic here
}



