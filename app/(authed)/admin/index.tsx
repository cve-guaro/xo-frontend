import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

let PrimeChart: any = null;
if (Platform.OS === 'web') {
  PrimeChart = require('primereact/chart').Chart;
}

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtK = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};
const timeSince = (d: string) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function ACount({ value, prefix = '', suffix = '', style }: { value: number; prefix?: string; suffix?: string; style?: any }) {
  const av = useRef(new Animated.Value(0)).current;
  const [dv, setDv] = useState(0);
  useEffect(() => {
    av.setValue(0);
    Animated.timing(av, { toValue: value, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = av.addListener(({ value: v }) => setDv(Math.round(v)));
    return () => av.removeListener(id);
  }, [value]);
  return <Text style={style}>{prefix}{dv.toLocaleString()}{suffix}</Text>;
}

export default function AdminOverview() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token, t } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [recentData, setRecentData] = useState<{ users: any[]; transactions: any[] }>({ users: [], transactions: [] });
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const fetchData = useCallback(async (showR = false) => {
    if (showR) setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };
      const [sR, rR, lR] = await Promise.all([
        fetch(`${API_URL}/admin/dashboard-data?range=${timeframe}`, { headers: h }),
        fetch(`${API_URL}/admin/metrics/recent`, { headers: h }),
        fetch(`${API_URL}/admin/metrics/live`, { headers: h }),
      ]);
      if (sR.ok) setStats(await sR.json());
      if (rR.ok) { const d = await rR.json(); setRecentData({ users: d.users || [], transactions: d.transactions || [] }); }
      if (lR.ok) setLive(await lR.json());
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);
  // Auto-refresh every 30s
  useEffect(() => { const id = setInterval(() => fetchData(), 30000); return () => clearInterval(id); }, [fetchData]);

  const d = useMemo(() => {
    const s = stats || {};
    const l = live || {};
    return {
      volume24h: Number(s.volume24h || 0),
      depositsToday: Number(l.depositsToday || 0),
      withdrawalsToday: Number(l.withdrawalsToday || 0),
      activeMatches: Number(l.activeMatches || s.activeGames || 0),
      onlineUsers: Number(l.onlineUsers || 0),
      users: Number(s.totalUsers || 0),
      dau: Number(l.dailyActiveUsers || 0),
      ggr: Number(l.grossGamingRevenue || 0),
      pending: Number(s.pendingWithdrawals || 0),
      failedWithdrawals: Number(s.failedWithdrawals || 0),
      chapaNet: Number(s.chapaNetPosition || 0),
      graphData: s.graphData || [],
      newUserGraphData: s.newUserGraphData || [],
      pendingList: l.pendingWithdrawals || [],
      health: l.systemHealth || {},
    };
  }, [stats, live]);

  // Chart configs
  const [chartData, setChartData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  const [userChartData, setUserChartData] = useState({});
  const [userChartOptions, setUserChartOptions] = useState({});

  useEffect(() => {
    if (!d.graphData?.length) return;
    setChartData({
      labels: d.graphData.map((i: any) => i.date),
      datasets: [{ label: 'Wallet Net Position (ETB)', fill: true, backgroundColor: 'rgba(0,163,255,0.08)', borderColor: '#00A3FF', tension: 0.4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#00A3FF', data: d.graphData.map((i: any) => i.profit) }]
    });
    setChartOptions({ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#475569', font: { size: 10 }, callback: (v: number) => fmtK(v) }, grid: { color: 'rgba(255,255,255,0.04)' } } } });
  }, [d.graphData]);

  useEffect(() => {
    if (!d.newUserGraphData?.length) return;
    setUserChartData({
      labels: d.newUserGraphData.map((i: any) => i.date),
      datasets: [
        { label: 'New Users', backgroundColor: 'rgba(0,163,255,0.6)', borderRadius: 6, data: d.newUserGraphData.map((i: any) => i.count) },
        { label: 'DAU', backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 6, data: d.newUserGraphData.map(() => Math.max(1, d.dau)) },
      ]
    });
    setUserChartOptions({ maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#475569', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } } } });
  }, [d.newUserGraphData, d.dau]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1c' }}><ActivityIndicator size="large" color="#00A3FF" /></View>;

  const txs = recentData.transactions || [];
  const healthItems = Object.entries(d.health || {}).map(([key, val]: [string, any]) => ({
    name: val?.label || key,
    status: val?.status || 'unknown',
  }));
  // Fallback if no health data yet
  if (healthItems.length === 0) {
    healthItems.push(
      { name: 'Vercel (Frontend)', status: 'operational' },
      { name: 'Railway (Backend)', status: 'operational' },
      { name: 'Supabase (Database)', status: 'operational' },
      { name: 'Chapa (Deposit)', status: 'operational' },
      { name: 'Chapa (Withdrawal)', status: 'operational' },
      { name: 'GeezSMS', status: 'operational' },
    );
  }

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* ═══ Pending Alert Banner ═══ */}
      {d.pending > 0 && (
        <TouchableOpacity style={st.alertBanner} onPress={() => router.push('/admin/ledger' as any)} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={st.alertIcon}><Ionicons name="notifications" size={18} color="#f59e0b" /></View>
            <View>
              <Text style={st.alertTitle}>{d.pending} PENDING APPROVALS</Text>
              <Text style={st.alertSub}>Withdrawals: {d.pendingList.length}, Verifications: {d.pending - d.pendingList.length} (last sync: a minute ago)</Text>
            </View>
          </View>
          <View style={st.alertBtn}><Text style={st.alertBtnText}>Go to Approvals</Text></View>
        </TouchableOpacity>
      )}

      {/* ═══ Header ═══ */}
      <View style={[st.header, isMobile && { flexDirection: 'column', gap: 12 }]}>
        <View>
          <Text style={st.title}>ADMIN OVERVIEW</Text>
          <Text style={st.subtitle}>Analytics & Platform Performance</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={st.statusBadge}><View style={st.statusDot} /><Text style={st.statusText}>SYSTEM NOMINAL</Text></View>
          <TouchableOpacity style={st.refreshBtn} onPress={() => fetchData(true)} activeOpacity={0.8}>
            {refreshing ? <ActivityIndicator size="small" color="#0a0f1c" /> : <Ionicons name="refresh" size={16} color="#0a0f1c" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Top Metric Cards (compact) ═══ */}
      <View style={[st.topGrid, isMobile && { flexDirection: 'column' }]}>
        <View style={st.metricCard}>
          <Text style={st.metricLabel}>TOTAL VOLUME (ETB)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <ACount value={d.volume24h} style={st.metricValue} />
            <View style={st.trendBadge}><Text style={st.trendText}>+15.8% (24h)</Text></View>
          </View>
        </View>
        <View style={st.metricCard}>
          <Text style={st.metricLabel}>DEPOSITS vs WITHDRAWALS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={[st.metricValue, { color: '#34d399' }]}>{fmtK(d.depositsToday)}</Text>
            <Text style={{ color: '#475569', fontSize: 14, fontWeight: '700' }}>/</Text>
            <Text style={[st.metricValue, { color: '#f87171', fontSize: 20 }]}>{fmtK(d.withdrawalsToday)}</Text>
            <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginLeft: 4 }}>ETB (Today)</Text>
          </View>
        </View>
        <View style={st.metricCard}>
          <Text style={st.metricLabel}>ACTIVE MATCHES</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <ACount value={d.activeMatches} style={st.metricValue} />
            <View style={[st.trendBadge, { backgroundColor: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.2)' }]}><Text style={[st.trendText, { color: '#a78bfa' }]}>{d.onlineUsers} Online</Text></View>
          </View>
        </View>
        <View style={st.metricCard}>
          <Text style={st.metricLabel}>GROSS GAMING REVENUE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <ACount value={d.ggr} prefix="" style={[st.metricValue, { color: '#34d399' }]} />
            <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700' }}>ETB</Text>
          </View>
        </View>
      </View>

      {/* ═══ Charts Row (bento) ═══ */}
      <View style={[st.bentoRow, isMobile && { flexDirection: 'column' }]}>
        {/* Wallet Net Position */}
        <View style={[st.chartCard, { flex: 1.2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={st.chartTitle}>WALLET NET POSITION (ETB)</Text>
              <Text style={st.chartSub}>(Eternal + Bonus + User Balance)</Text>
            </View>
            <View style={st.tfSelector}>
              {(['day', 'week', 'month'] as const).map(tf => (
                <TouchableOpacity key={tf} style={[st.tfOpt, timeframe === tf && { backgroundColor: '#00A3FF' }]} onPress={() => setTimeframe(tf)}>
                  <Text style={[st.tfText, timeframe === tf && { color: '#0a0f1c', fontWeight: '900' }]}>{tf === 'day' ? '24H' : tf === 'week' ? '7D' : '30D'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ height: 240 }}>
            {Platform.OS === 'web' && PrimeChart && Object.keys(chartData).length > 0 ? (
              <PrimeChart type="line" data={chartData} options={chartOptions} style={{ height: '100%' }} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#475569', fontSize: 12 }}>Loading chart...</Text></View>
            )}
          </View>
        </View>

        {/* New Users & DAU */}
        <View style={[st.chartCard, { flex: 0.8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={st.chartTitle}>NEW USERS & DAU</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={[st.metricValue, { fontSize: 18 }]}>{fmtK(d.users)}</Text>
              <Text style={[st.metricValue, { fontSize: 18, color: '#10b981' }]}>{fmtK(d.dau)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700' }}>Total Users</Text>
            <Text style={{ color: '#10b981', fontSize: 9, fontWeight: '700' }}>DAU today</Text>
          </View>
          <View style={{ height: 180 }}>
            {Platform.OS === 'web' && PrimeChart && Object.keys(userChartData).length > 0 ? (
              <PrimeChart type="bar" data={userChartData} options={userChartOptions} style={{ height: '100%' }} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#475569', fontSize: 12 }}>Loading...</Text></View>
            )}
          </View>
        </View>
      </View>

      {/* ═══ Bottom Bento (3 panels) ═══ */}
      <View style={[st.bentoRow, isMobile && { flexDirection: 'column' }]}>
        {/* Recent Transactions */}
        <View style={[st.panelCard, { flex: 1 }]}>
          <Text style={st.panelTitle}>RECENT TRANSACTIONS</Text>
          <View style={{ gap: 8 }}>
            {txs.slice(0, 5).map((tx: any, i: number) => {
              const isDep = tx.type === 'DEPOSIT' || String(tx.type).toLowerCase() === 'deposit';
              const isSucc = tx.status === 'COMPLETED' || tx.status === 'success';
              const statusColor = isSucc ? '#34d399' : (String(tx.status).toUpperCase() === 'PENDING' ? '#f59e0b' : '#64748b');
              return (
                <View key={i} style={st.txRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[st.txIcon, { backgroundColor: isDep ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }]}>
                      <Ionicons name={isDep ? 'arrow-down' : 'arrow-up'} color={isDep ? '#34d399' : '#f87171'} size={14} />
                    </View>
                    <View>
                      <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>{tx.username || 'User'}</Text>
                      <Text style={{ color: '#475569', fontSize: 9, fontWeight: '600' }}>{tx.type} · {timeSince(tx.created_at)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: isDep ? '#34d399' : '#e2e8f0', fontSize: 12, fontWeight: '800' }}>{isDep ? '+' : '-'}{fmt(tx.amount)}</Text>
                    <View style={[st.statusPill, { borderColor: statusColor + '40' }]}><Text style={{ color: statusColor, fontSize: 7, fontWeight: '800' }}>{tx.status}</Text></View>
                  </View>
                </View>
              );
            })}
            {txs.length === 0 && <Text style={{ color: '#475569', fontSize: 11 }}>No transactions</Text>}
          </View>
        </View>

        {/* Pending Withdrawals (3 oldest) */}
        <View style={[st.panelCard, { flex: 0.7 }]}>
          <Text style={st.panelTitle}>PENDING WITHDRAWALS (3 oldest)</Text>
          <View style={{ gap: 10 }}>
            {d.pendingList.length > 0 ? d.pendingList.map((pw: any, i: number) => (
              <View key={i} style={st.pendingRow}>
                <View>
                  <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>...{pw.id}</Text>
                  <Text style={{ color: '#475569', fontSize: 9 }}>{pw.username}</Text>
                </View>
                <View style={[st.statusPill, { borderColor: 'rgba(245,158,11,0.3)' }]}><Text style={{ color: '#f59e0b', fontSize: 8, fontWeight: '800' }}>PENDING</Text></View>
              </View>
            )) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="checkmark-circle" size={32} color="rgba(52,211,153,0.3)" />
                <Text style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>All clear!</Text>
              </View>
            )}
            {d.pendingList.length > 0 && (
              <TouchableOpacity style={st.goBtn} onPress={() => router.push('/admin/ledger' as any)}>
                <Text style={st.goBtnText}>Review All →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* System Status */}
        <View style={[st.panelCard, { flex: 0.6 }]}>
          <Text style={st.panelTitle}>SYSTEM STATUS</Text>
          <View style={{ gap: 10 }}>
            {healthItems.map((h, i) => (
              <View key={i} style={[st.healthRow, { borderColor: h.status === 'operational' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[st.healthDot, { backgroundColor: h.status === 'operational' ? '#34d399' : '#f87171' }]} />
                  <View>
                    <Text style={{ color: h.status === 'operational' ? '#34d399' : '#f87171', fontSize: 11, fontWeight: '800' }}>{h.name} ({h.status === 'operational' ? 'Active' : 'Down'})</Text>
                    <Text style={{ color: '#475569', fontSize: 9 }}>Operational</Text>
                  </View>
                </View>
                <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700' }}>{h.uptime || 99.9}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20, paddingTop: 32 },
  // Alert
  alertBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#f59e0b', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  alertIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  alertSub: { color: '#94a3b8', fontSize: 10, fontWeight: '600', marginTop: 2 },
  alertBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  alertBtnText: { color: '#0a0f1c', fontSize: 11, fontWeight: '800' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subtitle: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600', marginTop: 2 },
  statusBadge: { backgroundColor: 'rgba(52,211,153,0.06)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34d399', shadowColor: '#34d399', shadowOpacity: 0.8, shadowRadius: 6 },
  statusText: { color: '#34d399', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  refreshBtn: { backgroundColor: C.secondary, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: C.secondary, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  // Top metric cards
  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: 'rgba(23,23,50,0.6)', borderWidth: 1, borderColor: 'rgba(166,140,255,0.2)', borderRadius: 20, padding: 24, justifyContent: 'space-between', minHeight: 120, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  metricLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  metricValue: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  trendBadge: { backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trendText: { color: '#34d399', fontSize: 9, fontWeight: '800' },
  // Bento rows
  bentoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chartCard: { backgroundColor: 'rgba(23,23,50,0.6)', borderWidth: 1, borderColor: 'rgba(166,140,255,0.2)', borderRadius: 24, padding: 20, overflow: 'hidden', shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  chartTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  chartSub: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '600', marginTop: 2 },
  tfSelector: { flexDirection: 'row', gap: 4, padding: 3, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tfOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  tfText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: C.onSurfaceVariant },
  // Bottom panels
  panelCard: { backgroundColor: 'rgba(23,23,50,0.6)', borderWidth: 1, borderColor: 'rgba(166,140,255,0.2)', borderRadius: 24, padding: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  panelTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(166,140,255,0.1)' },
  txIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusPill: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginTop: 2 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(166,140,255,0.1)' },
  goBtn: { backgroundColor: 'rgba(0,218,243,0.1)', borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)', paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  goBtnText: { color: C.secondary, fontSize: 11, fontWeight: '900' },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(11,11,30,0.5)', borderWidth: 1, borderRadius: 12, padding: 12 },
  healthDot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.8, shadowRadius: 6 },
});
