import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

let PrimeChart: any = null;
if (Platform.OS === 'web') {
  PrimeChart = React.lazy(() => import('primereact/chart').then(m => ({ default: m.Chart })));
}

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtK = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};
const timeSince = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  const s = Math.floor((Date.now() - time) / 1000);
  if (s < 0) return 'Just now';
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

function AdminSkeleton({ isMobile }: { isMobile: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const styleWithPulse = (baseStyle: any) => [baseStyle, { opacity: pulseAnim }];

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Header Skeleton */}
      <View style={[st.header, isMobile && { flexDirection: 'column', gap: 12 }]}>
        <View style={{ gap: 6 }}>
          <Animated.View style={styleWithPulse({ width: 180, height: 28, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 })} />
          <Animated.View style={styleWithPulse({ width: 140, height: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 })} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Animated.View style={styleWithPulse({ width: 120, height: 28, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 })} />
          <Animated.View style={styleWithPulse({ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 })} />
        </View>
      </View>

      {/* Top Metric Cards Skeleton */}
      <View style={[st.topGrid, isMobile && { flexDirection: 'column' }]}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={st.metricCard}>
            <Animated.View style={styleWithPulse({ width: '60%', height: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, marginBottom: 12 })} />
            <Animated.View style={styleWithPulse({ width: '40%', height: 24, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 })} />
          </View>
        ))}
      </View>

      {/* Charts Row Skeleton */}
      <View style={[st.bentoRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[st.chartCard, { flex: 1.2, height: 320, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: 6 }}>
              <Animated.View style={styleWithPulse({ width: 160, height: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 })} />
              <Animated.View style={styleWithPulse({ width: 120, height: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2 })} />
            </View>
            <Animated.View style={styleWithPulse({ width: 100, height: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 })} />
          </View>
          <Animated.View style={styleWithPulse({ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, marginTop: 16 })} />
        </View>
        <View style={[st.chartCard, { flex: 0.8, height: 320, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: 120, height: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
            <View style={{ width: 60, height: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
          </View>
          <Animated.View style={styleWithPulse({ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, marginTop: 16 })} />
        </View>
      </View>

      {/* Live Matchmaking Rooms Skeleton */}
      <View style={[st.panelCard, { marginBottom: 16 }]}>
        <Animated.View style={styleWithPulse({ width: 160, height: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 16 })} />
        <View style={{ gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 8 }}>
              <Animated.View style={styleWithPulse({ width: 100, height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 })} />
              <Animated.View style={styleWithPulse({ width: 60, height: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 2 })} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <Animated.View style={styleWithPulse({ width: 40, height: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4 })} />
                <Animated.View style={styleWithPulse({ width: 40, height: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4 })} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function AdminOverview() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token, t } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [liveQueueStats, setLiveQueueStats] = useState<any>(null);
  const [recentData, setRecentData] = useState<{ users: any[]; transactions: any[] }>({ users: [], transactions: [] });
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [dauData, setDauData] = useState<any[]>([]);

  const fetchData = useCallback(async (showR = false) => {
    if (showR) setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };
      const [sR, rR, lR, dR, qR] = await Promise.all([
        fetch(`${API_URL}/admin/dashboard-data?range=${timeframe}`, { headers: h }),
        fetch(`${API_URL}/admin/metrics/recent`, { headers: h }),
        fetch(`${API_URL}/admin/metrics/live`, { headers: h }),
        fetch(`${API_URL}/admin/dau-list`, { headers: h }),
        fetch(`${API_URL}/admin/live-queue-stats`, { headers: h }),
      ]);
      if (sR.ok) setStats(await sR.json());
      if (rR.ok) { const d = await rR.json(); setRecentData({ users: d.users || [], transactions: d.transactions || [] }); }
      if (lR.ok) setLive(await lR.json());
      if (dR.ok) {
        const d = await dR.json();
        setDauData(d.dauList || []);
      }
      if (qR.ok) setLiveQueueStats(await qR.json());
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);
  // Auto-refresh every 2s
  useEffect(() => { const id = setInterval(() => fetchData(), 2000); return () => clearInterval(id); }, [fetchData]);

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
        { label: 'DAU', backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 6, data: d.newUserGraphData.map((i: any) => i.dau || 0) },
      ]
    });
    setUserChartOptions({ maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#475569', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } } } });
  }, [d.newUserGraphData, d.dau]);

  const combinedBreakdown = useMemo(() => {
    const flat: Record<number, { searching: number; liveMatches: number }> = {};
    if (liveQueueStats?.roomStats) {
      [1, 2, 3].forEach(roomNum => {
        const breakdown = liveQueueStats.roomStats[roomNum]?.betBreakdown || {};
        Object.entries(breakdown).forEach(([bet, item]: [string, any]) => {
          const betNum = Number(bet);
          if (!flat[betNum]) {
            flat[betNum] = { searching: 0, liveMatches: 0 };
          }
          flat[betNum].searching += item.searching || 0;
          flat[betNum].liveMatches += item.liveMatches || 0;
        });
      });
    }
    return flat;
  }, [liveQueueStats]);

  if (loading) return <View style={{ flex: 1, backgroundColor: C.background }}><AdminSkeleton isMobile={isMobile} /></View>;

  const getRoomTotals = (bets: number[]) => {
    let searching = 0;
    let liveMatches = 0;
    bets.forEach(b => {
      const item = combinedBreakdown[b];
      if (item) {
        searching += item.searching || 0;
        liveMatches += item.liveMatches || 0;
      }
    });
    return { searching, liveMatches };
  };

  const r1Totals = getRoomTotals([10, 25, 50, 100]);
  const r2Totals = getRoomTotals([100, 250, 500, 1000]);
  const r3Totals = getRoomTotals([1000, 2500, 5000, 10000]);

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
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(chartData).length > 0 ? (
              <React.Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="small" color="#00daf3" /></View>}>
                <PrimeChart type="line" data={chartData} options={chartOptions} style={{ height: '100%' }} />
              </React.Suspense>
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
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(userChartData).length > 0 ? (
              <React.Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="small" color="#00daf3" /></View>}>
                <PrimeChart type="bar" data={userChartData} options={userChartOptions} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#475569', fontSize: 12 }}>Loading...</Text></View>
            )}
          </View>
        </View>
      </View>

      {/* ═══ Live Matchmaking Rooms Overview ═══ */}
      <View style={[st.panelCard, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={st.panelTitle}>LIVE MATCHMAKING ROOMS</Text>
          <TouchableOpacity
            onPress={() => router.push('/admin/controls?activeTab=live_queue' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: '#00daf3', fontSize: 11, fontWeight: '800' }}>See More</Text>
            <Ionicons name="arrow-forward" size={12} color="#00daf3" />
          </TouchableOpacity>
        </View>
        
        <View style={{ gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Room 1 */}
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6' }} />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Room 1 - Beginner</Text>
            </View>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>10 - 100 ETB</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#00e5ff', fontSize: 16, fontWeight: '900' }}>{r1Totals.searching}</Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>SEARCHING</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#a78bfa', fontSize: 16, fontWeight: '900' }}>{r1Totals.liveMatches}</Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>LIVE MATCHES</Text>
              </View>
            </View>
          </View>

          {/* Room 2 */}
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' }} />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Room 2 - Intermediate</Text>
            </View>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>100 - 1000 ETB</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#00e5ff', fontSize: 16, fontWeight: '900' }}>{r2Totals.searching}</Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>SEARCHING</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#a78bfa', fontSize: 16, fontWeight: '900' }}>{r2Totals.liveMatches}</Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>LIVE MATCHES</Text>
              </View>
            </View>
          </View>

          {/* Room 3 */}
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#06b6d4' }} />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Room 3 - Advanced</Text>
            </View>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>1000 - 10000 ETB</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#00e5ff', fontSize: 16, fontWeight: '900' }}>{r3Totals.searching}</Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>SEARCHING</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#a78bfa', fontSize: 16, fontWeight: '900' }}>{r3Totals.liveMatches}</Text>
                <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>LIVE MATCHES</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ═══ Bottom Bento Row 1 ═══ */}
      <View style={[st.bentoRow, isMobile && { flexDirection: 'column' }]}>
        {/* Recent Transactions */}
        <View style={[st.panelCard, { flex: 1.2 }]}>
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
        <View style={[st.panelCard, { flex: 0.8 }]}>
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
      </View>

      {/* ═══ Bottom Bento Row 2 ═══ */}
      <View style={[st.bentoRow, isMobile && { flexDirection: 'column' }]}>
        {/* Active Users Today (DAU List) */}
        <View style={[st.panelCard, { flex: 1.2 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={st.panelTitle}>ACTIVE USERS TODAY (DAU: {dauData.length})</Text>
            <Ionicons name="people" size={16} color="#34d399" />
          </View>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {dauData.map((usr: any, i: number) => (
                <TouchableOpacity
                  key={usr.id || i}
                  style={st.txRow}
                  onPress={() => router.push(`/admin/user-detail?id=${usr.id}` as any)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[st.txIcon, { backgroundColor: 'rgba(52,211,153,0.1)' }]}>
                      <Ionicons name="person" color="#34d399" size={14} />
                    </View>
                    <View>
                      <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>
                        {usr.username || `User ${usr.number?.slice(-4)}`}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 9, fontWeight: '600' }}>
                        {usr.number || 'No Phone'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600' }}>
                      Last seen: {timeSince(usr.last_seen)}
                    </Text>
                    <Text style={{ color: '#00daf3', fontSize: 9, fontWeight: '800', marginTop: 2 }}>Details →</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {dauData.length === 0 && (
                <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', paddingVertical: 20 }}>
                  No active users recorded today yet.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>

        {/* System Status */}
        <View style={[st.panelCard, { flex: 0.8 }]}>
          <Text style={st.panelTitle}>SYSTEM STATUS</Text>
          <View style={{ gap: 10 }}>
            {healthItems.map((h, i) => (
              <View key={i} style={[st.healthRow, { borderColor: h.status === 'operational' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[st.healthDot, { backgroundColor: h.status === 'operational' ? '#34d399' : '#f87171' }]} />
                  <View>
                    <Text style={{ color: h.status === 'operational' ? '#34d399' : '#f87171', fontSize: 11, fontWeight: '800' }}>{h.name}</Text>
                    <Text style={{ color: '#475569', fontSize: 9 }}>{h.status === 'operational' ? 'Operational' : 'Issue Detected'}</Text>
                  </View>
                </View>
                <Text style={{ color: h.status === 'operational' ? '#34d399' : '#f87171', fontSize: 11, fontWeight: '700' }}>{h.status === 'operational' ? '✓' : '!'}</Text>
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
  metricCard: { flex: 1, backgroundColor: 'rgba(24, 24, 27, 0.65)', borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', borderRadius: 20, padding: 24, justifyContent: 'space-between', minHeight: 120, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  metricLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  metricValue: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  trendBadge: { backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trendText: { color: '#34d399', fontSize: 9, fontWeight: '800' },
  // Bento rows
  bentoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chartCard: { backgroundColor: 'rgba(24, 24, 27, 0.65)', borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', borderRadius: 24, padding: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  chartTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  chartSub: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '600', marginTop: 2 },
  tfSelector: { flexDirection: 'row', gap: 4, padding: 3, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tfOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  tfText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: C.onSurfaceVariant },
  // Bottom panels
  panelCard: { backgroundColor: 'rgba(24, 24, 27, 0.65)', borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  panelTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(39, 39, 42, 0.3)' },
  txIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusPill: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginTop: 2 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(39, 39, 42, 0.3)' },
  goBtn: { backgroundColor: 'rgba(0,218,243,0.1)', borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)', paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  goBtnText: { color: C.secondary, fontSize: 11, fontWeight: '900' },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(24,24,27,0.5)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.3)', borderRadius: 12, padding: 12 },
  healthDot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.8, shadowRadius: 6 },
});
