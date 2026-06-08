// app/(authed)/landing.tsx
import { API_URL } from "../../../config";
import ProfileEditModal from "../../../components/ProfileEditModal";
import WelcomeTermsPopup from "../../../components/WelcomeTermsPopup";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import BonusLogsModal from "../../../components/BonusLogsModal";
import ReferralModal from "../../../components/ReferralModal";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
  amountOptions: { amount: number; colors: [string, string] }[];
};

const ROOMS: RoomConfig[] = [
  {
    id: "R1",
    rangeLabel: "10-99",
    titleEn: "Room 1",
    titleAm: "ክፍል 1",
    cut: 20,
    time: 30,
    colors: ["#10b981", "#059669"], // Vibrant Green
    amountOptions: [
      { amount: 10, colors: ["#10b981", "#059669"] },
      { amount: 25, colors: ["#10b981", "#059669"] },
      { amount: 50, colors: ["#10b981", "#059669"] },
      { amount: 99, colors: ["#10b981", "#059669"] },
    ],
  },
  {
    id: "R2",
    rangeLabel: "100-999",
    titleEn: "Room 2",
    titleAm: "ክፍል 2",
    cut: 15,
    time: 30,
    colors: ["#3b82f6", "#2563eb"], // Vibrant Blue
    amountOptions: [
      { amount: 100, colors: ["#3b82f6", "#2563eb"] },
      { amount: 250, colors: ["#3b82f6", "#2563eb"] },
      { amount: 500, colors: ["#3b82f6", "#2563eb"] },
      { amount: 999, colors: ["#3b82f6", "#2563eb"] },
    ],
  },
  {
    id: "R3",
    rangeLabel: "1000-10000",
    titleEn: "Room 3",
    titleAm: "ክፍል 3",
    cut: 10,
    time: 30,
    colors: ["#06b6d4", "#0891b2"], // Cyan/Teal
    amountOptions: [
      { amount: 1000, colors: ["#06b6d4", "#0891b2"] },
      { amount: 2500, colors: ["#06b6d4", "#0891b2"] },
      { amount: 5000, colors: ["#06b6d4", "#0891b2"] },
      { amount: 7500, colors: ["#06b6d4", "#0891b2"] },
      { amount: 10000, colors: ["#06b6d4", "#0891b2"] },
    ],
  },
];


type SheetStep = "ROOMS" | "AMOUNTS";
type FloatDot = { top: number; left: number; opacity: number };

