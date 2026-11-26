// app/(authed)/admin/controls.tsx — 4-Game Engine & Live Inspector
// XO Battles, 5-Player Spin, Real Spin Rail, and Rock Paper Scissors
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, useWindowDimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import { useAdminNotifications } from '../../../context/AdminNotificationContext';
import {
  AdminPanel, AdminPill, AdminButton, AdminToggle, alpha,
} from '../../../components/admin/ui';
import Avatar from '../../../components/ui/Avatar';

const fmt = (n: number) => Number(n || 0).toLocaleString();
const fmtETB = (n: number) => `${fmt(n)} ETB`;

const STAKE_TIERS = [10, 25, 50, 100, 200, 500];

function SettingRow({ label, hint, checked, disabled, onChange }: {
  label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void;
}) {
  const { theme: C } = useAdminTheme();
  return (
    <View style={[st.settingRow, { borderBottomColor: C.border }]}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>{label}</Text>
        {hint && <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>{hint}</Text>}
      </View>
      <AdminToggle checked={checked} disabled={disabled} onChange={onChange} label={label} />
    </View>
  );
}

export default function GameEngineControls() {
  const { theme: C, isDark } = useAdminTheme();
  const { token, isSuperAdmin, showAlert } = useAuth();
  const { width } = useWindowDimensions();
  const { notify } = useAdminNotifications();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // 1. XO control states
  const [xoLockAll, setXoLockAll] = useState(false);
  const [xoLockRooms, setXoLockRooms] = useState(false);
  const [xoLockFriends, setXoLockFriends] = useState(false);
  const [botFallback, setBotFallback] = useState(false);
  const [fillSeconds, setFillSeconds] = useState(15);

  // 2. 5-Player Spin control states
  const [spin5pPaused, setSpin5pPaused] = useState(false);
  const [spin5pBots, setSpin5pBots] = useState(false);
  const [spin5pEntry, setSpin5pEntry] = useState(100);

  // 3. Real Spin (Rail) control states
  const [spinRailPaused, setSpinRailPaused] = useState(false);
  const [spinRailBots, setSpinRailBots] = useState(false);
  const [spinRailTimer, setSpinRailTimer] = useState(120);

  // 4. Rock Paper Scissors (RPS) control states
  const [rpsPaused, setRpsPaused] = useState(false);
  const [rpsBots, setRpsBots] = useState(false);

  // Stake room states for XO
  const [roomStates, setRoomStates] = useState<Record<number, { enabled: boolean; turnSeconds: number }>>({});

  // Live stats & inspector
  const [liveStats, setLiveStats] = useState<any>({ roomStats: {}, activeGamesCount: 0, liveGames: [], searchingPlayers: [] });
  const [selectedLiveGame, setSelectedLiveGame] = useState<any | null>(null);
  const [cancelingMatchId, setCancelingMatchId] = useState<string | null>(null);

  const fetchData = useCallback(async (isUserRefresh = false) => {
    if (isUserRefresh) setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };
      const [settRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/settings`, { headers: h }),
        fetch(`${API_URL}/admin/live-queue-stats`, { headers: h }).catch(() => null),
      ]);
      if (settRes.ok) {
        const d = await settRes.json();
        setData(d);
        if (d.config) {
          setXoLockAll(d.config.xo_lock_all === true);
          setXoLockRooms(d.config.xo_lock_rooms === true);
          setXoLockFriends(d.config.xo_lock_friends === true);
          setBotFallback(d.config.bot_fallback === true);
          setFillSeconds(d.config.fill_seconds || 15);

          setSpin5pPaused(d.config.spin_5p_paused === true || d.config.spin_paused === true);
          setSpin5pBots(d.config.spin_bots_enabled === true);
          setSpin5pEntry(d.config.spin_5p_entry_amount || 100);

          setSpinRailPaused(d.config.spin_rail_paused === true || d.config.spin_paused === true);
          setSpinRailBots(d.config.spin_rail_bots === true);
          setSpinRailTimer(d.config.spin_rail_timer || 120);

          setRpsPaused(d.config.rps_paused === true);
          setRpsBots(d.config.rps_bots_enabled !== false);
        }
        // Build room states
        const rooms: Record<number, { enabled: boolean; turnSeconds: number }> = {};
        STAKE_TIERS.forEach((stake, i) => {
          rooms[i] = {
            enabled: d.config?.[`room_${i}_enabled`] !== false,
            turnSeconds: d.config?.[`room_${i}_timer`] || (i < 3 ? 20 : 30),
          };
        });
        setRoomStates(rooms);
      }
      if (statsRes?.ok) {
        const sd = await statsRes.json();
        setLiveStats(sd);
      }
      if (isUserRefresh) {
        setToastMsg('Game engine settings & live queues updated');
        setTimeout(() => setToastMsg(null), 3000);
      }
    } catch (e) { console.error('[ENGINE] fetch error', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const timer = setInterval(() => fetchData(false), 8000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    try {
      await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify({ [key]: value }),
      });
      setToastMsg(`Setting '${key}' updated`);
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e) { showAlert('Error', 'Failed to update setting'); }
  }, [token, showAlert]);

  const handleForceCancel = async (game: any) => {
    if (!game) return;
    const gType = game.gameType || (game.playersCount ? 'spin' : 'xo');
    const mId = game.matchId || game.id || game.room;
    if (Platform.OS === 'web' && !window.confirm(`Cancel & refund match ${mId.slice(0, 8)}... (${gType.toUpperCase()})?`)) {
      return;
    }
    setCancelingMatchId(mId);
    try {
      const res = await fetch(`${API_URL}/admin/game/force-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameType: gType, roomId: mId, reason: 'Admin controls force-cancel' }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setSelectedLiveGame(null);
        fetchData(true);
        setToastMsg(`Match ${mId.slice(0, 8)} canceled & refunded`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        showAlert('Cancel Failed', resJson.error || 'Could not cancel game');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Network error');
    } finally {
      setCancelingMatchId(null);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ color: C.onSurfaceVariant, marginTop: 12, fontSize: 12 }}>Loading 4-game engine controls...</Text>
    </View>
  );

  const liveGames: any[] = liveStats.liveGames || liveStats.liveGamesList || [];
  const searchingPlayers: any[] = liveStats.searchingPlayers || liveStats.searchers || [];

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ padding: isMobile ? 12 : 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Toast Feedback */}
        {toastMsg && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: alpha(C.success, 0.15),
            borderWidth: 1,
            borderColor: alpha(C.success, 0.35),
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
          }}>
            <Ionicons name="checkmark-circle" size={17} color={C.success} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.success }}>{toastMsg}</Text>
          </View>
        )}

        {/* Header */}
        <View style={st.header}>
          <View>
            <Text style={[st.title, { color: C.onSurface }]}>Game engine & live console</Text>
            <Text style={[st.subtitle, { color: C.onSurfaceVariant }]}>
              Control 4 distinct games: XO Battles, 5P Spin, Real Spin Rail, and RPS.
            </Text>
          </View>
          <AdminButton
            icon="refresh"
            tone="brand"
            loading={refreshing}
            onPress={() => fetchData(true)}
          >
            {refreshing ? 'Updating...' : 'Refresh'}
          </AdminButton>
        </View>

        {/* ═══ LIVE GAMES MONITORING STRIP ═══ */}
        <AdminPanel
          title="Active live matches"
          kicker="Click any match card to open the live board inspector & take action."
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[st.livePillDot, { backgroundColor: C.success }]} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.success }}>
                {liveGames.length} In Progress
              </Text>
            </View>
          }
        >
          {liveGames.length === 0 ? (
            <View style={st.emptyLiveCard}>
              <Ionicons name="game-controller-outline" size={24} color={C.onSurfaceVariant} />
              <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>No matches currently in progress.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {liveGames.map((g: any, idx: number) => {
                const gType = g.gameType || 'xo';
                const isSelected = selectedLiveGame?.matchId === g.matchId;
                let gColor = C.primary;
                let gLabel = 'XO BATTLE';
                if (gType === 'rps') { gColor = '#F43F5E'; gLabel = 'RPS DUEL'; }
                else if (gType === 'spin' && g.playersCount === 5) { gColor = C.accentGold; gLabel = '5P SPIN'; }
                else if (gType === 'spin') { gColor = C.success; gLabel = 'RAIL SPIN'; }

                return (
                  <TouchableOpacity
                    key={g.matchId || idx}
                    onPress={() => setSelectedLiveGame(g)}
                    activeOpacity={0.8}
                    style={[
                      st.liveGameCard,
                      {
                        backgroundColor: isSelected ? alpha(gColor, 0.12) : C.surfaceContainerLow,
                        borderColor: isSelected ? gColor : C.border,
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={[st.gameBadge, { backgroundColor: `${gColor}20` }]}>
                        <View style={[st.liveDot, { backgroundColor: gColor }]} />
                        <Text style={[st.gameBadgeText, { color: gColor }]}>{gLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: C.onSurface }}>
                        {g.betAmount ? `${g.betAmount} ETB` : g.pot ? `${g.pot} ETB` : ''}
                      </Text>
                    </View>

                    <View style={{ marginVertical: 6, gap: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.onSurface }} numberOfLines={1}>
                        {g.player1Name || 'Player 1'} vs {g.player2Name || (g.playersCount ? `${g.playersCount} Players` : 'Opponent')}
                      </Text>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>
                        Room #{String(g.matchId || '').slice(0, 8)} · {g.status || 'ongoing'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 10, color: C.accentCyan, fontWeight: '700' }}>
                        Inspect Match →
                      </Text>
                      {g.turn && (
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Turn: {g.turn}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </AdminPanel>

        {/* ═══ LIVE SEARCHING USERS STRIP & QUEUE ANALYSIS ═══ */}
        <AdminPanel
          title="Searching players in matchmaking"
          kicker="Real-time breakdown of users waiting in XO and RPS lobbies with tier & player details."
          right={
            <AdminPill tone={searchingPlayers.length > 0 ? "gold" : "neutral"} dot={searchingPlayers.length > 0}>
              {`${searchingPlayers.length} Searching`}
            </AdminPill>
          }
        >
          {searchingPlayers.length === 0 ? (
            <View style={{ paddingVertical: 12, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, color: C.onSurfaceVariant, fontWeight: "600" }}>
                No players currently searching in matchmaking queue.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {/* Stake tier counter summary row */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {[10, 25, 50, 100, 250].map((tierAmt) => {
                  const countForTier = searchingPlayers.filter((p: any) => Number(p.betAmount || p.tier) === tierAmt).length;
                  if (countForTier === 0) return null;
                  return (
                    <View
                      key={`tier-count-${tierAmt}`}
                      style={{
                        backgroundColor: alpha(C.primary, 0.12),
                        borderWidth: 1,
                        borderColor: alpha(C.primary, 0.3),
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: C.primary }}>
                        {tierAmt} ETB:
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: C.onSurface }}>
                        {countForTier} waiting
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Detailed searcher cards scroll */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {searchingPlayers.map((p: any, idx: number) => {
                  const waitSec = Math.max(1, Math.round((Date.now() - (p.joinedAt || Date.now())) / 1000));
                  return (
                    <View
                      key={p.userId || p.socketId || idx}
                      style={[
                        st.searchUserChip,
                        {
                          backgroundColor: C.surfaceContainerLow,
                          borderColor: C.border,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          gap: 10,
                        },
                      ]}
                    >
                      <Avatar uri={p.avatar} name={p.username} size={30} />
                      <View style={{ gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: C.onSurface }}>
                            {p.username || "Player"}
                          </Text>
                          <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>
                            {waitSec}s ago
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 10.5, color: C.accentGold, fontWeight: "800" }}>
                            {p.gameType?.toUpperCase() || "XO"} · {p.betAmount || p.tier || 10} ETB
                          </Text>
                          {p.balance !== undefined && (
                            <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>
                              Bal: {p.balance} ETB
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </AdminPanel>

        {/* ═══ 4 SEPARATE GAME ENGINE PANELS ═══ */}
        <View style={[{ gap: 16 }, !isMobile && { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {/* 1. Tic-Tac-Toe (XO) Battles */}
          <AdminPanel
            title="1. XO Battles (Tic-Tac-Toe)"
            kicker="Grid PvP arena controls and bot fills"
            style={isMobile ? undefined : { flex: 1, minWidth: 320 }}
            right={<Ionicons name="game-controller-outline" size={17} color={C.primary} />}
          >
            <SettingRow
              label="Lock all XO battles"
              hint="Pause both public rooms and friend matchmaking."
              checked={xoLockAll}
              disabled={!isSuperAdmin}
              onChange={v => { setXoLockAll(v); updateSetting('xo_lock_all', v); }}
            />
            <SettingRow
              label="Lock public rooms"
              checked={xoLockRooms}
              disabled={!isSuperAdmin || xoLockAll}
              onChange={v => { setXoLockRooms(v); updateSetting('xo_lock_rooms', v); }}
            />
            <SettingRow
              label="Lock friend duels"
              checked={xoLockFriends}
              disabled={!isSuperAdmin || xoLockAll}
              onChange={v => { setXoLockFriends(v); updateSetting('xo_lock_friends', v); }}
            />
            <SettingRow
              label="XO bot fallback"
              hint="Fill public queue with AI when player wait exceeds limit."
              checked={botFallback}
              disabled={xoLockAll}
              onChange={v => { setBotFallback(v); updateSetting('bot_fallback', v); }}
            />
            <View style={[st.settingRow, { borderBottomWidth: 0 }]}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: C.onSurfaceVariant }}>Wait before AI fill</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={fillSeconds}
                  disabled={!botFallback || xoLockAll}
                  onChange={(e: any) => { const v = Number(e.target.value); setFillSeconds(v); updateSetting('fill_seconds', v); }}
                  style={{
                    height: 30, borderRadius: 8, border: `1px solid ${C.border}`,
                    backgroundColor: C.surface, paddingLeft: 10, paddingRight: 10,
                    fontSize: 12, color: C.onSurface, outline: 'none',
                    opacity: (!botFallback || xoLockAll) ? 0.4 : 1,
                  } as any}
                >
                  {[5, 10, 15, 20, 30, 45].map(s => <option key={s} value={s}>{s} seconds</option>)}
                </select>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.onSurface }}>{fillSeconds}s</Text>
              )}
            </View>
          </AdminPanel>

          {/* 2. 5-Player Spin Wheel */}
          <AdminPanel
            title="2. 5-Player Spin Wheel"
            kicker="Multiplayer wheel with automatic bot fill"
            style={isMobile ? undefined : { flex: 1, minWidth: 320 }}
            right={<Ionicons name="disc-outline" size={17} color={C.accentGold} />}
          >
            <SettingRow
              label="Pause 5-player spin"
              hint="Halt new 5-player spin round creations."
              checked={spin5pPaused}
              disabled={!isSuperAdmin}
              onChange={v => { setSpin5pPaused(v); updateSetting('spin_5p_paused', v); }}
            />
            <SettingRow
              label="Auto-fill with bots"
              hint="Fill open seats with simulated players after 12s."
              checked={spin5pBots}
              disabled={spin5pPaused}
              onChange={v => { setSpin5pBots(v); updateSetting('spin_bots_enabled', v); }}
            />
            <View style={[st.settingRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Entry stake amount</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>Per seat entry requirement</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.accentGold }}>{spin5pEntry} ETB</Text>
            </View>
            <View style={[st.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Platform rake / cut</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>Retained from total pot</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.success }}>20%</Text>
            </View>
          </AdminPanel>

          {/* 3. Real Spin (Rail) */}
          <AdminPanel
            title="3. Real Spin (Rail)"
            kicker="Continuous rolling wheel with liquidity bots"
            style={isMobile ? undefined : { flex: 1, minWidth: 320 }}
            right={<Ionicons name="aperture-outline" size={17} color={C.success} />}
          >
            <SettingRow
              label="Pause real spin rail"
              hint="Temporarily disable rail round wagers."
              checked={spinRailPaused}
              disabled={!isSuperAdmin}
              onChange={v => { setSpinRailPaused(v); updateSetting('spin_rail_paused', v); }}
            />
            <SettingRow
              label="Rail liquidity bots"
              hint="Provide simulated volume and scheduled bets."
              checked={spinRailBots}
              disabled={spinRailPaused}
              onChange={v => { setSpinRailBots(v); updateSetting('spin_rail_bots', v); }}
            />
            <View style={[st.settingRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Round window timer</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>Duration before lock & spin</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.onSurface }}>{spinRailTimer}s</Text>
            </View>
            <View style={[st.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>House commission</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>Platform cut on winning payouts</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.success }}>20%</Text>
            </View>
          </AdminPanel>

          {/* 4. Rock Paper Scissors (RPS) */}
          <AdminPanel
            title="4. Rock Paper Scissors (RPS)"
            kicker="Best-of-3 animated gesture duels"
            style={isMobile ? undefined : { flex: 1, minWidth: 320 }}
            right={<Ionicons name="cut-outline" size={17} color="#F43F5E" />}
          >
            <SettingRow
              label="Pause RPS duels"
              hint="Disable RPS matchmaking and friend duels."
              checked={rpsPaused}
              disabled={!isSuperAdmin}
              onChange={v => { setRpsPaused(v); updateSetting('rps_paused', v); }}
            />
            <SettingRow
              label="RPS AI fallback"
              hint="Match waiting players with AI bot after 15s."
              checked={rpsBots}
              disabled={rpsPaused}
              onChange={v => { setRpsBots(v); updateSetting('rps_bots_enabled', v); }}
            />
            <View style={[st.settingRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Available stake tiers</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>10, 25, 50, 100 ETB</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#F43F5E' }}>4 Tiers</Text>
            </View>
            <View style={[st.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>House fee</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>Retained from duel prize pot</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.success }}>10%</Text>
            </View>
          </AdminPanel>
        </View>

        {/* ═══ XO Stake Tiers & Timers Table ═══ */}
        <AdminPanel
          title="XO stake rooms & turn limits"
          kicker="Per-room turn timers and public entry toggles"
          noPadBody
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
            <View style={{ minWidth: 700 }}>
              <View style={[st.tableRow, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={[st.th, { flex: 1.2 }]}>Room Stake</Text>
                <Text style={[st.th, { flex: 1 }]}>Availability</Text>
                <Text style={[st.th, { flex: 1 }]}>Turn Timer</Text>
                <Text style={[st.th, { flex: 0.8, textAlign: 'right' }]}>Live Queue</Text>
                <Text style={[st.th, { flex: 0.8, textAlign: 'right' }]}>Live Matches</Text>
              </View>

              {STAKE_TIERS.map((stake, tier) => {
                const room = roomStates[tier] || { enabled: true, turnSeconds: 20 };
                const blocked = xoLockAll || xoLockRooms;
                const stats = liveStats.xo?.tiers?.[stake] || liveStats.xoTierStats?.[stake] || {};
                return (
                  <View key={`xo-${tier}`} style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
                      <Ionicons name="game-controller-outline" size={14} color={C.primary} />
                      <Text style={{ fontWeight: '700', color: C.onSurface, fontSize: 12 }}>
                        {stake} ETB
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AdminToggle
                        checked={room.enabled}
                        disabled={blocked}
                        onChange={on => {
                          setRoomStates(p => ({ ...p, [tier]: { ...p[tier], enabled: on } }));
                          updateSetting(`room_${tier}_enabled`, on);
                        }}
                        label={`XO ${stake} ETB rooms`}
                      />
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>{blocked ? 'Locked' : room.enabled ? 'Open' : 'Closed'}</Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={room.turnSeconds}
                          disabled={blocked || !room.enabled}
                          onChange={(e: any) => {
                            const v = Number(e.target.value);
                            setRoomStates(p => ({ ...p, [tier]: { ...p[tier], turnSeconds: v } }));
                            updateSetting(`room_${tier}_timer`, v);
                          }}
                          style={{
                            height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
                            backgroundColor: C.surface, paddingLeft: 8, paddingRight: 8,
                            fontSize: 11, color: C.onSurface, outline: 'none',
                            opacity: (blocked || !room.enabled) ? 0.4 : 1,
                          } as any}
                        >
                          {[15, 20, 25, 30, 45].map(s => <option key={s} value={s}>{s}s per move</option>)}
                        </select>
                      ) : (
                        <Text style={{ fontSize: 12, color: C.onSurface }}>{room.turnSeconds}s</Text>
                      )}
                    </View>
                    <Text style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'right', color: C.accentGold, fontSize: 12, fontWeight: '700' }}>
                      {stats.searching || 0}
                    </Text>
                    <Text style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'right', fontWeight: '700', color: C.success, fontSize: 12 }}>
                      {stats.liveMatches || 0}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </AdminPanel>
      </ScrollView>

      {/* ═══ SLIDE-OVER SIDE INSPECTOR DRAWER ═══ */}
      {selectedLiveGame && (
        <View style={[st.sideInspector, { backgroundColor: C.surface, borderLeftColor: C.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.onSurface }}>Match Live Inspector</Text>
              <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>
                ID: #{String(selectedLiveGame.matchId || '').slice(0, 10)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedLiveGame(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, marginVertical: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 14 }}>
              {/* Game Badge & Stake */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={[st.gameBadge, { backgroundColor: alpha(C.primary, 0.15) }]}>
                  <Text style={[st.gameBadgeText, { color: C.primary }]}>
                    {String(selectedLiveGame.gameType || 'XO').toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.success }}>
                  Stake: {selectedLiveGame.betAmount || 0} ETB
                </Text>
              </View>

              {/* Players Card */}
              <View style={[st.inspectorPlayerBox, { backgroundColor: C.surfaceContainerLow, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                    <Avatar uri={null} name={selectedLiveGame.player1Name} size={36} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurface }}>
                      {selectedLiveGame.player1Name || 'Player 1'}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: C.primary, fontWeight: '800' }}>[PLAYER X]</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: C.onSurfaceVariant }}>VS</Text>
                  <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                    <Avatar uri={null} name={selectedLiveGame.player2Name} size={36} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurface }}>
                      {selectedLiveGame.player2Name || 'Player 2'}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: C.accentCyan, fontWeight: '800' }}>[PLAYER O]</Text>
                  </View>
                </View>
              </View>

              {/* Live Board / Status Visualizer */}
              {selectedLiveGame.gameType === 'xo' || !selectedLiveGame.gameType ? (
                <View style={{ alignItems: 'center', gap: 8, padding: 12, backgroundColor: C.surfaceContainerLow, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurfaceVariant }}>
                    CURRENT TURN: {selectedLiveGame.turn || 'X'}
                  </Text>
                  {/* 3x3 Mock Grid Visualizer */}
                  <View style={{ width: 150, height: 150, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: C.border, borderRadius: 8 }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(cellIdx => {
                      const moves = selectedLiveGame.moves || [];
                      const cellMove = moves.find((m: any) => m.index === cellIdx || m.cell === cellIdx);
                      return (
                        <View
                          key={cellIdx}
                          style={{
                            width: '33.33%',
                            height: '33.33%',
                            borderWidth: 1,
                            borderColor: C.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {cellMove && (
                            <Text style={{ fontSize: 18, fontWeight: '900', color: cellMove.player === 'X' ? C.primary : C.accentCyan }}>
                              {cellMove.player}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : selectedLiveGame.gameType === 'rps' ? (
                <View style={{ padding: 14, backgroundColor: C.surfaceContainerLow, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurfaceVariant, textAlign: 'center' }}>
                    BEST OF 3 ROUNDS
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: C.primary }}>
                      {selectedLiveGame.scoreP1 || 0}
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.onSurfaceVariant }}>-</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: C.accentCyan }}>
                      {selectedLiveGame.scoreP2 || 0}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ padding: 14, backgroundColor: C.surfaceContainerLow, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurfaceVariant }}>
                    SEATED PLAYERS ({selectedLiveGame.playersCount || 0}/{selectedLiveGame.maxPlayers || 5})
                  </Text>
                  <Text style={{ fontSize: 12, color: C.onSurface }}>
                    Pot: {selectedLiveGame.pot || 0} ETB · Countdown: {selectedLiveGame.countdown || 0}s
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <AdminButton
              tone="danger"
              icon="trash-outline"
              loading={cancelingMatchId === selectedLiveGame.matchId}
              onPress={() => handleForceCancel(selectedLiveGame)}
            >
              Cancel & Refund Match
            </AdminButton>
            <AdminButton tone="ghost" onPress={() => setSelectedLiveGame(null)}>
              Close Inspector
            </AdminButton>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, minHeight: 48, borderBottomWidth: 1, paddingVertical: 8,
  },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 11, fontWeight: '700' },
  emptyLiveCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  livePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveGameCard: {
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  gameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  gameBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  searchUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sideInspector: {
    width: 320,
    borderLeftWidth: 1,
    padding: 16,
    zIndex: 100,
  },
  inspectorPlayerBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
