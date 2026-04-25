import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';

let PrimeChart: any = null;
if (Platform.OS === 'web') {
  PrimeChart = require('primereact/chart').Chart;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const timeSince = (d: string) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} mins ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function ACount({ value, prefix = '', style }: { value: number; prefix?: string; style?: any }) {
  const av = useRef(new Animated.Value(0)).current;
  const [dv, setDv] = useState(0);
  useEffect(() => {
    av.setValue(0);
    Animated.timing(av, { toValue: value, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = av.addListener(({ value: v }) => setDv(Math.round(v)));
    return () => av.removeListener(id);
  }, [value]);
  return <Text style={style}>{prefix}{dv.toLocaleString()}</Text>;
}

export default function AdminOverview() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token, t } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [recentData, setRecentData] = useState<{ users: any[]; transactions: any[] }>({ users: [], transactions: [] });
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const graphAnim = useRef(new Animated.Value(100)).current;

  const fetchData = useCallback(async (showR = false) => {
    if (showR) setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };
      const [sR, rR] = await Promise.all([
        fetch(`${API_URL}/admin/dashboard-data?range=${timeframe}`, { headers: h }),
        fetch(`${API_URL}/admin/metrics/recent`, { headers: h }),
      ]);
      if (sR.ok) setStats(await sR.json());
      if (rR.ok) { const d = await rR.json(); setRecentData({ users: d.users || [], transactions: d.transactions || [] }); }
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, timeframe]);

  useEffect(() => {
    fetchData().then(() => {
      graphAnim.setValue(100);
      Animated.timing(graphAnim, { toValue: 0, duration: 2000, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    });
  }, [fetchData]);

  // Transform data
  const d = useMemo(() => {
    const s = stats || {};
    return {
      platformEarnings: Number(s.platformEarnings || 0),
      deposits: Number(s.totalDeposits || 0),
      withdrawals: Number(s.totalWithdrawals || 0),
      users: Number(s.totalUsers || 0),
      pending: Number(s.pendingWithdrawalAmount || 0),
      failedWithdrawals: Number(s.failedWithdrawals || s.failedWithdrawalCount || 0),
      totalGames: Number(s.activeGames || s.totalGames || s.totalMatches || 0),
      chapaNet: Number(s.chapaNetPosition || s.chapaBalance || 0),
      volume24h: Number(s.volume24h || 0),
      successRate: Number(s.successRate || 0),
      graphData: s.graphData || [],
      newUserGraphData: s.newUserGraphData || [],
    };
  }, [stats]);

  // Prepare PrimeReact Chart Data
  const [chartData, setChartData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  const [userChartData, setUserChartData] = useState({});
  const [userChartOptions, setUserChartOptions] = useState({});

  useEffect(() => {
    if (!d.graphData || d.graphData.length === 0) return;
    
    const data = {
        labels: d.graphData.map((item: any) => item.date),
        datasets: [
            {
                label: t('real_wallet_position'),
                fill: true,
                backgroundColor: 'rgba(0,163,255,0.15)',
                borderColor: '#00A3FF',
                tension: 0.4,
                data: d.graphData.map((item: any) => item.profit)
            }
        ]
    };

    const options = {
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
            x: { ticks: { color: '#64748b', font: { weight: 500 } }, grid: { display: false, drawBorder: false } },
            y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false } }
        }
    };

    setChartData(data);
    setChartOptions(options);
  }, [d.graphData]);

  // New User Growth Chart
  useEffect(() => {
    if (!d.newUserGraphData || d.newUserGraphData.length === 0) return;
    
    const data = {
      labels: d.newUserGraphData.map((item: any) => item.date),
      datasets: [
        {
          label: 'New Users',
          fill: true,
          backgroundColor: 'rgba(16,185,129,0.15)',
          borderColor: '#10b981',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          data: d.newUserGraphData.map((item: any) => item.count)
        }
      ]
    };

    const options = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#64748b', font: { weight: 500 } }, grid: { display: false, drawBorder: false } },
        y: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false } }
      }
    };

    setUserChartData(data);
    setUserChartOptions(options);
  }, [d.newUserGraphData]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1c' }}>
        <ActivityIndicator size="large" color="#00A3FF" />
      </View>
    );
  }

  const txs = recentData.transactions || [];
  const newUsers = recentData.users || [];

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* ═══ Header ═══ */}
      <View style={[st.header, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View>
          <Text style={st.title}>{t('admin_overview')}</Text>
          <Text style={st.subtitle}>REAL-TIME PERFORMANCE METRICS FOR XO ET.</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={st.statusBadge}>
             <View style={st.statusDot} />
             <Text style={st.statusText}>{t('app_status')}: {t('nominal')}</Text>
          </View>
          <TouchableOpacity style={st.refreshBtn} onPress={() => fetchData(true)} activeOpacity={0.8}>
             {refreshing ? <ActivityIndicator size="small" color="#0a0f1c" /> : <Text style={st.refreshText}>{t('retry')}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ StatCards ═══ */}
      <View style={[st.grid, isMobile && { flexDirection: 'column' }]}>
         {/* Daily Revenue */}
         <View style={st.card}>
            <View style={st.cardHeader}>
               <View style={[st.iconBox, { backgroundColor: 'rgba(0,163,255,0.1)', borderColor: 'rgba(0,163,255,0.2)' }]}>
                  <Ionicons name="cash-outline" size={24} color="#00A3FF" />
               </View>
               <View style={[st.badge, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                  <Text style={[st.badgeText, { color: '#10b981' }]}>+12.5%</Text>
               </View>
            </View>
            <Text style={st.cardLabel}>{t('total_volume')}</Text>
            <ACount value={d.volume24h} prefix="ETB " style={st.cardValue} />
         </View>

         {/* Active Matches */}
         <View style={st.card}>
            <View style={st.cardHeader}>
               <View style={[st.iconBox, { backgroundColor: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.2)' }]}>
                  <Ionicons name="flash-outline" size={24} color="#a78bfa" />
               </View>
               <View style={[st.badge, { backgroundColor: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.2)' }]}>
                  <Text style={[st.badgeText, { color: '#a78bfa' }]}>Live</Text>
               </View>
            </View>
            <Text style={st.cardLabel}>{t('active_matches')}</Text>
            <ACount value={d.totalGames} style={st.cardValue} />
         </View>

         {/* Total Users */}
         <View style={st.card}>
            <View style={st.cardHeader}>
               <View style={[st.iconBox, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                  <Ionicons name="people-outline" size={24} color="#10b981" />
               </View>
               <View style={[st.badge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[st.badgeText, { color: '#94a3b8' }]}>Global</Text>
               </View>
            </View>
            <Text style={st.cardLabel}>{t('admin_users')}</Text>
            <ACount value={d.users} style={st.cardValue} />
         </View>

         {/* Failed Withdrawals */}
         <View style={st.card}>
            <View style={st.cardHeader}>
               <View style={[st.iconBox, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}>
                  <Ionicons name="time-outline" size={24} color="#f59e0b" />
               </View>
            </View>
            <Text style={st.cardLabel}>{t('pending_approval')}</Text>
            <ACount value={d.failedWithdrawals} style={[st.cardValue, { color: '#f87171' }]} />
         </View>
      </View>

      {/* ═══ ChartSection ═══ */}
      <View style={st.chartSection}>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, zIndex: 10 }}>
            <View>
               <Text style={st.chartTitle}>{t('real_wallet_position')}</Text>
               <Text style={st.chartSubtitle}>{t('admin_overview')}</Text>
            </View>
            <View style={st.tfSelector}>
               <TouchableOpacity style={[st.tfOpt, timeframe === 'day' && { backgroundColor: '#00A3FF' }]} onPress={() => setTimeframe('day')} activeOpacity={0.8}>
                  <Text style={[st.tfText, timeframe === 'day' ? { color: '#0a0f1c', fontWeight: '900' } : { color: '#94a3b8' }]}>24 HOURS</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[st.tfOpt, timeframe === 'week' && { backgroundColor: '#00A3FF' }]} onPress={() => setTimeframe('week')} activeOpacity={0.8}>
                  <Text style={[st.tfText, timeframe === 'week' ? { color: '#0a0f1c', fontWeight: '900' } : { color: '#94a3b8' }]}>7 DAYS</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[st.tfOpt, timeframe === 'month' && { backgroundColor: '#00A3FF' }]} onPress={() => setTimeframe('month')} activeOpacity={0.8}>
                  <Text style={[st.tfText, timeframe === 'month' ? { color: '#0a0f1c', fontWeight: '900' } : { color: '#94a3b8' }]}>30 {t('history')}</Text>
               </TouchableOpacity>
            </View>
         </View>
          <View style={{ height: 350, zIndex: 10, position: 'relative' }}>
            {Platform.OS === 'web' && PrimeChart && (Object.keys(chartData).length > 0) ? (
               <View style={{ width: '100%', height: '100%' }}>
                  <PrimeChart type="line" data={chartData} options={chartOptions} style={{ height: '100%' }} />
               </View>
            ) : (
               <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#64748b', fontSize: 14 }}>{Platform.OS === 'web' ? 'Loading chart data...' : 'Charts unsupported on mobile runtime.'}</Text>
               </View>
            )}
            
            {/* Background Blob Effect */}
            <View style={{ position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(0,163,255,0.05)', pointerEvents: 'none' }} />
          </View>
      </View>

      {/* ═══ New User Growth Chart ═══ */}
      <View style={[st.chartSection, { marginBottom: 32 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, zIndex: 10 }}>
          <View>
            <Text style={[st.chartTitle, { fontSize: 20 }]}>New User Registrations</Text>
            <Text style={st.chartSubtitle}>USER GROWTH TREND</Text>
          </View>
          <View style={[st.badge, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }]}>
            <Text style={[st.badgeText, { color: '#10b981' }]}>Growth</Text>
          </View>
        </View>
        <View style={{ height: 280, zIndex: 10, position: 'relative' }}>
          {Platform.OS === 'web' && PrimeChart && (Object.keys(userChartData).length > 0) ? (
            <View style={{ width: '100%', height: '100%' }}>
              <PrimeChart type="bar" data={userChartData} options={userChartOptions} style={{ height: '100%' }} />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 14 }}>{Platform.OS === 'web' ? 'Loading chart data...' : 'Charts unsupported on mobile.'}</Text>
            </View>
          )}
          <View style={{ position: 'absolute', left: -50, bottom: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(16,185,129,0.04)', pointerEvents: 'none' }} />
        </View>
      </View>

      {/* ═══ Recent Activity (Transactions & New Users) ═══ */}
      <View style={[st.bottomSection, isMobile && { flexDirection: 'column' }]}>
         {/* Recent Transactions */}
         <View style={[st.activityPanel, { flex: 1 }]}>
            <Text style={st.activityTitle}>{t('transactions')}</Text>
            <View style={{ gap: 16 }}>
               {txs.length > 0 ? txs.map((tx: any, i: number) => {
                  const isDep = tx.tx_type === 'DEPOSIT' || String(tx.type).toLowerCase() === 'deposit';
                  const isSucc = tx.status === 'COMPLETED' || tx.status === 'success';
                  const color = isDep ? '#34d399' : '#FF005C';
                  const bg = isDep ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,0,92,0.1)';
                  const borderColorStr = isDep ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,0,92,0.15)';
                  const statusColor = isSucc ? '#34d399' : (String(tx.status).toUpperCase() === 'PENDING' ? '#f59e0b' : '#64748b');

                  return (
                     <View key={i} style={[st.acRow, { borderColor: borderColorStr }]}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                          <View style={[st.acIcon, { backgroundColor: bg, borderColor: color }]}>
                             <Ionicons name={isDep ? 'arrow-down' : 'arrow-up'} color={color} size={18} />
                          </View>
                          <View style={{ flex: 1 }}>
                             <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{tx.username || tx.number || 'User'}</Text>
                             <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{timeSince(tx.created_at)}</Text>
                          </View>
                       </View>
                       <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
                           <Text style={{ color: isDep ? '#34d399' : '#fff', fontSize: 14, fontWeight: '900' }}>{isDep ? '+' : '-'} {fmt(tx.amount)} ETB</Text>
                           <View style={{ backgroundColor: statusColor + '15', borderColor: statusColor + '40', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 }}>
                               <Text style={{ color: statusColor, fontSize: 8, fontWeight: '900', letterSpacing: 1 }}>{tx.status?.toUpperCase()}</Text>
                           </View>
                       </View>
                    </View>
                  )
               }) : (
                 <Text style={{ color: '#64748b', fontSize: 12 }}>{t('no_data')}</Text>
               )}
            </View>
         </View>

         {/* New Users Queue */}
         <View style={[st.activityPanel, { flex: 1 }]}>
            <Text style={st.activityTitle}>{t('admin_users')}</Text>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 }}>
               <Text style={[st.th, { flex: 1.5 }]}>{t('user_account')}</Text>
               <Text style={[st.th, { flex: 1 }]}>{t('rank')}</Text>
               <Text style={[st.th, { flex: 1 }]}>{t('timestamp')}</Text>
               <Text style={[st.th, { flex: 1, textAlign: 'right' }]}>{t('balance')}</Text>
            </View>
            {newUsers.length > 0 ? newUsers.map((u: any, idx: number) => (
               <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} onPress={() => router.push(`/admin/users` as any)} activeOpacity={0.7}>
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                     <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                         <Text style={{ color: '#00A3FF', fontWeight: '900', fontSize: 10 }}>{(u.username || 'U')[0].toUpperCase()}</Text>
                     </View>
                     <View>
                        <Text style={{ color: '#cbd5e1', fontWeight: '700', fontSize: 13 }}>{u.username}</Text>
                        <Text style={{ color: '#64748b', fontSize: 10 }}>{u.number}</Text>
                     </View>
                  </View>
                  <Text style={{ flex: 1, color: u.role === 'admin' || u.role === 'superadmin' ? '#00A3FF' : '#64748b', fontWeight: '900', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{u.role}</Text>
                  <Text style={{ flex: 1, color: '#94a3b8', fontWeight: '700', fontSize: 11 }}>{timeSince(u.created_at)}</Text>
                  <Text style={{ flex: 1, color: '#fff', fontWeight: '900', fontSize: 13, textAlign: 'right' }}>ETB {fmt(u.available_balance)}</Text>
               </TouchableOpacity>
            )) : (
               <View style={{ paddingVertical: 20 }}>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>{t('no_data')}</Text>
               </View>
            )}
         </View>
      </View>

    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1c', padding: 24, paddingVertical: 40, ...Platform.select({ web: { backgroundImage: 'radial-gradient(circle at top right, rgba(0, 163, 255, 0.05), transparent 40%), radial-gradient(circle at bottom left, rgba(255, 0, 92, 0.02), transparent 40%)' } as any }) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, gap: 24 },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 2 },
  statusBadge: { backgroundColor: 'rgba(23,23,50,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399', shadowColor: '#10b981', shadowOpacity: 0.5, shadowRadius: 8 },
  statusText: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  refreshBtn: { backgroundColor: '#00A3FF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, shadowColor: '#00A3FF', shadowOpacity: 0.2, shadowRadius: 20 },
  refreshText: { color: '#0a0f1c', fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginBottom: 40 },
  card: { minWidth: 250, flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 32 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  iconBox: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cardRightText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  cardLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  cardValue: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -1 },

  chartSection: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 40, padding: 40, marginBottom: 32, overflow: 'hidden' },
  chartTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  chartSubtitle: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  tfSelector: { flexDirection: 'row', gap: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tfOpt: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
  tfText: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  bottomSection: { flexDirection: 'row', gap: 32 },
  activityPanel: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 32 },
  activityTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginBottom: 32 },
  acRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderRadius: 16 },
  acIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  th: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
});
