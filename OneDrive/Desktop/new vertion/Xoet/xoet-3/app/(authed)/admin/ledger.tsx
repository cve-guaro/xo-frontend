// app/(authed)/admin/ledger.tsx — Financial Ledger (XOET Design System)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from './_layout';

interface Tx {
  id: string;
  tx_ref?: string;
  provider_ref?: string;
  user_id: string;
  username?: string;
  number?: string;
  type: string;
  amount: number;
  provider?: string;
  bank?: string;
  status: string;
  created_at: string;
  provider_payload?: any;
}

const TABS = ['Recent Deposit Requests', 'Recent Withdrawal Requests'];

export default function AdminLedger() {
  const { theme: C, isDark } = useAdminTheme();
  const styles = useMemo(() => getStyles(C, isDark), [C, isDark]);
  const { token, t, showAlert, isSuperAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [txs, setTxs] = useState<Tx[]>([]);
  const [filtered, setFiltered] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(0); // 0 = Deposits, 1 = Withdrawals
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Admin Review' | 'Success' | 'Failed'>('All');
  const [amountRange, setAmountRange] = useState<'all' | '0-100' | '100-10000' | '10000-100000'>('all');
  const [gameFilter, setGameFilter] = useState<'all' | 'xo' | 'spin'>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const limit = 20;

  const openReviewModal = async (id: string) => {
    setReviewModalVisible(true);
    setReviewLoading(true);
    setReviewData(null);
    try {
      const res = await fetch(`${API_URL}/admin/transactions/${id}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setReviewData(await res.json());
    } finally {
      setReviewLoading(false);
    }
  };

  const execTxAction = async (action: 'approve' | 'reject' | 'ban' | 'delete', txId: string, userId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      let url = '';
      let method = 'PATCH';
      if (action === 'approve') url = `${API_URL}/admin/transactions/${txId}/approve`;
      if (action === 'reject') url = `${API_URL}/admin/transactions/${txId}/reject`;
      if (action === 'ban') {
        url = `${API_URL}/admin/users/${userId}/ban`;
        method = 'POST';
      }
      if (action === 'delete') {
        url = `${API_URL}/admin/users/${userId}`;
        method = 'DELETE';
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        showAlert('Success', `Action ${action} completed successfully.`);
        setReviewModalVisible(false);
        setConfirmAction(null);
        fetchTxs();
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert('Error', err.error || `Action ${action} failed`);
      }
    } catch {
      showAlert('Error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.log('[admin/stats]', e);
    }
  }, [token]);

  const fetchTxs = useCallback(async () => {
    try {
      setLoading(true);
      const offset = page * limit;
      const type = tab === 0 ? 'deposit' : 'withdrawal';
      const status = statusFilter === 'All' ? '' : statusFilter.toLowerCase();

      let url = `${API_URL}/admin/transactions?limit=${limit}&offset=${offset}&type=${type}`;
      if (status) {
        url += `&status=${
          status === 'success'
            ? 'success,succeeded'
            : status === 'failed'
            ? 'failed,rejected'
            : status === 'admin review'
            ? 'pending_manual'
            : status
        }`;
      }
      if (amountRange !== 'all') url += `&amountRange=${amountRange}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const d = await res.json();
        const list = d.transactions ?? [];
        setTxs(list);
        setTotal(d.total ?? 0);
      }
    } catch (e) {
      console.log('[admin/txs]', e);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, tab, statusFilter, amountRange]);

  useEffect(() => {
    fetchTxs();
    fetchStats();
  }, [fetchTxs, fetchStats]);

  useEffect(() => {
    let list = txs;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          (t.username || '').toLowerCase().includes(q) ||
          (t.number || '').includes(q) ||
          (t.tx_ref || '').toLowerCase().includes(q) ||
          (t.provider_ref || '').toLowerCase().includes(q) ||
          (t.user_id || '').toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [query, txs]);

  const etb = (v: number) => Number(v || 0).toFixed(2);
  const initials = (t: Tx) => (t.username || t.number || '??').slice(0, 2).toUpperCase();
  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: '—', time: '—' };
    }
  };

  const s = stats || {};
  const pendingCount = Number(s.pendingWithdrawals || 0);

  const renderStatusBadge = (statusStr: string) => {
    const sUpper = (statusStr || '').toUpperCase();
    const isPending = sUpper === 'PENDING' || sUpper === 'WAITING';
    const isAdminPending = sUpper === 'PENDING_MANUAL';
    const isSuccess = sUpper === 'SUCCESS' || sUpper === 'SUCCEEDED' || sUpper === 'COMPLETED' || sUpper === 'PAID';

    if (isPending) {
      return (
        <View style={styles.statusPending}>
          <Ionicons name="time-outline" size={12} color="#c084fc" />
          <Text style={[styles.statusText, { color: '#c084fc' }]}>PENDING</Text>
        </View>
      );
    }
    if (isAdminPending) {
      return (
        <View style={styles.statusPendingManual}>
          <Ionicons name="hourglass-outline" size={12} color="#fbbf24" />
          <Text style={[styles.statusText, { color: '#fbbf24' }]}>ADMIN REV</Text>
        </View>
      );
    }
    if (isSuccess) {
      return (
        <View style={styles.statusSuccess}>
          <Ionicons name="checkmark-circle-outline" size={12} color="#10b981" />
          <Text style={[styles.statusText, { color: '#10b981' }]}>SUCCESS</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusFailed}>
        <Ionicons name="alert-circle-outline" size={12} color="#ff2d55" />
        <Text style={[styles.statusText, { color: '#ff2d55' }]}>FAILED</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* ════════════════════════════════════════════════════════════════
            ██  HEADER (Image 2 Top)
            ════════════════════════════════════════════════════════════════ */}
        <View style={[styles.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="receipt-outline" size={24} color="#FF2D55" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>{t('financial_ledger') || 'Financial Ledger'}</Text>
              <Text style={styles.pageSub}>
                Manage user deposit and withdrawal transaction requests and wallet activity.
              </Text>
            </View>
          </View>

          {/* Tab Switch Pills: Recent Deposit Requests vs Recent Withdrawal Requests */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => {
                setTab(0);
                setPage(0);
              }}
              style={[styles.tabBtn, tab === 0 ? styles.tabBtnActive : styles.tabBtnInactive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, tab === 0 ? styles.tabTextActive : styles.tabTextInactive]}>
                Recent Deposit Requests
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTab(1);
                setPage(0);
              }}
              style={[styles.tabBtn, tab === 1 ? styles.tabBtnActive : styles.tabBtnInactive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, tab === 1 ? styles.tabTextActive : styles.tabTextInactive]}>
                Recent Withdrawal Requests
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════
            ██  4 KPI CARDS (Image 2 Bento)
            ════════════════════════════════════════════════════════════════ */}
        <View style={[styles.statsRow, isMobile && { gap: 10 }]}>
          {/* Card 1: Total Deposit */}
          <View style={[styles.statCard, isMobile && { width: '48%', flex: undefined, minWidth: '48%' }]}>
            <View style={styles.statTop}>
              <View style={styles.statIconBadgeGreen}>
                <Ionicons name="arrow-down-outline" size={16} color="#10b981" />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>TOTAL DEPOSIT</Text>
              <Ionicons name="trending-up-outline" size={14} color="#10b981" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>ETB {etb(s.totalDeposits || 0)}</Text>
          </View>

          {/* Card 2: Total Withdrawal */}
          <View style={[styles.statCard, isMobile && { width: '48%', flex: undefined, minWidth: '48%' }]}>
            <View style={styles.statTop}>
              <View style={styles.statIconBadgeRed}>
                <Ionicons name="arrow-up-outline" size={16} color="#f43f5e" />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>TOTAL WITHDRAWAL</Text>
              <Ionicons name="trending-down-outline" size={14} color="#f43f5e" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>ETB {etb(s.totalWithdrawals || 0)}</Text>
          </View>

          {/* Card 3: Admin Pending */}
          <View style={[styles.statCard, isMobile && { width: '48%', flex: undefined, minWidth: '48%' }]}>
            <View style={styles.statTop}>
              <View style={styles.statIconBadgeAmber}>
                <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>ADMIN PENDING</Text>
              <Ionicons name="time-outline" size={14} color="#f59e0b" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{pendingCount}</Text>
          </View>

          {/* Card 4: Failed Withdrawal */}
          <View style={[styles.statCard, isMobile && { width: '48%', flex: undefined, minWidth: '48%' }]}>
            <View style={styles.statTop}>
              <View style={styles.statIconBadgeRed}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>FAILED WITHDRAWAL</Text>
              <Ionicons name="trending-down-outline" size={14} color="#ef4444" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{s.failedWithdrawals || 0}</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════
            ██  MAIN CONTAINER / TABLE CARD (Image 2)
            ════════════════════════════════════════════════════════════════ */}
        <View style={styles.tableCard}>
          {/* Header Row with Title, Search, and Filters */}
          <View style={[styles.tableHead, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 14 }]}>
            <Text style={styles.tableTitle}>
              {tab === 0 ? 'Recent Deposit Requests' : 'Recent Withdrawal Requests'}
            </Text>

            <View style={[styles.filterBar, isMobile && { flexDirection: 'column', width: '100%' }]}>
              {/* Search Box */}
              <View style={[styles.searchBox, isMobile && { width: '100%' }]}>
                <Ionicons name="search" size={16} color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.7)'} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search ledger..."
                  placeholderTextColor={isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.5)'}
                  value={query}
                  onChangeText={setQuery}
                  {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {/* Status Filter Pill */}
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter !== 'All' && styles.filterChipActive]}
                  onPress={() => {
                    const map: any = {
                      All: 'Pending',
                      Pending: 'Admin Review',
                      'Admin Review': 'Success',
                      Success: 'Failed',
                      Failed: 'All',
                    };
                    setStatusFilter(map[statusFilter] || 'All');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="filter" size={13} color="#FF2D55" />
                  <Text style={styles.filterChipText}>Status: {statusFilter}</Text>
                </TouchableOpacity>

                {/* Amount Range Pill */}
                <View style={styles.dropdownChip}>
                  <Ionicons name="cash-outline" size={13} color={isDark ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.8)'} />
                  {Platform.OS === 'web' ? (
                    <select
                      value={amountRange}
                      onChange={(e: any) => setAmountRange(e.target.value as any)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        fontSize: 12,
                        fontWeight: '700',
                        outlineStyle: 'none',
                        cursor: 'pointer' as any,
                      } as any}
                    >
                      <option value="all" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>All Ranges</option>
                      <option value="0-100" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>0-100 ETB</option>
                      <option value="100-10000" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>100-10k ETB</option>
                      <option value="10000-100000" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>10k-100k ETB</option>
                    </select>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        const order = ['all', '0-100', '100-10000', '10000-100000'] as const;
                        setAmountRange(order[(order.indexOf(amountRange) + 1) % order.length]);
                      }}
                    >
                      <Text style={styles.dropdownChipText}>{amountRange === 'all' ? 'All Ranges' : amountRange.toUpperCase()}</Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={12} color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)'} />
                </View>

                {/* Game Filter Pill */}
                <View style={styles.dropdownChip}>
                  <Ionicons name="game-controller-outline" size={13} color={isDark ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.8)'} />
                  {Platform.OS === 'web' ? (
                    <select
                      value={gameFilter}
                      onChange={(e: any) => setGameFilter(e.target.value as any)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        fontSize: 12,
                        fontWeight: '700',
                        outlineStyle: 'none',
                        cursor: 'pointer' as any,
                      } as any}
                    >
                      <option value="all" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>All Games</option>
                      <option value="xo" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>XO Games</option>
                      <option value="spin" style={{ background: isDark ? '#0c1424' : '#fff', color: isDark ? '#fff' : '#000' }}>Spin Game</option>
                    </select>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        const order = ['all', 'xo', 'spin'] as const;
                        setGameFilter(order[(order.indexOf(gameFilter as any) + 1) % order.length] as any);
                      }}
                    >
                      <Text style={styles.dropdownChipText}>{gameFilter === 'all' ? 'All Games' : gameFilter.toUpperCase()}</Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={12} color={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)'} />
                </View>
              </View>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              ██  CONTENT: MOBILE CARDS vs DESKTOP TABLE
              ════════════════════════════════════════════════════════════════ */}
          {isMobile ? (
            /* ── MOBILE CARDS FEED (Image 2 Right Side) ── */
            <View style={{ padding: 14 }}>
              <AnimatedList
                items={loading ? [] : filtered}
                renderItem={(tx: Tx) => {
                  const d = fmtDate(tx.created_at);
                  const ini = initials(tx);

                  return (
                    <View key={tx.id} style={styles.mobileCard}>
                      {/* Top: Avatar, Name & ID on left, Status Badge on right */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <View style={styles.txAvatar}>
                            <Text style={styles.txAvatarText}>{ini}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.txName} numberOfLines={1}>{tx.username || 'Unknown'}</Text>
                            <Text style={styles.txId}>ID: {tx.user_id ? tx.user_id.slice(0, 8) : '-'}</Text>
                          </View>
                        </View>
                        {renderStatusBadge(tx.status)}
                      </View>

                      {/* Middle: Amount & Timestamp */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <Text style={[styles.txAmount, { color: tab === 1 ? '#f87171' : '#10b981' }]}>
                          {tab === 1 ? '- ' : '+ '}ETB {etb(tx.amount)}
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.txDate}>{d.date}</Text>
                          <Text style={styles.txTime}>{d.time}</Text>
                        </View>
                      </View>

                      {/* Bottom: Red Outlined "See More" Button */}
                      <TouchableOpacity
                        onPress={() => openReviewModal(tx.id)}
                        style={styles.mobileSeeMoreBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.mobileSeeMoreTxt}>See More</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
                showGradients={false}
                enableArrowNavigation={true}
              />
              {loading && <ActivityIndicator color="#FF2D55" style={{ marginVertical: 40 }} />}
              {!loading && filtered.length === 0 && <Text style={styles.empty}>No transactions found.</Text>}
            </View>
          ) : (
            /* ── DESKTOP TABLE (Image 2 Left Side) ── */
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 920, flex: 1 }}>
                {/* Column Headers */}
                <View style={styles.colRow}>
                  <View style={{ flex: 2 }}><Text style={styles.colHead}>USER ACCOUNT</Text></View>
                  <View style={{ flex: 1.2 }}><Text style={styles.colHead}>AMOUNT (ETB)</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.colHead}>METHOD</Text></View>
                  <View style={{ flex: 1.4 }}><Text style={styles.colHead}>TIMESTAMP</Text></View>
                  <View style={{ flex: 1.1 }}><Text style={styles.colHead}>STATUS</Text></View>
                  <View style={{ flex: 1.1, alignItems: 'flex-end' }}><Text style={styles.colHead}>RECEIPT</Text></View>
                </View>

                {/* Table Rows */}
                <AnimatedList
                  items={loading ? [] : filtered}
                  renderItem={(tx: Tx) => {
                    const d = fmtDate(tx.created_at);
                    const ini = initials(tx);

                    return (
                      <View key={tx.id} style={styles.txRow}>
                        {/* User Account */}
                        <View style={[styles.txUser, { flex: 2 }]}>
                          <View style={styles.txAvatar}>
                            <Text style={styles.txAvatarText}>{ini}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.txName} numberOfLines={1}>{tx.username || 'Unknown'}</Text>
                            <Text style={styles.txId}>ID: {tx.user_id ? tx.user_id.slice(0, 8) : '-'}</Text>
                          </View>
                        </View>

                        {/* Amount */}
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.txAmount, { color: tab === 1 ? '#f87171' : '#10b981' }]} numberOfLines={1}>
                            {tab === 1 ? '- ' : '+ '}ETB {etb(tx.amount)}
                          </Text>
                        </View>

                        {/* Method */}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.methodText}>{tx.provider || 'N/A'}</Text>
                        </View>

                        {/* Timestamp */}
                        <View style={[styles.txTimestamp, { flex: 1.4 }]}>
                          <Text style={styles.txDate}>{d.date}</Text>
                          <Text style={styles.txTime}>{d.time}</Text>
                        </View>

                        {/* Status */}
                        <View style={{ flex: 1.1 }}>
                          {renderStatusBadge(tx.status)}
                        </View>

                        {/* Action Receipt: Red Outlined "See More" */}
                        <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
                          <TouchableOpacity
                            onPress={() => openReviewModal(tx.id)}
                            style={styles.seeMoreBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.seeMoreBtnTxt}>See More</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                  showGradients={false}
                  enableArrowNavigation={true}
                />

                {loading && <ActivityIndicator color="#FF2D55" style={{ marginVertical: 40 }} />}
                {!loading && filtered.length === 0 && <Text style={styles.empty}>No transactions found.</Text>}
              </View>
            </ScrollView>
          )}

          {/* ════════════════════════════════════════════════════════════════
              ██  PAGINATION FOOTER (Image 2 Bottom)
              ════════════════════════════════════════════════════════════════ */}
          <View style={styles.paginationRow}>
            <Text style={styles.paginationInfo}>
              Showing <Text style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: '800' }}>
                {Math.min(total, page * limit + 1)}-{Math.min(total, (page + 1) * limit)}
              </Text> of <Text style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: '800' }}>{total}</Text> transactions
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 0 && { opacity: 0.35 }]}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                {!isMobile && <Text style={styles.pageBtnText}>Back</Text>}
              </TouchableOpacity>

              {isMobile && (
                <View style={styles.pageNumberPill}>
                  <Text style={styles.pageNumberText}>{page + 1}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.pageBtn, (page + 1) * limit >= total && { opacity: 0.35 }]}
                onPress={() => setPage((p) => ((p + 1) * limit < total ? p + 1 : p))}
                disabled={(page + 1) * limit >= total}
                activeOpacity={0.8}
              >
                {!isMobile && <Text style={styles.pageBtnText}>Next</Text>}
                <Ionicons name="chevron-forward" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════
          ██  TRANSACTION REVIEW / DETAILS MODAL
          ════════════════════════════════════════════════════════════════ */}
      {reviewModalVisible && (
        <Modal transparent animationType="fade" visible={reviewModalVisible}>
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                setReviewModalVisible(false);
                setConfirmAction(null);
              }}
            />
            <View style={styles.reviewModalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.modalHeaderIconBadge}>
                    <Ionicons name="receipt-outline" size={20} color="#FF2D55" />
                  </View>
                  <Text style={styles.modalHeaderTitle}>Transaction Details</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setReviewModalVisible(false);
                    setConfirmAction(null);
                  }}
                >
                  <Ionicons name="close" size={22} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
                </TouchableOpacity>
              </View>

              {reviewLoading || !reviewData ? (
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <ActivityIndicator color="#FF2D55" />
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={true}>
                  <Text style={styles.sectionHeading}>Transaction Context</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                    <View style={styles.contextBox}>
                      <Text style={styles.contextLabel}>STATUS</Text>
                      <Text style={[styles.contextValue, { color: '#FF2D55' }]}>
                        {(reviewData.transaction?.status || 'UNKNOWN').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contextBox}>
                      <Text style={styles.contextLabel}>AMOUNT</Text>
                      <Text style={[styles.contextValue, { color: '#10b981' }]}>
                        ETB {etb(reviewData.transaction?.amount)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sectionHeading}>User Details & Risk Profile</Text>
                  <View style={styles.riskBox}>
                    <Text style={{ color: '#FF2D55', fontSize: 13, fontWeight: '700' }}>
                      Anomaly Score: <Text style={{ fontWeight: '900' }}>{reviewData.user?.anomaly_score || 0} Flags</Text>
                    </Text>
                    {Number(reviewData.user?.anomaly_score) > 3 && (
                      <Text style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>
                        High risk of abuse. Verify bank transaction before manual action.
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contextLabel}>USERNAME</Text>
                      <Text style={styles.userInfoText}>{reviewData.user?.username || 'N/A'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contextLabel}>PHONE</Text>
                      <Text style={styles.userInfoText}>{reviewData.user?.number || 'N/A'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contextLabel}>ROLE</Text>
                      <Text style={[styles.userInfoText, { color: '#FF2D55', fontWeight: '800' }]}>
                        {String(reviewData.user?.role || 'user').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Actions for Pending Requests */}
                  {(reviewData.transaction?.status?.toUpperCase() === 'PENDING' ||
                    reviewData.transaction?.status?.toUpperCase() === 'PENDING_MANUAL') && (
                    <>
                      <Text style={styles.sectionHeading}>Manual Action</Text>
                      {!confirmAction && (
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                          <TouchableOpacity
                            disabled={actionLoading}
                            onPress={() => setConfirmAction('approve')}
                            style={styles.approveActionBtn}
                          >
                            <Text style={styles.approveActionTxt}>Approve Payout</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={actionLoading}
                            onPress={() => setConfirmAction('reject')}
                            style={styles.rejectActionBtn}
                          >
                            <Text style={styles.rejectActionTxt}>Reject & Refund</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {confirmAction === 'approve' && (
                        <View style={styles.confirmBox}>
                          <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '900', marginBottom: 8 }}>
                            Confirm Approval
                          </Text>
                          <Text style={styles.confirmSub}>
                            Mark withdrawal as COMPLETED. User will see success. Make sure money has been transferred manually.
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                            <TouchableOpacity
                              disabled={actionLoading}
                              onPress={() => execTxAction('approve', reviewData.transaction.id, reviewData.user.id)}
                              style={styles.confirmBtn}
                            >
                              <Text style={styles.confirmBtnTxt}>
                                {actionLoading ? 'Processing...' : 'Confirm Approval'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setConfirmAction(null)}
                              style={styles.cancelBtn}
                            >
                              <Text style={styles.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {confirmAction === 'reject' && (
                        <View style={styles.confirmBox}>
                          <Text style={{ color: '#FF2D55', fontSize: 14, fontWeight: '900', marginBottom: 8 }}>
                            Reject & Refund
                          </Text>
                          <Text style={styles.confirmSub}>
                            This marks the withdrawal as REJECTED and refunds ETB {etb(reviewData.transaction.amount)} to user.
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                            <TouchableOpacity
                              disabled={actionLoading}
                              onPress={() => execTxAction('reject', reviewData.transaction.id, reviewData.user.id)}
                              style={[styles.confirmBtn, { backgroundColor: '#FF2D55' }]}
                            >
                              <Text style={styles.confirmBtnTxt}>
                                {actionLoading ? 'Refunding...' : 'Confirm Reject & Refund'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setConfirmAction(null)}
                              style={styles.cancelBtn}
                            >
                              <Text style={styles.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// ██  STYLES (Full Dark/Light Theme Inversion)
// ════════════════════════════════════════════════════════════════
const getStyles = (C: any, isDark: boolean) => {
  const bgSurface = isDark ? '#0c1424' : '#ffffff';
  const bgCard = isDark ? '#080e1b' : '#f8fafc';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    pageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    headerIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 45, 85, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      color: textPrimary,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    pageSub: {
      color: textSecondary,
      fontSize: 12,
      marginTop: 2,
      fontWeight: '500',
    },
    tabContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tabBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    tabBtnActive: {
      backgroundColor: '#FF2D55',
      borderColor: '#FF2D55',
    },
    tabBtnInactive: {
      backgroundColor: isDark ? 'rgba(15, 24, 42, 0.6)' : '#ffffff',
      borderColor: borderColor,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
    },
    tabTextActive: {
      color: '#ffffff',
    },
    tabTextInactive: {
      color: textSecondary,
    },

    // ── 4 Bento Metric Cards ──
    statsRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 24,
      flexWrap: 'wrap',
    },
    statCard: {
      flex: 1,
      minWidth: 180,
      backgroundColor: bgSurface,
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 12,
      padding: 18,
    },
    statTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    statIconBadgeGreen: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statIconBadgeRed: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 45, 85, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statIconBadgeAmber: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      color: textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      flex: 1,
    },
    statValue: {
      color: textPrimary,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.5,
    },

    // ── Table Card ──
    tableCard: {
      backgroundColor: bgSurface,
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 14,
      overflow: 'hidden',
    },
    tableHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
      backgroundColor: bgSurface,
    },
    tableTitle: {
      color: textPrimary,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: bgCard,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: borderColor,
      width: 200,
    },
    searchInput: {
      flex: 1,
      color: textPrimary,
      fontSize: 12,
      fontWeight: '500',
      height: 20,
      padding: 0,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.08)' : 'rgba(255, 45, 85, 0.06)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.35)',
    },
    filterChipActive: {
      backgroundColor: '#FF2D55',
      borderColor: '#FF2D55',
    },
    filterChipText: {
      color: '#FF2D55',
      fontSize: 12,
      fontWeight: '700',
    },
    dropdownChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 10,
      backgroundColor: bgCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: borderColor,
    },
    dropdownChipText: {
      color: textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },

    // ── Table Columns Header ──
    colRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: bgCard,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    colHead: {
      color: textSecondary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    // ── Table Row ──
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    txUser: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minWidth: 0,
    },
    txAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 45, 85, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.3)',
    },
    txAvatarText: {
      color: '#FF2D55',
      fontSize: 12,
      fontWeight: '800',
    },
    txName: {
      color: textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    txId: {
      color: textSecondary,
      fontSize: 11,
      fontWeight: '500',
      marginTop: 2,
    },
    txAmount: {
      fontSize: 14,
      fontWeight: '800',
    },
    methodText: {
      color: textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    txTimestamp: {
      gap: 2,
    },
    txDate: {
      color: textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    txTime: {
      color: textSecondary,
      fontSize: 10,
      fontWeight: '500',
    },

    // ── Status Badges ──
    statusFailed: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.4)',
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.1)' : 'rgba(255, 45, 85, 0.06)',
      alignSelf: 'flex-start',
    },
    statusSuccess: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.4)',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.06)',
      alignSelf: 'flex-start',
    },
    statusPending: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(192, 132, 252, 0.4)',
      backgroundColor: isDark ? 'rgba(192, 132, 252, 0.1)' : 'rgba(192, 132, 252, 0.06)',
      alignSelf: 'flex-start',
    },
    statusPendingManual: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.4)',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.06)',
      alignSelf: 'flex-start',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    // ── See More Buttons ──
    seeMoreBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#FF2D55',
      backgroundColor: 'transparent',
    },
    seeMoreBtnTxt: {
      color: '#FF2D55',
      fontSize: 11,
      fontWeight: '800',
    },

    // ── Mobile Card ──
    mobileCard: {
      backgroundColor: bgCard,
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    mobileSeeMoreBtn: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: '#FF2D55',
      borderRadius: 8,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    mobileSeeMoreTxt: {
      color: '#FF2D55',
      fontSize: 12,
      fontWeight: '800',
    },

    // ── Pagination ──
    paginationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: borderColor,
      backgroundColor: bgSurface,
    },
    paginationInfo: {
      color: textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: bgCard,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: borderColor,
    },
    pageBtnText: {
      color: textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    pageNumberPill: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: '#FF2D55',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageNumberText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
    },

    empty: {
      color: textSecondary,
      textAlign: 'center',
      marginVertical: 40,
      fontSize: 13,
    },

    // ── Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    reviewModalCard: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: bgSurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: borderColor,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    modalHeaderIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 45, 85, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalHeaderTitle: {
      color: textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionHeading: {
      color: textSecondary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    contextBox: {
      flex: 1,
      backgroundColor: bgCard,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: borderColor,
    },
    contextLabel: {
      color: textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    contextValue: {
      fontSize: 16,
      fontWeight: '900',
      marginTop: 4,
    },
    riskBox: {
      backgroundColor: isDark ? 'rgba(255, 45, 85, 0.08)' : 'rgba(255, 45, 85, 0.05)',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.25)',
      marginBottom: 20,
    },
    userInfoText: {
      color: textPrimary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    approveActionBtn: {
      flex: 1,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#10b981',
      alignItems: 'center',
    },
    approveActionTxt: {
      color: '#10b981',
      fontSize: 13,
      fontWeight: '800',
    },
    rejectActionBtn: {
      flex: 1,
      backgroundColor: 'rgba(255, 45, 85, 0.15)',
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#FF2D55',
      alignItems: 'center',
    },
    rejectActionTxt: {
      color: '#FF2D55',
      fontSize: 13,
      fontWeight: '800',
    },
    confirmBox: {
      backgroundColor: bgCard,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: borderColor,
      marginBottom: 14,
    },
    confirmSub: {
      color: textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    confirmBtn: {
      flex: 1,
      backgroundColor: '#10b981',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    confirmBtnTxt: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
    },
    cancelBtn: {
      flex: 0.4,
      backgroundColor: bgSurface,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: borderColor,
    },
    cancelBtnTxt: {
      color: textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
};