function buildFloatingDots(width: number): FloatDot[] {
  const dots: FloatDot[] = [];
  for (let i = 0; i < 6; i++) {
    dots.push({
      top: 40 + ((i * 70) % 320),
      left: (i * 90) % (width - 40),
      opacity: 0.07 + (i % 3) * 0.04,
    });
  }
  return dots;
}


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
        {/* Single simple pulse for visual feedback without being heavy */}
        <Animated.View style={{
          position: 'absolute',
          width: 200, height: 200, borderRadius: 100,
          borderWidth: 2, borderColor: 'rgba(129,236,255,0.1)',
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }],
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })
        }} />
        
        <LinearGradient colors={isMatched ? ['#10b981', '#059669'] : ['#81ecff', '#a68cff']} style={{ 
          width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
          shadowColor: '#81ecff', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
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
  onSelectAmount: (room: RoomConfig, amount: number) => void;
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
      onSelectAmount(selectedRoom, localAmount);
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sheetTitle}>{isEN ? `${selectedRoom.titleEn} amount` : `${selectedRoom.titleAm} መጠን`}</Text>
                <Text style={styles.sheetSubTitle}>Fee {selectedRoom.cut}% • {selectedRoom.time}s</Text>
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
              {ROOMS.map((room) => {
                const isR1 = room.id === "R1";
                const r1Locked = isR1 && ((userCaps?.r1_10||0)>=25 && (userCaps?.r1_25||0)>=25 && (userCaps?.r1_50||0)>=25 && (userCaps?.r1_99||0)>=25);
                return (
                  <TouchableOpacity 
                    key={room.id} 
                    activeOpacity={0.88} 
                    disabled={r1Locked} 
                    onPress={() => onSelectRoom(room.id)} 
                    style={[styles.roomBtn, r1Locked && { opacity: 0.4 }]}
                  >
                    <LinearGradient colors={r1Locked ? ['#444', '#222'] : room.colors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.roomInner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{isEN ? room.titleEn : room.titleAm} {r1Locked && "(MAXED)"}</Text>
                        <Text style={styles.roomDetail}>
                          {isEN ? `ETB ${room.rangeLabel} • ${room.cut}% fee • ${room.time}s` : `ETB ${room.rangeLabel} • ${room.cut}% ክፍያ • ${room.time} ሰ`}
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
                  if (selectedRoom.id === "R1") {
                    if (opt.amount === 10) capReached = (userCaps?.r1_10 || 0) >= 25;
                    if (opt.amount === 25) capReached = (userCaps?.r1_25 || 0) >= 25;
                    if (opt.amount === 50) capReached = (userCaps?.r1_50 || 0) >= 25;
                    if (opt.amount === 99) capReached = (userCaps?.r1_99 || 0) >= 25;
                  }
                  const disabled = (balance < opt.amount) || capReached;
                  const isSelected = localAmount === opt.amount;
                  const pillColors = disabled
                    ? ['rgba(60,60,80,0.6)', 'rgba(40,40,60,0.4)'] as [string, string]
                    : opt.colors as [string, string];

                  return (
                    <Pressable
                      key={opt.amount}
                      disabled={disabled}
                      onPress={() => isDesktop ? setLocalAmount(opt.amount) : onSelectAmount(selectedRoom, opt.amount)}
                      style={({ pressed }) => [
                        { width: '48%', marginBottom: 12, borderRadius: 16, overflow: 'hidden', opacity: disabled ? 0.45 : 1 },
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
                          paddingVertical: 16,
                          paddingHorizontal: 20,
                          borderRadius: 16,
                          borderWidth: isSelected ? 2 : 0,
                          borderColor: isSelected ? '#fff' : 'transparent',
                        }}
                      >
                        <View>
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 0.3 }}>
                            ETB {opt.amount.toLocaleString()}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                            Fee {selectedRoom.cut}% • {selectedRoom.time}s
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
                      colors={localAmount !== null ? ['#a68cff', '#7c4dff'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
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

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;
  const { ensureConnected, findMatch, cancelFind, isSearching, onMessage } = useSocket();
  const { user, token, booting, refreshProfile, language, switchLanguage, t, showAlert } = useAuth();
  const { isPlaying: bgMusicPlaying, toggleMusic } = useBackgroundMusic();
  const isEN = language === "en";
  const isBanned = !!(user as any)?.banned;
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, totalBonusEarned: 0 });
  const [showReferralModal, setShowReferralModal] = useState(false);
  const toast = useToast();

  const [appConfig, setAppConfig] = useState<{ referral_enabled?: boolean }>({});
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/account/config`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setAppConfig(data))
        .catch(() => {});
    }
  }, [token]);

  const params = useLocalSearchParams();

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
        refreshProfile().catch(() => {});
      }
    }, [token, refreshProfile])
  );

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
      } catch {}
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
    } catch {}
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
              opponentAvatar: opponentAvatar || "",
              amount: String(bkAmount || 10),
              time: String(timerDuration || 30),
              _k: String(Date.now()),
            },
          } as any);
        }
      } catch {}
    });
    return () => {
      try { off(); } catch {}
    };
  }, [isLargeScreen, onMessage, router]);

  // Poll profile every 30s while banned so the UI auto-recovers when admin unbans
  useEffect(() => {
    if (!isBanned) return;
    const timer = setInterval(() => { refreshProfile().catch(() => {}); }, 30_000);
    return () => clearInterval(timer);
  }, [isBanned, refreshProfile]);

  // ---------- sound (click only — background managed by BackgroundMusicProvider) ----------
  const clickSound = useAudioPlayer(require("../../../assets/sounds/click.wav"));

  const playClick = useCallback(async () => {
    if (!bgMusicPlaying) return;
    try {
      clickSound.play();
    } catch {}
  }, [bgMusicPlaying, clickSound]);

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
    async (room: RoomConfig, amount: number) => {
      haptics.tap();
      await playClick();
      if (Number.isFinite(balance) && balance < amount) {
        haptics.warning();
        toast.warning(
          isEN ? "Insufficient Balance" : "በቂ ሂሳብ የለም",
          isEN ? `You need at least ETB ${amount} to play. Deposit more funds.` : `ለመጫወት ቢያንስ ETB ${amount} ያስፈልጋል። ተጨማሪ ገንዘብ ያስገቡ።`
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
              amount: String(amount),
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
              amount: String(amount),
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

  const floatDots = useMemo(() => buildFloatingDots(width), [width]);

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.bootText}>{t("loading")}</Text>
      </View>
    );
  }

  if (isLargeScreen) {
    return (
      <View style={styles.desktopHubRoot}>
        {/* Modals & Profile */}
        <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <ProfileEditModal visible={!user?.username} onClose={() => {}} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />
        
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
            userCaps={{ r1_10: (user as any)?.r1_10_wins, r1_25: (user as any)?.r1_25_wins, r1_50: (user as any)?.r1_50_wins, r1_99: (user as any)?.r1_99_wins }}
          />
        )}

        {/* Ambient Glows */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', top: -100, left: -100, width: 600, height: 600, borderRadius: 300, backgroundColor: 'rgba(124, 77, 255, 0.04)' }} />
          <View style={{ position: 'absolute', bottom: -100, right: -100, width: 600, height: 600, borderRadius: 300, backgroundColor: 'rgba(0, 218, 243, 0.04)' }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.hubDesktopGrid, isTablet && { flexDirection: 'column', gap: 40 }]}>
            
            {/* ── LEFT COLUMN (8/12) ── */}
            <View style={styles.desktopMainCol}>
              <View style={styles.glassCard}>
                {/* Background Blobs inside card */}
                <View style={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(166,140,255,0.05)' }} />
                <View style={{ position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(0,218,243,0.05)' }} />

                <View style={{ zIndex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={styles.hubTitle}>{isEN ? "GAMEPLAY HUB" : "የጨዋታ ማዕከል"}</Text>
                    {Number(user?.bonus_balance || 0) > 0 && (
                      <TouchableOpacity onPress={() => setBonusModalVisible(true)} style={styles.bonusBadgeWeb}>
                        <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.bonusBadgeGradient}>
                          <Ionicons name="gift" size={12} color="#0B0B0F" />
                          <Text style={styles.bonusBadgeText}>+{Number(user?.bonus_balance || 0)} {isEN ? "BONUS" : "ቦነስ"}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.hubSub}>{isEN ? "OUTPACE. OUTSMART. WIN!" : "ፍጥነት። ብልሃት። ድል!"}</Text>

                  <View style={styles.hubBoardContainer}>
                    <BoardDemo isDesktop={true} />
                  </View>

                  {/* Play Now — disabled when banned or searching */}
                  <TouchableOpacity
                    onPress={isBanned || isSearching ? undefined : openRoomSheet}
                    disabled={isBanned || isSearching}
                    style={[styles.playNowBtn, (isBanned || isSearching) && { opacity: 0.45 }]}
                    activeOpacity={(isBanned || isSearching) ? 1 : 0.85}
                  >
                    <LinearGradient
                      colors={isBanned ? ['#3a2020', '#2a1515'] : ['#a68cff', '#7c4dff']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.playNowInner}
                    >
                      {isBanned && <Ionicons name="lock-closed" size={15} color="#fd6f85" style={{ marginRight: 6 }} />}
                      {isSearching && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />}
                      <Text style={[styles.playNowText, isBanned && { color: '#fd6f85' }]}>
                        {isBanned 
                          ? (isEN ? 'SUSPENDED' : 'ታግዷል') 
                          : isSearching 
                            ? (isEN ? 'SEARCHING...' : 'እየፈለገ ነው...') 
                            : (isEN ? 'PLAY NOW' : 'አሁኑኑ ይጫወቱ')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {isBanned && (
                    <Text style={{ color: 'rgba(253,111,133,0.6)', fontSize: 11, textAlign: 'center', marginTop: 8, fontWeight: '700', letterSpacing: 0.5 }}>
                      {isEN ? 'Your account is suspended · Contact support' : 'መለያዎ ታግዷል · ድጋፍን ያነጋግሩ'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.statsBento}>
                <View style={styles.bentoCard}>
                  <View style={[styles.bentoIcon, { backgroundColor: 'rgba(0,218,243,0.1)', borderColor: 'rgba(0,218,243,0.2)' }]}>
                    <Ionicons name="trending-up" size={24} color="#00daf3" />
                  </View>
                  <View>
                    <Text style={styles.bentoLabel}>{isEN ? "Win Rate" : "የድል መጠን"}</Text>

                    <Text style={styles.bentoValue}>{winRate}%</Text>
                  </View>
                </View>
                <View style={styles.bentoCard}>
                  <View style={[styles.bentoIcon, { backgroundColor: 'rgba(255,81,250,0.1)', borderColor: 'rgba(255,81,250,0.2)' }]}>
                    <Ionicons name={rankMeta.icon} size={24} color="#ff51fa" />
                  </View>
                  <View>
                    <Text style={styles.bentoLabel}>{isEN ? "Current Rank" : "የአሁኑ ደረጃ"}</Text>

                    <Text style={styles.bentoValue}>{rankMeta.label}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── RIGHT COLUMN (4/12) ── */}
            <View style={styles.desktopSideCol}>
              {/* Profile Panel */}
              <View style={[styles.glassCard, styles.accountCard]}>
                <View style={styles.accountHeader}>
                  <Text style={styles.accountTitle}>{isEN ? "Account Profile" : "የመለያ መገለጫ"}</Text>

                  <TouchableOpacity onPress={() => router.push('/(authed)/home/account' as any)}>
                    <Ionicons name="create-outline" size={20} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>

                <View style={styles.accountRow}>
                  <View style={styles.accountLabel}>
                    <Ionicons name="person-outline" size={16} color="#a68cff" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>{isEN ? "Username" : "የተጠቃሚ ስም"}</Text>
                  </View>

                  <Text style={styles.accountValue}>{user?.username || 'NeonPlayer_01'}</Text>
                </View>

                <View style={styles.accountRow}>
                  <View style={styles.accountLabel}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#a68cff" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>{isEN ? "Status" : "ሁኔታ"}</Text>
                  </View>

                  {isBanned ? (
                    <View style={[styles.verifiedPill, { backgroundColor: 'rgba(253,111,133,0.1)', borderColor: 'rgba(253,111,133,0.3)' }]}>
                      <Ionicons name="ban" size={10} color="#fd6f85" />
                      <Text style={[styles.verifiedText, { color: '#fd6f85' }]}>{isEN ? "BANNED" : "ታግዷል"}</Text>
                    </View>

                  ) : (
                    <View style={styles.verifiedPill}>
                      <Text style={styles.verifiedText}>{isEN ? "Verified" : "ተረጋግጧል"}</Text>
                    </View>

                  )}
                </View>

                <View style={styles.accountRow}>
                  <View style={styles.accountLabel}>
                    <Ionicons name="mail-outline" size={16} color="#a68cff" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>{isEN ? "Phone" : "ስልክ"}</Text>
                  </View>

                  <Text style={[styles.accountValue, { color: 'rgba(229,227,255,0.5)' }]}>{user?.number || '—'}</Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity onPress={() => setDepositVisible(true)} style={styles.actionBtn}>
                    <Ionicons name="add-circle-outline" size={24} color="#a68cff" />
                    <Text style={styles.actionLabel}>Deposit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setWithdrawVisible(true)} style={styles.actionBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#fd6f85" />
                    <Text style={[styles.actionLabel, { color: '#fd6f85' }]}>Withdraw</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(authed)/games' as any)} style={styles.actionBtn}>
                    <Ionicons name="receipt-outline" size={24} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.actionLabel}>{isEN ? "History" : "ታሪክ"}</Text>
                  </TouchableOpacity>
                  {appConfig?.referral_enabled !== false && (
                    <TouchableOpacity onPress={() => setShowReferralModal(true)} style={styles.actionBtn}>
                      <Ionicons name="share-social-outline" size={24} color="#10b981" />
                      <Text style={[styles.actionLabel, { color: '#10b981' }]}>{isEN ? "Share" : "አጋራ"}</Text>
                    </TouchableOpacity>
                  )}

                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <Text style={styles.quickStatsTitle}>{isEN ? "QUICK STATS" : "ፈጣን መረጃዎች"}</Text>
                  <View style={styles.quickStatsRow}>

                    <View style={styles.quickStatItem}>
                      <Text style={styles.quickStatVal}>{gamesPlayed}</Text>
                      <Text style={styles.quickStatLabel}>{isEN ? "Games Played" : "የተጫወቱት ጨዋታዎች"}</Text>
                    </View>

                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatVal, { color: '#00daf3' }]}>{wins}</Text>
                      <Text style={styles.quickStatLabel}>{isEN ? "Total Wins" : "አጠቃላይ ድሎች"}</Text>
                    </View>

                  </View>
                </View>
              </View>

              {/* Transactions Panel */}
              <View style={[styles.glassCard, styles.txPanel]}>
                <View style={styles.txHeader}>
                  <Text style={styles.accountTitle}>{isEN ? "Game Matches" : "የጨዋታ ታሪክ"}</Text>
                  <TouchableOpacity onPress={() => router.push('/(authed)/games' as any)}>

                    <Text style={{ color: '#a68cff', fontSize: 11, fontWeight: '800' }}>{isEN ? "VIEW ALL" : "ሁሉንም ይመልከቱ"}</Text>

                  </TouchableOpacity>
                </View>

                  <ScrollView 
                    style={{ maxHeight: 400 }} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 10 }}
                  >
                    {txHistory.length === 0 ? (
                      <Text style={{color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20}}>{isEN ? "No recent activity" : "በቅርብ ጊዜ ምንም እንቅስቃሴ የለም"}</Text>
                    ) : txHistory.map((tx, i) => {

                      const isWin = tx.winner === user?.id;
                      const isDraw = tx.status === 'draw';
                      const amount = Number(tx.bet_amount || 0);
                      const title = isDraw ? (isEN ? 'Match Draw' : 'ማነጻጸር') : (isWin ? (isEN ? 'Match Won' : 'አሸንፈዋል') : (isEN ? 'Match Lost' : 'ተሸንፈዋል'));
                      const multiplier = amount < 100 ? 1.6 : (amount < 1000 ? 1.7 : 1.8);
                      const amt = isDraw ? 'ETB 0' : (isWin ? `+${amount * multiplier}` : `-${amount}`);
                      const col = isDraw ? '#94a3b8' : (isWin ? '#00daf3' : '#fd6f85');

                      const bg = isDraw ? 'rgba(148,163,184,0.1)' : (isWin ? 'rgba(0,218,243,0.1)' : 'rgba(253,111,133,0.1)');
                      const d = new Date(tx.created_at);
                      const timeStr = d.toLocaleDateString(undefined, {month:'short', day:'numeric'}) + ", " + d.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
                      
                      return (
                        <View key={i} style={styles.txItem}>
                          <View style={[styles.txIcon, { backgroundColor: bg }]}>
                            <Ionicons name={isDraw ? 'git-compare' : (isWin ? 'trophy' : 'flash') as any} size={18} color={col} />
                          </View>
                          <View style={styles.txMain}>
                            <Text style={styles.txLabel}>{title}</Text>
                            <Text style={styles.txTime}>{timeStr}</Text>
                          </View>
                          <Text style={[styles.txAmount, { color: col }]}>{amt}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>

              </View>
            </View>

          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
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
          onClose={() => {}}
          initialUsername={user?.username}
          initialDisplayName={(user as any)?.display_name}
          initialAvatar={(user as any)?.avatar}
          onSaved={refreshProfile}
        />
      </View>

    );
  }

  // ── Mobile return ──
  return (
    <View style={styles.bg}>
      <LinearGradient colors={["#0c0c1f", "#1e1e40", "#0c0c1f"]} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={[styles.blob, styles.blob1]} />
      <View pointerEvents="none" style={[styles.blob, styles.blob2]} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'top']}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.floatingLayer} pointerEvents="none">
            {floatDots.map((d, i) => (
              <View key={i} style={[styles.floatDot, { top: d.top, left: d.left, opacity: d.opacity }]} />
            ))}
          </View>
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerTop}>
              <View style={styles.brand}>
                <Image source={require("../../../assets/images/icon.jpg")} style={{ width: 80, height: 32, resizeMode: 'contain' }} />
                <View style={{ marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {hasBonus && (
                      <View style={{ backgroundColor: 'rgba(0,218,243,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)' }}>
                        <Text style={{ color: '#00daf3', fontSize: 9, fontWeight: '900' }}>{isEN ? "BONUS" : "ቦነስ"}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.brandSub}>{isEN ? "Fast matchmaking •" : "ፈጣን ማጣመር •"}</Text>
                </View>
              </View>
              <View style={styles.headerBtns}>
                <HeaderPill onPress={handleLanguageToggle} icon="language-outline" text={language === "en" ? "አማ" : "EN"} gradient={["rgba(124,58,237,0.95)", "rgba(79,70,229,0.85)"]} />
                <HeaderPill onPress={handleToggleSound} icon={bgMusicPlaying ? "volume-high-outline" : "volume-mute-outline"} gradient={bgMusicPlaying ? ["rgba(16,185,129,0.95)", "rgba(5,150,105,0.85)"] : ["rgba(148,163,184,0.28)", "rgba(148,163,184,0.14)"]} />
                <HeaderPill onPress={() => goReplace("/(authed)/home/account")} icon="person-outline" gradient={["rgba(59,130,246,0.95)", "rgba(29,78,216,0.85)"]} />
              </View>
            </View>
            <View style={styles.balanceCard}>
              <LinearGradient colors={["rgba(10,12,28,0.50)", "rgba(10,12,28,0.28)"]} style={StyleSheet.absoluteFill} />
              <View style={styles.balanceLeft}>
                <Text style={styles.balanceLabel}>{t("balance")}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.balanceValue}>ETB {balance.toLocaleString()}</Text>
                  {hasBonus && (
                    <TouchableOpacity onPress={() => setBonusModalVisible(true)} style={styles.bonusPillInline}>
                      <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.bonusPillGradient}>
                        <Ionicons name="gift" size={10} color="#0B0B0F" />
                        <Text style={styles.bonusPillText}>+{Number(user?.bonus_balance || 0)}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={handleRefreshProfile} style={styles.refreshBtn} activeOpacity={0.85}>
                <LinearGradient colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.06)"]} style={styles.refreshInner}>
                  <Ionicons name="reload-outline" size={16} color="rgba(255,255,255,0.92)" />
                   <Text style={styles.refreshText}>{isEN ? "Refresh" : "አድስ"}</Text>

                </LinearGradient>
              </TouchableOpacity>
            </View>

          </Animated.View>
          <View style={styles.quickGrid}>
            <QuickTile 
              icon="add-circle-outline" 
              title={t("deposit")} 
              subtitle={isEN ? "Top up" : "ማስገቢያ"} 
              onPress={() => Platform.OS === 'web' ? setDepositVisible(true) : router.push("/(authed)/deposit")} 
            />
            <QuickTile 
              icon="arrow-down-circle-outline" 
              title={t("withdraw")} 
              subtitle={isEN ? "Cash out" : "ማውጫ"} 
              onPress={() => Platform.OS === 'web' ? setWithdrawVisible(true) : router.push("/(authed)/withdraw")} 
              colors={["#ff4b4b", "#b91c1c"]} 
            />
            <QuickTile 
              icon="time-outline" 
              title={t("history")} 
              subtitle={isEN ? "Games" : "ታሪክ"} 
              onPress={() => router.push("/(authed)/games")} 
            />
          </View>

          <View style={styles.mainCard}>
            <LinearGradient colors={["rgba(10,12,28,0.44)", "rgba(10,12,28,0.22)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroRow}>
              <View style={styles.logoWrap}>
                <Image source={require("../../../assets/images/icon.jpg")} style={styles.logo} />
                <LinearGradient colors={["rgba(124,58,237,0.25)", "transparent"]} style={StyleSheet.absoluteFill} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{isEN ? "GAMEPLAY HUB" : "የጨዋታ ማዕከል"}</Text>
                <Text style={styles.heroSub}>{isEN ? "OUTPACE. OUTSMART. WIN!" : "ፍጥነት። ብልሃት። ድል!"}</Text>
              </View>

            </View>
            <View style={styles.boardWrap}><BoardDemo isDesktop={false} /></View>
            {/* Play Now — disabled when banned, visible always */}
            <TouchableOpacity
              onPress={isBanned ? undefined : openRoomSheet}
              disabled={isBanned}
              activeOpacity={isBanned ? 1 : 0.9}
              style={[styles.playBtn, isBanned && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={isBanned ? ['rgba(80,20,20,0.9)', 'rgba(60,10,10,0.9)'] : ["#7C3AED", "#4F46E5"]}
                style={styles.playInner}
              >
                <Ionicons name={isBanned ? "lock-closed" : "flash-outline"} size={20} color={isBanned ? '#fd6f85' : '#fff'} />
                <Text style={[styles.playText, isBanned && { color: '#fd6f85' }]}>
                  {isBanned ? (isEN ? 'SUSPENDED' : 'ታግዷል') : t("play_now")}
                </Text>
                <View style={{ width: 6 }} />
                {!isBanned && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />}
              </LinearGradient>
            </TouchableOpacity>
            {isBanned && (
              <Text style={{ color: 'rgba(253,111,133,0.6)', fontSize: 11, textAlign: 'center', marginTop: 6, fontWeight: '700', letterSpacing: 0.5 }}>
                {isEN ? 'Your account is suspended · Contact support' : 'መለያዎ ታግዷል · ድጋፍን ያነጋግሩ'}
              </Text>
            )}
            <View style={styles.infoRow}>
              <InfoPill icon="shield-checkmark-outline" text={isEN ? "Anti-cheat" : "ፀረ-ማታለል አለ"} />
              <InfoPill icon="timer-outline" text={isEN ? "Fast rounds" : "ፈጣን ዙር"} />
              <InfoPill icon="cash-outline" text={isEN ? "Instant pay" : "ፈጣን ክፍያ"} />
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
        {!!user?.username && <WelcomeTermsPopup visible={termsVisible} onAgree={handleAgreeTerms} language={language} />}
        <BonusLogsModal visible={bonusModalVisible} onClose={() => setBonusModalVisible(false)} language={language} />

        {Platform.OS === 'web' && (
          <>
            <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
            <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
          </>
        )}
      </SafeAreaView>
      {exitModalVisible && <ExitModal language={language} onCancel={cancelExit} onConfirm={confirmExit} />}

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
          userCaps={{ r1_10: (user as any)?.r1_10_wins, r1_25: (user as any)?.r1_25_wins, r1_50: (user as any)?.r1_50_wins, r1_99: (user as any)?.r1_99_wins }}
        />
      )}
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
    width: 600,
    height: 600,
    borderRadius: 300,
    opacity: 0.05,
    backgroundColor: "#a68cff",
    top: "10%",
    left: "20%",
  },
  blob1: {},
  blob2: { bottom: "-10%", right: "-5%", backgroundColor: "#00daf3", opacity: 0.08, top: "auto", left: "auto" },

  // floating dots
  floatingLayer: { ...StyleSheet.absoluteFillObject },
  floatDot: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.03)",
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
  borderColor: "rgba(166,139,255,0.2)", // brighter edge
  backgroundColor: "rgba(12,12,31,0.6)", // lighter base
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
  tile: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
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
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(10,12,28,0.18)", // lighter base
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
    shadowColor: '#7c4dff',
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
    backgroundColor: '#a68cff',
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
    shadowColor: '#a68cff',
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
    color: '#00daf3',
    textShadowColor: 'rgba(0, 218, 243, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  neonXText: {
    color: '#fd6f85',
    textShadowColor: 'rgba(253, 111, 133, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  neonCtaOuter: {
    shadowColor: '#a68cff',
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
    backgroundColor: "rgba(10,12,24,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
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
    backgroundColor: '#171728',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(166,139,255,0.2)',
    overflow: 'hidden',
    shadowColor: '#a68cff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
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
    backgroundColor: "#171725",
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
    borderTopColor: "rgba(255,255,255,0.12)",
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
  amountFee: { 
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
  desktopHubRoot: { flex: 1, backgroundColor: '#0c0c1f' },
  hubDesktopGrid: { flexDirection: 'row', gap: 40, maxWidth: 1400, alignSelf: 'center', width: '100%', paddingHorizontal: 40, marginTop: 40 },
  desktopMainCol: { flex: 8, gap: 28 },
  desktopSideCol: { flex: 4, gap: 28 },

  // Glass Panel
  glassCard: {
    backgroundColor: 'rgba(23, 23, 50, 0.4)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 40,
    overflow: 'hidden',
  },
  
  // Gameplay Hub Specifics
  hubTitle: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 10, textAlign: 'center' },
  hubSub: { color: 'rgba(229, 227, 255, 0.5)', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 44 },
  
  hubBoardContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  playNowBtn: { marginTop: 44, borderRadius: 22, overflow: 'hidden', shadowColor: '#a68cff', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 28, alignSelf: 'center', width: 340 },
  playNowInner: { paddingVertical: 26, alignItems: 'center', justifyContent: 'center' },
  playNowText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },

  // Bento Stats
  statsBento: { flexDirection: 'row', gap: 24 },
  bentoCard: { flex: 1, backgroundColor: 'rgba(23,23,50,0.4)', borderRadius: 28, padding: 28, flexDirection: 'row', alignItems: 'center', gap: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bentoIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bentoLabel: { color: 'rgba(167,139,250,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  bentoValue: { color: '#fff', fontSize: 28, fontWeight: '900' },

  // Account Card
  accountCard: { padding: 32 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  accountTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  accountLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountValue: { color: '#fff', fontWeight: '800', fontSize: 15 },
  verifiedPill: { backgroundColor: 'rgba(166,140,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(166,140,255,0.3)' },
  verifiedText: { color: '#a68cff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },

  // Quick Actions
  actionGrid: { flexDirection: 'row', gap: 14, marginTop: 12 },
  actionBtn: { flex: 1, height: 90, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 10 },
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
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.06)', padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.15)',
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



