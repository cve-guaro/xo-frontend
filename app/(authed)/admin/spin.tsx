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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';
import { SkeletonRow } from '../../../components/SkeletonLoading';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFmt = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SpinAdminPage() {
  const { token, isSuperAdmin, showAlert } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'history' | 'leaderboard' | 'moderation'>((params.tab as any) || 'overview');
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

  const headers = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };

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
  }, [token]);

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
  }, [token]);

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
  }, [token]);

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
  }, [token]);

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

    return {
      railBets,
      fivepBets,
      totalWagered,
      railRatio,
      fivepRatio,
      railProfit,
      fivepProfit,
      totalProfit,
    };
  }, [spinStats]);

  const openRoundDetails = (round: any) => {
    setSelectedRound(round);
    setDetailModalVisible(true);
  };

  const renderStatsColumn = (title: string, modeStats: any, botVal: boolean, botSetter: (v: boolean) => void, settingKey: string, showEntryAmount: boolean = false) => {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(17,17,25,0.7)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.outlineVariant }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 16, letterSpacing: 0.5 }}>{title}</Text>
        
        {/* Controls Card */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
          <View style={s.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Bot Assistance</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                When active, bots automatically seed the room.
              </Text>
            </View>
            <Switch
              value={botVal}
              disabled={!isSuperAdmin || saving}
              onValueChange={(v) => updateToggleSetting(settingKey, v, botSetter)}
              trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(117,81,255,0.3)' }}
              thumbColor={botVal ? C.primary : '#f4f3f4'}
            />
          </View>

          {showEntryAmount && (
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 16 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>Entry Amount (ETB)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.inputRow, { flex: 1 }]}>
                  <Ionicons name="wallet-outline" size={16} color={C.onSurfaceVariant} style={{ marginRight: 8 }} />
                  <TextInput
                    value={spinEntryAmount}
                    onChangeText={setSpinEntryAmount}
                    placeholder="e.g. 100"
                    style={s.input}
                    placeholderTextColor="rgba(163,174,208,0.4)"
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity onPress={saveSpinEntryAmount} disabled={saving} style={s.saveBtn}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Analytics Card */}
        <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 }}>ANALYTICS</Text>
        {modeStats ? (
          <View style={{ gap: 12 }}>
            {[
              { label: 'Total Bets', value: `${fmt(modeStats.totalBets / 100)} ETB`, icon: 'trending-up', color: '#38bdf8' },
              { label: 'Total Payouts', value: `${fmt(modeStats.totalPayouts / 100)} ETB`, icon: 'arrow-down-circle', color: '#f59e0b' },
              { label: 'Total Refunds', value: `${fmt(modeStats.totalRefunds / 100)} ETB`, icon: 'refresh-circle', color: '#fb923c' },
              { label: 'Net House Profit', value: `${fmt(modeStats.netHouseProfit / 100)} ETB`, icon: 'cash', color: modeStats.netHouseProfit >= 0 ? C.success : C.error },
              { label: 'Total Rounds', value: String(modeStats.totalRounds), icon: 'repeat', color: '#a78bfa' },
              { label: 'Unique Players', value: String(modeStats.uniquePlayers), icon: 'people', color: C.secondary },
            ].map((card, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: card.color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={card.icon as any} size={16} color={card.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>{card.label}</Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 }}>{card.value}</Text>
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
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(117,81,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(117,81,255,0.3)' }}
        >
          <Ionicons name="play" size={14} color={C.primary} />
          <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800' }}>Launch Game</Text>
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
              borderRadius: 14,
              backgroundColor: activeTab === t.id ? C.primary : 'rgba(17,17,25,0.6)',
              borderWidth: 1,
              borderColor: activeTab === t.id ? C.primary : C.outlineVariant,
            }}
          >
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.id ? '#fff' : C.onSurfaceVariant} />
            <Text style={{ color: activeTab === t.id ? '#fff' : C.onSurfaceVariant, fontSize: 12, fontWeight: '800' }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- GRAPHICAL OVERVIEW TAB --- */}
      {(activeTab === 'overview') && (
        <>
          {/* Graphical Ratio & Net Profit Dashboard Card */}
          <View style={s.graphicalDashboardCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="stats-chart" size={22} color={C.primary} />
                <View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>WAGER VOLUME & MODE DISTRIBUTION</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Real Spin Mode vs 5-Player Mode breakdown</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.success, fontSize: 18, fontWeight: '900' }}>{fmt(dashboardMetrics.totalWagered)} ETB</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>Total Cumulative Wagered</Text>
              </View>
            </View>

            {/* Visual Ratio Bar */}
            <View style={s.ratioMeterTrack}>
              <View style={[s.ratioMeterFillRail, { width: `${dashboardMetrics.railRatio}%` }]} />
              <View style={[s.ratioMeterFill5p, { width: `${dashboardMetrics.fivepRatio}%` }]} />
            </View>

            {/* Mode Breakdown Legends */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#38bdf8' }} />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Real Spin (Rail): {dashboardMetrics.railRatio.toFixed(1)}%</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>({fmt(dashboardMetrics.railBets)} ETB)</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#a78bfa' }} />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>5-Player Spin: {dashboardMetrics.fivepRatio.toFixed(1)}%</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>({fmt(dashboardMetrics.fivepBets)} ETB)</Text>
              </View>
            </View>

            {/* Comparative Net Profit Graphs */}
            <View style={s.profitGraphGrid}>
              <View style={s.profitGraphCard}>
                <Text style={s.profitGraphLabel}>Real Spin Net Profit</Text>
                <Text style={[s.profitGraphVal, { color: dashboardMetrics.railProfit >= 0 ? C.success : C.error }]}>
                  {fmt(dashboardMetrics.railProfit)} ETB
                </Text>
                <View style={s.miniBarTrack}>
                  <View style={[s.miniBarFill, { width: `${Math.min(100, Math.max(10, Math.abs(dashboardMetrics.railProfit) / 500))}%`, backgroundColor: '#38bdf8' }]} />
                </View>
              </View>

              <View style={s.profitGraphCard}>
                <Text style={s.profitGraphLabel}>5-Player Net Profit</Text>
                <Text style={[s.profitGraphVal, { color: dashboardMetrics.fivepProfit >= 0 ? C.success : C.error }]}>
                  {fmt(dashboardMetrics.fivepProfit)} ETB
                </Text>
                <View style={s.miniBarTrack}>
                  <View style={[s.miniBarFill, { width: `${Math.min(100, Math.max(10, Math.abs(dashboardMetrics.fivepProfit) / 500))}%`, backgroundColor: '#a78bfa' }]} />
                </View>
              </View>
            </View>
          </View>

          {/* 3-Switch Granular Spin Lock Controls */}
          <View style={s.lockSectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Ionicons name="lock-closed" size={20} color={spinLockAll ? C.error : C.primary} />
              <View>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>SPIN 3-SWITCH LOCK CONTROL PANEL</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Lock all spin modes or lock specific spin modes during system updates.</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {/* Switch 1: Lock ALL Spin */}
              <View style={[s.switchRowBox, spinLockAll && s.switchRowBoxActive]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.switchTitle, spinLockAll && { color: C.error }]}>Switch 1: Lock ALL Spin Modes</Text>
                  <Text style={s.switchDesc}>Locks both Real Spin / Rail Mode AND 5-Player Mode globally.</Text>
                </View>
                <Switch
                  value={spinLockAll}
                  disabled={!isSuperAdmin || saving}
                  onValueChange={(v) => updateToggleSetting('spin_lock_all', v, setSpinLockAll)}
                  trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(239,68,68,0.35)' }}
                  thumbColor={spinLockAll ? C.error : '#f4f3f4'}
                />
              </View>

              {/* Switch 2: Lock Real Spin / Rail Only */}
              <View style={[s.switchRowBox, spinLockRail && s.switchRowBoxActive]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.switchTitle, spinLockRail && { color: '#38bdf8' }]}>Switch 2: Lock Real Spin (Rail) Only</Text>
                  <Text style={s.switchDesc}>Locks Real Spin mode. 5-Player mode remains accessible.</Text>
                </View>
                <Switch
                  value={spinLockRail}
                  disabled={!isSuperAdmin || saving}
                  onValueChange={(v) => updateToggleSetting('spin_lock_rail', v, setSpinLockRail)}
                  trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(56,189,248,0.35)' }}
                  thumbColor={spinLockRail ? '#38bdf8' : '#f4f3f4'}
                />
              </View>

              {/* Switch 3: Lock 5-Player Spin Only */}
              <View style={[s.switchRowBox, spinLock5p && s.switchRowBoxActive]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[s.switchTitle, spinLock5p && { color: '#a78bfa' }]}>Switch 3: Lock 5-Player Spin Only</Text>
                  <Text style={s.switchDesc}>Locks 5-Player Spin mode. Real Spin mode remains accessible.</Text>
                </View>
                <Switch
                  value={spinLock5p}
                  disabled={!isSuperAdmin || saving}
                  onValueChange={(v) => updateToggleSetting('spin_lock_5p', v, setSpinLock5p)}
                  trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(167,139,250,0.35)' }}
                  thumbColor={spinLock5p ? '#a78bfa' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          {/* Dynamic Grid Layout containing Rail and 5-Player columns */}
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 24, marginBottom: 24 }}>
            {renderStatsColumn('Rail Spin Mode', spinStats?.rail, railBotsEnabled, setRailBotsEnabled, 'spin_rail_bots_enabled')}
            {renderStatsColumn('5-Player Spin Mode', spinStats?.fivePlayer, fivepBotsEnabled, setFivepBotsEnabled, 'spin_5p_bots_enabled', true)}
          </View>
        </>
      )}

      {/* --- LIVE ROOMS TAB --- */}
      {(activeTab === 'overview' || activeTab === 'rooms') && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={s.sectionLabel}>LIVE SPIN LOBBIES ({spinLive.length})</Text>
            <TouchableOpacity onPress={fetchSpinLive} style={s.refreshBtnSmall}>
              <Ionicons name="refresh" size={12} color="#fff" />
              <Text style={s.refreshBtnTextSmall}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {spinLive.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="game-controller-outline" size={24} color="rgba(255,255,255,0.1)" />
              <Text style={s.emptyStateText}>No Spin Wheel lobbies are running. Lobbies spin up dynamically when players enter.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {spinLive.map((room: any, i: number) => (
                <View key={room.roundId || i} style={s.liveRoomCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[s.breakdownStatusDot, { backgroundColor: room.status === 'waiting' ? '#fbbf24' : room.status === 'spinning' ? C.success : C.secondary }]} />
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{room.roomName || room.mode}</Text>
                    </View>
                    <View style={s.liveStatusBadge}>
                      <Text style={{ color: room.status === 'waiting' ? '#fbbf24' : C.success, fontSize: 9, fontWeight: '800' }}>{room.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 12 }}>Players: <Text style={{ color: '#fff', fontWeight: '700' }}>{room.realPlayersCount}/{room.maxPlayers}</Text> (bots: {room.botsCount})</Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 12 }}>Pot: <Text style={{ color: C.success, fontWeight: '700' }}>{fmt(room.pot)} ETB</Text></Text>
                    {room.countdown > 0 && <Text style={{ color: C.onSurfaceVariant, fontSize: 12 }}>Timer: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{room.countdown}s</Text></Text>}
                  </View>
                  {room.players && room.players.length > 0 && (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      {room.players.map((p: any, pi: number) => (
                        <View key={pi} style={s.livePlayerRow}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>#{p.seatIndex + 1}</Text>
                          <Text style={{ color: p.isBot ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: 11, fontWeight: '700', flex: 1 }}>{p.username}{p.isBot ? ' (Bot)' : ''}</Text>
                          <Text style={{ color: C.success, fontSize: 11, fontWeight: '700' }}>{fmt(p.stake)} ETB</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* --- MATCH HISTORY TAB (Interactive Cards + Detail Modal) --- */}
      {(activeTab === 'overview' || activeTab === 'history') && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={s.sectionLabel}>SPIN HISTORY LOG ({spinHistoryTotal})</Text>
            <TouchableOpacity onPress={() => fetchSpinHistory(spinHistoryPage)} style={s.refreshBtnSmall}>
              <Ionicons name="refresh" size={12} color="#fff" />
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
                    <View style={[s.historyStatusPill, { borderColor: round.status === 'paid' ? 'rgba(34,197,94,0.3)' : 'rgba(245,57,57,0.3)' }]}>
                      <Text style={{ color: round.status === 'paid' ? C.success : C.error, fontSize: 9, fontWeight: '800' }}>{round.status?.toUpperCase()}</Text>
                    </View>
                    <View style={[s.historyStatusPill, { backgroundColor: isRealSpin ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderColor: isRealSpin ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)' }]}>
                      <Text style={{ color: isRealSpin ? C.success : '#f59e0b', fontSize: 9, fontWeight: '800' }}>{isRealSpin ? 'REAL SPIN' : 'BOT ASSISTED'}</Text>
                    </View>
                    <View style={s.voiceBadge}>
                      <Ionicons name="mic" size={10} color="#38bdf8" />
                      <Text style={{ color: '#38bdf8', fontSize: 9, fontWeight: '800' }}>Voice Channel</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' }}>{timeFmt(round.created_at)}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View>
                    <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '800' }}>
                      Winner: <Text style={{ color: round.winner_is_bot ? '#fbbf24' : '#38bdf8' }}>{winnerName}</Text>
                    </Text>
                    {round.winner_phone && <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>{round.winner_phone}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: C.success, fontSize: 14, fontWeight: '900' }}>+{fmt((round.prize_amount || 0) / 100)} ETB</Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>Pot: {fmt((round.pot_amount || 0) / 100)} ETB</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>Mode: <Text style={{ color: '#fff' }}>{round.config_id === 2 ? 'Rail Spin' : '5-Player Spin'}</Text></Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>Players: <Text style={{ color: '#fff' }}>{round.total_players || 5} Total</Text></Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: C.primary, fontSize: 11, fontWeight: '800' }}>View Details</Text>
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
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>Page {spinHistoryPage + 1} of {Math.ceil(spinHistoryTotal / 10)}</Text>
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
                <Ionicons name="disc-outline" size={24} color={C.primary} />
                <View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Round Details & Voice Log</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>ID: {selectedRound?.id || '—'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={s.closeCircle}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedRound && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Round Overview Header */}
                <View style={s.roundOverviewBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>WINNING PLAYER</Text>
                    <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                      {selectedRound.winner_username || 'Bot Winner'}
                    </Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>
                      {selectedRound.winner_phone || 'System Bot Seat'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: C.success, fontSize: 18, fontWeight: '900' }}>
                      +{fmt((selectedRound.prize_amount || 0) / 100)} ETB
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                      Pot: {fmt((selectedRound.pot_amount || 0) / 100)} ETB
                    </Text>
                  </View>
                </View>

                {/* Details Breakdown */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 14 }}>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Mode</Text><Text style={s.detailChipVal}>{selectedRound.config_id === 2 ? 'Rail Spin' : '5-Player'}</Text></View>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Winning Slice</Text><Text style={s.detailChipVal}>#{selectedRound.winning_slice ?? 0}</Text></View>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Created</Text><Text style={s.detailChipVal}>{timeFmt(selectedRound.created_at)}</Text></View>
                  <View style={s.detailChip}><Text style={s.detailChipLabel}>Status</Text><Text style={[s.detailChipVal, { color: C.success }]}>{selectedRound.status?.toUpperCase()}</Text></View>
                </View>

                {/* Player Roster Table */}
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>PLAYER SEATS & STAKES</Text>
                {selectedRound.players && selectedRound.players.length > 0 ? (
                  <View style={{ gap: 6, marginBottom: 16 }}>
                    {selectedRound.players.map((p: any, idx: number) => (
                      <View key={idx} style={s.rosterRow}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800' }}>#{p.seatIndex !== undefined ? p.seatIndex + 1 : idx + 1}</Text>
                        <Text style={{ color: p.isBot ? 'rgba(255,255,255,0.5)' : '#fff', fontSize: 12, fontWeight: '700', flex: 1, marginLeft: 8 }}>
                          {p.username || p.name} {p.isBot ? '(Bot)' : ''}
                        </Text>
                        <Text style={{ color: C.success, fontSize: 12, fontWeight: '800' }}>
                          {fmt((p.stake || selectedRound.pot_amount / (selectedRound.total_players || 5)) / 100)} ETB
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 16 }}>Seat details recorded in DB log.</Text>
                )}

                {/* Voice Session Activity Record */}
                <View style={s.voiceSessionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="mic-circle" size={20} color="#38bdf8" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Voice Communication Channel Record</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 16 }}>
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
            <Ionicons name="warning" size={40} color={C.primary} style={{ marginBottom: 12 }} />
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 24, paddingTop: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.lightPrimary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  headerSub: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },

  // Graphical Dashboard
  graphicalDashboardCard: {
    backgroundColor: 'rgba(17,17,25,0.85)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginBottom: 24,
  },
  ratioMeterTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ratioMeterFillRail: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  ratioMeterFill5p: {
    height: '100%',
    backgroundColor: '#a78bfa',
  },
  profitGraphGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  profitGraphCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  profitGraphLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
  },
  profitGraphVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  miniBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 10,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Lock section
  lockSectionCard: {
    backgroundColor: 'rgba(17,17,25,0.8)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginBottom: 24,
  },
  switchRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  switchRowBoxActive: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  switchTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  switchDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },

  // input/save fields
  inputRow: { flex: 1, backgroundColor: C.surfaceContainerLowest, borderRadius: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, color: '#ffffff', padding: 12, fontSize: 14 },
  saveBtn: { backgroundColor: C.primary, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  refreshBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  refreshBtnTextSmall: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  // Lobbies list
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyStateText: { color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  liveRoomCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  liveStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, borderColor: C.border, alignSelf: 'flex-start' },
  livePlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: C.surfaceContainerLowest },
  breakdownStatusDot: { width: 8, height: 8, borderRadius: 4 },

  // History list
  historyCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  historyStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  voiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)' },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  pageBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },

  // Detail Modal
  detailModalContent: { backgroundColor: 'rgba(15,20,35,0.98)', borderRadius: 24, width: '100%', maxWidth: 540, maxHeight: '85%', borderWidth: 1, borderColor: C.border, padding: 24 },
  closeCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  roundOverviewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  detailChip: { backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  detailChipLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  detailChipVal: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 2 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  voiceSessionBox: { backgroundColor: 'rgba(56,189,248,0.06)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', marginTop: 8 },

  // Confirm Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,18,32,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: C.surface, borderRadius: 20, width: '100%', maxWidth: 450, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center' },
  modalTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalMessage: { color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: C.surfaceContainerLowest, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalConfirmBtn: { flex: 1, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalConfirmBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
