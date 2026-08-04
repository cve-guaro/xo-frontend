// app/(authed)/admin/spin.tsx — Spin Game Management (Admin Portal)
import React, { useState, useEffect, useCallback } from 'react';
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
import { AdminTheme as C } from './_layout';

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
          <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
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
            <Text style={s.headerSub}>SPIN GAME MANAGEMENT, LIVE LOBBIES & MATCH LOGS</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.replace('/(authed)/home/gameplay' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: C.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            alignSelf: isMobile ? 'flex-start' : 'center',
          }}
        >
          <Ionicons name="home" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Tab Navigation Bar */}
      <View style={{ marginBottom: 24 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { id: 'overview', label: 'Overview', icon: 'grid-outline' },
            { id: 'rooms', label: 'Live Rooms', icon: 'game-controller-outline' },
            { id: 'history', label: 'Match History', icon: 'time-outline' },
            { id: 'leaderboard', label: 'Leaderboard', icon: 'podium-outline' },
            { id: 'moderation', label: 'Moderation', icon: 'shield-outline' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: activeTab === tab.id ? C.primary : 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: activeTab === tab.id ? C.primaryContainer : C.outlineVariant,
              }}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? '#0c0c1f' : '#e5e3ff'} />
              <Text style={{ color: activeTab === tab.id ? '#0c0c1f' : '#e5e3ff', fontSize: 13, fontWeight: '800' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <>
          {/* Global Config Card */}
          <View style={[s.card, { marginBottom: 24 }]}>
            <Text style={s.sectionLabel}>GLOBAL SETTINGS</Text>
            {loading ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <View style={s.switchRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={s.cardTitle}>Spin Game Active</Text>
                  <Text style={s.cardSubTitle}>
                    Enable or disable the Spin game for all users. When disabled, new players cannot join spin lobbies.
                  </Text>
                </View>
                <Switch
                  value={spinGameActive}
                  disabled={saving}
                  onValueChange={(v) => updateToggleSetting('spin_game_enabled', v, setSpinGameActive)}
                  trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(117,81,255,0.3)' }}
                  thumbColor={spinGameActive ? C.primary : '#f4f3f4'}
                />
              </View>
            )}
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
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 12 }}>Pot: <Text style={{ color: C.success, fontWeight: '700' }}>{fmt(room.pot / 100)} ETB</Text></Text>
                    {room.countdown > 0 && <Text style={{ color: C.onSurfaceVariant, fontSize: 12 }}>Timer: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{room.countdown}s</Text></Text>}
                  </View>
                  {room.players && room.players.length > 0 && (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      {room.players.map((p: any, pi: number) => (
                        <View key={pi} style={s.livePlayerRow}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>#{p.seatIndex + 1}</Text>
                          <Text style={{ color: p.isBot ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: 11, fontWeight: '700', flex: 1 }}>{p.username}{p.isBot ? ' (Bot)' : ''}</Text>
                          <Text style={{ color: C.success, fontSize: 11, fontWeight: '700' }}>{fmt(p.stake / 100)} ETB</Text>
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

      {/* --- MATCH HISTORY TAB --- */}
      {(activeTab === 'overview' || activeTab === 'history') && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={s.sectionLabel}>SPIN HISTORY LOG ({spinHistoryTotal})</Text>
            <TouchableOpacity onPress={() => fetchSpinHistory(spinHistoryPage)} style={s.refreshBtnSmall}>
              <Ionicons name="refresh" size={12} color="#fff" />
              <Text style={s.refreshBtnTextSmall}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {spinHistoryLoading && <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />}
          {!spinHistoryLoading && spinHistory.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>No completed spin rounds yet</Text>
            </View>
          )}
          {!spinHistoryLoading && spinHistory.map((round: any, i: number) => {
            const isRealSpin = round.is_real_spin || (round.real_players > 0 && round.real_players === round.total_players);
            const winnerName = round.winner_display_name || round.winner_username || '—';

            return (
              <View key={round.id || i} style={s.historyCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[s.historyStatusPill, { borderColor: round.status === 'paid' ? 'rgba(34,197,94,0.3)' : 'rgba(245,57,57,0.3)' }]}>
                      <Text style={{ color: round.status === 'paid' ? C.success : C.error, fontSize: 9, fontWeight: '800' }}>{round.status?.toUpperCase()}</Text>
                    </View>
                    <View style={[s.historyStatusPill, { backgroundColor: isRealSpin ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderColor: isRealSpin ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)' }]}>
                      <Text style={{ color: isRealSpin ? C.success : '#f59e0b', fontSize: 9, fontWeight: '800' }}>{isRealSpin ? 'REAL SPIN' : 'BOT ASSISTED'}</Text>
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>Mode: <Text style={{ color: '#fff' }}>{round.mode_label || (round.config_id === 2 ? 'Rail Spin' : '5-Player Spin')}</Text></Text>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>Players: <Text style={{ color: '#fff' }}>{round.total_players || 5} Players ({round.real_players || 0} Real / {(round.total_players || 5) - (round.real_players || 0)} Bot)</Text></Text>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>Slot: <Text style={{ color: '#fff' }}>#{round.winning_slice ?? '—'}</Text></Text>
                </View>
              </View>
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

      {/* --- LEADERBOARD TAB --- */}
      {activeTab === 'leaderboard' && (
        <View style={s.emptyState}>
          <Ionicons name="podium-outline" size={48} color={C.primary} style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Leaderboard System Coming Soon</Text>
          <Text style={{ color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 440 }}>
            High roller rankings, win streaks, and total accumulated earnings for Spin Wheel will be listed here.
          </Text>
        </View>
      )}

      {/* --- MODERATION TAB --- */}
      {activeTab === 'moderation' && (
        <View style={s.emptyState}>
          <Ionicons name="shield-outline" size={48} color={C.secondary} style={{ marginBottom: 16 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Moderation Panel Under Construction</Text>
          <Text style={{ color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 440 }}>
            Backend routes and database schemas for wheel configuration weights, bot frequency settings, and slice multipliers are currently under development. Check back shortly.
          </Text>
        </View>
      )}

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
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  headerSub: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.08)' } as any : {}),
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardSubTitle: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 18, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  
  // input/save fields
  inputRow: { flex: 1, backgroundColor: C.surfaceContainerLowest, borderRadius: 14, borderWidth: 1, borderColor: C.outlineVariant, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, color: '#fff', padding: 12, fontSize: 14 },
  saveBtn: { backgroundColor: C.primary, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Cost widgets
  costGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  costBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    padding: 16,
  },
  costBoxLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500' },
  costBoxVal: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 6 },
  
  // Analytics
  refreshBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  refreshBtnTextSmall: { color: '#fff', fontSize: 11, fontWeight: '800' },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticsCard: {
    width: Platform.OS === 'web' ? '31%' : '47%',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.04)' } as any : {}),
  },
  analyticsIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  analyticsValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  analyticsLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  roundsBreakdownBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceContainerLowest, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.outlineVariant },
  breakdownStatusDot: { width: 8, height: 8, borderRadius: 4 },
  
  // Lobbies list
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  emptyStateText: { color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  liveRoomCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.outlineVariant },
  liveStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, borderColor: C.outlineVariant, alignSelf: 'flex-start' },
  livePlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: C.surfaceContainerLowest },

  // History list
  historyCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.outlineVariant },
  historyStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant },
  pageBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },

  // Confirm Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11,20,55,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: C.surface, borderRadius: 24, width: '100%', maxWidth: 450, borderWidth: 1, borderColor: C.outlineVariant, padding: 24, alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalMessage: { color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: C.surfaceContainerLowest, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.outlineVariant },
  modalCancelBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalConfirmBtn: { flex: 1, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalConfirmBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
