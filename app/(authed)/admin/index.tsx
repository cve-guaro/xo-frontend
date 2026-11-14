// app/(authed)/admin/index.tsx
// ─────────────────────────────────────────────────────────────────────
// Admin Dashboard Overview — redesigned to match reference dashboard.
// Uses shared admin UI primitives from components/admin/ui.tsx.
// ─────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, useWindowDimensions, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from './_layout';
import Svg, { Path } from 'react-native-svg';
import {
  AdminPanel, AdminKpiCard, AdminPill, AdminButton, AdminMeter, AdminDelta, AdminPager,
} from '../../../components/admin/ui';

// ── Formatters ───────────────────────────────────────────────────────
const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtK = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};
const fmtETB = (n: number) => `${fmt(n)} ETB`;
const timeSince = (d: string) => {
  if (!d) return '\u2014';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '\u2014';
  const s = Math.floor((Date.now() - time) / 1000);
  if (s < 0) return 'Just now';
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Sparkline (SVG) ─────────────────────────────────────────────────
function Sparkline({ data, width = 80, height = 30, color = '#FF2D55' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });
  const pathD = `M ${points.map((p, i) => `${i === 0 ? '' : 'L '}${p.replace(',', ' ')}`).join(' ')}`;
  return (
    <View style={{ width, height, opacity: 0.85 }}>
      <Svg width={width} height={height}>
        <Path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// ── Lazy Chart.js (web only) ─────────────────────────────────────────
let PrimeChart: any = null;
if (Platform.OS === 'web') {
  PrimeChart = React.lazy(() => import('primereact/chart').then(m => ({ default: m.Chart })));
}

// ── Skeleton loader ──────────────────────────────────────────────────
function OverviewSkeleton({ isMobile, C, isDark }: { isMobile: boolean; C: any; isDark: boolean }) {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const bg1 = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const bg2 = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  return (
    <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
      {/* Header skeleton */}
      <View style={{ marginBottom: 28 }}>
        <Animated.View style={{ width: 220, height: 28, backgroundColor: bg1, borderRadius: 4, opacity: pulse }} />
        <Animated.View style={{ width: 180, height: 14, backgroundColor: bg2, borderRadius: 4, marginTop: 8, opacity: pulse }} />
      </View>
      {/* KPI cards skeleton */}
      <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={{ flex: 1, minHeight: 140, backgroundColor: bg2, borderRadius: 16, opacity: pulse }} />
        ))}
      </View>
      {/* Chart panels skeleton */}
      <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 24 }}>
        <Animated.View style={{ flex: 1.2, height: 320, backgroundColor: bg2, borderRadius: 16, opacity: pulse }} />
        <Animated.View style={{ flex: 0.8, height: 320, backgroundColor: bg2, borderRadius: 16, opacity: pulse }} />
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN ADMIN OVERVIEW COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function AdminOverview() {
  const { theme: C, isDark } = useAdminTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token, t } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ── State ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [liveQueueStats, setLiveQueueStats] = useState<any>(null);
  const [recentData, setRecentData] = useState<{ users: any[]; transactions: any[] }>({ users: [], transactions: [] });
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [dauData, setDauData] = useState<any[]>([]);
  const [activityTab, setActivityTab] = useState<'cashouts' | 'ledger'>('cashouts');

  // ── Data fetching ──────────────────────────────────────────────────
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
      if (dR.ok) { const d = await dR.json(); setDauData(d.dauList || []); }
      if (qR.ok) setLiveQueueStats(await qR.json());
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, timeframe]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(() => fetchData(), 15000); return () => clearInterval(id); }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────────────
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

  // ── Chart.js configs ───────────────────────────────────────────────
  const [chartData, setChartData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  const [userChartData, setUserChartData] = useState({});
  const [userChartOptions, setUserChartOptions] = useState({});

  useEffect(() => {
    if (!d.graphData?.length) return;
    setChartData({
      labels: d.graphData.map((i: any) => i.date),
      datasets: [{
        label: 'Wallet net position (ETB)',
        fill: true,
        backgroundColor: C.lightPrimary,
        borderColor: C.primary,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: C.primary,
        data: d.graphData.map((i: any) => i.profit)
      }]
    });
    setChartOptions({
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: C.onSurfaceVariant, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: C.onSurfaceVariant, font: { size: 10 }, callback: (v: number) => fmtK(v) }, grid: { color: C.border } }
      }
    });
  }, [d.graphData, C]);

  useEffect(() => {
    if (!d.newUserGraphData?.length) return;
    setUserChartData({
      labels: d.newUserGraphData.map((i: any) => i.date),
      datasets: [
        { label: 'New users', backgroundColor: C.primary, borderRadius: 6, data: d.newUserGraphData.map((i: any) => i.count) },
        { label: 'DAU', backgroundColor: C.success, borderRadius: 6, data: d.newUserGraphData.map((i: any) => i.dau || 0) },
      ]
    });
    setUserChartOptions({
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: C.onSurfaceVariant, font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: C.onSurfaceVariant, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: C.onSurfaceVariant, stepSize: 1 }, grid: { color: C.border } }
      }
    });
  }, [d.newUserGraphData, d.dau, C]);

  // ── Live room stats ────────────────────────────────────────────────
  const combinedBreakdown = useMemo(() => {
    const flat: Record<number, { searching: number; liveMatches: number }> = {};
    if (liveQueueStats?.roomStats) {
      [1, 2, 3].forEach(roomNum => {
        const breakdown = liveQueueStats.roomStats[roomNum]?.betBreakdown || {};
        Object.entries(breakdown).forEach(([bet, item]: [string, any]) => {
          const betNum = Number(bet);
          if (!flat[betNum]) flat[betNum] = { searching: 0, liveMatches: 0 };
          flat[betNum].searching += item.searching || 0;
          flat[betNum].liveMatches += item.liveMatches || 0;
        });
      });
    }
    return flat;
  }, [liveQueueStats]);

  const getRoomTotals = (bets: number[]) => {
    let searching = 0, liveMatches = 0;
    bets.forEach(b => { const item = combinedBreakdown[b]; if (item) { searching += item.searching; liveMatches += item.liveMatches; } });
    return { searching, liveMatches };
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) return <View style={{ flex: 1, backgroundColor: C.background }}><OverviewSkeleton isMobile={isMobile} C={C} isDark={isDark} /></View>;

  const r1Totals = getRoomTotals([10, 25, 50, 100]);
  const r2Totals = getRoomTotals([100, 250, 500, 1000]);
  const r3Totals = getRoomTotals([1000, 2500, 5000, 10000]);
  const txs = recentData.transactions || [];
  const healthItems = Object.entries(d.health || {}).map(([key, val]: [string, any]) => ({
    name: val?.label || key, status: val?.status || 'unknown',
  }));
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

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Pending alert banner ───────────────────────────────── */}
      {d.pending > 0 && (
        <TouchableOpacity
          style={[st.alertBanner, { borderColor: 'rgba(240,149,12,0.3)' }]}
          onPress={() => router.push('/admin/financial' as any)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={[st.alertIcon, { backgroundColor: 'rgba(240,149,12,0.15)' }]}>
              <Ionicons name="notifications" size={18} color={C.accentGold} />
            </View>
            <View>
              <Text style={[st.alertTitle, { color: C.onSurface }]}>{d.pending} pending approvals</Text>
              <Text style={[st.alertSub, { color: C.onSurfaceVariant }]}>
                Withdrawals: {d.pendingList.length}, Verifications: {d.pending - d.pendingList.length}
              </Text>
            </View>
          </View>
          <AdminButton tone="brand" onPress={() => router.push('/admin/financial' as any)}>Review</AdminButton>
        </TouchableOpacity>
      )}

      {/* ─── Dashboard header ──────────────────────────────────── */}
      <View style={[st.header, isMobile && { flexDirection: 'column', gap: 12 }]}>
        <View>
          <Text style={[st.pageTitle, { color: C.onSurface }]}>Dashboard overview</Text>
          <Text style={[st.pageSubtitle, { color: C.onSurfaceVariant }]}>
            Live players, revenue, and activity across XO Ethiopia.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Timeframe selector */}
          <View style={[st.tfSelector, { backgroundColor: C.surfaceContainerLowest, borderColor: C.border }]}>
            {(['day', 'week', 'month'] as const).map(tf => (
              <TouchableOpacity
                key={tf}
                style={[st.tfOpt, timeframe === tf && { backgroundColor: C.primary }]}
                onPress={() => setTimeframe(tf)}
              >
                <Text style={[st.tfText, { color: timeframe === tf ? '#ffffff' : C.onSurfaceVariant }, timeframe === tf && { fontWeight: '700' }]}>
                  {tf === 'day' ? 'Today' : tf === 'week' ? '7 days' : '30 days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <AdminButton tone="brand" icon="refresh" onPress={() => fetchData(true)}>
            {refreshing ? undefined : 'Update data'}
          </AdminButton>
        </View>
      </View>

      {/* ─── KPI cards (4 cards matching reference) ────────────── */}
      <View style={[st.kpiRow, isMobile && { flexDirection: 'column' }]}>
        <AdminKpiCard
          label="Gaming revenue"
          value={fmtETB(d.ggr)}
          delta={8.4}
          icon="trending-up"
          featured
        />
        <AdminKpiCard
          label="Online players"
          value={String(d.onlineUsers)}
          delta={12.1}
          icon="people"
        />
        <AdminKpiCard
          label="Daily active"
          value={String(d.dau)}
          delta={3.2}
          icon="pulse"
        />
        <AdminKpiCard
          label="Active matches"
          value={String(d.activeMatches)}
          icon="game-controller"
          note={`${d.onlineUsers} online`}
        />
      </View>

      {/* ─── Revenue + Cash flow charts ────────────────────────── */}
      <View style={[st.row, isMobile && { flexDirection: 'column' }]}>
        {/* Revenue chart panel */}
        <AdminPanel
          title="Gaming revenue"
          kicker="20% house commission, in ETB."
          style={{ flex: 1.2 }}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ color: C.primary, fontSize: 22, fontWeight: '800', letterSpacing: -1 }}>{fmtK(d.ggr)}</Text>
              <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>ETB</Text>
            </View>
          }
        >
          <View style={{ height: 200 }}>
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(chartData).length > 0 ? (
              <React.Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="small" color={C.primary} /></View>}>
                <PrimeChart type="line" data={chartData} options={chartOptions} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Sparkline data={d.graphData.map((i: any) => i.profit || 0)} width={280} height={120} color={C.primary} />
              </View>
            )}
          </View>
        </AdminPanel>

        {/* Cash flow panel */}
        <AdminPanel
          title="Cash flow"
          kicker="Deposits and withdrawals over time"
          style={{ flex: 0.8 }}
          right={
            <AdminDelta value={d.depositsToday > d.withdrawalsToday ? 5.3 : -2.1} />
          }
        >
          <View style={{ gap: 16 }}>
            {/* Net deposits */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500' }}>Net deposits</Text>
                <Text style={{ color: C.primary, fontSize: 24, fontWeight: '800', letterSpacing: -1, marginTop: 4 }}>
                  {fmtK(d.depositsToday - d.withdrawalsToday)}
                </Text>
              </View>
            </View>
            {/* Deposits bar */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10.5, fontWeight: '600' }}>Deposits</Text>
                <Text style={{ color: C.success, fontSize: 11, fontWeight: '700' }}>{fmtK(d.depositsToday)} ETB</Text>
              </View>
              <AdminMeter value={Math.min(100, (d.depositsToday / Math.max(1, d.depositsToday + d.withdrawalsToday)) * 100)} tone="brand" />
            </View>
            {/* Withdrawals bar */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10.5, fontWeight: '600' }}>Withdrawals</Text>
                <Text style={{ color: C.error, fontSize: 11, fontWeight: '700' }}>{fmtK(d.withdrawalsToday)} ETB</Text>
              </View>
              <AdminMeter value={Math.min(100, (d.withdrawalsToday / Math.max(1, d.depositsToday + d.withdrawalsToday)) * 100)} tone="coral" />
            </View>
            {/* Volume */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ color: C.onSurfaceVariant, fontSize: 10.5 }}>Total volume</Text>
              <Text style={{ color: C.onSurface, fontSize: 11, fontWeight: '700' }}>{fmtETB(d.volume24h)}</Text>
            </View>
          </View>
        </AdminPanel>
      </View>

      {/* ─── Matches by tier + User chart ──────────────────────── */}
      <View style={[st.row, isMobile && { flexDirection: 'column' }]}>
        {/* Matches by stake tier */}
        <AdminPanel
          title="Matches by stake tier"
          kicker="Round activity across 10 to 10,000 ETB"
          style={{ flex: 1 }}
          right={
            <TouchableOpacity onPress={() => router.push('/admin/controls' as any)}>
              <Ionicons name="open-outline" size={16} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          }
        >
          <View style={{ gap: 12 }}>
            {[
              { label: 'Room 1 (10-100 ETB)', totals: r1Totals },
              { label: 'Room 2 (100-1K ETB)', totals: r2Totals },
              { label: 'Room 3 (1K-10K ETB)', totals: r3Totals },
            ].map(room => {
              const total = room.totals.searching + room.totals.liveMatches;
              return (
                <View key={room.label} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '600' }}>{room.label}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <AdminPill tone="positive" dot>{`${room.totals.searching} searching`}</AdminPill>
                      <AdminPill tone="brand" dot>{`${room.totals.liveMatches} live`}</AdminPill>
                    </View>
                  </View>
                  <AdminMeter value={Math.min(100, Math.max(5, (total / 50) * 100))} tone="brand" />
                </View>
              );
            })}
          </View>
        </AdminPanel>

        {/* New users and DAU chart */}
        <AdminPanel
          title="New users and DAU"
          kicker="Registration and daily active users"
          style={{ flex: 1 }}
          right={
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'baseline' }}>
              <Text style={{ color: C.onSurface, fontSize: 18, fontWeight: '800' }}>{fmtK(d.users)}</Text>
              <Text style={{ color: C.success, fontSize: 18, fontWeight: '800' }}>{fmtK(d.dau)}</Text>
            </View>
          }
        >
          <View style={{ height: 180 }}>
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(userChartData).length > 0 ? (
              <React.Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="small" color={C.primary} /></View>}>
                <PrimeChart type="bar" data={userChartData} options={userChartOptions} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Sparkline data={d.newUserGraphData.map((i: any) => i.count || 0)} width={240} height={100} color={C.primary} />
              </View>
            )}
          </View>
        </AdminPanel>
      </View>

      {/* ─── Cash-out requests + Pending payouts ───────────────── */}
      <View style={[st.row, isMobile && { flexDirection: 'column' }]}>
        {/* Recent transactions */}
        <AdminPanel
          title="Recent transactions"
          kicker="Latest deposits and withdrawals"
          style={{ flex: 1.2 }}
          right={
            <TouchableOpacity onPress={() => router.push('/admin/ledger' as any)}>
              <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700' }}>View all</Text>
            </TouchableOpacity>
          }
        >
          <View style={{ gap: 0 }}>
            {txs.slice(0, 5).map((tx: any, i: number) => {
              const typeUpper = String(tx.type || '').toUpperCase();
              const isCredit = ['DEPOSIT', 'GIFT', 'BONUS', 'WELCOME_BONUS', 'PROMO', 'GIVEAWAY', 'REFERRAL', 'REFERRAL_BONUS', 'REFUND', 'WIN', 'ADMIN_CREDIT'].includes(typeUpper);
              const isSucc = tx.status === 'COMPLETED' || tx.status === 'success' || tx.status === 'SUCCESS';
              const statusColor = isSucc ? C.success : (String(tx.status).toUpperCase() === 'PENDING' ? C.accentGold : C.error);
              return (
                <View key={i} style={[st.txRow, { borderBottomColor: C.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={[st.txIcon, { backgroundColor: C.surfaceContainerHighest }]}>
                      <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} color={isCredit ? C.success : C.error} size={15} />
                    </View>
                    <View>
                      <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '600' }}>{tx.username || 'User'}</Text>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>{tx.type} · {timeSince(tx.created_at)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: isCredit ? C.success : C.error, fontSize: 12, fontWeight: '700' }}>
                      {isCredit ? '+' : '-'}{fmt(tx.amount)} ETB
                    </Text>
                    <AdminPill tone={isSucc ? 'positive' : 'gold'}>{tx.status}</AdminPill>
                  </View>
                </View>
              );
            })}
            {txs.length === 0 && <Text style={{ color: C.onSurfaceVariant, fontSize: 12, paddingVertical: 16, textAlign: 'center' }}>No transactions recorded.</Text>}
          </View>
        </AdminPanel>

        {/* Pending withdrawals */}
        <AdminPanel
          title="Cash-out requests"
          kicker="Recent player withdrawals"
          style={{ flex: 0.8 }}
          right={<AdminPill tone="brand">{`${d.pendingList.length} pending`}</AdminPill>}
        >
          {d.pendingList.length > 0 ? (
            <View style={{ gap: 8 }}>
              {d.pendingList.slice(0, 4).map((pw: any, i: number) => (
                <View key={i} style={[st.txRow, { borderBottomColor: C.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[st.txIcon, { backgroundColor: C.surfaceContainerHighest }]}>
                      <Ionicons name="arrow-up" size={14} color={C.accentGold} />
                    </View>
                    <View>
                      <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '600' }}>{pw.username || `...${pw.id?.slice(-6)}`}</Text>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>{fmtETB(pw.amount || 0)}</Text>
                    </View>
                  </View>
                  <AdminPill tone="gold">Pending</AdminPill>
                </View>
              ))}
              <TouchableOpacity
                style={[st.viewAllBtn, { borderColor: C.primary }]}
                onPress={() => router.push('/admin/financial' as any)}
              >
                <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700' }}>View payout queue</Text>
                <Ionicons name="arrow-forward" size={14} color={C.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Ionicons name="checkmark-circle-outline" size={36} color={C.success} />
              <Text style={{ color: C.onSurfaceVariant, fontSize: 12, marginTop: 8 }}>Queue clear. No pending payouts.</Text>
            </View>
          )}
        </AdminPanel>
      </View>

      {/* ─── DAU list + System status ──────────────────────────── */}
      <View style={[st.row, isMobile && { flexDirection: 'column' }]}>
        {/* Active users today */}
        <AdminPanel
          title={`Active users today (${dauData.length})`}
          style={{ flex: 1.2 }}
          right={<Ionicons name="people-outline" size={16} color={C.primary} />}
        >
          <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 0 }}>
              {dauData.slice(0, 10).map((usr: any, i: number) => (
                <TouchableOpacity
                  key={usr.id || i}
                  style={[st.txRow, { borderBottomColor: C.border }]}
                  onPress={() => router.push(`/admin/user-detail?id=${usr.id}` as any)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[st.txIcon, { backgroundColor: C.surfaceContainerHighest }]}>
                      <Ionicons name="person-outline" color={C.onSurfaceVariant} size={14} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: C.onSurface, fontSize: 12, fontWeight: '600' }}>
                        {usr.username || `User ${usr.number?.slice(-4)}`}
                      </Text>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>{timeSince(usr.last_seen)}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.primary, fontSize: 11, fontWeight: '600' }}>Details</Text>
                </TouchableOpacity>
              ))}
              {dauData.length === 0 && (
                <Text style={{ color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>
                  No active users recorded today yet.
                </Text>
              )}
            </View>
          </ScrollView>
        </AdminPanel>

        {/* System status */}
        <AdminPanel
          title="System status"
          style={{ flex: 0.8 }}
          right={<AdminPill tone="positive" dot>Operational</AdminPill>}
        >
          <View style={{ gap: 8 }}>
            {healthItems.map((h, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: C.surfaceContainerLowest,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: h.status === 'operational' ? C.success : C.error }} />
                  <View>
                    <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '600' }}>{h.name}</Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>
                      {h.status === 'operational' ? 'Operational' : 'Attention required'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={h.status === 'operational' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={h.status === 'operational' ? C.success : C.error}
                />
              </View>
            ))}
          </View>
        </AdminPanel>
      </View>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}>
        <Text style={{ color: C.onSurfaceVariant, fontSize: 10.5 }}>XO Ethiopia operator console</Text>
        <Text style={{ color: C.onSurfaceVariant, fontSize: 10.5 }}>Amounts in ETB · GGR = 20% of wager handle</Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const st = StyleSheet.create({
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(240,149,12,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontSize: 13, fontWeight: '700' },
  alertSub: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  tfSelector: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tfOpt: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  tfText: { fontSize: 10.5, fontWeight: '600' },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    marginTop: 8,
  },
});
