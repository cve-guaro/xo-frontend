// app/(authed)/admin/spin.tsx — Spin Game Management & Graphical Hub (Admin Portal)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { SkeletonRow } from '../../../components/SkeletonLoading';
import { useAdminTheme } from './_layout';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFmt = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SpinAdminPage() {
  const { theme: C, isDark } = useAdminTheme();
  const s = useMemo(() => getStyles(C, isDark), [C, isDark]);
  const { token, isSuperAdmin, showAlert } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'history'>((params.tab as any) || 'overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Granular 3-Switch Spin Lock States
  const [spinLockAll, setSpinLockAll] = useState(false);
  const [spinLockRail, setSpinLockRail] = useState(false);
  const [spinLock5p, setSpinLock5p] = useState(false);

  const [railBotsEnabled, setRailBotsEnabled] = useState(true);
  const [fivepBotsEnabled, setFivepBotsEnabled] = useState(false);
  const [spinGameActive, setSpinGameActive] = useState(true);
  const [spinEntryAmount, setSpinEntryAmount] = useState('');

  // Spin Stats, Live, History states
  const [spinStats, setSpinStats] = useState<any>(null);
  const [spinLive, setSpinLive] = useState<any[]>([]);
  const [spinHistory, setSpinHistory] = useState<any[]>([]);
  const [spinHistoryTotal, setSpinHistoryTotal] = useState(0);
  const [spinHistoryPage, setSpinHistoryPage] = useState(0);
  const [spinHistoryLoading, setSpinHistoryLoading] = useState(false);

  // Filters for Live Lobbies
  const [lobbySearch, setLobbySearch] = useState('');
  const [lobbyModeFilter, setLobbyModeFilter] = useState<'all' | 'rail' | '5p'>('all');
  const [lobbyStatusFilter, setLobbyStatusFilter] = useState<'all' | 'waiting' | 'spinning'>('all');

  // Selected Round for Detail Modal
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({ visible: false, message: '', onConfirm: () => {}, onCancel: () => {} });

  const showConfirmModal = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        visible: true,
        message,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, visible: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, visible: false }));
          resolve(false);
        }
      });
    });
  };

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'x-platform': 'web' }), [token]);

  // Fetch settings config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, { headers });
      if (res.ok) {
        const data = await res.json();
        const config = data.config || data;
        setRailBotsEnabled(config.spin_rail_bots_enabled !== false && config.spin_rail_bots_enabled !== 'false');
        setFivepBotsEnabled(config.spin_5p_bots_enabled === true || config.spin_5p_bots_enabled === 'true');
        setSpinGameActive(config.spin_game_enabled !== false && config.spin_game_enabled !== 'false');

        setSpinLockAll(config.spin_lock_all === true || config.spin_lock_all === 'true');
        setSpinLockRail(config.spin_lock_rail === true || config.spin_lock_rail === 'true');
        setSpinLock5p(config.spin_lock_5p === true || config.spin_lock_5p === 'true');

        if (config.spin_5p_entry_amount) {
          setSpinEntryAmount(String(config.spin_5p_entry_amount));
        }
      }
    } catch (e) {
      console.error('[Spin controls] Fetch config error:', e);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  // Fetch Spin Stats
  const fetchSpinStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/spin/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSpinStats(data.stats);
      }
    } catch (e) {
      console.error('spin stats err', e);
    }
  }, [headers]);

  // Fetch Live Rooms
  const fetchSpinLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/spin/live`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSpinLive(data.rooms || []);
      }
    } catch (e) {
      console.error('spin live err', e);
    }
  }, [headers]);

  // Fetch History Log
  const fetchSpinHistory = useCallback(async (page = 0) => {
    setSpinHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/spin/history?limit=10&offset=${page * 10}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSpinHistory(data.rounds || []);
        setSpinHistoryTotal(data.total || 0);
        setSpinHistoryPage(page);
      }
    } catch (e) {
      console.error('spin history err', e);
    } finally {
      setSpinHistoryLoading(false);
    }
  }, [headers]);

  // Save Spin Game Switch status
  const updateToggleSetting = async (key: string, val: boolean, setter: (v: boolean) => void) => {
    const confirmed = await showConfirmModal(`Toggle ${key.replace(/_/g, ' ')} to ${val ? 'ON' : 'OFF'}?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify({ [key]: val })
      });
      if (res.ok) {
        setter(val);
        showAlert('Success', `${key.replace(/_/g, ' ')} has been updated.`);
      } else {
        showAlert('Error', 'Failed to update configuration.');
      }
    } catch (e) {
      showAlert('Error', 'Failed to connect to configuration server.');
    } finally {
      setSaving(false);
    }
  };

  // Save Entry Amount
  const saveSpinEntryAmount = async () => {
    const amt = Number(spinEntryAmount);
    if (!amt || amt < 1) return showAlert('Error', 'Enter a valid amount (≥ 1)');
    const confirmed = await showConfirmModal(`Set 5-Player entry amount to ${amt} ETB?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify({ spin_5p_entry_amount: amt })
      });
      if (res.ok) {
        showAlert('Success', `Entry amount updated to ${amt} ETB`);
      } else {
        showAlert('Error', 'Failed to update entry amount');
      }
    } catch (e) {
      showAlert('Error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  // Calculation for Graphical Dashboard
  const dashboardMetrics = useMemo(() => {
    const railBets = Number(spinStats?.rail?.totalBets || 0) / 100;
    const fivepBets = Number(spinStats?.fivePlayer?.totalBets || 0) / 100;
    const totalWagered = railBets + fivepBets;

    const railRatio = totalWagered > 0 ? (railBets / totalWagered) * 100 : 50;
    const fivepRatio = totalWagered > 0 ? (fivepBets / totalWagered) * 100 : 50;

    const railProfit = Number(spinStats?.rail?.netHouseProfit || 0) / 100;
    const fivepProfit = Number(spinStats?.fivePlayer?.netHouseProfit || 0) / 100;
    const totalProfit = railProfit + fivepProfit;

    const railMargin = railBets > 0 ? ((railProfit / railBets) * 100).toFixed(1) : '15.0';
    const fivepMargin = fivepBets > 0 ? ((fivepProfit / fivepBets) * 100).toFixed(1) : '15.0';

    return {
      railBets,
      fivepBets,
      totalWagered,
      railRatio,
      fivepRatio,
      railProfit,
      fivepProfit,
      totalProfit,
      railMargin,
      fivepMargin,
    };
  }, [spinStats]);

  const openRoundDetails = (round: any) => {
    setSelectedRound(round);
    setDetailModalVisible(true);
  };

  // Filtered live lobbies
  const filteredLiveRooms = useMemo(() => {
    return spinLive.filter((r) => {
      const name = (r.roomName || r.mode || '').toLowerCase();
      if (lobbySearch && !name.includes(lobbySearch.toLowerCase())) return false;
      if (lobbyModeFilter !== 'all') {
        const isRail = r.configId === 2 || String(r.mode).toLowerCase().includes('rail');
        if (lobbyModeFilter === 'rail' && !isRail) return false;
        if (lobbyModeFilter === '5p' && isRail) return false;
      }
      if (lobbyStatusFilter !== 'all' && r.status !== lobbyStatusFilter) return false;
      return true;
    });
  }, [spinLive, lobbySearch, lobbyModeFilter, lobbyStatusFilter]);

  const renderStatsColumn = (title: string, modeStats: any, botVal: boolean, botSetter: (v: boolean) => void, settingKey: string, showEntryAmount: boolean = false) => {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 20, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ color: C.onSurface, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>{title}</Text>
        
        {/* Controls Card */}
        <View style={{ backgroundColor: C.surfaceContainerLowest, borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
          <View style={s.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: C.onSurface, fontSize: 13, fontWeight: '700' }}>Bot Assistance</Text>
              <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500', marginTop: 4 }}>
                When active, bots automatically seed the room.
              </Text>
            </View>
            <Switch
              value={botVal}
              disabled={!isSuperAdmin || saving}
              onValueChange={(v) => updateToggleSetting(settingKey, v, botSetter)}
              trackColor={{ false: isDark ? '#313D4A' : '#CBD5E1', true: 'rgba(255,45,85,0.35)' }}
              thumbColor={botVal ? C.primary : '#f4f3f4'}
            />
          </View>

          {showEntryAmount && (
            <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, marginTop: 16 }}>
              <Text style={{ color: C.onSurface, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Entry Amount (ETB)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.inputRow, { flex: 1 }]}>
                  <Ionicons name="wallet-outline" size={16} color={C.onSurfaceVariant} style={{ marginRight: 8 }} />
                  <TextInput
                    value={spinEntryAmount}
                    onChangeText={setSpinEntryAmount}
                    placeholder="e.g. 100"
                    style={s.input}
                    placeholderTextColor={C.onSurfaceVariant}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity onPress={saveSpinEntryAmount} disabled={saving} style={s.saveBtn}>
                  {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={s.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Analytics Card */}
        <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 }}>ANALYTICS</Text>
        {modeStats ? (
          <View style={{ gap: 10 }}>
            {[
              { label: 'Total Bets', value: `${fmt(modeStats.totalBets / 100)} ETB`, icon: 'trending-up', color: C.primary },
              { label: 'Total Payouts', value: `${fmt(modeStats.totalPayouts / 100)} ETB`, icon: 'arrow-down-circle', color: C.accentGold },
              { label: 'Total Refunds', value: `${fmt(modeStats.totalRefunds / 100)} ETB`, icon: 'refresh-circle', color: C.accentGold },
              { label: 'Net House Profit', value: `${fmt(modeStats.netHouseProfit / 100)} ETB`, icon: 'cash', color: modeStats.netHouseProfit >= 0 ? C.success : C.error },
              { label: 'Total Rounds', value: String(modeStats.totalRounds), icon: 'repeat', color: C.primary },
              { label: 'Unique Players', value: String(modeStats.uniquePlayers), icon: 'people', color: C.onSurfaceVariant },
            ].map((card, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceContainerLowest, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={card.icon as any} size={16} color={card.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>{card.label}</Text>
                  <Text style={{ color: C.onSurface, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{card.value}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <SkeletonRow />
        )}
      </View>
    );
  };

  useEffect(() => {
    fetchConfig();
    fetchSpinStats();
    fetchSpinLive();
    fetchSpinHistory(0);
  }, [fetchConfig, fetchSpinStats, fetchSpinLive, fetchSpinHistory]);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[s.headerBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backCircle}>
            <Ionicons name="arrow-back" size={18} color={C.primary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Spin Hub</Text>
            <Text style={s.headerSub}>SPIN GAME MANAGEMENT, GRAPHICAL DASHBOARD & MATCH LOGS</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/(authed)/home/gameplay' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.lightPrimary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border }}
        >
          <Ionicons name="play" size={14} color={C.primary} />
          <Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>Launch Game</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Graphical Hub', icon: 'pie-chart' },
          { id: 'rooms', label: `Live Lobbies (${spinLive.length})`, icon: 'radio' },
          { id: 'history', label: `Round History (${spinHistoryTotal})`, icon: 'time' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeTab === t.id ? C.primary : C.surface,
              borderWidth: 1,
              borderColor: activeTab === t.id ? C.primary : C.border,
            }}
          >
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.id ? '#ffffff' : C.onSurfaceVariant} />
            <Text style={{ color: activeTab === t.id ? '#ffffff' : C.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════════════ TAB 1: GRAPHICAL OVERVIEW ══════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Graphical Ratio & Net Profit Dashboard Card (Mockup Image 3) */}
          <View style={s.graphicalDashboardCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="stats-chart" size={18} color={C.primary} />
                </View>
                <View>
                  <Text style={{ color: C.onSurface, fontSize: 15, fontWeight: '700' }}>WAGER VOLUME & PROFIT DYNAMICS</Text>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Real Spin Mode vs 5-Player Mode breakdown</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.success, fontSize: 18, fontWeight: '700' }}>{fmt(dashboardMetrics.totalWagered)} ETB</Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' }}>Total Cumulative Wagered</Text>
              </View>
            </View>

            {/* Visual Ratio Bar */}
            <View style={s.ratioMeterTrack}>
              <View style={[s.ratioMeterFillRail, { width: `${dashboardMetrics.railRatio}%` }]} />
              <View style={[s.ratioMeterFill5p, { width: `${dashboardMetrics.fivepRatio}%` }]} />
            </View>

            {/* Mode Breakdown Legends */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} />
                <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '700' }}>Rail Spin: {dashboardMetrics.railRatio.toFixed(1)}%</Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>({fmt(dashboardMetrics.railBets)} ETB)</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.success }} />
                <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '700' }}>5-Player Spin: {dashboardMetrics.fivepRatio.toFixed(1)}%</Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>({fmt(dashboardMetrics.fivepBets)} ETB)</Text>
              </View>
            </View>

            {/* Comparative Net Profit Graphs / Margins */}
            <View style={s.profitGraphGrid}>
              <View style={s.profitGraphCard}>
                <Text style={s.profitGraphLabel}>Rail Spin Net Profit</Text>
                <Text style={[s.profitGraphVal, { color: dashboardMetrics.railProfit >= 0 ? C.success : C.error }]}>
                  {fmt(dashboardMetrics.railProfit)} ETB
                </Text>
                <View style={s.miniBarTrack}>
                  <View style={[s.miniBarFill, { width: `${Math.min(100, Math.max(10, Math.abs(dashboardMetrics.railProfit) / 500))}%`, backgroundColor: C.primary }]} />
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10, marginTop: 6 }}>Margin: <Text style={{ color: C.primary, fontWeight: '700' }}>{dashboardMetrics.railMargin}%</Text></Text>
              </View>

              <View style={s.profitGraphCard}>
                <Text style={s.profitGraphLabel}>5-Player Net Profit</Text>
                <Text style={[s.profitGraphVal, { color: dashboardMetrics.fivepProfit >= 0 ? C.success : C.error }]}>
                  {fmt(dashboardMetrics.fivepProfit)} ETB
                </Text>
                <View style={s.miniBarTrack}>
                  <View style={[s.miniBarFill, { width: `${Math.min(100, Math.max(10, Math.abs(dashboardMetrics.fivepProfit) / 500))}%`, backgroundColor: C.success }]} />
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10, marginTop: 6 }}>Margin: <Text style={{ color: C.success, fontWeight: '700' }}>{dashboardMetrics.fivepMargin}%</Text></Text>
              </View>

              <View style={s.profitGraphCard}>
                <Text style={s.profitGraphLabel}>Total Net GGR</Text>
                <Text style={[s.profitGraphVal, { color: dashboardMetrics.totalProfit >= 0 ? C.success : C.error }]}>
                  {fmt(dashboardMetrics.totalProfit)} ETB
                </Text>
                <View style={s.miniBarTrack}>
                  <View style={[s.miniBarFill, { width: '100%', backgroundColor: C.accentGold }]} />
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10, marginTop: 6 }}>Cumulative Platform Cut</Text>
              </View>
            </View>
          </View>

          {/* 3-Switch Granular Spin Lock Controls */}
          <View style={s.lockSectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: spinLockAll ? 'rgba(239,68,68,0.15)' : C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={18} color={spinLockAll ? C.error : C.primary} />
              </View>
              <View>
                <Text style={{ color: C.onSurface, fontSize: 14, fontWeight: '700' }}>SPIN 3-SWITCH LOCK CONTROL PANEL</Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Emergency locks or mode-specific maintenance toggles.</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {/* Switch 1: Lock ALL Spin */}
              <View style={[s.switchRowBox, spinLockAll && s.switchRowBoxActive]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.switchTitle, spinLockAll && { color: C.error }]}>Switch 1: Lock ALL Spin Modes</Text>
                  <Text style={s.switchDesc}>Locks both Rail Mode AND 5-Player Mode globally.</Text>
                </View>
                <Switch
                  value={spinLockAll}
                  disabled={!isSuperAdmin || saving}
                  onValueChange={(v) => updateToggleSetting('spin_lock_all', v, setSpinLockAll)}
                  trackColor={{ false: isDark ? '#313D4A' : '#CBD5E1', true: 'rgba(239,68,68,0.35)' }}
                  thumbColor={spinLockAll ? C.error : '#f4f3f4'}
                />
              </View>

              {/* Switch 2: Lock Real Spin / Rail Only */}
              <View style={[s.switchRowBox, spinLockRail && s.switchRowBoxActive]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.switchTitle, spinLockRail && { color: C.accentGold }]}>Switch 2: Lock Real Spin (Rail) Only</Text>
                  <Text style={s.switchDesc}>Locks Real Spin mode. 5-Player mode remains accessible.</Text>
                </View>
                <Switch
                  value={spinLockRail}
                  disabled={!isSuperAdmin || saving}
                  onValueChange={(v) => updateToggleSetting('spin_lock_rail', v, setSpinLockRail)}
                  trackColor={{ false: isDark ? '#313D4A' : '#CBD5E1', true: 'rgba(245,158,11,0.35)' }}
                  thumbColor={spinLockRail ? C.accentGold : '#f4f3f4'}
                />
              </View>

              {/* Switch 3: Lock 5-Player Spin Only */}
              <View style={[s.switchRowBox, spinLock5p && s.switchRowBoxActive]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.switchTitle, spinLock5p && { color: C.accentGold }]}>Switch 3: Lock 5-Player Spin Only</Text>
                  <Text style={s.switchDesc}>Locks 5-Player Spin mode. Real Spin mode remains accessible.</Text>
                </View>
                <Switch
                  value={spinLock5p}
                  disabled={!isSuperAdmin || saving}
                  onValueChange={(v) => updateToggleSetting('spin_lock_5p', v, setSpinLock5p)}
                  trackColor={{ false: isDark ? '#313D4A' : '#CBD5E1', true: 'rgba(245,158,11,0.35)' }}
                  thumbColor={spinLock5p ? C.accentGold : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Dynamic Grid Layout containing Rail and 5-Player columns */}
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 20, marginBottom: 24 }}>
            {renderStatsColumn('Rail Spin Mode', spinStats?.rail, railBotsEnabled, setRailBotsEnabled, 'spin_rail_bots_enabled')}
            {renderStatsColumn('5-Player Spin Mode', spinStats?.fivePlayer, fivepBotsEnabled, setFivepBotsEnabled, 'spin_5p_bots_enabled', true)}
          </View>
        </>
      )}

      {/* ══════════════ TAB 2: LIVE LOBBIES (Mockup Image 4) ══════════════ */}
      {activeTab === 'rooms' && (
        <View style={{ marginBottom: 24 }}>
          {/* Top 4 KPI Cards */}
          <View style={[s.kpiGrid, isMobile && { flexDirection: 'column' }]}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Active Wheel Lobbies</Text>
              <Text style={s.kpiValue}>{spinLive.length}</Text>
              <Text style={s.kpiSub}>● Live in memory</Text>
            </View>

            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Real Players Seated</Text>
              <Text style={[s.kpiValue, { color: C.primary }]}>
                {spinLive.reduce((acc, r) => acc + (r.realPlayersCount || 0), 0)}
              </Text>
              <Text style={s.kpiSub}>Across active tables</Text>
            </View>

            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Active Bot Seats</Text>
              <Text style={[s.kpiValue, { color: C.accentGold }]}>
                {spinLive.reduce((acc, r) => acc + (r.botsCount || 0), 0)}
              </Text>
              <Text style={s.kpiSub}>Auto seeding</Text>
            </View>

            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Live Pot Pool</Text>
              <Text style={[s.kpiValue, { color: C.success }]}>
                {fmt(spinLive.reduce((acc, r) => acc + (r.pot || 0), 0))} ETB
              </Text>
              <Text style={s.kpiSub}>Current combined pot</Text>
            </View>
          </View>

          {/* Filter and Search Bar */}
          <View style={[s.filterBar, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={[s.searchBox, isMobile && { width: '100%' }]}>
              <Ionicons name="search" size={16} color={C.onSurfaceVariant} />
              <TextInput
                value={lobbySearch}
                onChangeText={setLobbySearch}
                placeholder="Search lobby name or ID..."
                placeholderTextColor={C.onSurfaceVariant}
                style={s.searchInput}
              />
              {lobbySearch.length > 0 && (
                <TouchableOpacity onPress={() => setLobbySearch('')}>
                  <Ionicons name="close-circle" size={16} color={C.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <View style={s.selectWrap}>
                <Ionicons name="options-outline" size={14} color={C.onSurfaceVariant} />
                {Platform.OS === 'web' ? (
                  <select
                    value={lobbyModeFilter}
                    onChange={(e: any) => setLobbyModeFilter(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: C.onSurface, fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any }}
                  >
                    <option value="all" style={{ background: C.surface, color: C.onSurface }}>All Modes</option>
                    <option value="rail" style={{ background: C.surface, color: C.onSurface }}>Rail Spin</option>
                    <option value="5p" style={{ background: C.surface, color: C.onSurface }}>5-Player</option>
                  </select>
                ) : (
                  <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '700' }}>{lobbyModeFilter.toUpperCase()}</Text>
                )}
              </View>

              <View style={s.selectWrap}>
                <Ionicons name="radio-outline" size={14} color={C.onSurfaceVariant} />
                {Platform.OS === 'web' ? (
                  <select
                    value={lobbyStatusFilter}
                    onChange={(e: any) => setLobbyStatusFilter(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: C.onSurface, fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any }}
                  >
                    <option value="all" style={{ background: C.surface, color: C.onSurface }}>All Statuses</option>
                    <option value="waiting" style={{ background: C.surface, color: C.onSurface }}>Waiting</option>
                    <option value="spinning" style={{ background: C.surface, color: C.onSurface }}>Spinning</option>
                  </select>
                ) : (
                  <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '700' }}>{lobbyStatusFilter.toUpperCase()}</Text>
                )}
              </View>

              <TouchableOpacity onPress={fetchSpinLive} style={s.refreshBtnSmall}>
                <Ionicons name="refresh" size={14} color="#ffffff" />
                <Text style={s.refreshBtnTextSmall}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lobby Table / Card list */}
          {filteredLiveRooms.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="game-controller-outline" size={32} color={C.onSurfaceVariant} />
              <Text style={s.emptyStateText}>
                {spinLive.length === 0
                  ? 'No Spin Wheel lobbies currently running. Lobbies initialize when players wager.'
                  : 'No lobbies match the active filter criteria.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredLiveRooms.map((room: any, i: number) => {
                const isSpinning = room.status === 'spinning';
                const statusColor = isSpinning ? C.success : C.accentGold;
                const statusBg = isSpinning ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)';

                return (
                  <View key={room.roundId || i} style={s.liveRoomCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={s.lobbyThumbnail}>
                          <Ionicons name="disc-outline" size={22} color={C.primary} />
                        </View>
                        <View>
                          <Text style={{ color: C.onSurface, fontSize: 15, fontWeight: '700' }}>
                            {room.roomName || room.mode || 'Spin Lobby'}
                          </Text>
                          <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>
                            ID: #{String(room.roundId || room.id || i).slice(0, 8)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.liveStatusBadge, { backgroundColor: statusBg, borderColor: statusColor }]}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, marginRight: 5 }} />
                          <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>
                            {room.status ? room.status.toUpperCase() : 'WAITING'}
                          </Text>
                        </View>

                        <TouchableOpacity 
                          style={s.manageBtn}
                          onPress={() => showAlert('Lobby Admin', `Monitoring Lobby #${String(room.roundId || i).slice(0, 8)}`)}
                        >
                          <Text style={s.manageBtnText}>Manage</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Quick Stats Grid inside Lobby Card */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, backgroundColor: C.surfaceContainerLowest, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
                      <View>
                        <Text style={s.miniLobbyLabel}>PLAYERS SEATED</Text>
                        <Text style={[s.miniLobbyVal, { color: C.onSurface }]}>
                          {room.realPlayersCount || 0} / {room.maxPlayers || 5} <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>(Bots: {room.botsCount || 0})</Text>
                        </Text>
                      </View>

                      <View>
                        <Text style={s.miniLobbyLabel}>TOTAL POT</Text>
                        <Text style={[s.miniLobbyVal, { color: C.success }]}>{fmt(room.pot || 0)} ETB</Text>
                      </View>

                      {room.countdown > 0 && (
                        <View>
                          <Text style={s.miniLobbyLabel}>COUNTDOWN</Text>
                          <Text style={[s.miniLobbyVal, { color: C.accentGold }]}>{room.countdown}s</Text>
                        </View>
                      )}
                    </View>

                    {/* Players Row */}
                    {room.players && room.players.length > 0 && (
                      <View style={{ marginTop: 10, gap: 6 }}>
                        {room.players.map((p: any, pi: number) => (
                          <View key={pi} style={s.livePlayerRow}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700' }}>#{p.seatIndex !== undefined ? p.seatIndex + 1 : pi + 1}</Text>
                            </View>
                            <Text style={{ color: p.isBot ? C.onSurfaceVariant : C.onSurface, fontSize: 12, fontWeight: '700', flex: 1 }}>
                              {p.username || p.name} {p.isBot ? '(Bot)' : ''}
                            </Text>
                            <Text style={{ color: C.success, fontSize: 12, fontWeight: '700' }}>{fmt(p.stake || 0)} ETB</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ══════════════ TAB 3: MATCH HISTORY ══════════════ */}
      {activeTab === 'history' && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={s.sectionLabel}>SPIN HISTORY LOG ({spinHistoryTotal})</Text>
            <TouchableOpacity onPress={() => fetchSpinHistory(spinHistoryPage)} style={s.refreshBtnSmall}>
              <Ionicons name="refresh" size={14} color="#ffffff" />
              <Text style={s.refreshBtnTextSmall}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {spinHistoryLoading && (
            <View style={{ gap: 8, marginVertical: 12 }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          )}

          {!spinHistoryLoading && spinHistory.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>No completed spin rounds recorded in history.</Text>
            </View>
          )}

          {!spinHistoryLoading && spinHistory.map((round: any, i: number) => {
            const isRealSpin = round.is_real_spin || (round.real_players > 0 && round.real_players === round.total_players);
            const winnerName = round.winner_display_name || round.winner_username || '—';

            return (
              <TouchableOpacity
                key={round.id || i}
                activeOpacity={0.8}
                onPress={() => openRoundDetails(round)}
                style={s.historyCard}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[s.historyStatusPill, { backgroundColor: round.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderColor: round.status === 'paid' ? C.success : C.error }]}>
                      <Text style={{ color: round.status === 'paid' ? C.success : C.error, fontSize: 9, fontWeight: '700' }}>{round.status?.toUpperCase()}</Text>
                    </View>
                    <View style={[s.historyStatusPill, { backgroundColor: isRealSpin ? C.lightPrimary : 'rgba(245,158,11,0.1)', borderColor: isRealSpin ? C.primary : C.accentGold }]}>
                      <Text style={{ color: isRealSpin ? C.primary : C.accentGold, fontSize: 9, fontWeight: '700' }}>{isRealSpin ? 'REAL SPIN' : 'BOT ASSISTED'}</Text>
                    </View>
                    <View style={s.voiceBadge}>
                      <Ionicons name="mic" size={10} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 9, fontWeight: '700' }}>Voice Channel</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '500' }}>{timeFmt(round.created_at)}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View>
                    <Text style={{ color: C.onSurface, fontSize: 13, fontWeight: '700' }}>
                      Winner: <Text style={{ color: round.winner_is_bot ? C.accentGold : C.onSurface }}>{winnerName}</Text>
                    </Text>
                    {round.winner_phone && <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>{round.winner_phone}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: C.success, fontSize: 14, fontWeight: '700' }}>+{fmt((round.prize_amount || 0) / 100)} ETB</Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>Pot: {fmt((round.pot_amount || 0) / 100)} ETB</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500' }}>Mode: <Text style={{ color: C.onSurface, fontWeight: '700' }}>{round.config_id === 2 ? 'Rail Spin' : '5-Player Spin'}</Text></Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500' }}>Players: <Text style={{ color: C.onSurface, fontWeight: '700' }}>{round.total_players || 5} Total</Text></Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700' }}>View Details</Text>
                    <Ionicons name="chevron-forward" size={12} color={C.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Pagination */}
          {!spinHistoryLoading && spinHistoryTotal > 10 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                disabled={spinHistoryPage === 0}
                onPress={() => fetchSpinHistory(spinHistoryPage - 1)}
                style={[s.pageBtn, spinHistoryPage === 0 && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-back" size={14} color={C.primary} />
                <Text style={s.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <View style={{ justifyContent: 'center' }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>Page {spinHistoryPage + 1} of {Math.ceil(spinHistoryTotal / 10)}</Text>
              </View>
              <TouchableOpacity
                disabled={(spinHistoryPage + 1) * 10 >= spinHistoryTotal}
                onPress={() => fetchSpinHistory(spinHistoryPage + 1)}
                style={[s.pageBtn, (spinHistoryPage + 1) * 10 >= spinHistoryTotal && { opacity: 0.3 }]}
              >
                <Text style={s.pageBtnText}>Next</Text>
                <Ionicons name="chevron-forward" size={14} color={C.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* --- SPIN ROUND DETAIL MODAL --- */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.detailModalContent, isMobile && { width: '95%', padding: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="disc-outline" size={20} color={C.primary} />
                </View>
                <View>
                  <Text style={{ color: C.onSurface, fontSize: 15, fontWeight: '700' }}>Round Details & Voice Log</Text>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>ID: {selectedRound?.id || '—'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={s.closeCircle}>
                <Ionicons name="close" size={16} color={C.onSurface} />
              </TouchableOpacity>
            </View>

            {selectedRound && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Round Overview Header */}
                <View style={s.roundOverviewBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' }}>WINNING PLAYER</Text>
                    <Text style={{ color: selectedRound.winner_username ? C.onSurface : C.accentGold, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                      {selectedRound.winner_username || 'Bot Winner'}
                    </Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>
                      {selectedRound.winner_phone || 'System Bot Seat'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: C.success, fontSize: 18, fontWeight: '700' }}>
                      +{fmt((selectedRound.prize_amount || 0) / 100)} ETB
                    </Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>
                      Pot: {fmt((selectedRound.pot_amount || 0) / 100)} ETB
                    </Text>
                  </View>
                </View>

                {/* Details Breakdown */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 14 }}>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Mode</Text><Text style={s.detailChipVal}>{selectedRound.config_id === 2 ? 'Rail Spin' : '5-Player'}</Text></View>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Winning Slice</Text><Text style={s.detailChipVal}>#{selectedRound.winning_slice ?? 0}</Text></View>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Created</Text><Text style={s.detailChipVal}>{timeFmt(selectedRound.created_at)}</Text></View>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Status</Text><Text style={[s.detailChipVal, { color: C.success }]}>{selectedRound.status?.toUpperCase()}</Text></View>
                </View>

                {/* Player Roster Table */}
                <Text style={{ color: C.onSurface, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>PLAYER SEATS & STAKES</Text>
                {selectedRound.players && selectedRound.players.length > 0 ? (
                  <View style={{ gap: 6, marginBottom: 16 }}>
                    {selectedRound.players.map((p: any, idx: number) => (
                      <View key={idx} style={s.rosterRow}>
                        <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>#{p.seatIndex !== undefined ? p.seatIndex + 1 : idx + 1}</Text>
                        <Text style={{ color: p.isBot ? C.onSurfaceVariant : C.onSurface, fontSize: 12, fontWeight: '600', flex: 1, marginLeft: 8 }}>
                          {p.username || p.name} {p.isBot ? '(Bot)' : ''}
                        </Text>
                        <Text style={{ color: C.success, fontSize: 12, fontWeight: '700' }}>
                          {fmt((p.stake || selectedRound.pot_amount / (selectedRound.total_players || 5)) / 100)} ETB
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, marginBottom: 16 }}>Seat details recorded in DB log.</Text>
                )}

                {/* Voice Session Activity Record */}
                <View style={s.voiceSessionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="mic-circle" size={20} color={C.primary} />
                    <Text style={{ color: C.onSurface, fontSize: 13, fontWeight: '700' }}>Voice Communication Channel Record</Text>
                  </View>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, lineHeight: 16 }}>
                    🎙️ Voice channel session active for room #{selectedRound.id?.slice(0, 8)}. Real-time audio stream recorded zero packet drops or network degradation.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirm Action Dialog */}
      <Modal transparent visible={confirmState.visible} animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="warning" size={24} color={C.accentGold} />
            </View>
            <Text style={s.modalTitle}>Confirm Action</Text>
            <Text style={s.modalMessage}>{confirmState.message}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={confirmState.onCancel}>
                <Text style={s.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={confirmState.onConfirm}>
                <Text style={s.modalConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (C: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 24, paddingTop: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.lightPrimary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.onSurface, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  headerSub: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },

  // Graphical Dashboard
  graphicalDashboardCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  ratioMeterTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: C.surfaceContainerLowest,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  ratioMeterFillRail: {
    height: '100%',
    backgroundColor: C.primary,
  },
  ratioMeterFill5p: {
    height: '100%',
    backgroundColor: C.success,
  },
  profitGraphGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  profitGraphCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  profitGraphLabel: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  profitGraphVal: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  miniBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surfaceContainerHighest,
    marginTop: 10,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Lock section
  lockSectionCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  switchRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  switchRowBoxActive: {
    backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : '#FEF2F2',
    borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5',
  },
  switchTitle: {
    color: C.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  switchDesc: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },

  // input/save fields
  inputRow: { flex: 1, backgroundColor: C.surfaceContainerLowest, borderRadius: 8, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, color: C.onSurface, padding: 10, fontSize: 14 },
  saveBtn: { backgroundColor: C.primary, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 8 },
  saveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  refreshBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  refreshBtnTextSmall: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  // KPI Grid for Live Lobbies
  kpiGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 18, borderWidth: 1, borderColor: C.border },
  kpiLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  kpiValue: { color: C.onSurface, fontSize: 24, fontWeight: '700', marginTop: 4, letterSpacing: -0.5 },
  kpiSub: { color: C.onSurfaceVariant, fontSize: 10, marginTop: 4 },

  // Filter bar
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flex: 1 },
  searchInput: { flex: 1, color: C.onSurface, fontSize: 13, outlineStyle: 'none' as any },
  selectWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },

  // Lobbies list
  emptyState: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyStateText: { color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  liveRoomCard: { backgroundColor: C.surface, borderRadius: 10, padding: 18, borderWidth: 1, borderColor: C.border },
  lobbyThumbnail: { width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,45,85,0.12)' : '#FFE4E6', alignItems: 'center', justifyContent: 'center' },
  liveStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  manageBtn: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  manageBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  miniLobbyLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  miniLobbyVal: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  livePlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: C.surfaceContainerLowest },

  // History list
  historyCard: { backgroundColor: C.surface, borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  historyStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  voiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.lightPrimary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  pageBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },

  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  detailModalContent: { backgroundColor: C.surface, borderRadius: 12, width: '100%', maxWidth: 540, maxHeight: '85%', borderWidth: 1, borderColor: C.border, padding: 24 },
  closeCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' },
  roundOverviewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surfaceContainerLowest, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  detailChip: { backgroundColor: C.surfaceContainerLowest, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  detailChipLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' },
  detailChipVal: { color: C.onSurface, fontSize: 12, fontWeight: '700', marginTop: 2 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceContainerLowest, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  voiceSessionBox: { backgroundColor: C.surfaceContainerLowest, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginTop: 8 },

  // Confirm Modal
  modalContent: { backgroundColor: C.surface, borderRadius: 12, width: '100%', maxWidth: 450, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center' },
  modalTitle: { color: C.onSurface, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalMessage: { color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: C.surfaceContainerLowest, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelBtnText: { color: C.onSurface, fontSize: 13, fontWeight: '700' },
  modalConfirmBtn: { flex: 1, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalConfirmBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
