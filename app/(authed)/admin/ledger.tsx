// app/(authed)/admin/ledger.tsx — God Mode: Financial Ledger
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, Modal, Pressable } from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const glass: any = {
  backgroundColor: 'rgba(24, 24, 27, 0.65)',
};

interface Tx {
  id: string; tx_ref?: string; provider_ref?: string;
  user_id: string; username?: string; number?: string;
  type: string; amount: number; provider?: string;
  bank?: string; status: string; created_at: string;
  provider_payload?: any;
}

const TABS = ['Deposits', 'Withdrawals'];

export default function AdminLedger() {
  const { token, t, showAlert, isSuperAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const [txs, setTxs] = useState<Tx[]>([]);
  const [filtered, setFiltered] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All'|'Pending'|'Admin Review'|'Success'|'Failed'>('All');
  const [amountRange, setAmountRange] = useState<'all' | '0-100' | '100-10000' | '10000-100000'>('all');
  const [gameFilter, setGameFilter] = useState<'all' | 'xo' | 'spin'>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const openReviewModal = async (id: string) => {
    setReviewModalVisible(true); setReviewLoading(true); setReviewData(null);
    try {
      const res = await fetch(`${API_URL}/admin/transactions/${id}/details`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setReviewData(await res.json());
    } finally { setReviewLoading(false); }
  };

  const [confirmAction, setConfirmAction] = useState<'approve'|'reject'|null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const execTxAction = async (action: 'approve'|'reject'|'ban'|'delete', txId: string, userId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      let url = ''; let method = 'PATCH';
      if (action === 'approve') url = `${API_URL}/admin/transactions/${txId}/approve`;
      if (action === 'reject') url = `${API_URL}/admin/transactions/${txId}/reject`;
      if (action === 'ban') { url = `${API_URL}/admin/users/${userId}/ban`; method = 'POST'; }
      if (action === 'delete') { url = `${API_URL}/admin/users/${userId}`; method = 'DELETE'; }

      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }});
      if (res.ok) {
         showAlert(`Success`, `Action ${action} completed successfully.`);
         setReviewModalVisible(false);
         setConfirmAction(null);
         fetchTxs();
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert('Error', err.error || `Action ${action} failed`);
      }
    } catch { showAlert('Error', 'Network error'); }
    finally { setActionLoading(false); }
  };

  const limit = 20;

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.log('[admin/stats]', e); }
  }, [token]);

  const fetchTxs = useCallback(async () => {
    try {
      setLoading(true);
      const offset = page * limit;
      const type = tab === 0 ? 'deposit' : 'withdrawal';
      const status = statusFilter === 'All' ? '' : statusFilter.toLowerCase();
      
      let url = `${API_URL}/admin/transactions?limit=${limit}&offset=${offset}&type=${type}`;
      if (status) url += `&status=${status === 'success' ? 'success,succeeded' : status === 'failed' ? 'failed,rejected' : status === 'admin review' ? 'pending_manual' : status}`;
      if (amountRange !== 'all') url += `&amountRange=${amountRange}`;

      const res = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } 
      });
      if (res.ok) {
        const d = await res.json();
        const list = d.transactions ?? [];
        setTxs(list);
        setTotal(d.total ?? 0);
      }
    } catch (e) { console.log('[admin/txs]', e); }
    finally { setLoading(false); }
  }, [token, page, limit, tab, statusFilter, amountRange]);

  useEffect(() => { fetchTxs(); fetchStats(); }, [fetchTxs, fetchStats]);

  useEffect(() => {
    // Local filter for the search query (since search isn't server-side for ledger yet)
    if (query) {
      const q = query.toLowerCase();
      const list = txs.filter(t => {
        const d = fmtDate(t.created_at);
        const amt = etb(t.amount);
        const method = (t.provider || t.bank || '').toLowerCase();
        
        return (
          t.username?.toLowerCase().includes(q) || 
          t.number?.includes(q) || 
          t.id?.toLowerCase().includes(q) || 
          t.tx_ref?.toLowerCase().includes(q) ||
          amt.includes(q) ||
          method.includes(q) ||
          d.date.toLowerCase().includes(q) ||
          d.time.toLowerCase().includes(q)
        );
      });
      setFiltered(list);
    } else {
      setFiltered(txs);
    }
  }, [txs, query]);

  // Reset page when tab, status filter, or amount range changes
  useEffect(() => { setPage(0); }, [tab, statusFilter, amountRange]);


  const etb = (v: number) => Number(v || 0).toFixed(2);
  const initials = (t: Tx) => (t.username || t.number || '??').slice(0, 2).toUpperCase();
  const fmtDate = (iso: string) => {
    try { const d = new Date(iso); return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }; }
    catch { return { date: '—', time: '—' }; }
  };

  // Stats - Real dynamic values from backend
  const s = stats || {};
  const totalVol = Number(s.volume24h || s.totalDeposits || 0);
  const pendingCount = Number(s.pendingWithdrawals || 0);
  const sRate = Number(s.successRate || 98.4);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Header row — stacks on mobile */}
        <View style={[styles.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: 16 }]}>
          <View>
            <Text style={[styles.pageTitle, isMobile && { fontSize: 20 }]}>{t('financial_ledger')}</Text>
            {!isMobile && <Text style={styles.pageSub}>Manage user deposit and withdrawal transaction requests and wallet activity.</Text>}
          </View>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <View style={styles.tabBar}>
              {TABS.map((tabLabel, i) => (
                <TouchableOpacity key={tabLabel} onPress={() => setTab(i)} style={[styles.tabBtn, tab === i && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t((tabLabel === 'Deposits' ? 'recent_deposits' : 'recent_withdrawals') as any)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Stats bento — wraps into 2x2 or 1x4 based on space */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 20 : 24 }}>
          {/* Card 1: Deposits */}
          <View style={[styles.statCard, { minWidth: isMobile ? '48%' : 180, flex: 1, padding: isMobile ? 16 : 20 }]}>
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, isMobile && { fontSize: 10 }]} numberOfLines={1}>Total Deposit</Text>
              <View style={styles.statIconBadge}>
                <Ionicons name="arrow-down-outline" size={18} color={C.success} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: '#ffffff' }, isMobile && { fontSize: 18 }]} numberOfLines={1}>ETB {etb(s.totalDeposits || 0)}</Text>
            <Text style={[styles.statSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Today: ETB {etb(s.volume24h || 0)}</Text>
          </View>

          {/* Card 2: Withdrawals */}
          <View style={[styles.statCard, { minWidth: isMobile ? '48%' : 180, flex: 1, padding: isMobile ? 16 : 20 }]}>
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, isMobile && { fontSize: 10 }]} numberOfLines={1}>Total Withdrawal</Text>
              <View style={styles.statIconBadge}>
                <Ionicons name="arrow-up-outline" size={18} color={C.error} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: '#ffffff' }, isMobile && { fontSize: 18 }]} numberOfLines={1}>ETB {etb(s.totalWithdrawals || 0)}</Text>
            <Text style={[styles.statSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Total Settled</Text>
          </View>

          {/* Card 3: Pending */}
          <View style={[styles.statCard, { minWidth: isMobile ? '48%' : 180, flex: 1, padding: isMobile ? 16 : 20 }]}>
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, isMobile && { fontSize: 10 }]} numberOfLines={1}>Admin Pending</Text>
              <View style={styles.statIconBadge}>
                <Ionicons name="hourglass-outline" size={18} color={C.accentGold} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: C.accentGold }, isMobile && { fontSize: 18 }]} numberOfLines={1}>{pendingCount}</Text>
            <Text style={[styles.statSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Pending: {etb(s.pendingWithdrawalAmount || 0)} ETB</Text>
          </View>

          {/* Card 4: Failed */}
          <View style={[styles.statCard, { minWidth: isMobile ? '48%' : 180, flex: 1, padding: isMobile ? 16 : 20 }]}>
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, isMobile && { fontSize: 10 }]} numberOfLines={1}>Failed Withdrawal</Text>
              <View style={styles.statIconBadge}>
                <Ionicons name="alert-circle-outline" size={18} color={C.error} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: C.error }, isMobile && { fontSize: 18 }]} numberOfLines={1}>{s.failedWithdrawals || 0}</Text>
            <Text style={[styles.statSub, isMobile && { fontSize: 10 }]} numberOfLines={1}>Failed Settled: 0</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableCard}>
          <View style={[styles.tableHead, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 16 }]}>
            <Text style={[styles.tableTitle, isMobile && { fontSize: 16 }]}>{tab === 0 ? t('Recent Deposit Requests') : t('Recent Withdrawal Requests')}</Text>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, isMobile && { width: '100%' as any }]}>
              <View style={[styles.searchBox, isMobile && { flex: 1 }]}>
                <Ionicons name="search" size={16} color="rgba(168,167,212,0.5)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("Search ledger...")}
                  placeholderTextColor="rgba(168,167,212,0.4)"
                  value={query}
                  onChangeText={setQuery}
                  {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter !== 'All' && { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={() => {
                  const map: any = { 'All':'Pending', 'Pending':'Admin Review', 'Admin Review': 'Success', 'Success':'Failed', 'Failed':'All' };
                  setStatusFilter(map[statusFilter] || 'All');
                }}
              >
                <Ionicons name="filter" size={14} color={statusFilter !== 'All' ? '#fff' : C.primary} />
                <Text style={[styles.filterChipText, statusFilter !== 'All' && { color: '#fff' }]}>{t('Status')}: {t(statusFilter)}</Text>
              </TouchableOpacity>
              
              <View style={[styles.searchBox, { width: isMobile ? '100%' : 160, height: 40, paddingVertical: 0 }]}>
                 <Ionicons name="cash-outline" size={14} color="rgba(168,167,212,0.6)" />
                 {Platform.OS === 'web' ? (
                    <select
                      value={amountRange}
                      onChange={(e: any) => setAmountRange(e.target.value as any)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any, flex: 1 } as any}
                    >
                      <option value="all" style={{ background: '#111128' }}>All Ranges</option>
                      <option value="0-100" style={{ background: '#111128' }}>0-100 ETB</option>
                      <option value="100-10000" style={{ background: '#111128' }}>100-10k ETB</option>
                      <option value="10000-100000" style={{ background: '#111128' }}>10k-100k ETB</option>
                    </select>
                 ) : (
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                       const order = ['all', '0-100', '100-10000', '10000-100000'] as const;
                       setAmountRange(order[(order.indexOf(amountRange) + 1) % order.length]);
                    }}>
                       <Text style={{ color: '#e5e3ff', fontSize: 11, fontWeight: '700' }}>{amountRange.toUpperCase()}</Text>
                    </TouchableOpacity>
                 )}
              </View>

              <View style={[styles.searchBox, { width: isMobile ? '100%' : 160, height: 40, paddingVertical: 0 }]}>
                 <Ionicons name="game-controller-outline" size={14} color="rgba(168,167,212,0.6)" />
                 {Platform.OS === 'web' ? (
                    <select
                      value={gameFilter}
                      onChange={(e: any) => setGameFilter(e.target.value as any)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any, flex: 1 } as any}
                    >
                      <option value="all" style={{ background: '#111128' }}>All Games</option>
                      <option value="xo" style={{ background: '#111128' }}>XO Games</option>
                      <option value="spin" disabled style={{ background: '#111128', color: '#555' }}>Spin Wheel (Coming Soon)</option>
                    </select>
                 ) : (
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                       const order = ['all', 'xo'] as const;
                       setGameFilter(order[(order.indexOf(gameFilter as any) + 1) % order.length] as any);
                    }}>
                       <Text style={{ color: '#e5e3ff', fontSize: 11, fontWeight: '700' }}>{gameFilter === 'all' ? 'ALL GAMES' : 'XO GAMES'}</Text>
                    </TouchableOpacity>
                 )}
              </View>
            </View>
          </View>

          {/* Table / Mobile Card List */}
          {isMobile ? (
            <View style={{ padding: 12 }}>
              <AnimatedList
                items={loading ? [] : filtered}
                renderItem={(tx: Tx) => {
                  const d = fmtDate(tx.created_at);
                  const status = (tx.status || '').toUpperCase();
                  const isPending = status === 'PENDING' || status === 'WAITING';
                  const isAdminPending = status === 'PENDING_MANUAL';
                  const isSuccess = status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'COMPLETED' || status === 'PAID';
                  const isFailed = status === 'FAILED' || status === 'REJECTED' || status === 'ERROR' || status === 'CANCELLED';
                  
                  const providerColor = tx.provider?.toUpperCase() === 'CHAPA' ? C.primary : C.secondary;
                  const ini = initials(tx);
                  const avatarBg = isPending ? 'rgba(192,132,252,0.15)' : isAdminPending ? 'rgba(251,191,36,0.15)' : isSuccess ? 'rgba(0,218,243,0.1)' : 'rgba(253,111,133,0.15)';
                  const avatarColor = isPending ? '#c084fc' : isAdminPending ? '#fbbf24' : isSuccess ? C.secondary : C.error;

                  return (
                    <View key={tx.id} style={[styles.txRow, { flexDirection: 'column', alignItems: 'stretch', padding: 14, gap: 10, marginBottom: 10 }]}>
                      {/* Top Row: User & Amount */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <View style={[styles.txAvatar, { backgroundColor: avatarBg }]}>
                            <Text style={[styles.txAvatarText, { color: avatarColor }]}>{ini}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.txName} numberOfLines={1}>{tx.username || 'Unknown'}</Text>
                            <Text style={styles.txId}>ID: {tx.user_id?.slice(0, 7)}</Text>
                          </View>
                        </View>
                        <Text style={[styles.txAmount, { color: tab === 1 ? '#f87171' : '#34d399', fontSize: 16 }]} numberOfLines={1}>
                          {tab === 1 ? '- ' : '+ '}ETB {etb(tx.amount)}
                        </Text>
                      </View>

                      {/* Middle Row: Method, Timestamp & Status */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', padding: 10, borderRadius: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.methodPill, { borderColor: `${providerColor}33`, backgroundColor: `${providerColor}0a` }]}>
                            <Text style={[styles.methodText, { color: providerColor }]}>{tx.provider || 'N/A'}</Text>
                          </View>
                          <Text style={styles.txTime}>{d.date} {d.time}</Text>
                        </View>
                        <View>
                          {isPending ? (
                            <View style={[styles.statusPending, { backgroundColor: 'rgba(192,132,252,0.1)', borderColor: 'rgba(192,132,252,0.3)' }]}>
                              <View style={[styles.statusDot, { backgroundColor: '#c084fc' }]} />
                              <Text style={[styles.statusText, { color: '#c084fc' }]}>SYS PEND</Text>
                            </View>
                          ) : isAdminPending ? (
                            <View style={styles.statusPending}>
                              <View style={[styles.statusDot, { backgroundColor: '#fbbf24' }]} />
                              <Text style={[styles.statusText, { color: '#fbbf24' }]}>ADMIN REV</Text>
                            </View>
                          ) : isSuccess ? (
                            <View style={styles.statusSuccess}>
                              <Ionicons name="checkmark-circle" size={13} color={C.secondary} />
                              <Text style={[styles.statusText, { color: C.secondary }]}>Success</Text>
                            </View>
                          ) : (
                            <View style={styles.statusFailed}>
                              <Ionicons name="close-circle" size={13} color={C.error} />
                              <Text style={[styles.statusText, { color: C.error }]}>{status || 'Failed'}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Bottom Row: Review Action Button */}
                      <TouchableOpacity 
                        onPress={() => openReviewModal(tx.id)}
                        style={[styles.reviewBtn, { alignItems: 'center', paddingVertical: 10, backgroundColor: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.35)' }]}
                      >
                        <Text style={[styles.reviewBtnTxt, { color: '#a78bfa', fontWeight: '800' }]}>Review & Details</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
                showGradients={false}
                enableArrowNavigation={true}
              />
              {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />}
              {!loading && filtered.length === 0 && <Text style={styles.empty}>No transactions found.</Text>}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 900 }}>
                {/* Column headers */}
                <View style={[styles.colRow, { backgroundColor: 'rgba(17,17,40,0.8)', borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.4)' }]}>
                  <View style={{ flex: 2 }}><Text style={styles.colHead}>User Account</Text></View>
                  <View style={{ flex: 1.1 }}><Text style={styles.colHead}>Amount (ETB)</Text></View>
                  <View style={{ flex: 0.9 }}><Text style={styles.colHead}>Method</Text></View>
                  <View style={{ flex: 1.2 }}><Text style={styles.colHead}>Timestamp</Text></View>
                  <View style={{ flex: 0.9 }}><Text style={styles.colHead}>Status</Text></View>
                  <View style={{ flex: 1.3 }}><Text style={[styles.colHead, { textAlign: 'right' }]}>Receipt</Text></View>
                </View>

                <AnimatedList
                  items={loading ? [] : filtered}
                  renderItem={(tx: Tx) => {
                    const d = fmtDate(tx.created_at);
                    const status = (tx.status || '').toUpperCase();
                    const isPending = status === 'PENDING' || status === 'WAITING';
                    const isAdminPending = status === 'PENDING_MANUAL';
                    const isSuccess = status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'COMPLETED' || status === 'PAID';
                    const isFailed = status === 'FAILED' || status === 'REJECTED' || status === 'ERROR' || status === 'CANCELLED';
                    
                    const providerColor = tx.provider?.toUpperCase() === 'CHAPA' ? C.primary : C.secondary;
                    const ini = initials(tx);
                    const avatarBg = isPending ? 'rgba(192,132,252,0.15)' : isAdminPending ? 'rgba(251,191,36,0.15)' : isSuccess ? 'rgba(0,218,243,0.1)' : 'rgba(253,111,133,0.15)';
                    const avatarColor = isPending ? '#c084fc' : isAdminPending ? '#fbbf24' : isSuccess ? C.secondary : C.error;

                    return (
                      <View key={tx.id} style={[styles.txRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
                        {/* User */}
                        <View style={[styles.txUser, { flex: 2 }]}>
                          <View style={[styles.txAvatar, { backgroundColor: avatarBg }]}>
                            <Text style={[styles.txAvatarText, { color: avatarColor }]}>{ini}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.txName} numberOfLines={1}>{tx.username || 'Unknown'}</Text>
                            <Text style={styles.txId}>ID: {tx.user_id?.slice(0,7)}</Text>
                          </View>
                        </View>
                        {/* Amount */}
                        <View style={{ flex: 1.1 }}>
                          <Text style={[styles.txAmount, { color: tab === 1 ? '#f87171' : '#34d399' }]} numberOfLines={1}>
                            {tab === 1 ? '- ' : '+ '}ETB {etb(tx.amount)}
                          </Text>
                        </View>
                        {/* Method */}
                        <View style={{ flex: 0.9 }}>
                          <View style={[styles.methodPill, { borderColor: `${providerColor}33`, backgroundColor: `${providerColor}0a`, alignSelf: 'flex-start' }]}>
                            <Text style={[styles.methodText, { color: providerColor }]}>{tx.provider || 'N/A'}</Text>
                          </View>
                        </View>
                        {/* Timestamp */}
                        <View style={[styles.txTimestamp, { flex: 1.2 }]}>
                          <Text style={styles.txDate}>{d.date}</Text>
                          <Text style={styles.txTime}>{d.time}</Text>
                        </View>
                        {/* Status */}
                        <View style={{ flex: 0.9 }}>
                          {isPending ? (
                            <View style={[styles.statusPending, { backgroundColor: 'rgba(192,132,252,0.1)', borderColor: 'rgba(192,132,252,0.3)' }]}>
                              <View style={[styles.statusDot, { backgroundColor: '#c084fc' }]} />
                              <Text style={[styles.statusText, { color: '#c084fc' }]}>SYS PEND</Text>
                            </View>
                          ) : isAdminPending ? (
                            <View style={styles.statusPending}>
                              <View style={[styles.statusDot, { backgroundColor: '#fbbf24' }]} />
                              <Text style={[styles.statusText, { color: '#fbbf24' }]}>ADMIN REV</Text>
                            </View>
                          ) : isSuccess ? (
                            <View style={styles.statusSuccess}>
                              <Ionicons name="checkmark-circle" size={13} color={C.secondary} />
                              <Text style={[styles.statusText, { color: C.secondary }]}>Success</Text>
                            </View>
                          ) : (
                            <View style={styles.statusFailed}>
                              <Ionicons name="close-circle" size={13} color={C.error} />
                              <Text style={[styles.statusText, { color: C.error }]}>{status || 'Failed'}</Text>
                            </View>
                          )}
                        </View>
                        {/* Actions */}
                        <View style={{ flex: 1.3, alignItems: 'flex-end' }}>
                           <TouchableOpacity 
                             onPress={() => openReviewModal(tx.id)}
                             style={styles.reviewBtn}
                           >
                              <Text style={styles.reviewBtnTxt}>See More</Text>
                           </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                  showGradients={false}
                  enableArrowNavigation={true}
                />

                {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />}
                {!loading && filtered.length === 0 && <Text style={styles.empty}>No transactions found.</Text>}
              </View>
            </ScrollView>
          )}

          {/* Pagination */}
          <View style={styles.paginationRow}>
            <Text style={styles.paginationInfo}>
              Showing <Text style={{ color: '#e5e3ff', fontWeight: '800' }}>{Math.min(total, page * limit + 1)}-{Math.min(total, (page + 1) * limit)}</Text> of <Text style={{ color: '#e5e3ff', fontWeight: '800' }}>{total}</Text> transactions
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.pageBtn, page === 0 && { opacity: 0.3 }]} 
                onPress={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <Ionicons name="chevron-back" size={14} color="#fff" />
                <Text style={styles.pageBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.pageBtn, (page + 1) * limit >= total && { opacity: 0.3 }, { backgroundColor: (page+1)*limit < total ? C.primary : 'rgba(166,140,255,0.1)' }]}
                onPress={() => setPage(p => (p + 1) * limit < total ? p + 1 : p)}
                disabled={(page + 1) * limit >= total}
              >
                <Text style={[styles.pageBtnText, (page+1)*limit < total && { color: '#000' }]}>Next</Text>
                <Ionicons name="chevron-forward" size={14} color={ (page+1)*limit < total ? "#000" : "#fff" } />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual Approval Modal */}
      {reviewModalVisible && (
        <Modal transparent animationType="fade" visible={reviewModalVisible}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setReviewModalVisible(false); setConfirmAction(null); }} />
            <View style={[styles.receiptModal, { maxWidth: 500 }]}>
              <View style={styles.receiptHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(251,191,36,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text" size={20} color="#fbbf24" />
                  </View>
                  <Text style={styles.receiptTitle}>Manual Review</Text>
                </View>
                <TouchableOpacity onPress={() => { setReviewModalVisible(false); setConfirmAction(null); }}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              {reviewLoading || !reviewData ? (
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={true}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 }}>Transaction Context</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant }}>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>Status</Text>
                      <Text style={{ color: reviewData.transaction.status?.toUpperCase() === 'PENDING_MANUAL' ? '#fbbf24' : reviewData.transaction.status?.toUpperCase() === 'PENDING' ? '#c084fc' : C.primary, fontSize: 16, fontWeight: '900', marginTop: 4 }}>
                        {reviewData.transaction.status?.toUpperCase() === 'PENDING_MANUAL' ? 'ADMIN REVIEW' : reviewData.transaction.status?.toUpperCase() === 'PENDING' ? 'SYS PENDING' : (reviewData.transaction.status || 'UNKNOWN').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant }}>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>Amount</Text>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4 }}>ETB {etb(reviewData.transaction.amount)}</Text>
                    </View>
                  </View>

                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 }}>User Metrics & Risk</Text>
                  <View style={{ backgroundColor: 'rgba(253,111,133,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)', marginBottom: 24 }}>
                    <Text style={{ color: C.error, fontSize: 13, fontWeight: '600' }}>Anomaly Score: <Text style={{ fontWeight: '900' }}>{reviewData.user.anomaly_score} Flags</Text></Text>
                    {Number(reviewData.user.anomaly_score) > 3 && <Text style={{ color: 'rgba(253,111,133,0.7)', fontSize: 11, marginTop: 4 }}>High risk of abuse. Proceed with extreme caution.</Text>}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10, marginBottom: 4 }}>USERNAME</Text>
                      <Text style={{ color: '#fff', fontSize: 14 }}>{reviewData.user.username}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10, marginBottom: 4 }}>PHONE IP</Text>
                      <Text style={{ color: '#fff', fontSize: 14 }}>{reviewData.user.number}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10, marginBottom: 4 }}>SECURITY LEVEL</Text>
                      <Text style={{ color: C.primary, fontSize: 14, fontWeight: '800' }}>{String(reviewData.user.role || 'user').toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 32 }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                      <Text style={{ color: 'rgba(166,140,255,0.7)', fontSize: 10, marginBottom: 4 }}>GAMES RECORD</Text>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{reviewData.user.total_games || 0} <Text style={{ color: '#34d399', fontSize: 12 }}>({reviewData.user.total_wins || 0} W)</Text></Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                      <Text style={{ color: 'rgba(52,211,153,0.7)', fontSize: 10, marginBottom: 4 }}>TOTAL DEPOSIT</Text>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>ETB {etb(reviewData.user.total_deposit || 0)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                      <Text style={{ color: 'rgba(253,111,133,0.7)', fontSize: 10, marginBottom: 4 }}>TOTAL WITHDRAW</Text>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>ETB {etb(reviewData.user.total_withdraw || 0)}</Text>
                    </View>
                  </View>

                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 16 }}>Actions</Text>
                  
                  {reviewData.transaction.status?.toUpperCase() === 'PENDING' || reviewData.transaction.status?.toUpperCase() === 'PENDING_MANUAL' ? (
                    <>
                      {/* Step 1: Show action buttons */}
                      {!confirmAction && (
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                          <TouchableOpacity disabled={actionLoading} onPress={() => setConfirmAction('approve')} style={{ flex: 1, backgroundColor: 'rgba(52,211,153,0.1)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#34d399', alignItems: 'center' }}>
                            <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '900' }}>Approve Payout</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={actionLoading} onPress={() => setConfirmAction('reject')} style={{ flex: 1, backgroundColor: 'rgba(251,191,36,0.1)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fbbf24', alignItems: 'center' }}>
                            <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '900' }}>Reject & Refund</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Step 2: APPROVE confirmation */}
                      {confirmAction === 'approve' && (
                        <View style={{ backgroundColor: 'rgba(52,211,153,0.06)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Ionicons name="warning" size={20} color="#fbbf24" />
                            <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '900' }}>IMPORTANT: This does NOT send money automatically.</Text>
                          </View>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
                            Clicking "Confirm" will mark this withdrawal as COMPLETED in the system. The user will see "Success" on their screen.
                          </Text>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>You MUST manually transfer the money FIRST:</Text>
                          <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10, marginBottom: 12, gap: 4 }}>
                            <Text style={{ color: '#34d399', fontSize: 14, fontWeight: '800' }}>Amount: ETB {etb(reviewData.transaction.amount)}</Text>
                            <Text style={{ color: '#fff', fontSize: 13 }}>Phone: {reviewData.user.number || 'N/A'}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Method: {reviewData.transaction.provider || 'Chapa'}</Text>
                          </View>
                          <Text style={{ color: 'rgba(253,111,133,0.8)', fontSize: 11, marginBottom: 16 }}>
                            ⚠️ Only click "Confirm" AFTER you have already sent the money from your banking app.
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity disabled={actionLoading} onPress={() => execTxAction('approve', reviewData.transaction.id, reviewData.user.id)} style={{ flex: 1, backgroundColor: '#34d399', paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: actionLoading ? 0.6 : 1 }}>
                              <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>{actionLoading ? 'Processing...' : '✅ I Already Sent The Money'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={actionLoading} onPress={() => setConfirmAction(null)} style={{ flex: 0.5, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800' }}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Step 2: REJECT confirmation */}
                      {confirmAction === 'reject' && (
                        <View style={{ backgroundColor: 'rgba(253,111,133,0.06)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)', marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Ionicons name="return-down-back" size={20} color="#fbbf24" />
                            <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '900' }}>Reject & Refund User</Text>
                          </View>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
                            This will mark the withdrawal as REJECTED and automatically refund <Text style={{ color: '#34d399', fontWeight: '900' }}>ETB {etb(reviewData.transaction.amount)}</Text> back to the user's wallet.
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 16 }}>
                            The user will see their balance restored. No money needs to be sent manually.
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity disabled={actionLoading} onPress={() => execTxAction('reject', reviewData.transaction.id, reviewData.user.id)} style={{ flex: 1, backgroundColor: C.error, paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: actionLoading ? 0.6 : 1 }}>
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>{actionLoading ? 'Refunding...' : '🔴 Reject & Refund User'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={actionLoading} onPress={() => setConfirmAction(null)} style={{ flex: 0.5, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800' }}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity disabled={actionLoading} onPress={() => execTxAction('ban', reviewData.transaction.id, reviewData.user.id)} style={{ flex: 1, backgroundColor: 'rgba(253,111,133,0.1)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.error, alignItems: 'center', opacity: actionLoading ? 0.6 : 1 }}>
                      <Text style={{ color: C.error, fontSize: 13, fontWeight: '900' }}>Ban User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={actionLoading} onPress={() => execTxAction('delete', reviewData.transaction.id, reviewData.user.id)} style={{ flex: 1, backgroundColor: 'rgba(253,111,133,0.3)', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.error, alignItems: 'center', opacity: actionLoading ? 0.6 : 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>Delete Account</Text>
                    </TouchableOpacity>
                  </View>

                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  pageTitle: { color: '#ffffff', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  pageSub: { color: C.onSurfaceVariant, fontSize: 13, marginTop: 4, fontWeight: '500' },
  tabContainer: { 
    backgroundColor: C.surfaceContainerLowest, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: C.border 
  },
  tabBar: { flexDirection: 'row', gap: 4 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  tabBtnActive: { backgroundColor: C.primary },
  tabText: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 20 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statIconBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#313D4A', alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1, paddingRight: 4 },
  statValue: { color: '#ffffff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statUnit: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '500' },
  statSub: { color: C.onSurfaceVariant, fontSize: 11, marginTop: 4 },

  tableCard: { flex: 1, marginBottom: 0, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  tableHead: { 
    paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surfaceContainerLowest, borderBottomWidth: 1, borderColor: C.border
  },
  tableTitle: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceContainerLowest, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border, width: 220 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, height: 24 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'rgba(60, 80, 224, 0.1)', borderRadius: 6, borderWidth: 1, borderColor: C.primary },
  filterChipText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  colRow: { 
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#313D4A', borderBottomWidth: 1, borderColor: C.border,
  },
  colHead: { color: '#8A99AD', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderColor: C.border },
  txUser: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' },
  txAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: C.border, backgroundColor: '#313D4A' },
  txAvatarText: { fontSize: 12, fontWeight: '700' },
  txName: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  txId: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500' },
  txAmount: { color: C.success, fontSize: 14, fontWeight: '700' },
  methodPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  methodText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  txTimestamp: { flex: 1.2 },
  txDate: { color: '#fff', fontSize: 12, fontWeight: '500' },
  txTime: { color: C.onSurfaceVariant, fontSize: 11, marginTop: 2, fontWeight: '400' },
  statusPending: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(240, 149, 12, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: C.accentGold },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accentGold, flexShrink: 0 },
  statusSuccess: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: C.success },
  statusFailed: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251, 84, 84, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: C.error },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  txActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, alignItems: 'center' },
  approveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.success, backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  approveTxt: { color: C.success, fontSize: 11, fontWeight: '700' },
  rejectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.error, backgroundColor: 'rgba(251, 84, 84, 0.1)' },
  rejectTxt: { color: C.error, fontSize: 11, fontWeight: '700' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.primary, backgroundColor: 'rgba(60, 80, 224, 0.1)' },
  receiptTxt: { color: C.primary, fontSize: 11, fontWeight: '700' },
  empty: { color: C.onSurfaceVariant, textAlign: 'center', marginVertical: 40, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  receiptModal: { width: '100%', maxWidth: 450, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  receiptTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 10, letterSpacing: -0.2 },
  
  receiptAmountRow: { alignItems: 'center', marginVertical: 24 },
  receiptAmount: { fontSize: 36, fontWeight: '700', letterSpacing: -1, color: '#ffffff' },
  receiptCurrency: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600', marginTop: 4 },
  
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, borderRadius: 6, marginBottom: 24 },
  statusBannerTxt: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  receiptGrid: { gap: 16, marginBottom: 32 },
  receiptInfoItem: { gap: 3 },
  receiptInfoLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  receiptInfoVal: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, height: 44, borderRadius: 8 },
  printBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  paginationRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 16, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface
  },
  paginationInfo: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' },
  pageBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(60, 80, 224, 0.1)', 
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.primary 
  },
  pageBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  reviewBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(60, 80, 224, 0.1)', borderRadius: 6, borderWidth: 1, borderColor: C.primary },
  reviewBtnTxt: { color: C.primary, fontSize: 11, fontWeight: '700' },
});
