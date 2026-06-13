// app/(authed)/admin/leaderboard.tsx — Admin Leaderboard Control Panel
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import { API_URL } from "../../../config";
import ActionConfirmModal from "../../../components/ActionConfirmModal";

const C = {
  bg: '#0a0a1a',
  card: 'rgba(17, 17, 24, 0.85)',
  cardHeader: 'rgba(26, 26, 37, 0.4)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(0, 242, 255, 0.4)',
  accent: '#00e5ff',
  accentDim: 'rgba(0, 229, 255, 0.15)',
  secondary: '#00e5ff',
  gold: '#ffb84d',
  silver: '#cbd5e1',
  bronze: '#d97706',
  green: '#10b981',
  red: '#ef4444',
  txt: '#f1f1f6',
  dim: '#9090a8',
  bgGlass: 'rgba(255, 255, 255, 0.02)',
};

type Standing = { id: string; username: string; number: string; wins: number; rank: number };
type Snapshot = { id: string; week_start: string; week_end: string; user_id: string; username: string; wins: number; rank: number; prize_amount: number; prize_status: string };
type FakeTicker = { id: number; username: string; amount: number; active: boolean };

export default function AdminLeaderboardPage() {
  const { token, language, showAlert } = useAuth();
  const isEN = language === 'en';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' };

  const [loading, setLoading] = useState(true);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [fakeEntries, setFakeEntries] = useState<FakeTicker[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  // Pagination and search
  const [standingsSearch, setStandingsSearch] = useState('');
  const [standingsPage, setStandingsPage] = useState(1);
  const [standingsTotal, setStandingsTotal] = useState(0);
  const STANDINGS_LIMIT = 15;

  // Fake ticker form
  const [newFakeName, setNewFakeName] = useState('');
  const [newFakeAmount, setNewFakeAmount] = useState('');

  // Settings
  const [fakeTickerEnabled, setFakeTickerEnabled] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);

  // Giveaway Controller
  const [giveawayData, setGiveawayData] = useState<any>(null);
  const [giveawayLoading, setGiveawayLoading] = useState(false);
  const [smsMessage, setSmsMessage] = useState('🏆 Congratulations {username}! You ranked #{rank} on the XO ET weekly leaderboard and won {prize} ETB! Keep playing and winning!');
  const [sendingGiveaway, setSendingGiveaway] = useState(false);
  const [giveawayResults, setGiveawayResults] = useState<any[]>([]);
  const [prizeAmounts, setPrizeAmounts] = useState<Record<string, string>>({});
  const [showSMSConfirm, setShowSMSConfirm] = useState(false);
  const adjustPrize = (userId: string, amount: number) => {
    setPrizeAmounts(prev => {
      const winner = giveawayData?.winners?.find((w: any) => w.id === userId);
      const defaultPrize = winner ? (winner.rank === 1 ? 500 : winner.rank === 2 ? 300 : 200) : 0;
      const current = Number(prev[userId] || defaultPrize);
      return { ...prev, [userId]: String(current + amount) };
    });
  };

  const resetPrize = (userId: string) => {
    setPrizeAmounts(prev => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Responsive state for dual column layout
  const [width, setWidth] = useState(Platform.OS === 'web' ? window.innerWidth : Dimensions.get('window').width);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStandings = useCallback(async () => {
    if (!token) return;
    try {
      const offset = (standingsPage - 1) * STANDINGS_LIMIT;
      const searchParams = new URLSearchParams({ limit: String(STANDINGS_LIMIT), offset: String(offset) });
      if (standingsSearch) searchParams.append('search', standingsSearch);

      const res = await fetch(`${API_URL}/admin/leaderboard/current?${searchParams.toString()}`, { headers });
      const data = await res.json();
      if (data.ok) {
        setStandings(data.standings || []);
        setStandingsTotal(data.total || 0);
        setWeekStart(data.weekStart || '');
        setWeekEnd(data.weekEnd || '');
      }
    } catch (e) {
      console.error('Fetch standings error:', e);
    }
  }, [token, standingsPage, standingsSearch]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const offset = (standingsPage - 1) * STANDINGS_LIMIT;
      const searchParams = new URLSearchParams({ limit: String(STANDINGS_LIMIT), offset: String(offset) });
      if (standingsSearch) searchParams.append('search', standingsSearch);

      const [standingsRes, snapshotsRes, fakeRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/admin/leaderboard/current?${searchParams.toString()}`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/leaderboard/snapshots`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/leaderboard/fake-ticker`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/settings`, { headers }).then(r => r.json()),
      ]);

      if (standingsRes.ok) {
        setStandings(standingsRes.standings || []);
        setStandingsTotal(standingsRes.total || 0);
        setWeekStart(standingsRes.weekStart || '');
        setWeekEnd(standingsRes.weekEnd || '');
      }
      if (snapshotsRes.ok) setSnapshots(snapshotsRes.snapshots || []);
      if (fakeRes.ok) setFakeEntries(fakeRes.entries || []);
      if (settingsRes.ok) {
        setFakeTickerEnabled(settingsRes.config?.fake_ticker_enabled === true);
        setAutoApprove(settingsRes.config?.leaderboard_auto_approve === true);
      }
    } catch (e) {
      console.error('Admin LB fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]); // removed standingsPage and standingsSearch from dep array to avoid full page reload loop, but added it to fetchStandings instead.

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Separate effect for pagination and search
  useEffect(() => {
    fetchStandings();
  }, [standingsPage, standingsSearch, fetchStandings]);

  // Timer countdown to next Sunday midnight UTC (matches backend/user bounds)
  useEffect(() => {
    if (!weekEnd) return;
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(weekEnd).getTime() + 1; // reset point
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('00d : 00h : 00m : 00s');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const dStr = String(days).padStart(2, '0');
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeLeft(`${dStr}d : ${hStr}h : ${mStr}m : ${sStr}s`);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [weekEnd]);

  // Fetch giveaway status
  const fetchGiveawayStatus = useCallback(async () => {
    setGiveawayLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/giveaway-status`, { headers });
      if (res.ok) setGiveawayData(await res.json());
    } catch (e) { console.error('Giveaway status error:', e); }
    finally { setGiveawayLoading(false); }
  }, [token]);

  useEffect(() => { fetchGiveawayStatus(); }, [fetchGiveawayStatus]);

  const sendGiveawaySMS = async (dryRun: boolean) => {
    if (!giveawayData?.winners?.length) return;
    setSendingGiveaway(true);
    try {
      const winners = giveawayData.winners.slice(0, 3).map((w: any) => ({
        userId: w.id,
        username: w.username,
        phone: w.number,
        rank: w.rank,
        wins: w.wins || 0,
        prize: prizeAmounts[w.id] || (w.rank === 1 ? '500' : w.rank === 2 ? '300' : '200'),
      }));
      const res = await fetch(`${API_URL}/admin/leaderboard/send-giveaway`, {
        method: 'POST', headers,
        body: JSON.stringify({ winners, message: smsMessage, dryRun }),
      });
      const data = await res.json();
      if (data.ok) {
        setGiveawayResults(data.results || []);
        if (!dryRun) {
          showAlert('Success', data.message || 'Giveaway distributed successfully!');
          fetchAll();
          fetchGiveawayStatus();
        }
      } else {
        showAlert('Error', data.error || 'Failed to process giveaway');
      }
    } catch (e) { console.error('Send giveaway error:', e); }
    finally { setSendingGiveaway(false); }
  };

  const updateSetting = async (key: string, value: boolean) => {
    try {
      await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ [key]: value }),
      });
    } catch {}
  };

  const createSnapshot = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/snapshot`, {
        method: 'POST', headers,
        body: JSON.stringify({ autoApprove }),
      });
      const data = await res.json();
      if (data.ok) {
        showAlert('Success', data.message);
        fetchAll();
      } else {
        showAlert('Error', data.error);
      }
    } catch (e) {
      console.error('Snapshot error:', e);
    }
  };

  const approvePrize = async (snapshotId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/approve/${snapshotId}`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (data.ok) {
        showAlert('Success', data.message);
        fetchAll();
      } else {
        showAlert('Error', data.error);
      }
    } catch {}
  };

  const approveAllPrizes = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/approve-all`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (data.ok) {
        showAlert('Success', data.message);
        fetchAll();
      } else {
        showAlert('Error', data.error);
      }
    } catch (e) {
      console.error('Approve all error:', e);
    }
  };

  const addFakeEntry = async () => {
    if (!newFakeName || !newFakeAmount) return;
    try {
      await fetch(`${API_URL}/admin/leaderboard/fake-ticker`, {
        method: 'POST', headers,
        body: JSON.stringify({ username: newFakeName, amount: Number(newFakeAmount) }),
      });
      setNewFakeName('');
      setNewFakeAmount('');
      fetchAll();
    } catch {}
  };

  const deleteFakeEntry = async (id: number) => {
    try {
      await fetch(`${API_URL}/admin/leaderboard/fake-ticker/${id}`, {
        method: 'DELETE', headers,
      });
      fetchAll();
    } catch {}
  };

  if (loading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadText}>Loading Leaderboard Hub...</Text>
      </View>
    );
  }

  const rankColor = (r: number) => r === 1 ? C.gold : r === 2 ? C.silver : r === 3 ? C.bronze : C.dim;
  const isLargeScreen = width > 900;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0a0a1a', '#0c0c1d', '#08080f']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          
          {/* ================= HEADER SECTION ================= */}
          <View style={s.headerContainer}>
            <View style={s.headerLeft}>
              <View style={s.crownGlow}>
                <Ionicons name="trophy" size={24} color={C.gold} />
              </View>
              <View>
                <Text style={s.headerTitle}>XOET ADMIN</Text>
                <Text style={s.headerSubTitle}>Super Administrator Control Panel</Text>
              </View>
            </View>
            <View style={s.headerRight}>
              <View style={s.activeBadge}>
                <View style={s.pulseDot} />
                <Text style={s.activeBadgeText}>Live Server Connection</Text>
              </View>
              <TouchableOpacity onPress={fetchAll} style={s.refreshBtn} activeOpacity={0.7}>
                <Ionicons name="refresh" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ================= CURRENT WEEK BANNER & COUNTDOWN ================= */}
          <View style={s.bannerCard}>
            <LinearGradient 
              colors={['rgba(0, 229, 255, 0.08)', 'rgba(0, 229, 255, 0.03)']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }}
              style={s.bannerInner}
            >
              <View style={s.bannerCol}>
                <View style={s.bannerHeaderLabel}>
                  <Ionicons name="calendar-outline" size={14} color={C.secondary} />
                  <Text style={s.bannerLabelText}>CURRENT STANDINGS INTERVAL</Text>
                </View>
                <Text style={s.bannerDatesText}>
                  {weekStart ? new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} 
                  {"   "}→{"   "} 
                  {weekEnd ? new Date(weekEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </Text>
              </View>
              <View style={s.bannerDivider} />
              <View style={s.bannerCol}>
                <View style={s.bannerHeaderLabel}>
                  <Ionicons name="time-outline" size={14} color={C.accent} style={s.pulseIcon} />
                  <Text style={s.bannerLabelText}>WEEK ENDS IN (UTC SYNCHRONIZED)</Text>
                </View>
                <Text style={s.bannerTimerText}>{timeLeft}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* ================= PROTOCOL DISTRIBUTION MODE SELECTOR ================= */}
          <View style={s.modeSelectorCard}>
            <View style={s.modeSelectorHeader}>
              <Ionicons name="git-network-outline" size={16} color={C.accent} />
              <Text style={s.modeSelectorTitle}>SYSTEM SETTLEMENT PROTOCOL MODE</Text>
            </View>
            <View style={s.modeBtnContainer}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => { setAutoApprove(true); updateSetting('leaderboard_auto_approve', true); }}
                style={[s.modeBtn, autoApprove ? s.modeBtnActive : null, { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
              >
                <Ionicons name="flash-sharp" size={16} color={autoApprove ? "#000" : C.green} style={{ marginRight: 6 }} />
                <Text style={[s.modeBtnText, autoApprove ? s.modeBtnTextActive : null]}>AUTOMATIC PROTOCOL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => { setAutoApprove(false); updateSetting('leaderboard_auto_approve', false); }}
                style={[s.modeBtn, !autoApprove ? s.modeBtnActive : null, { borderTopRightRadius: 12, borderBottomRightRadius: 12 }]}
              >
                <Ionicons name="hammer-sharp" size={16} color={!autoApprove ? "#000" : "#f59e0b"} style={{ marginRight: 6 }} />
                <Text style={[s.modeBtnText, !autoApprove ? s.modeBtnTextActive : null]}>MANUAL CONSOLE</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.modeHintText}>
              {autoApprove 
                ? "Auto Mode: Standard distributions settle automatically at countdown expiry with instant payout & congratulations notification."
                : "Manual Mode: Standings snapshots are taken manually at any time with custom prize values and manual payout trigger controls."
              }
            </Text>
          </View>

          {/* ================= WORKSPACE GRID (TWO COLUMNS ON DESKTOP) ================= */}
          <View style={[s.gridRow, isLargeScreen ? s.rowLayout : s.columnLayout]}>
            
            {/* ----------------- COLUMN 1: STANDINGS (LEFT) ----------------- */}
            <View style={[s.gridCol, isLargeScreen ? { flex: 1.3 } : null]}>
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.titleRow}>
                    <Ionicons name="stats-chart" size={16} color={C.secondary} />
                    <Text style={s.cardTitle}>Current Week Standings</Text>
                  </View>
                  <View style={s.countBadge}>
                    <Text style={s.countBadgeText}>{standingsTotal} Active</Text>
                  </View>
                </View>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                  <View style={s.searchWrap}>
                    <Ionicons name="search" size={18} color={C.dim} style={{ marginLeft: 12 }} />
                    <TextInput
                      style={s.searchInput}
                      placeholder={isEN ? "Search username or phone..." : "ስም ወይም ስልክ ይፈልጉ..."}
                      placeholderTextColor={C.dim}
                      value={standingsSearch}
                      onChangeText={(t) => { setStandingsSearch(t); setStandingsPage(1); }}
                    />
                  </View>
                </View>

                <View style={s.cardContent}>
                  {standings.length === 0 ? (
                    <View style={s.emptyState}>
                      <Ionicons name="people-outline" size={48} color={C.dim} style={{ marginBottom: 12, opacity: 0.5 }} />
                      <Text style={s.emptyText}>{isEN ? 'No winners yet this week' : 'በዚህ ሳምንት ገና ምንም አሸናፊ የለም'}</Text>
                    </View>
                  ) : (
                    standings.map((u, index) => {
                      const maxWins = standings[0]?.wins || 1;
                      const ratio = u.wins / maxWins;
                      return (
                        <View key={u.id} style={s.standingRow}>
                          <View style={s.standingLeft}>
                            <View style={[s.rankPill, { backgroundColor: rankColor(u.rank) + '15', borderColor: rankColor(u.rank) + '40' }]}>
                              <Text style={[s.rankText, { color: rankColor(u.rank) }]}>#{u.rank}</Text>
                            </View>
                            <View>
                              <Text style={s.standingName}>{u.username}</Text>
                              <Text style={s.standingPhone}>{u.number}</Text>
                            </View>
                          </View>
                          <View style={s.standingRight}>
                            <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
                              <Text style={s.standingWins}>{u.wins} {isEN ? 'Wins' : 'ድሎች'}</Text>
                            </View>
                            {/* Visual Progress Bar */}
                            <View style={s.barContainer}>
                              <View style={[s.barFill, { width: `${ratio * 100}%`, backgroundColor: u.rank === 1 ? C.gold : C.accent }]} />
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Pagination Controls */}
                  {standingsTotal > STANDINGS_LIMIT && (
                    <View style={s.paginationRow}>
                      <TouchableOpacity 
                        style={[s.pageBtn, standingsPage === 1 && s.pageBtnDisabled]}
                        disabled={standingsPage === 1}
                        onPress={() => setStandingsPage(p => Math.max(1, p - 1))}
                      >
                        <Ionicons name="chevron-back" size={16} color={standingsPage === 1 ? C.dim : C.txt} />
                      </TouchableOpacity>
                      <Text style={s.pageText}>
                        Page {standingsPage} of {Math.ceil(standingsTotal / STANDINGS_LIMIT)}
                      </Text>
                      <TouchableOpacity 
                        style={[s.pageBtn, standingsPage >= Math.ceil(standingsTotal / STANDINGS_LIMIT) && s.pageBtnDisabled]}
                        disabled={standingsPage >= Math.ceil(standingsTotal / STANDINGS_LIMIT)}
                        onPress={() => setStandingsPage(p => p + 1)}
                      >
                        <Ionicons name="chevron-forward" size={16} color={standingsPage >= Math.ceil(standingsTotal / STANDINGS_LIMIT) ? C.dim : C.txt} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ----------------- COLUMN 2: CONTROLS & SNAPSHOTS (RIGHT) ----------------- */}
            <View style={[s.gridCol, isLargeScreen ? { flex: 1 } : null]}>
              
              {/* Settings Card */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.titleRow}>
                    <Ionicons name="settings-sharp" size={16} color={C.accent} />
                    <Text style={s.cardTitle}>Global Settings</Text>
                  </View>
                </View>

                <View style={s.cardContent}>
                  <View style={s.settingRow}>
                    <View style={s.settingInfo}>
                      <Text style={s.settingLabel}>{isEN ? 'Auto-Approve Prizes' : 'ሽልማቶችን ራስ-ፈቅድ'}</Text>
                      <Text style={s.settingDesc}>Distribute weekly payouts automatically at midnight</Text>
                    </View>
                    <Switch
                      value={autoApprove}
                      onValueChange={(v) => { setAutoApprove(v); updateSetting('leaderboard_auto_approve', v); }}
                      trackColor={{ false: '#221c38', true: C.accent + '50' }}
                      thumbColor={autoApprove ? C.accent : '#555'}
                    />
                  </View>

                  <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
                    <View style={s.settingInfo}>
                      <Text style={s.settingLabel}>{isEN ? 'Live Winner Ticker' : 'ሐሰት ቲከር አንቃ'}</Text>
                      <Text style={s.settingDesc}>Use tickers for promotional fake winner alerts</Text>
                    </View>
                    <Switch
                      value={fakeTickerEnabled}
                      onValueChange={(v) => { setFakeTickerEnabled(v); updateSetting('fake_ticker_enabled', v); }}
                      trackColor={{ false: '#221c38', true: C.accent + '50' }}
                      thumbColor={fakeTickerEnabled ? C.accent : '#555'}
                    />
                  </View>
                </View>
              </View>

              {/* Past Snapshots Card */}
              <View style={[s.card, { marginTop: 16 }]}>
                <View style={s.cardHeader}>
                  <View style={s.titleRow}>
                    <Ionicons name="folder-open" size={16} color={C.gold} />
                    <Text style={s.cardTitle}>{isEN ? 'Past Snapshots' : 'ያለፉ ቅጽበቶች'}</Text>
                  </View>
                  {!autoApprove && snapshots.some(snap => snap.prize_status === 'pending') && (
                    <TouchableOpacity onPress={approveAllPrizes} style={s.approveAllBtn} activeOpacity={0.8}>
                      <Ionicons name="checkmark-done" size={12} color="#fff" />
                      <Text style={s.approveAllText}>Approve All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={s.cardContent}>
                  {snapshots.length === 0 ? (
                    <View style={s.emptyState}>
                      <Ionicons name="archive-outline" size={32} color={C.dim} style={{ marginBottom: 8, opacity: 0.5 }} />
                      <Text style={s.emptyText}>{isEN ? 'No snapshots yet' : 'ገና ምንም ቅጽበቶች የሉም'}</Text>
                    </View>
                  ) : (
                    Object.entries(
                      snapshots.reduce((groups: Record<string, Snapshot[]>, s: Snapshot) => {
                        const key = `${s.week_start} → ${s.week_end}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(s);
                        return groups;
                      }, {} as Record<string, Snapshot[]>)
                    ).slice(0, 3).map(([weekRange, snaps]) => (
                      <View key={weekRange} style={s.snapshotGroup}>
                        <View style={s.snapshotGroupHeader}>
                          <Ionicons name="time" size={12} color={C.secondary} />
                          <Text style={s.snapshotGroupTitle}>{weekRange}</Text>
                        </View>
                        {snaps.sort((a,b) => a.rank - b.rank).slice(0, 3).map(snap => (
                          <View key={snap.id} style={s.snapRow}>
                            <View style={s.snapInfo}>
                              <Text style={s.snapName}>#{snap.rank} {snap.username}</Text>
                              <Text style={s.snapMeta}>{snap.wins} wins · {snap.prize_amount} ETB</Text>
                            </View>
                            {!autoApprove && snap.prize_status === 'pending' ? (
                              <TouchableOpacity onPress={() => approvePrize(snap.id)} style={s.approveBtn} activeOpacity={0.7}>
                                <Text style={s.approveBtnText}>Approve</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={[s.statusBadge, { borderColor: (snap.prize_status === 'approved' || snap.prize_status === 'paid') ? C.green + '40' : C.dim + '40', backgroundColor: (snap.prize_status === 'approved' || snap.prize_status === 'paid') ? C.green + '10' : C.dim + '10' }]}>
                                <Ionicons name={(snap.prize_status === 'approved' || snap.prize_status === 'paid') ? "checkmark-circle" : "time-outline"} size={10} color={(snap.prize_status === 'approved' || snap.prize_status === 'paid') ? C.green : C.dim} />
                                <Text style={[s.statusBadgeText, { color: (snap.prize_status === 'approved' || snap.prize_status === 'paid') ? C.green : C.dim }]}>
                                  {(snap.prize_status === 'approved' || snap.prize_status === 'paid') ? 'Paid' : 'Pending'}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </View>

            </View>
          </View>

          {/* ================= BOTTOM CONDITIONAL DISTRIBUTION MODULE ================= */}
          <View style={s.moduleDivider} />

          {autoApprove ? (
            /* ================= MODE: AUTOMATIC ACTIVE ================= */
            <View style={s.card}>
              <View style={[s.cardHeader, { borderBottomColor: C.green + '30' }]}>
                <View style={s.titleRow}>
                  <Ionicons name="flash-sharp" size={20} color={C.green} />
                  <Text style={[s.cardTitle, { color: C.green, fontSize: 16 }]}>AUTOMATIC DISTRIBUTION PROTOCOL</Text>
                </View>
                <View style={[s.activeStatusBadge, { backgroundColor: C.green + '20', borderColor: C.green + '40' }]}>
                  <Text style={{ color: C.green, fontSize: 11, fontWeight: '900' }}>ACTIVE</Text>
                </View>
              </View>

              <View style={s.cardContent}>
                <Text style={s.modeDescription}>
                  Weekly prizes, standing snapshots, and automated SMS announcements are fully managed by the core background workers. Standings lock and distribute instantly on the Sunday countdown expiry.
                </Text>

                <View style={[s.gridRow, isLargeScreen ? s.rowLayout : s.columnLayout, { marginTop: 18, gap: 14 }]}>
                  
                  {/* Prize Tier Standings */}
                  <View style={[s.gridCol, { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border }]}>
                    <Text style={s.subSectionTitle}>Prize Pool Distribution</Text>
                    <View style={s.prizeRow}>
                      <View style={[s.prizeMedal, { backgroundColor: C.gold + '20' }]}><Text style={{ color: C.gold, fontWeight: '900' }}>1</Text></View>
                      <Text style={s.prizeLabel}>Rank #1 Champion</Text>
                      <Text style={s.prizeValue}>500 ETB</Text>
                    </View>
                    <View style={s.prizeRow}>
                      <View style={[s.prizeMedal, { backgroundColor: C.silver + '20' }]}><Text style={{ color: C.silver, fontWeight: '900' }}>2</Text></View>
                      <Text style={s.prizeLabel}>Rank #2 Second</Text>
                      <Text style={s.prizeValue}>300 ETB</Text>
                    </View>
                    <View style={s.prizeRow}>
                      <View style={[s.prizeMedal, { backgroundColor: C.bronze + '20' }]}><Text style={{ color: C.bronze, fontWeight: '900' }}>3</Text></View>
                      <Text style={s.prizeLabel}>Rank #3 Third</Text>
                      <Text style={s.prizeValue}>200 ETB</Text>
                    </View>
                  </View>

                  {/* SMS / In-App Notification Preview */}
                  <View style={[s.gridCol, { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border }]}>
                    <Text style={s.subSectionTitle}>User Notification Previews</Text>
                    
                    {/* Victory notification mockup */}
                    <Text style={s.notificationPreviewHeader}>IN-APP VICTORY NOTIFICATION</Text>
                    <View style={s.mockNotification}>
                      <View style={s.mockNotificationHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="trophy" size={14} color={C.gold} />
                          <Text style={s.mockNotifTitle}>Weekly Leaderboard Champion</Text>
                        </View>
                        <Text style={s.mockNotifTime}>Just now</Text>
                      </View>
                      <Text style={s.mockNotifBody}>
                        Congratulations! You finished the week as one of our champion players! A reward of 500 ETB has been credited directly to your wallet balance. Keep playing!
                      </Text>
                    </View>
                  </View>

                </View>
              </View>
            </View>
          ) : (
            /* ================= MODE: MANUAL CONTROL ================= */
            <View style={s.card}>
              <View style={[s.cardHeader, { borderBottomColor: '#f59e0b40' }]}>
                <View style={s.titleRow}>
                  <Ionicons name="hammer-sharp" size={20} color="#f59e0b" />
                  <Text style={[s.cardTitle, { color: '#f59e0b', fontSize: 16 }]}>MANUAL CONSOLE & WEEK SNAPSHOT</Text>
                </View>
                <View style={[s.activeStatusBadge, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b40' }]}>
                  <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '900' }}>MANUAL</Text>
                </View>
              </View>

              <View style={s.cardContent}>
                <Text style={s.modeDescription}>
                  Audit standings and trigger distributions manually. You can set customized rewards for the weekly winners and distribute notifications at any time.
                </Text>

                {giveawayLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
                ) : giveawayData?.winners?.length ? (
                  <View style={[s.gridRow, isLargeScreen ? s.rowLayout : s.columnLayout, { marginTop: 18, gap: 14 }]}>
                    
                    {/* Top 3 Winners custom inputs */}
                    <View style={[s.gridCol, { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border }]}>
                      <Text style={s.subSectionTitle}>Configure Champion Rewards</Text>
                      
                      {giveawayData.winners.slice(0, 3).map((w: any) => {
                        const defaultPrize = w.rank === 1 ? '500' : w.rank === 2 ? '300' : '200';
                        return (
                          <View key={w.id} style={{ marginBottom: 16 }}>
                            <View style={s.giveawayWinnerRow}>
                              <View style={[s.prizeMedal, { backgroundColor: rankColor(w.rank) + '20', width: 26, height: 26 }]}>
                                <Text style={{ color: rankColor(w.rank), fontWeight: '900', fontSize: 12 }}>#{w.rank}</Text>
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={s.giveawayWinnerName}>{w.username}</Text>
                                <Text style={s.giveawayWinnerWins}>{w.wins} wins · {w.number}</Text>
                              </View>
                              <View style={s.giveawayInputContainer}>
                                <TextInput
                                  style={s.giveawayPrizeInput}
                                  placeholder={defaultPrize}
                                  placeholderTextColor="rgba(255,255,255,0.2)"
                                  value={prizeAmounts[w.id] || ''}
                                  onChangeText={(v) => setPrizeAmounts(p => ({ ...p, [w.id]: v }))}
                                  keyboardType="numeric"
                                />
                                <Text style={s.giveawayCurrencyLabel}>ETB</Text>
                              </View>
                            </View>
                            
                            {/* Quick Adjust Suggestions */}
                            <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 36, marginTop: 2 }}>
                              <TouchableOpacity 
                                style={s.quickAdjBtn} 
                                onPress={() => adjustPrize(w.id, 50)}
                                activeOpacity={0.7}
                              >
                                <Text style={s.quickAdjText}>+50</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={s.quickAdjBtn} 
                                onPress={() => adjustPrize(w.id, 100)}
                                activeOpacity={0.7}
                              >
                                <Text style={s.quickAdjText}>+100</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[s.quickAdjBtn, { borderColor: 'rgba(239, 68, 68, 0.2)' }]} 
                                onPress={() => resetPrize(w.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={[s.quickAdjText, { color: C.red }]}>Reset</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* SMS Message Customizer */}
                    <View style={[s.gridCol, { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border }]}>
                      <Text style={s.subSectionTitle}>SMS Announcement Template</Text>
                      
                      <TextInput
                        style={s.smsTextInput}
                        multiline
                        numberOfLines={4}
                        value={smsMessage}
                        onChangeText={setSmsMessage}
                        placeholder="Write SMS template..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                      />

                      {/* Clickable Variable Tag Badges */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 12, alignItems: 'center' }}>
                        <Text style={[s.smsVariablesDesc, { marginTop: 0, marginRight: 4, fontWeight: '700' }]}>Insert Tag:</Text>
                        <TouchableOpacity 
                          style={s.tagBadge}
                          onPress={() => setSmsMessage(prev => prev + ' {username}')}
                          activeOpacity={0.7}
                        >
                          <Text style={s.tagBadgeText}>{'{username}'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={s.tagBadge}
                          onPress={() => setSmsMessage(prev => prev + ' {rank}')}
                          activeOpacity={0.7}
                        >
                          <Text style={s.tagBadgeText}>{'{rank}'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={s.tagBadge}
                          onPress={() => setSmsMessage(prev => prev + ' {prize}')}
                          activeOpacity={0.7}
                        >
                          <Text style={s.tagBadgeText}>{'{prize}'}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={s.manualActionRow}>
                        <TouchableOpacity
                          onPress={() => sendGiveawaySMS(true)}
                          disabled={sendingGiveaway}
                          style={s.dryRunBtn}
                          activeOpacity={0.7}
                        >
                          {sendingGiveaway ? (
                            <ActivityIndicator color={C.accent} size="small" />
                          ) : (
                            <Text style={s.dryRunBtnText}>🧪 Preview SMS</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setShowSMSConfirm(true)}
                          disabled={sendingGiveaway}
                          style={s.payoutBtn}
                          activeOpacity={0.8}
                        >
                          <LinearGradient colors={[C.accent, '#00b4cc']} style={s.payoutInner}>
                            <Ionicons name="paper-plane" size={14} color="#0a0a1a" />
                            <Text style={s.payoutBtnText}>Send & Snapshot</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>

                  </View>
                ) : (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: C.dim }}>No current standings data for award calculations.</Text>
                  </View>
                )}

                {/* Dry Run Preview Log */}
                {giveawayResults.length > 0 && (
                  <View style={s.resultsCard}>
                    <Text style={s.resultsTitle}>Dry Run Distribution Output</Text>
                    {giveawayResults.map((r: any, i: number) => (
                      <View key={i} style={s.resultItem}>
                        <Text style={{ color: C.txt, fontSize: 12 }}>{r.phone} ({r.username || 'User'})</Text>
                        <View style={[s.statusBadge, { backgroundColor: r.status === 'dry_run' ? C.accent + '20' : C.green + '20', borderColor: r.status === 'dry_run' ? C.accent + '40' : C.green + '40' }]}>
                          <Text style={{ color: r.status === 'dry_run' ? C.accent : C.green, fontSize: 9, fontWeight: '900' }}>{r.status.toUpperCase()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Manual snapshot fallback */}
                <TouchableOpacity onPress={createSnapshot} style={[s.snapshotBtn, { marginTop: 14 }]} activeOpacity={0.85}>
                  <LinearGradient colors={['#111118', '#0c0c15']} style={s.snapshotInner}>
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={s.snapshotText}>Trigger Emergency Standings Capture</Text>
                  </LinearGradient>
                </TouchableOpacity>

              </View>
            </View>
          )}

          {/* ================= MOCK/FAKE TICKER MANAGER ================= */}
          <View style={[s.card, { marginTop: 16 }]}>
            <View style={s.cardHeader}>
              <View style={s.titleRow}>
                <Ionicons name="megaphone-outline" size={16} color={C.secondary} />
                <Text style={s.cardTitle}>Home Page Ticker Manager</Text>
              </View>
            </View>

            <View style={s.cardContent}>
              <Text style={s.modeDescription}>
                Manage the scrolling winner ticker that appears on the home page. These entries appear in the live "🔥 WON" feed at the bottom of the gameplay screen — they do NOT affect the leaderboard standings.
              </Text>

              <View style={s.fakeForm}>
                <TextInput
                  style={s.fakeInput}
                  placeholder="Username"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={newFakeName}
                  onChangeText={setNewFakeName}
                />
                <TextInput
                  style={[s.fakeInput, { width: 100 }]}
                  placeholder="Amount (ETB)"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  value={newFakeAmount}
                  onChangeText={setNewFakeAmount}
                />
                <TouchableOpacity onPress={addFakeEntry} style={s.fakeAddBtn} activeOpacity={0.8}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {fakeEntries.length === 0 ? (
                <Text style={s.emptyText}>No manual overrides active. Ticker relies on real user transactions.</Text>
              ) : (
                <View style={s.fakeEntriesContainer}>
                  {fakeEntries.map(entry => (
                    <View key={entry.id} style={s.fakeRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="gift-outline" size={14} color={C.secondary} />
                        <Text style={s.fakeName}>{entry.username}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={s.fakeAmount}>{entry.amount} ETB</Text>
                        <TouchableOpacity onPress={() => deleteFakeEntry(entry.id)} style={s.fakeDeleteBtn} activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={14} color={C.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>

        <ActionConfirmModal
          visible={showSMSConfirm}
          title={isEN ? "Trigger Prize Disbursement" : "ለአሸናፊዎች ሽልማት ላክ"}
          message={isEN 
            ? "Are you sure you want to capture the standings snapshot, commit prize wallets, and distribute real SMS notifications to top winners?" 
            : "ቅጽበታዊ መረጃዎችን ለመያዝ ፣ የኪስ ቦርሳዎችን ለመሙላት እና ለእውነተኛ አሸናፊዎች የኤስኤምኤስ ማሳወቂያዎችን ለመላክ እርግጠኛ ነዎት?"
          }
          confirmText={isEN ? "Confirm & Settle" : "አዎ ፣ ፈቅድ"}
          confirmColor="yellow"
          iconName="paper-plane-outline"
          isLoading={sendingGiveaway}
          onCancel={() => setShowSMSConfirm(false)}
          onConfirm={async () => {
            await sendGiveawaySMS(false);
            setShowSMSConfirm(false);
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18 },
  modeSelectorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
  },
  modeSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeSelectorTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: C.dim,
    letterSpacing: 1,
  },
  modeBtnContainer: {
    flexDirection: 'row',
    height: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: '#fff',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.dim,
    letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: '#000',
    fontWeight: '900',
  },
  modeHintText: {
    fontSize: 11,
    color: 'rgba(148, 163, 184, 0.6)',
    marginTop: 10,
    lineHeight: 15,
    paddingHorizontal: 2,
  },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadText: { color: C.dim, fontSize: 13, marginTop: 10, fontWeight: '600' },

  // Header styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownGlow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubTitle: {
    fontSize: 11,
    color: C.dim,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...Platform.select({
      web: { display: 'flex' },
      default: { display: 'none' }
    })
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week Banner Card
  bannerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  bannerInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerCol: {
    flex: 1,
    minWidth: 200,
    paddingVertical: 4,
  },
  bannerDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
    ...Platform.select({
      web: { display: 'flex' },
      default: { display: 'none' }
    })
  },
  bannerHeaderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bannerLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.dim,
    letterSpacing: 0.8,
  },
  bannerDatesText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  bannerTimerText: {
    fontSize: 20,
    fontWeight: '900',
    color: C.secondary,
    letterSpacing: 1.5,
  },
  pulseIcon: {
    transform: [{ scale: 1 }],
  },

  // Workspace Grid
  gridRow: {
    gap: 16,
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  columnLayout: {
    flexDirection: 'column',
  },
  gridCol: {
    minWidth: '30%',
  },

  // Core Premium Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: C.cardHeader,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 16,
  },

  // Standings Lists
  countBadge: {
    backgroundColor: 'rgba(0, 218, 243, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.secondary,
  },
  standingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  standingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
  },
  standingName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.txt,
  },
  standingPhone: {
    fontSize: 10,
    color: C.dim,
    marginTop: 2,
  },
  standingRight: {
    alignItems: 'stretch',
    minWidth: 110,
  },
  standingWins: {
    fontSize: 13,
    fontWeight: '800',
    color: C.gold,
  },
  barContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Settings Layout
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 10,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.txt,
  },
  settingDesc: {
    fontSize: 10,
    color: C.dim,
    marginTop: 2,
  },

  // Past Snapshots
  approveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.green + '15',
    borderWidth: 1,
    borderColor: C.green + '40',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  approveAllText: {
    color: C.green,
    fontSize: 10,
    fontWeight: '800',
  },
  snapshotGroup: {
    marginBottom: 16,
  },
  snapshotGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  snapshotGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
    letterSpacing: 0.5,
  },
  snapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  snapInfo: {
    flex: 1,
  },
  snapName: {
    fontSize: 12,
    fontWeight: '700',
    color: C.txt,
  },
  snapMeta: {
    fontSize: 10,
    color: C.dim,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  approveBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Bottom Conditional Mode Sections
  moduleDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: 10,
  },
  activeStatusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeDescription: {
    fontSize: 12,
    color: C.dim,
    lineHeight: 18,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    paddingBottom: 6,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  prizeMedal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeLabel: {
    fontSize: 12,
    color: C.txt,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  prizeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: C.secondary,
  },

  // Mock Notifications
  notificationPreviewHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mockNotification: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
  },
  mockNotificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mockNotifTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  mockNotifTime: {
    fontSize: 8,
    color: C.dim,
  },
  mockNotifBody: {
    fontSize: 10,
    color: C.dim,
    lineHeight: 14,
  },

  // Manual configuration inputs
  giveawayWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  giveawayWinnerName: {
    fontSize: 12,
    fontWeight: '700',
    color: C.txt,
  },
  giveawayWinnerWins: {
    fontSize: 10,
    color: C.dim,
    marginTop: 1,
  },
  giveawayInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 90,
  },
  giveawayPrizeInput: {
    flex: 1,
    paddingVertical: 5,
    color: C.gold,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  giveawayCurrencyLabel: {
    fontSize: 9,
    color: C.dim,
    fontWeight: '800',
  },
  smsTextInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    color: '#fff',
    fontSize: 11,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  smsVariablesDesc: {
    fontSize: 9,
    color: C.dim,
    marginTop: 4,
  },
  manualActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dryRunBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dryRunBtnText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  payoutBtn: {
    flex: 1.2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  payoutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  payoutBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  // Dry run result logs
  resultsCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
  },
  resultsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },

  // Manual snapshot fallback action
  snapshotBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  snapshotInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  snapshotText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  // Mock winner overrides
  fakeForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fakeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 12,
  },
  fakeAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fakeEntriesContainer: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 10,
  },
  fakeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  fakeName: {
    fontSize: 12,
    color: C.txt,
    fontWeight: '600',
  },
  fakeAmount: {
    fontSize: 12,
    color: C.secondary,
    fontWeight: '800',
  },
  fakeDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: C.red + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAdjBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    backgroundColor: 'rgba(0, 229, 255, 0.03)',
  },
  quickAdjText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 77, 0.25)',
    backgroundColor: 'rgba(255, 184, 77, 0.05)',
  },
  tagBadgeText: {
    color: '#ffb84d',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: C.dim,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    height: 38,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageText: {
    color: C.dim,
    fontSize: 11,
    fontWeight: '600',
  },
});
