// app/(authed)/admin/users.tsx — Players Roster
// Modern, high-craft admin player matrix with live stats, search, and responsive cards
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useRouter } from 'expo-router';
import { useAdminTheme } from '../../../constants/adminTheme';
import { useAdminNotifications } from '../../../context/AdminNotificationContext';
import {
  AdminPanel, AdminPill, AdminPager, AdminMeter, AdminButton,
} from '../../../components/admin/ui';
import Avatar from '../../../components/ui/Avatar';

interface User {
  id: string;
  number: string;
  username: string;
  available_balance: number;
  bonus_balance: number;
  withdrawable_balance?: number;
  banned: boolean;
  created_at: string;
  last_seen?: string;
  role?: string;
  display_name?: string;
  avatar?: string | null;
  total_wagered?: number;
  wins?: number;
  losses?: number;
}

type AccountStatus = 'all' | 'active' | 'banned';
type SortKey = 'wagered' | 'balance' | 'winrate' | 'recent';

const fmt = (n: number) => Number(n || 0).toLocaleString();
const fmtCompact = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

const timeSince = (d?: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  const s = Math.floor((Date.now() - time) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function AdminUsers() {
  const { theme: C } = useAdminTheme();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();
  const { notify } = useAdminNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusView, setStatusView] = useState<AccountStatus>('all');
  const [sort, setSort] = useState<SortKey>('wagered');
  const limit = 20;

  const fetchUsers = useCallback(async (searchOverride?: string) => {
    try {
      setLoading(true);
      const q = searchOverride !== undefined ? searchOverride : query;
      const offset = page * limit;
      let url = `${API_URL}/admin/users?limit=${limit}&offset=${offset}`;
      if (q.trim()) url += `&search=${encodeURIComponent(q.trim())}`;
      if (statusView === 'banned') url += '&status=banned';
      else if (statusView === 'active') url += '&status=active';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
      }
    } catch (e) {
      console.log('[admin/users]', e);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusView]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!query.trim()) { fetchUsers(); return; }
    const timer = setTimeout(() => { setPage(0); fetchUsers(query); }, 350);
    return () => clearTimeout(timer);
  }, [query, fetchUsers]);

  useEffect(() => { setPage(0); }, [statusView]);

  // Sort client-side
  const sorted = useMemo(() => {
    const list = [...users];
    const val = (u: User) => {
      if (sort === 'wagered') return u.total_wagered || 0;
      if (sort === 'balance') return (u.available_balance || 0) + (u.withdrawable_balance || 0) + (u.bonus_balance || 0);
      if (sort === 'recent') return new Date(u.created_at || 0).getTime();
      return (u.wins || 0) / Math.max(1, (u.wins || 0) + (u.losses || 0));
    };
    return list.sort((a, b) => val(b) - val(a));
  }, [users, sort]);

  // Global counts and aggregate totals
  const aggregates = useMemo(() => {
    let active = 0, banned = 0, totalWagered = 0, totalBalance = 0;
    users.forEach(u => {
      if (u.banned) banned++;
      else active++;
      totalWagered += (u.total_wagered || 0);
      totalBalance += ((u.available_balance || 0) + (u.withdrawable_balance || 0) + (u.bonus_balance || 0));
    });
    return { active, banned, totalWagered, totalBalance };
  }, [users]);

  const pages = Math.max(1, Math.ceil(total / limit));

  const winRate = (u: User) => {
    const totalGames = (u.wins || 0) + (u.losses || 0);
    return totalGames > 0 ? Math.round(((u.wins || 0) / totalGames) * 100) : 0;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{
        padding: isMobile ? 12 : 24,
        paddingBottom: 100,
        maxWidth: 1400,
        width: '100%',
        alignSelf: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Top Stats KPI Banner ─────────────────────────────────── */}
      <View style={[st.kpiGrid, isMobile && { flexDirection: 'column' }]}>
        <View style={[st.kpiCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[st.kpiLabel, { color: C.onSurfaceVariant }]}>REGISTERED ACCOUNTS</Text>
            <View style={[st.kpiIconBox, { backgroundColor: 'rgba(0, 218, 243, 0.12)' }]}>
              <Ionicons name="people" size={16} color={C.primary} />
            </View>
          </View>
          <Text style={[st.kpiValue, { color: C.onSurface }]}>{fmt(total)}</Text>
          <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>
            Active: <Text style={{ color: C.success, fontWeight: '700' }}>{aggregates.active}</Text> · Banned: <Text style={{ color: C.error, fontWeight: '700' }}>{aggregates.banned}</Text>
          </Text>
        </View>

        <View style={[st.kpiCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[st.kpiLabel, { color: C.onSurfaceVariant }]}>PAGE WALLET LIQUIDITY</Text>
            <View style={[st.kpiIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Ionicons name="wallet" size={16} color={C.success} />
            </View>
          </View>
          <Text style={[st.kpiValue, { color: C.success }]}>{fmtCompact(aggregates.totalBalance)} ETB</Text>
          <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>
            Across {users.length} loaded records
          </Text>
        </View>

        <View style={[st.kpiCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[st.kpiLabel, { color: C.onSurfaceVariant }]}>PAGE WAGER HANDLE</Text>
            <View style={[st.kpiIconBox, { backgroundColor: 'rgba(250, 204, 21, 0.12)' }]}>
              <Ionicons name="flame" size={16} color={C.accentGold} />
            </View>
          </View>
          <Text style={[st.kpiValue, { color: C.accentGold }]}>{fmtCompact(aggregates.totalWagered)} ETB</Text>
          <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>
            Cumulative stakes recorded
          </Text>
        </View>
      </View>

      {/* ─── Main Panel ────────────────────────────────────────────── */}
      <AdminPanel
        title="Player Roster"
        kicker={`${fmt(total)} registered accounts · Click any row for 360° analytics`}
        noPadBody
        right={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {/* Status Tabs */}
            <View style={[st.tabGroup, { backgroundColor: C.surfaceContainerHighest }]}>
              {([
                ['all', 'All'] as const,
                ['active', `Active (${aggregates.active})`] as const,
                ['banned', `Banned (${aggregates.banned})`] as const,
              ]).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setStatusView(k)}
                  style={[st.tabBtn, statusView === k && { backgroundColor: C.surface }]}
                >
                  <Text style={[st.tabBtnText, { color: statusView === k ? C.onSurface : C.onSurfaceVariant }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Select */}
            {Platform.OS === 'web' ? (
              <select
                value={sort}
                onChange={(e: any) => setSort(e.target.value)}
                style={{
                  height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                  backgroundColor: C.surface, paddingLeft: 8, paddingRight: 8,
                  fontSize: 11, fontWeight: 600, color: C.onSurface, outline: 'none',
                  cursor: 'pointer',
                } as any}
              >
                <option value="wagered">Sort: Total Wagered</option>
                <option value="balance">Sort: Wallet Balance</option>
                <option value="winrate">Sort: Win Rate</option>
                <option value="recent">Sort: Recently Joined</option>
              </select>
            ) : null}

            <AdminButton
              tone="ghost"
              icon="refresh"
              size="sm"
              loading={loading}
              onPress={() => {
                fetchUsers();
              }}
            >
              Refresh
            </AdminButton>
          </View>
        }
      >
        {/* Search Row */}
        <View style={[st.searchRow, { borderBottomColor: C.border }]}>
          <View style={[st.searchBox, { backgroundColor: C.surfaceContainerHighest, borderColor: C.border }]}>
            <Ionicons name="search" size={15} color={C.onSurfaceVariant} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, phone (+251...), or UUID..."
              placeholderTextColor={C.onSurfaceVariant}
              style={[st.searchInput, { color: C.onSurface }]}
              {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Loading Spinner */}
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ color: C.onSurfaceVariant, fontSize: 12, marginTop: 12 }}>Loading player roster...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ minWidth: 860, width: '100%' }}>
              {/* Table Header */}
              <View style={[st.tableHead, { backgroundColor: C.surfaceContainerHighest, borderBottomColor: C.border }]}>
                <View style={[st.tableCell, { flex: 2.3, minWidth: 190, paddingHorizontal: 14 }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant }]}>PLAYER IDENTITY</Text>
                </View>
                <View style={[st.tableCell, { flex: 1.5, minWidth: 135, paddingHorizontal: 12 }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant }]}>PHONE & ID</Text>
                </View>
                <View style={[st.tableCell, { flex: 1.15, minWidth: 105, paddingHorizontal: 12, justifyContent: 'flex-end' }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant, textAlign: 'right' }]}>TOTAL WAGERED</Text>
                </View>
                <View style={[st.tableCell, { flex: 1.25, minWidth: 115, paddingHorizontal: 12, justifyContent: 'flex-end' }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant, textAlign: 'right' }]}>WALLET BALANCE</Text>
                </View>
                <View style={[st.tableCell, { flex: 1.1, minWidth: 105, paddingHorizontal: 12, justifyContent: 'flex-end' }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant, textAlign: 'right' }]}>WIN RATE</Text>
                </View>
                <View style={[st.tableCell, { flex: 0.95, minWidth: 92, paddingHorizontal: 12 }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant }]}>STATUS</Text>
                </View>
                <View style={[st.tableCell, { flex: 0.95, minWidth: 96, paddingHorizontal: 14, justifyContent: 'center' }]}>
                  <Text style={[st.th, { color: C.onSurfaceVariant, textAlign: 'center' }]}>ACTION</Text>
                </View>
              </View>

              {/* Rows */}
              {sorted.map(u => {
                const wr = winRate(u);
                const totalBalance = (u.available_balance || 0) + (u.withdrawable_balance || 0) + (u.bonus_balance || 0);
                const isOnline = !u.banned;

                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}
                    onPress={() => router.push(`/admin/user-detail?id=${u.id}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Player Identity */}
                    <View style={[st.tableCell, { flex: 2.3, minWidth: 190, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 }]}>
                      <View style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar uri={u.avatar} name={u.display_name || u.username} size="sm" />
                        <View style={[st.onlineDot, { backgroundColor: isOnline ? C.success : 'rgba(255,255,255,0.2)' }]} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontWeight: '800', color: C.onSurface, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                            {u.display_name || u.username || 'Anonymous'}
                          </Text>
                          {u.role && u.role !== 'user' && (
                            <View style={[st.roleBadge, { backgroundColor: 'rgba(0, 218, 243, 0.15)', borderColor: 'rgba(0, 218, 243, 0.4)' }]}>
                              <Text style={{ color: C.primary, fontSize: 8, fontWeight: '800' }}>{u.role.toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>
                          @{u.username || 'unknown'} · Joined {timeSince(u.created_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Phone & ID */}
                    <View style={[st.tableCell, { flex: 1.5, minWidth: 135, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 12 }]}>
                      <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '600', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }} numberOfLines={1}>
                        {u.number || 'No phone'}
                      </Text>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 9.5, marginTop: 3, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }} numberOfLines={1}>
                        ID: {u.id.slice(0, 8)}…
                      </Text>
                    </View>

                    {/* Total Wagered */}
                    <View style={[st.tableCell, { flex: 1.15, minWidth: 105, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 12 }]}>
                      <Text style={{ fontWeight: '800', color: C.onSurface, fontSize: 12.5 }}>
                        {fmtCompact(u.total_wagered || 0)} ETB
                      </Text>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 3 }}>
                        {(u.wins || 0) + (u.losses || 0)} matches
                      </Text>
                    </View>

                    {/* Wallet Balance */}
                    <View style={[st.tableCell, { flex: 1.25, minWidth: 115, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 12 }]}>
                      <Text style={{ fontWeight: '800', color: totalBalance > 0 ? C.success : C.onSurfaceVariant, fontSize: 12.5 }}>
                        {fmt(totalBalance)} ETB
                      </Text>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 3 }}>
                        Avail: {fmt(u.available_balance || 0)}
                      </Text>
                    </View>

                    {/* Win Rate */}
                    <View style={[st.tableCell, { flex: 1.1, minWidth: 105, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: wr >= 50 ? C.accentGold : C.onSurfaceVariant, fontSize: 12, fontWeight: '800' }}>
                          {wr}%
                        </Text>
                        <View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <View style={{ width: `${Math.min(100, wr)}%`, height: '100%', backgroundColor: wr >= 50 ? C.accentGold : C.primary }} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 3 }}>
                        {u.wins || 0}W - {u.losses || 0}L
                      </Text>
                    </View>

                    {/* Status */}
                    <View style={[st.tableCell, { flex: 0.95, minWidth: 92, paddingHorizontal: 12, paddingVertical: 12 }]}>
                      <AdminPill tone={u.banned ? 'coral' : 'positive'} dot>
                        {u.banned ? 'Banned' : 'Active'}
                      </AdminPill>
                    </View>

                    {/* Action */}
                    <View style={[st.tableCell, { flex: 0.95, minWidth: 96, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' }]}>
                      <View style={[st.actionPill, { backgroundColor: 'rgba(0, 218, 243, 0.1)', borderColor: 'rgba(0, 218, 243, 0.3)' }]}>
                        <Text style={{ color: C.primary, fontSize: 10.5, fontWeight: '700' }}>Inspect</Text>
                        <Ionicons name="chevron-forward" size={12} color={C.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {sorted.length === 0 && (
                <View style={{ padding: 48, alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.15)" />
                  <Text style={{ fontSize: 13, color: C.onSurfaceVariant, marginTop: 12, fontWeight: '600' }}>
                    No players found matching your search.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Pager */}
        {total > limit && (
          <AdminPager
            page={page}
            pages={pages}
            count={total}
            size={limit}
            label="players"
            onPage={p => setPage(p)}
          />
        )}
      </AdminPanel>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  kpiGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabGroup: { flexDirection: 'row', borderRadius: 8, padding: 3 },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tabBtnText: { fontSize: 10.5, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 13 },
  tableHead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  tableCell: { flexDirection: 'row', alignItems: 'center' },
  th: { paddingVertical: 12, fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#0b0f19',
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
});
