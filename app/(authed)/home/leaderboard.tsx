// app/(authed)/home/leaderboard.tsx — Weekly Leaderboard Full Page
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CongratulationsModal from "../../../components/CongratulationsModal";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { API_URL } from "../../../config";

const { width: SCREEN_W } = Dimensions.get("window");

type LeaderboardUser = {
  id: string;
  username: string;
  avatar: string | null;
  wins: number;
  rank: number;
  isMe: boolean;
};

type PreviousWeekWin = {
  snapshotId: string;
  rank: number;
  prize: number;
  weekStart: string;
  weekEnd: string;
} | null;

// ── Countdown Timer ──────────────────────────────────────────────────
function CountdownTimer({ secondsRemaining: initialSeconds, isEN }: { secondsRemaining: number; isEN: boolean }) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining > 0]);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const timeBlocks = [
    { val: days, label: isEN ? 'Days' : 'ቀናት' },
    { val: hours, label: isEN ? 'Hrs' : 'ሰዓት' },
    { val: minutes, label: isEN ? 'Min' : 'ደቂቃ' },
    { val: seconds, label: isEN ? 'Sec' : 'ሰከንድ' },
  ];

  return (
    <View style={{
      backgroundColor: '#111115',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Ionicons name="time-outline" size={14} color="#00daf3" />
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#00daf3', letterSpacing: 1.5 }}>
          {isEN ? "WEEKLY GIVEAWAY RESET" : "ሳምንታዊ ሽልማት ቀየርስ"}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {timeBlocks.map((block, i) => (
          <React.Fragment key={block.label}>
            <View style={{ alignItems: 'center', minWidth: 50 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#00daf3' }}>
                {String(block.val).padStart(2, '0')}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {block.label}
              </Text>
            </View>
            {i < timeBlocks.length - 1 && (
              <Text style={{ fontSize: 20, fontWeight: '900', color: 'rgba(0, 218, 243, 0.25)', marginBottom: 12 }}>:</Text>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function PrizePoolCard({ isEN, topPrize }: { isEN: boolean; topPrize: number }) {
  return (
    <View style={{
      backgroundColor: '#111115',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      padding: 20,
      flex: 1,
      justifyContent: 'space-between',
    }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Ionicons name="gift-outline" size={14} color="#f97316" />
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#f97316', letterSpacing: 1.5 }}>
            {isEN ? "WEEKLY PRIZE POOL" : "ሳምንታዊ የሽልማት ገንዳ"}
          </Text>
        </View>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#ffb84d' }}>
          {topPrize} BIRR
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
          {isEN ? "For the 1st Place Winner" : "ለ1ኛ ደረጃ አሸናፊ"}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffb84d', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#111115' }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>1</Text>
          </View>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#b9cacb', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#111115', marginLeft: -8 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>2</Text>
          </View>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fb923c', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#111115', marginLeft: -8 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>3</Text>
          </View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' }}>
          +1.2k {isEN ? "Players Joining" : "ተጫዋቾች ተሳትፈዋል"}
        </Text>
      </View>
    </View>
  );
}

function MobileUnifiedCard({
  secondsRemaining: initialSeconds,
  isEN,
  prizes,
}: {
  secondsRemaining: number;
  isEN: boolean;
  prizes: { rank: number; amount: number }[];
}) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining > 0]);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const prize1 = prizes.find(p => p.rank === 1)?.amount || 500;
  const prize2 = prizes.find(p => p.rank === 2)?.amount || 300;
  const prize3 = prizes.find(p => p.rank === 3)?.amount || 200;

  return (
    <View style={{
      backgroundColor: '#111115',
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: '#f97316',
      paddingTop: 18,
      paddingHorizontal: 20,
      paddingBottom: 28,
      marginHorizontal: 20,
      marginBottom: 32,
      position: 'relative',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="gift-outline" size={14} color="#f97316" />
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#f97316', letterSpacing: 1.5 }}>
            {isEN ? "WEEKLY PRIZE POOL" : "ሳምንታዊ የሽልማት ገንዳ"}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffb84d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#111115' }}>
              <Text style={{ fontSize: 7, fontWeight: '900', color: '#000' }}>1</Text>
            </View>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#b9cacb', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#111115', marginLeft: -5 }}>
              <Text style={{ fontSize: 7, fontWeight: '900', color: '#000' }}>2</Text>
            </View>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fb923c', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#111115', marginLeft: -5 }}>
              <Text style={{ fontSize: 7, fontWeight: '900', color: '#000' }}>3</Text>
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>
            +1.2k {isEN ? "Joining" : "ተሳታፊዎች"}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 24, marginVertical: 10 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: '#ffb84d', letterSpacing: 0.5 }}>1ST PLACE</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#ffb84d', marginTop: 2 }}>
            {prize1}
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255, 184, 77, 0.6)' }}> {isEN ? "Birr" : "ብር"}</Text>
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: '#b9cacb', letterSpacing: 0.5 }}>2ND PLACE</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#b9cacb', marginTop: 2 }}>
            {prize2}
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(185, 202, 203, 0.6)' }}> {isEN ? "Birr" : "ብር"}</Text>
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: '#fb923c', letterSpacing: 0.5 }}>3RD PLACE</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#fb923c', marginTop: 2 }}>
            {prize3}
            <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(251, 146, 60, 0.6)' }}> {isEN ? "Birr" : "ብር"}</Text>
          </Text>
        </View>
      </View>

      {remaining > 0 && (
        <View style={{
          position: 'absolute',
          bottom: -18,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <View style={{
            backgroundColor: '#1E1E24',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: '#f97316',
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#f97316',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }}>
            <Ionicons name="time-outline" size={14} color="#00daf3" />
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#00daf3', letterSpacing: 0.5 }}>
              {String(days).padStart(2, '0')} : {String(hours).padStart(2, '0')} : {String(minutes).padStart(2, '0')} : {String(seconds).padStart(2, '0')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Podium Component ──────────────────────────────────────────────────
function Podium({ top3, prizes }: { top3: LeaderboardUser[]; prizes: { rank: number; amount: number }[] }) {
  const getPrize = (rank: number) => prizes.find(p => p.rank === rank)?.amount || 0;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const spots = [
    { data: top3[1], rank: 2, barH: isDesktop ? 70 : 45, color: '#b9cacb', borderColor: 'rgba(185, 202, 203, 0.25)', bgColor: 'rgba(255,255,255,0.02)', textColor: '#b9cacb' },
    { data: top3[0], rank: 1, barH: isDesktop ? 100 : 70, color: '#ffb84d', borderColor: 'rgba(255, 184, 77, 0.3)', bgColor: 'rgba(255,255,255,0.03)', textColor: '#ffb84d' },
    { data: top3[2], rank: 3, barH: isDesktop ? 60 : 35, color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.25)', bgColor: 'rgba(255,255,255,0.02)', textColor: '#fb923c' },
  ];

  return (
    <View style={s.podiumContainer}>
      {spots.map((spot) => {
        const u = spot.data;
        const prize = getPrize(spot.rank);
        return (
          <View key={spot.rank} style={s.podiumSpot}>
            <Text style={[s.podiumPrize, { color: spot.textColor }]}>{prize} Birr</Text>
            <View style={[s.rankCircle, { borderColor: spot.color, width: spot.rank === 1 ? 64 : 50, height: spot.rank === 1 ? 64 : 50 }]}>
              {u?.avatar ? (
                <Image source={{ uri: u.avatar }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
              ) : (
                <Text style={{ fontSize: spot.rank === 1 ? 24 : 18, fontWeight: '900', color: '#fff' }}>{spot.rank}</Text>
              )}
              {/* Always render rank badge so they can see rank 1, 2, 3 even with avatars */}
              <View style={[s.crownBadge, { backgroundColor: spot.color, bottom: spot.rank === 1 ? -4 : -2, right: spot.rank === 1 ? -4 : -2, width: spot.rank === 1 ? 22 : 18, height: spot.rank === 1 ? 22 : 18, borderRadius: spot.rank === 1 ? 11 : 9 }]}>
                {spot.rank === 1 ? (
                  <Ionicons name="trophy" size={10} color="#000" />
                ) : (
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>{spot.rank}</Text>
                )}
              </View>
            </View>
            <View style={[s.podiumBar, { height: spot.barH, borderColor: spot.borderColor, backgroundColor: spot.bgColor, width: spot.rank === 1 ? 100 : 80 }]}>
              <Text style={s.podiumName} numberOfLines={1}>{u?.username || '—'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Leaderboard Item ──────────────────────────────────────────────────
function LBItem({ item }: { item: LeaderboardUser }) {
  const isTop3 = item.rank <= 3;
  const rankColor = item.isMe ? '#00daf3' : (item.rank === 1 ? '#ffb84d' : item.rank === 2 ? '#b9cacb' : item.rank === 3 ? '#fb923c' : '#00daf3');
  const scoreColor = item.isMe ? '#00daf3' : '#ffb84d';

  return (
    <View style={[
      s.lbItem,
      item.isMe && {
        backgroundColor: 'rgba(0, 218, 243, 0.05)',
        borderColor: '#00daf3',
        shadowColor: '#00daf3',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
      }
    ]}>
      <Text style={[s.lbRank, { color: rankColor, fontSize: isTop3 ? 18 : 14 }]}>{item.rank}</Text>
      <View style={[s.lbAvatar, item.isMe && { backgroundColor: 'rgba(0, 218, 243, 0.15)', borderColor: '#00daf3' }]}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
        ) : (
          <Ionicons name={isTop3 && item.rank === 1 ? "trophy" : "person"} size={14} color={item.isMe ? '#00daf3' : (isTop3 && item.rank === 1 ? '#ffb84d' : '#d1c5eb')} />
        )}
      </View>
      <View style={s.lbInfo}>
        <Text style={[s.lbName, item.isMe && { color: '#00daf3' }]}>{item.username}{item.isMe ? ' (You)' : ''}</Text>
      </View>
      <Text style={[s.lbScore, { color: scoreColor }]}>{item.wins} Wins</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const { token, language } = useAuth();
  const { onMessage } = useSocket();
  const isEN = language === "en";
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);
  const [prizes, setPrizes] = useState<{ rank: number; amount: number }[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [previousWeekWin, setPreviousWeekWin] = useState<PreviousWeekWin>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [payoutPending, setPayoutPending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/leaderboard/weekly`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setMyRank(data.myRank || null);
        setPrizes(data.prizes || []);
        setSecondsRemaining(data.secondsRemaining || 0);
        setPayoutPending(data.payoutPending || false);
        if (data.previousWeekWin) {
          setPreviousWeekWin(data.previousWeekWin);
          setShowCongrats(true);
        }
      }
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const unsub = onMessage(({ type }) => {
      if (type === "balance_update") {
        fetchData();
      }
    });
    return unsub;
  }, [onMessage, fetchData]);

  const handleClaimPrize = async () => {
    setShowCongrats(false);
    if (!previousWeekWin || !token) return;
    try {
      await fetch(`${API_URL}/leaderboard/claim`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshotId: previousWeekWin.snapshotId }),
      });
      setPreviousWeekWin(null);
    } catch (e) {
      console.error('Failed to claim prize:', e);
    }
  };

  const top3 = leaderboard.slice(0, 3);

  const flatListData = useMemo(() => {
    const base = [...leaderboard];
    const myInList = leaderboard.find(u => u.isMe);
    if (!myInList && myRank && myRank.rank) {
      base.push(myRank);
    }
    const list = [{ id: 'subheader', type: 'subheader' } as any, ...base];
    if (base.length === 0) {
      list.push({ id: 'empty', type: 'empty' } as any);
    }
    return list;
  }, [leaderboard, myRank]);

  const scrollToMe = () => {
    const myIdx = flatListData.findIndex(u => u.isMe);
    if (myIdx >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: myIdx, animated: true, viewPosition: 0.5 });
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFill} />

        <View pointerEvents="none" style={[s.blob, s.blob1]} />
        <View pointerEvents="none" style={[s.blob, s.blob2]} />
        <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
          <View style={s.header}>
            <View style={{ width: 180, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <View style={s.refreshBtn} />
          </View>
          <View style={{ marginTop: 15, marginBottom: 20 }}>
            <View style={s.podiumContainer}>
              {[2, 1, 3].map(rank => (
                <View key={rank} style={s.podiumSpot}>
                  <View style={{ width: 40, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 10 }} />
                  <View style={[s.rankCircle, { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', width: rank === 1 ? 64 : 50, height: rank === 1 ? 64 : 50 }]} />
                  <View style={[s.podiumBar, { height: rank === 1 ? 100 : (rank === 2 ? 70 : 60), backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.02)', width: rank === 1 ? 100 : 80 }]} />
                </View>
              ))}
            </View>
          </View>
          {/* Countdown Skeleton */}
          <View style={{ marginHorizontal: 20, height: 100, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16 }} />
          <View style={s.subHeader}>
            <View style={{ width: 120, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
          </View>
          <View style={s.listContent}>
            {[1, 2, 3, 4, 5].map((_, i) => (
              <View key={i} style={s.lbItem}>
                <View style={{ width: 24, height: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }} />
                <View style={s.lbAvatar} />
                <View style={s.lbInfo}>
                  <View style={{ width: '60%', height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                </View>
                <View style={{ width: 50, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
              </View>
            ))}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={[s.blob, s.blob1]} />
      <View pointerEvents="none" style={[s.blob, s.blob2]} />

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
          position: 'absolute', top: 106, left: 0, right: 0, height: 2.5, backgroundColor: '#00daf3',
          shadowColor: '#00daf3', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        <View style={{ 
          position: 'absolute', top: 213, left: 0, right: 0, height: 2.5, backgroundColor: '#00daf3',
          shadowColor: '#00daf3', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        {/* Vertical lines */}
        <View style={{ 
          position: 'absolute', left: 106, top: 0, bottom: 0, width: 2.5, backgroundColor: '#00daf3',
          shadowColor: '#00daf3', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        <View style={{ 
          position: 'absolute', left: 213, top: 0, bottom: 0, width: 2.5, backgroundColor: '#00daf3',
          shadowColor: '#00daf3', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6
        }} />
        
        {/* Illustrative faded board moves */}
        <Text style={{ 
          position: 'absolute', top: 15, left: 25, fontSize: 52, fontWeight: '900', color: '#00daf3',
          textShadowColor: 'rgba(0, 218, 243, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6
        }}>X</Text>
        <Text style={{ 
          position: 'absolute', top: 125, left: 135, fontSize: 52, fontWeight: '900', color: '#00daf3',
          textShadowColor: 'rgba(0, 218, 243, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6
        }}>O</Text>
        <Text style={{ 
          position: 'absolute', top: 235, left: 245, fontSize: 52, fontWeight: '900', color: '#00daf3',
          textShadowColor: 'rgba(0, 218, 243, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6
        }}>X</Text>
      </View>

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <FlatList
          ref={flatListRef}
          data={flatListData}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 50));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            });
          }}
          renderItem={({ item }) => {
            if (item.type === 'subheader') {
              return (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 8,
                  marginHorizontal: -20,
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: 12,
                  backgroundColor: 'transparent',
                  zIndex: 10,
                }}>
                  <Text style={s.subHeaderTitle}>{isEN ? "All Players" : "ሁሉም ተጫዋቾች"}</Text>
                  <Text style={s.subHeaderLabel}>{isEN ? "(Weekly)" : "(ሳምንታዊ)"}</Text>
                </View>
              );
            }
            if (item.type === 'empty') {
              return (
                <View style={s.emptyWrap}>
                  <Ionicons name="trophy-outline" size={40} color="rgba(255,255,255,0.2)" />
                  <Text style={s.emptyText}>{isEN ? "No players ranked yet this week" : "በዚህ ሳምንት ገና ምንም ተጫዋች አልተመዘገበም"}</Text>
                </View>
              );
            }
            return <LBItem item={item} />;
          }}
          ListHeaderComponent={() => {
            const warningBanner = payoutPending && (
              <View style={{
                marginHorizontal: isDesktop ? 20 : 0,
                marginBottom: 16,
                padding: 14,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                borderWidth: 1,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10
              }}>
                <Ionicons name="time" size={18} color="#f59e0b" />
                <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 }}>
                  {isEN 
                    ? "Results Under Review: The admin team is currently validating last week's matches to ensure fair play. Payouts will be ready once verification completes."
                    : "ግምገማ ላይ ያለ ውጤት፡ ባለፈው ሳምንት የተጫወቱ ጨዋታዎች ትክክለኛነት በስተርዳዳሪው እየተጣራ ነው። ማረጋገጫው ሲጠናቀቅ ሽልማቶች ይከፈላሉ::"}
                </Text>
              </View>
            );

            if (isDesktop) {
              return (
                <View>
                  {warningBanner}
                  <View style={{ flexDirection: 'row', gap: 24, paddingHorizontal: 20, marginBottom: 24 }}>
                    {/* Left Box: Podium */}
                    <View style={{ flex: 1.5, backgroundColor: '#111115', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 24 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{isEN ? "Weekly Top Winners" : "ሳምንታዊ ከፍተኛ አሸናፊዎች"}</Text>
                        <TouchableOpacity onPress={fetchData} style={s.refreshBtn}>
                           <Ionicons name="refresh" size={18} color="#00daf3" />
                        </TouchableOpacity>
                      </View>
                      <Podium top3={top3} prizes={prizes} />
                    </View>

                    {/* Right Box: Countdown + Prize Pool */}
                    <View style={{ flex: 1, gap: 16 }}>
                      {secondsRemaining > 0 && (
                        <CountdownTimer secondsRemaining={secondsRemaining} isEN={isEN} />
                      )}
                      <PrizePoolCard isEN={isEN} topPrize={prizes.find(p => p.rank === 1)?.amount || 500} />
                    </View>
                  </View>
                </View>
              );
            }

            // Mobile Header components
            return (
              <View style={{ backgroundColor: 'transparent', marginBottom: 12 }}>
                {warningBanner}
                {/* Header */}
                <View style={[s.header, { paddingHorizontal: 0 }]}>
                  <Text style={s.headerTitle}>{isEN ? "Weekly Top Winners" : "ሳምንታዊ ከፍተኛ አሸናፊዎች"}</Text>
                  <TouchableOpacity onPress={fetchData} style={s.refreshBtn}>
                    <Ionicons name="refresh" size={18} color="#00daf3" />
                  </TouchableOpacity>
                </View>

                {/* Podium */}
                <View style={{ marginTop: 8, marginBottom: 12, marginHorizontal: -20 }}>
                  <Podium top3={top3} prizes={prizes} />
                </View>

                {/* Mobile Unified Prize & Timer Card */}
                <View style={{ marginHorizontal: -20 }}>
                  <MobileUnifiedCard
                    secondsRemaining={secondsRemaining}
                    isEN={isEN}
                    prizes={prizes}
                  />
                </View>
              </View>
            );
          }}
          stickyHeaderIndices={[1]}
          contentContainerStyle={s.listContent}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Find Me Button */}
        {myRank && myRank.rank && (
          <TouchableOpacity onPress={scrollToMe} style={s.findMeBtn} activeOpacity={0.85}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 24,
              backgroundColor: '#111115',
              borderWidth: 1.5,
              borderColor: '#00daf3',
              shadowColor: '#00daf3',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <Ionicons name="arrow-down" size={14} color="#00daf3" />
              <Text style={{ color: '#00daf3', fontWeight: '900', fontSize: 13 }}>{isEN ? "FIND ME" : "እኔን ፈልግ"}</Text>
            </View>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Congratulations Modal */}
      <CongratulationsModal
        visible={showCongrats}
        previousWeekWin={previousWeekWin}
        onDismiss={handleClaimPrize}
        isEN={isEN}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#00daf3', fontSize: 13, marginTop: 12, fontWeight: '600' },

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

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    height: 160, gap: 16, paddingHorizontal: 20,
  },
  podiumSpot: { alignItems: 'center' },
  podiumPrize: { fontSize: 13, fontWeight: '700', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  rankCircle: {
    borderRadius: 999, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0c0c1d', marginBottom: -20, zIndex: 2, overflow: 'hidden',
  },
  crownBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#ffb84d', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
  },
  podiumBar: {
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
    borderWidth: 1, borderBottomWidth: 0,
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14,
  },
  podiumName: { fontSize: 12, fontWeight: '700', color: '#ecedf6', maxWidth: 80, textAlign: 'center' },

  // Sub Header
  subHeader: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  subHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  subHeaderLabel: { fontSize: 12, color: '#00daf3', fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 20, gap: 10, paddingBottom: 120 },
  lbItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  lbItemMe: {
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    borderColor: 'rgba(0, 218, 243, 0.25)',
    shadowColor: '#00daf3', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 15,
  },
  lbRank: { width: 28, fontWeight: '900', textAlign: 'center' },
  lbAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  lbScore: { fontWeight: '800', color: '#ffb84d', fontSize: 14 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Find Me
  findMeBtn: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 8,
  },
  findMeInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24,
  },
  findMeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
