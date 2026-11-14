// app/(authed)/admin/users.tsx — Players view
// Matches reference: PlayerRoster (sortable table, status filter, search)
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
import {
  AdminPanel, AdminPill, AdminButton, AdminPager,
} from '../../../components/admin/ui';
import Avatar from '../../../components/ui/Avatar';

interface User {
  id: string; number: string; username: string;
  available_balance: number; bonus_balance: number;
  banned: boolean; created_at: string;
  role?: string; display_name?: string; avatar?: string | null;
  total_wagered?: number; wins?: number; losses?: number;
  withdrawable_balance?: number;
}

type AccountStatus = 'all' | 'active' | 'banned';
type SortKey = 'wagered' | 'balance' | 'winrate';

const fmt = (n: number) => Number(n || 0).toLocaleString();
const fmtETB = (n: number) => `${fmt(n)} ETB`;
const fmtCompact = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

const STATUS_PILL: Record<string, { label: string; tone: 'positive' | 'gold' | 'coral' }> = {
  active: { label: 'Active', tone: 'positive' },
  suspended: { label: 'Suspended', tone: 'gold' },
  banned: { label: 'Banned', tone: 'coral' },
};

export default function AdminUsers() {
  const { theme: C } = useAdminTheme();
  const { token, isSuperAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

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
    } catch (e) { console.log('[admin/users]', e); }
    finally { setLoading(false); }
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
      return (u.wins || 0) / Math.max(1, (u.wins || 0) + (u.losses || 0));
    };
    return list.sort((a, b) => val(b) - val(a));
  }, [users, sort]);

  // Counts
  const counts = useMemo(() => {
    const c = { active: 0, banned: 0 };
    users.forEach(u => { if (u.banned) c.banned++; else c.active++; });
    return c;
  }, [users]);

  const pages = Math.max(1, Math.ceil(total / limit));

  const initials = (u: User) => (u.display_name || u.username || u.number || '??').slice(0, 2).toUpperCase();
  const winRate = (u: User) => {
    const total = (u.wins || 0) + (u.losses || 0);
    return total > 0 ? ((u.wins || 0) / total * 100).toFixed(0) : '0';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ padding: isMobile ? 12 : 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <AdminPanel
        title="Player roster"
        kicker={`${fmt(total)} wallets match this segment · select a player to view details`}
        noPadBody
        right={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {/* Status filter */}
            <View style={[st.tabGroup, { backgroundColor: C.surfaceContainerHighest }]}>
              {([
                ['all', 'All'] as const,
                ['active', `Active ${counts.active}`] as const,
                ['banned', `Banned ${counts.banned}`] as const,
              ]).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setStatusView(k)}
                  style={[st.tabBtn, statusView === k && { backgroundColor: C.surface }]}
                >
                  <Text style={[st.tabBtnText, { color: statusView === k ? C.onSurface : C.onSurfaceVariant }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Sort */}
            {Platform.OS === 'web' ? (
              <select
                value={sort}
                onChange={(e: any) => setSort(e.target.value)}
                style={{
                  height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                  backgroundColor: C.surface, paddingLeft: 8, paddingRight: 8,
                  fontSize: 11, fontWeight: 600, color: C.onSurfaceVariant, outline: 'none',
                } as any}
              >
                <option value="wagered">Sort: wagered</option>
                <option value="balance">Sort: wallet balance</option>
                <option value="winrate">Sort: win rate</option>
              </select>
            ) : null}
          </View>
        }
      >
        {/* Search */}
        <View style={[st.searchRow, { borderBottomColor: C.border }]}>
          <View style={[st.searchBox, { backgroundColor: C.surfaceContainerHighest, borderColor: C.border }]}>
            <Ionicons name="search" size={14} color={C.onSurfaceVariant} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, phone, or ID..."
              placeholderTextColor={C.onSurfaceVariant}
              style={[st.searchInput, { color: C.onSurface }]}
              {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
            />
          </View>
        </View>

        {/* Table */}
        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginVertical: 40 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
            <View style={{ minWidth: 820 }}>
              {/* Header */}
              <View style={[st.tableRow, { backgroundColor: C.surfaceContainerHighest }]}>
                <Text style={[st.th, { flex: 2.5 }]}>Player</Text>
                <Text style={[st.th, { flex: 1 }]}>City</Text>
                <Text style={[st.th, { flex: 1, textAlign: 'right' }]}>Total wagered</Text>
                <Text style={[st.th, { flex: 1, textAlign: 'right' }]}>Wallet balance</Text>
                <Text style={[st.th, { flex: 0.7, textAlign: 'right' }]}>Win rate</Text>
                <Text style={[st.th, { flex: 0.8 }]}>Account</Text>
              </View>
              {/* Rows */}
              {sorted.map(u => {
                const status = u.banned ? 'banned' : 'active';
                const pill = STATUS_PILL[status];
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}
                    onPress={() => router.push(`/admin/user-detail?id=${u.id}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Player cell */}
                    <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                      <Avatar uri={u.avatar} name={u.display_name || u.username} size="sm" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: '700', color: C.onSurface, fontSize: 12 }} numberOfLines={1}>{u.username || 'Unknown'}</Text>
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }} numberOfLines={1}>{u.id.slice(0, 8)}</Text>
                      </View>
                    </View>
                    {/* City */}
                    <Text style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: C.onSurfaceVariant, fontSize: 12 }}>--</Text>
                    {/* Wagered */}
                    <Text style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '600', color: C.onSurface, fontSize: 12, textAlign: 'right' }}>
                      {fmtCompact(u.total_wagered || 0)} ETB
                    </Text>
                    {/* Balance */}
                    <Text style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: C.onSurfaceVariant, fontSize: 12, textAlign: 'right' }}>
                      {fmtCompact((u.available_balance || 0) + (u.withdrawable_balance || 0) + (u.bonus_balance || 0))} ETB
                    </Text>
                    {/* Win rate */}
                    <Text style={{ flex: 0.7, paddingHorizontal: 12, paddingVertical: 10, color: C.onSurfaceVariant, fontSize: 12, textAlign: 'right' }}>
                      {winRate(u)}%
                    </Text>
                    {/* Status */}
                    <View style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10 }}>
                      <AdminPill tone={pill.tone}>{pill.label}</AdminPill>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {sorted.length === 0 && (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>No players match this date range, segment, or account status.</Text>
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
  tabGroup: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tabBtnText: { fontSize: 11, fontWeight: '600' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 36 },
  searchInput: { flex: 1, fontSize: 12 },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 11, fontWeight: '700' },
});
