// app/(authed)/admin/leaderboard.tsx — Weekly Leaderboard Admin
// Redesigned to match reference LeaderboardPanel layout.
// Uses real backend APIs for standings, snapshots, and giveaway.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import {
  AdminPanel, AdminPill, AdminButton, AdminToggle, AdminPager,
} from '../../../components/admin/ui';

/* ── helpers ─────────────────────────────────────────── */
const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtETB = (n: number) => `ETB ${fmtInt(n)}`;
const fmtDay = (iso: string) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ── Countdown component ─────────────────────────────── */
function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, to - now);
  const parts = [
    { l: 'Days', v: Math.floor(left / 86_400_000) },
    { l: 'Hours', v: Math.floor((left % 86_400_000) / 3_600_000) },
    { l: 'Min', v: Math.floor((left % 3_600_000) / 60_000) },
    { l: 'Sec', v: Math.floor((left % 60_000) / 1000) },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {parts.map(p => (
        <View
          key={p.l}
          style={{
            flex: 1, borderRadius: 12, paddingVertical: 12,
            alignItems: 'center',
            backgroundColor: '#FF2D55',
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>
            {String(p.v).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
            {p.l}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ── types ───────────────────────────────────────────── */
type Standing = { id: string; username: string; number: string; wins: number; rank: number };
type Snapshot = {
  id: string; week_start: string; week_end: string;
  user_id: string; username: string; wins: number;
  rank: number; prize_amount: number; prize_status: string;
};

/* ── rank styling ────────────────────────────────────── */
const RANK_BG = ['#fde7ad', '#e2e8f0', '#f3d0b3'];
const RANK_FG = ['#855f14', '#475569', '#8c5128'];

/* ════════════════════════════════════════════════════════════════════ */
export default function AdminLeaderboardPage() {
  const { theme: C, isDark } = useAdminTheme();
  const { token, isSuperAdmin, showAlert } = useAuth();
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' }),
    [token],
  );

  const [loading, setLoading] = useState(true);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Confirm dialog
  const [confirm, setConfirm] = useState(false);

  /* ── fetch ─────────────────────────────────────────── */
  const fetchStandings = useCallback(async () => {
    if (!token) return;
    try {
      const offset = (page - 1) * LIMIT;
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      const res = await fetch(`${API_URL}/admin/leaderboard/current?${params}`, { headers });
      const data = await res.json();
      if (data.ok) {
        setStandings(data.standings || []);
        setTotal(data.total || 0);
        setWeekStart(data.weekStart || '');
        setWeekEnd(data.weekEnd || '');
      }
    } catch (e) { console.error('[leaderboard/standings]', e); }
  }, [token, page]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const offset = (page - 1) * LIMIT;
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      const [standingsRes, snapshotsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/admin/leaderboard/current?${params}`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/leaderboard/snapshots`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/admin/settings`, { headers }).then(r => r.json()),
      ]);
      if (standingsRes.ok) {
        setStandings(standingsRes.standings || []);
        setTotal(standingsRes.total || 0);
        setWeekStart(standingsRes.weekStart || '');
        setWeekEnd(standingsRes.weekEnd || '');
      }
      if (snapshotsRes.ok) setSnapshots(snapshotsRes.snapshots || []);
      if (settingsRes.ok) setAutoApprove(settingsRes.config?.leaderboard_auto_approve === true);
    } catch (e) { console.error('[leaderboard/fetchAll]', e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchStandings(); }, [page]);

  const weekEndMs = weekEnd ? new Date(weekEnd).getTime() : 0;
  const leader = standings[0];
  const pendingSnapshots = snapshots.filter(s => s.prize_status === 'pending');
  const pendingTotal = pendingSnapshots.reduce((s, r) => s + (r.prize_amount || 0), 0);
  const paidCount = snapshots.filter(s => s.prize_status === 'approved' || s.prize_status === 'paid').length;

  // Last week winners (from snapshots)
  const lastWeekWinners = snapshots
    .filter(s => s.prize_status === 'approved' || s.prize_status === 'paid')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);

  const createSnapshot = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/snapshot`, {
        method: 'POST', headers,
        body: JSON.stringify({ autoApprove }),
      });
      const data = await res.json();
      if (data.ok) {
        showAlert('Success', data.message || 'Snapshot created');
        setConfirm(false);
        fetchAll();
      } else {
        showAlert('Error', data.error || 'Failed');
      }
    } catch (e) {
      showAlert('Error', 'Network error');
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    try {
      await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ [key]: value }),
      });
    } catch {}
  };

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 80 }} />
        ) : (
          <>
            {/* ── Top row: countdown + award mode ── */}
            <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 16 } : { gap: 16 }}>
              {/* Countdown */}
              <View style={{ flex: 1.1 }}>
                <AdminPanel
                  title="This week ends in"
                  kicker={`Cycle ${fmtDay(weekStart)} - ${fmtDay(weekEnd)} · snapshot taken at 23:59 EAT`}
                >
                  <Countdown to={weekEndMs} />
                  {/* KPIs */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Prize pool</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.primary, marginTop: 4 }}>
                        {fmtETB(pendingTotal)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Current leader</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: C.onSurface, marginTop: 4 }} numberOfLines={1}>
                        {leader?.username || '--'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Paid</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.onSurface, marginTop: 4 }}>
                        {`${paidCount}/${snapshots.length}`}
                      </Text>
                    </View>
                  </View>
                </AdminPanel>
              </View>

              {/* Prize award mode */}
              <View style={{ flex: 1 }}>
                <AdminPanel title="Prize award mode" kicker="How winners are paid when the countdown reaches zero">
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['auto', 'manual'] as const).map(m => {
                      const active = autoApprove === (m === 'auto');
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => {
                            const val = m === 'auto';
                            setAutoApprove(val);
                            updateSetting('leaderboard_auto_approve', val);
                          }}
                          disabled={!isSuperAdmin}
                          style={{
                            flex: 1, borderRadius: 12, borderWidth: 1, padding: 14,
                            borderColor: active ? C.primary + '66' : C.border,
                            backgroundColor: active ? C.primary + '18' : C.surface,
                            opacity: !isSuperAdmin ? 0.55 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: active ? C.primary : C.onSurface }}>
                            {m === 'auto' ? 'Automatic' : 'Manual approval'}
                          </Text>
                          <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 4, lineHeight: 15 }}>
                            {m === 'auto'
                              ? 'Prizes credit to withdrawable wallets the moment the week closes.'
                              : 'Week closes, then an admin reviews and confirms each payout.'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={{ marginTop: 16 }}>
                    <AdminButton
                      tone="brand"
                      icon="trophy-outline"
                      onPress={() => setConfirm(true)}
                      disabled={!isSuperAdmin || pendingTotal === 0}
                    >
                      {pendingTotal ? `Review and pay ${fmtETB(pendingTotal)}` : 'All prizes paid'}
                    </AdminButton>
                  </View>
                </AdminPanel>
              </View>
            </View>

            {/* ── Bottom row: standings table + last week ── */}
            <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : { gap: 16 }}>
              {/* Live standings */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <AdminPanel
                  title="Live weekly standings"
                  kicker="Ranked by wins · prizes are credited to the withdrawable wallet"
                  noPadBody
                  right={<AdminPill tone="brand">Week live</AdminPill>}
                >
                  {/* Table header */}
                  <View style={{
                    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
                    backgroundColor: C.surfaceContainerHighest,
                    borderBottomWidth: 1, borderBottomColor: C.border,
                  }}>
                    {['Rank', 'Player', 'Total wins', 'Prize', 'Status'].map((h, i) => (
                      <Text
                        key={h}
                        style={{
                          flex: i === 1 ? 2 : 1,
                          fontSize: 10, fontWeight: '700', color: C.onSurfaceVariant,
                          textTransform: 'uppercase', letterSpacing: 1,
                          textAlign: i >= 2 ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </Text>
                    ))}
                  </View>
                  {/* Rows */}
                  {standings.map((row, idx) => {
                    const globalIdx = (page - 1) * LIMIT + idx;
                    const snap = snapshots.find(s => s.user_id === row.id);
                    const status = snap?.prize_status || 'PENDING';
                    return (
                      <View
                        key={row.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 16, paddingVertical: 12,
                          borderBottomWidth: 1, borderBottomColor: C.border,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{
                            width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: globalIdx < 3 ? RANK_BG[globalIdx] : C.surfaceContainerLow,
                          }}>
                            <Text style={{
                              fontSize: 11, fontWeight: '800',
                              color: globalIdx < 3 ? RANK_FG[globalIdx] : C.onSurfaceVariant,
                              fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
                            }}>
                              {globalIdx + 1}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ flex: 2, fontSize: 12, fontWeight: '800', color: C.onSurface }}>{row.username}</Text>
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: C.onSurface, textAlign: 'right' }}>
                          {fmtInt(row.wins)}
                        </Text>
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: C.primary, textAlign: 'right' }}>
                          {snap ? fmtETB(snap.prize_amount) : '--'}
                        </Text>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <AdminPill tone={status.toLowerCase().includes('paid') || status.toLowerCase().includes('approved') ? 'positive' : 'gold'}>
                            {status.toUpperCase()}
                          </AdminPill>
                        </View>
                      </View>
                    );
                  })}
                  {standings.length === 0 && (
                    <Text style={{ textAlign: 'center', color: C.onSurfaceVariant, paddingVertical: 40, fontSize: 12 }}>
                      No standings available this week.
                    </Text>
                  )}
                  {totalPages > 1 && (
                    <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                      <AdminPager page={page} pages={totalPages} count={total} size={LIMIT} label="standings" onPage={setPage} />
                    </View>
                  )}
                </AdminPanel>
              </View>

              {/* Last week winners */}
              <View style={Platform.OS === 'web' ? { width: 360 } : {}}>
                <AdminPanel
                  title="Last week's winners"
                  kicker={lastWeekWinners.length > 0 ? `${fmtDay(lastWeekWinners[0]?.week_start || '')} - ${fmtDay(lastWeekWinners[0]?.week_end || '')}` : 'No data'}
                >
                  {lastWeekWinners.length === 0 ? (
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>
                      No past winners yet.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {lastWeekWinners.map((row, i) => (
                        <View
                          key={row.id || `${i}`}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12,
                          }}
                        >
                          <View style={{
                            width: 32, height: 32, borderRadius: 16,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: i < 3 ? RANK_BG[i] : C.surfaceContainerLow,
                          }}>
                            <Text style={{
                              fontSize: 11, fontWeight: '800',
                              color: i < 3 ? RANK_FG[i] : C.onSurfaceVariant,
                              fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
                            }}>
                              {i + 1}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: C.onSurface }}>{row.username}</Text>
                            <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>{fmtInt(row.wins)} wins</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: C.primary }}>{fmtETB(row.prize_amount)}</Text>
                            <AdminPill tone="positive">PAID</AdminPill>
                          </View>
                        </View>
                      ))}
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }}>
                        {`Total paid ${fmtETB(lastWeekWinners.reduce((s, r) => s + r.prize_amount, 0))}`}
                      </Text>
                    </View>
                  )}
                </AdminPanel>
              </View>
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Confirm payout modal ── */}
      <Modal visible={confirm} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: 460, maxWidth: '90%' as any, borderRadius: 16, backgroundColor: C.surface, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: C.onSurface }}>Confirm weekly prize payout</Text>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>
                  These amounts will be credited to each winner's withdrawable balance and written to the ledger.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setConfirm(false)}>
                <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260, marginTop: 16, borderWidth: 1, borderColor: C.border, borderRadius: 12 }}>
              {pendingSnapshots.map((r, i) => (
                <View key={r.id} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderBottomWidth: i < pendingSnapshots.length - 1 ? 1 : 0, borderBottomColor: C.border,
                }}>
                  <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>
                    <Text style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', color: C.onSurfaceVariant }}>#{r.rank} </Text>
                    {r.username}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.primary }}>{fmtETB(r.prize_amount)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>Total</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.onSurface }}>{fmtETB(pendingTotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <AdminButton tone="ghost" onPress={() => setConfirm(false)}>Cancel</AdminButton>
              <AdminButton tone="brand" icon="trophy-outline" onPress={createSnapshot}>Confirm and pay</AdminButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
