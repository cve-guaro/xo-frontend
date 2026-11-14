// app/(authed)/admin/controls.tsx — Game Engine view
// Matches reference: EnginePanel (XO/Spin controls, stake settings table, diagnostics)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import {
  AdminPanel, AdminPill, AdminButton, AdminToggle, AdminMeter,
} from '../../../components/admin/ui';

const fmt = (n: number) => Number(n || 0).toLocaleString();
const fmtETB = (n: number) => `${fmt(n)} ETB`;

const STAKE_TIERS = [10, 25, 50, 100, 200, 500];

function SettingRow({ label, hint, checked, disabled, onChange }: {
  label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void;
}) {
  const { theme: C } = useAdminTheme();
  return (
    <View style={[st.settingRow, { borderBottomColor: C.border }]}>
      <View style={{ flex: 1 }}>
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
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // XO control states
  const [xoLockAll, setXoLockAll] = useState(false);
  const [xoLockRooms, setXoLockRooms] = useState(false);
  const [xoLockFriends, setXoLockFriends] = useState(false);
  const [botFallback, setBotFallback] = useState(false);
  const [fillSeconds, setFillSeconds] = useState(15);

  // Spin control states
  const [spinPaused, setSpinPaused] = useState(false);
  const [spinBots, setSpinBots] = useState(false);
  const [spinRailBots, setSpinRailBots] = useState(false);

  // Stake availability
  const [roomStates, setRoomStates] = useState<Record<number, { enabled: boolean; turnSeconds: number }>>({});

  // Live stats
  const [liveStats, setLiveStats] = useState<any>({ roomStats: {}, activeGamesCount: 0 });

  const fetchData = useCallback(async () => {
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
          setSpinPaused(d.config.spin_paused === true);
          setSpinBots(d.config.spin_bots_enabled === true);
          setSpinRailBots(d.config.spin_rail_bots === true);
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
    } catch (e) { console.error('[ENGINE] fetch error', e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    try {
      await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) { showAlert('Error', 'Failed to update setting'); }
  }, [token, showAlert]);

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ color: C.onSurfaceVariant, marginTop: 12, fontSize: 12 }}>Loading engine controls...</Text>
    </View>
  );

  const xoBlocked = xoLockAll;
  const spinBlocked = spinPaused;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ padding: isMobile ? 12 : 20, paddingBottom: 100, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={[st.title, { color: C.onSurface }]}>Game engine</Text>
          <Text style={[st.subtitle, { color: C.onSurfaceVariant }]}>
            Control matchmaking, bots, timers, and stake availability
          </Text>
        </View>
        <AdminButton icon="refresh" tone="ghost" onPress={fetchData}>Refresh</AdminButton>
      </View>

      {/* ═══ XO + Spin Controls ═══ */}
      <View style={[{ gap: 16 }, !isMobile && { flexDirection: 'row' }]}>
        {/* Tic-Tac-Toe controls */}
        <AdminPanel
          title="Tic-Tac-Toe controls"
          kicker="Changes apply only to XO."
          style={{ flex: 1 }}
          right={<Ionicons name="game-controller-outline" size={16} color={C.primary} />}
        >
          <SettingRow
            label="Lock all XO"
            hint="Pause public and friend matchmaking."
            checked={xoLockAll}
            disabled={!isSuperAdmin}
            onChange={v => { setXoLockAll(v); updateSetting('xo_lock_all', v); }}
          />
          <SettingRow
            label="Lock public rooms"
            checked={xoLockRooms}
            disabled={!isSuperAdmin || xoBlocked}
            onChange={v => { setXoLockRooms(v); updateSetting('xo_lock_rooms', v); }}
          />
          <SettingRow
            label="Lock friend battles"
            checked={xoLockFriends}
            disabled={!isSuperAdmin || xoBlocked}
            onChange={v => { setXoLockFriends(v); updateSetting('xo_lock_friends', v); }}
          />
          <SettingRow
            label="XO AI fallback"
            hint="Fill public queues after the wait period."
            checked={botFallback}
            disabled={xoBlocked}
            onChange={v => { setBotFallback(v); updateSetting('bot_fallback', v); }}
          />
          {/* Fill wait selector */}
          <View style={[st.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: C.onSurfaceVariant }}>Wait before adding AI</Text>
            {Platform.OS === 'web' ? (
              <select
                value={fillSeconds}
                disabled={!botFallback || xoBlocked}
                onChange={(e: any) => { const v = Number(e.target.value); setFillSeconds(v); updateSetting('fill_seconds', v); }}
                style={{
                  height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                  backgroundColor: C.surface, paddingLeft: 12, paddingRight: 12,
                  fontSize: 12, color: C.onSurface, outline: 'none',
                  opacity: (!botFallback || xoBlocked) ? 0.4 : 1,
                } as any}
              >
                {[5, 10, 15, 20, 30, 45, 60].map(s => <option key={s} value={s}>{s} seconds</option>)}
              </select>
            ) : (
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>{fillSeconds}s</Text>
            )}
          </View>
        </AdminPanel>

        {/* Spin Wheel controls */}
        <AdminPanel
          title="Spin Wheel controls"
          kicker="Changes apply only to Spin Wheel."
          style={{ flex: 1 }}
          right={<Ionicons name="disc-outline" size={16} color={C.primary} />}
        >
          <SettingRow
            label="Pause Spin Wheel"
            hint="Stop new Spin rooms and rail wagers."
            checked={spinPaused}
            disabled={!isSuperAdmin}
            onChange={v => { setSpinPaused(v); updateSetting('spin_paused', v); }}
          />
          <SettingRow
            label="5-player room bots"
            hint="Fill unoccupied seats in five-player rooms."
            checked={spinBots}
            disabled={spinBlocked}
            onChange={v => { setSpinBots(v); updateSetting('spin_bots_enabled', v); }}
          />
          <SettingRow
            label="Rail wager bots"
            hint="Provide liquidity for continuous rail wagers."
            checked={spinRailBots}
            disabled={spinBlocked}
            onChange={v => { setSpinRailBots(v); updateSetting('spin_rail_bots', v); }}
          />
          {/* Live rooms info */}
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 8, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Live stats</Text>
              <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>{spinBlocked ? 'Paused' : 'Realtime'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <View style={[st.statChip, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Active games</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.onSurface }}>{liveStats.activeGamesCount || 0}</Text>
              </View>
              <View style={[st.statChip, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Queued players</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.onSurface }}>
                  {Object.values(liveStats.roomStats || {}).reduce((sum: number, r: any) => sum + (r?.queue || 0), 0)}
                </Text>
              </View>
            </View>
          </View>
        </AdminPanel>
      </View>

      {/* ═══ Stake Settings Table ═══ */}
      <AdminPanel
        title="Stake settings"
        kicker="Each game's timers and availability are independent."
        noPadBody
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
          <View style={{ minWidth: 760 }}>
            {/* Table header */}
            <View style={[st.tableRow, { backgroundColor: C.surfaceContainerHighest }]}>
              <Text style={[st.th, { flex: 1.2 }]}>Game</Text>
              <Text style={[st.th, { flex: 0.8 }]}>Stake</Text>
              <Text style={[st.th, { flex: 1 }]}>Available</Text>
              <Text style={[st.th, { flex: 1 }]}>Timer</Text>
              <Text style={[st.th, { flex: 0.8, textAlign: 'right' }]}>Matches</Text>
              <Text style={[st.th, { flex: 0.8, textAlign: 'right' }]}>GGR (ETB)</Text>
            </View>
            {/* XO rows */}
            {STAKE_TIERS.map((stake, tier) => {
              const room = roomStates[tier] || { enabled: true, turnSeconds: 20 };
              const blocked = xoBlocked || xoLockRooms;
              const stats = liveStats.roomStats?.[`room_${tier}`] || {};
              return (
                <View key={`xo-${tier}`} style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Ionicons name="game-controller-outline" size={14} color={C.onSurfaceVariant} />
                    <Text style={{ fontWeight: '700', color: C.onSurface, fontSize: 12 }}>Tic-Tac-Toe</Text>
                  </View>
                  <Text style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '600', color: C.onSurface, fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                    {stake.toLocaleString()} ETB
                  </Text>
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
                  <Text style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'right', color: C.onSurface, fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                    {fmt(stats.matches || 0)}
                  </Text>
                  <Text style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'right', fontWeight: '600', color: C.onSurface, fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                    {fmt(stats.ggr || 0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </AdminPanel>

      {/* ═══ Diagnostics ═══ */}
      <AdminPanel title="Diagnostics" kicker="Engine health and shadow pool">
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Engine health</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>Matchmaking and game loops are running.</Text>
              </View>
            </View>
            <AdminPill tone="positive" dot>Healthy</AdminPill>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.onSurface }}>Active connections</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <View style={[st.statChip, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>WebSocket</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.success }}>{liveStats.wsConnections || 0}</Text>
              </View>
              <View style={[st.statChip, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Active games</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>{liveStats.activeGamesCount || 0}</Text>
              </View>
              <View style={[st.statChip, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>In queue</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.accentGold }}>
                  {Object.values(liveStats.roomStats || {}).reduce((sum: number, r: any) => sum + (r?.queue || 0), 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </AdminPanel>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, minHeight: 52, borderBottomWidth: 1, paddingVertical: 10,
  },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 11, fontWeight: '700' },
  statChip: { borderRadius: 12, padding: 12, minWidth: 90 },
});
