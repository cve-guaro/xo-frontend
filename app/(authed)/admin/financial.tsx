import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, Animated, Easing, FlatList } from 'react-native';
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

// Animated counter
function ACount({ value, prefix = '', suffix = '', style }: any) {
  const av = useRef(new Animated.Value(0)).current;
  const [dv, setDv] = useState(0);
  useEffect(() => {
    av.setValue(0);
    Animated.timing(av, { toValue: value, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = av.addListener(({ value: v }) => setDv(Math.round(v)));
    return () => av.removeListener(id);
  }, [value]);
  return <Text style={style}>{prefix}{dv.toLocaleString()}{suffix}</Text>;
}

type TimeRange = 'day' | 'week' | 'month' | 'all';
type TabKey = 'deposits' | 'withdrawals' | 'bonuses' | 'giveaways' | 'refunds';

export default function FinancialDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<TimeRange>('week');
  const [gameFilter, setGameFilter] = useState<'all' | 'xo' | 'spin'>('all');
  const [activeTab, setActiveTab] = useState<TabKey>('deposits');
  const [drillData, setDrillData] = useState<any>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const h = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };
      const res = await fetch(`${API_URL}/admin/financial-dashboard?range=${range}`, { headers: h });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error('[FIN] fetch error', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, range]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(() => fetchData(), 60000); return () => clearInterval(id); }, [fetchData]);

  const fetchDrillDown = useCallback(async (type: string, date: string) => {
    setDrillLoading(true);
    setSelectedDate(date);
    try {
      const h = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };
      const d = new Date(date);
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
      const res = await fetch(`${API_URL}/admin/financial-dashboard/drill-down?type=${type}&date=${dateStr}`, { headers: h });
      if (res.ok) setDrillData(await res.json());
    } catch (e) { console.error('[FIN] drill-down error', e); }
    finally { setDrillLoading(false); }
  }, [token]);

  // Chart data
  const depositChartData = useMemo(() => {
    if (!data?.depositTimeline?.length) return {};
    return {
      labels: data.depositTimeline.map((i: any) => i.label),
      datasets: [{
        label: 'Deposits (ETB)',
        fill: true,
        backgroundColor: 'rgba(52,211,153,0.08)',
        borderColor: '#34d399',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#34d399',
        pointHoverRadius: 7,
        data: data.depositTimeline.map((i: any) => i.amount)
      }]
    };
  }, [data?.depositTimeline]);

  const withdrawalChartData = useMemo(() => {
    if (!data?.withdrawalTimeline?.length) return {};
    return {
      labels: data.withdrawalTimeline.map((i: any) => i.label),
      datasets: [{
        label: 'Withdrawals (ETB)',
        fill: true,
        backgroundColor: 'rgba(248,113,113,0.08)',
        borderColor: '#f87171',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#f87171',
        pointHoverRadius: 7,
        data: data.withdrawalTimeline.map((i: any) => i.amount)
      }]
    };
  }, [data?.withdrawalTimeline]);

  const chartOpts = useMemo(() => ({
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,30,0.95)',
        borderColor: 'rgba(0, 218, 243, 0.3)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: '#475569', font: { size: 10 }, callback: (v: number) => fmtK(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
    },
    onClick: (_: any, elements: any[], chart: any) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const timeline = activeTab === 'withdrawals' ? data?.withdrawalTimeline : data?.depositTimeline;
        if (timeline?.[idx]?.date) {
          fetchDrillDown(activeTab === 'withdrawals' ? 'withdrawals' : 'deposits', timeline[idx].date);
        }
      }
    }
  }), [data, activeTab, fetchDrillDown]);

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ color: C.onSurfaceVariant, marginTop: 12, fontSize: 12 }}>Loading financial data...</Text>
    </View>
  );

  const d = data || {};
  const profitImpactTotal = (d.bonusesGiven || 0) + (d.giveawaysGiven || 0) + (d.systemRefunds || 0) + (d.adminRefunds || 0);
  const profitImpactPct = d.purePlatformProfit > 0 ? ((profitImpactTotal / d.purePlatformProfit) * 100).toFixed(1) : '0';

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={[st.header, isMobile && { flexDirection: 'column', gap: 12 }]}>
        <View>
          <Text style={st.title}>FINANCIAL DASHBOARD</Text>
          <Text style={st.subtitle}>Revenue, Deposits, Withdrawals & Profit Tracking</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Game Filter */}
          <View style={st.tfSelector}>
            {(['all', 'xo'] as const).map(gf => (
              <TouchableOpacity key={gf} style={[st.tfOpt, gameFilter === gf && { backgroundColor: C.secondary }]} onPress={() => setGameFilter(gf)}>
                <Text style={[st.tfText, gameFilter === gf && { color: '#0a0f1c', fontWeight: '900' as any }]}>
                  {gf === 'all' ? 'ALL GAMES' : 'XO GAME'}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={[st.tfOpt, { opacity: 0.4 }]}>
              <Text style={[st.tfText, { fontStyle: 'italic' }]}>SPIN (Soon)</Text>
            </View>
          </View>

          {/* Time Range Selector */}
          <View style={st.tfSelector}>
            {(['day', 'week', 'month', 'all'] as TimeRange[]).map(tf => (
              <TouchableOpacity key={tf} style={[st.tfOpt, range === tf && { backgroundColor: C.primary }]} onPress={() => setRange(tf)}>
                <Text style={[st.tfText, range === tf && { color: '#0a0f1c', fontWeight: '900' as any }]}>
                  {tf === 'day' ? '24H' : tf === 'week' ? '7D' : tf === 'month' ? '30D' : 'ALL'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={st.refreshBtn} onPress={() => fetchData(true)} activeOpacity={0.8}>
            {refreshing ? <ActivityIndicator size="small" color="#0a0f1c" /> : <Ionicons name="refresh" size={16} color="#0a0f1c" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Top KPI Cards ═══ */}
      <View style={[st.kpiRow, isMobile && { flexDirection: 'column' }]}>
        {/* Card 1: Violet */}
        <View style={[st.kpiCard, { borderColor: C.border }]}>
          <View style={[st.kpiIcon, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
            <Ionicons name="wallet" size={20} color="#7c3aed" />
          </View>
          <Text style={st.kpiLabel}>TOTAL PLATFORM BALANCE</Text>
          <ACount value={d.totalPlatformAmount || 0} style={st.kpiValue} suffix=" ETB" />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 }}>
            <View>
              <Text style={st.kpiMini}>Available</Text>
              <Text style={st.kpiMiniVal}>{fmtK(d.totalAvailable || 0)}</Text>
            </View>
            <View>
              <Text style={st.kpiMini}>Withdrawable</Text>
              <Text style={st.kpiMiniVal}>{fmtK(d.totalWithdrawable || 0)}</Text>
            </View>
            <View>
              <Text style={st.kpiMini}>Bonus</Text>
              <Text style={[st.kpiMiniVal, { color: '#f5b642' }]}>{fmtK(d.totalBonus || 0)}</Text>
            </View>
          </View>
          {/* Proportional 3-way balance split bar */}
          <View style={{ height: 4, backgroundColor: 'rgba(31, 37, 64, 0.6)', borderRadius: 2, flexDirection: 'row', overflow: 'hidden', width: '100%' }}>
            <View style={{ flex: Math.max(1, d.totalAvailable || 0), backgroundColor: '#7c3aed' }} />
            <View style={{ flex: Math.max(1, d.totalWithdrawable || 0), backgroundColor: '#22d3ee' }} />
            <View style={{ flex: Math.max(1, d.totalBonus || 0), backgroundColor: '#f5b642' }} />
          </View>
        </View>

        {/* Card 2: Cyan */}
        <View style={[st.kpiCard, { borderColor: C.border }]}>
          <View style={[st.kpiIcon, { backgroundColor: 'rgba(34, 211, 238, 0.15)' }]}>
            <Ionicons name="card" size={20} color="#22d3ee" />
          </View>
          <Text style={st.kpiLabel}>CHAPA BALANCE</Text>
          <ACount value={d.chapaBalance || 0} style={[st.kpiValue, { color: '#22d3ee' }]} suffix=" ETB" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <View style={[st.statusDot, { backgroundColor: d.chapaBalance > 0 ? '#22c55e' : '#ef4444' }]} />
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '600' as any }}>
              {d.chapaBalance > 0 ? 'Connected & Active' : 'Low Balance'}
            </Text>
          </View>
        </View>

        {/* Card 3: Gold */}
        <View style={[st.kpiCard, { borderColor: C.border }]}>
          <View style={[st.kpiIcon, { backgroundColor: 'rgba(245, 182, 66, 0.15)' }]}>
            <Ionicons name="trending-up" size={20} color="#f5b642" />
          </View>
          <Text style={st.kpiLabel}>GROSS PLATFORM PROFIT</Text>
          <ACount value={d.purePlatformProfit || 0} style={[st.kpiValue, { color: '#f5b642' }]} suffix=" ETB" />
          <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>
            Commission earned from {fmt(d.totalGamesFinished || 0)} game rounds
          </Text>
        </View>

        {/* Card 4: Green */}
        <View style={[st.kpiCard, { borderColor: C.border }]}>
          <View style={[st.kpiIcon, { backgroundColor: d.netPlatformProfit >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="analytics" size={20} color={d.netPlatformProfit >= 0 ? '#22c55e' : '#ef4444'} />
          </View>
          <Text style={st.kpiLabel}>NET PLATFORM PROFIT</Text>
          <ACount value={d.netPlatformProfit || 0} style={[st.kpiValue, { color: d.netPlatformProfit >= 0 ? '#22c55e' : '#ef4444' }]} suffix=" ETB" />
          <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4 }}>
            -{profitImpactPct}% deducted ({fmtK(profitImpactTotal)})
          </Text>
        </View>
      </View>

      {/* ═══ Deposits & Withdrawals Today Bars ═══ */}
      <View style={[st.todayRow, isMobile && { flexDirection: 'column' }]}>
        <View style={st.todayCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[st.todayIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
              <Ionicons name="arrow-down" size={18} color="#34d399" />
            </View>
            <View>
              <Text style={st.todayLabel}>DEPOSITS TODAY</Text>
              <Text style={[st.todayVal, { color: '#34d399' }]}>{fmt(d.depositsToday || 0)} ETB</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700' as any }}>{d.depositCountToday || 0} txs</Text>
            <Text style={{ color: '#475569', fontSize: 10 }}>Total: {fmtK(d.totalDeposits || 0)}</Text>
          </View>
        </View>
        <View style={st.todayCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[st.todayIcon, { backgroundColor: 'rgba(248,113,113,0.12)' }]}>
              <Ionicons name="arrow-up" size={18} color="#f87171" />
            </View>
            <View>
              <Text style={st.todayLabel}>WITHDRAWALS TODAY</Text>
              <Text style={[st.todayVal, { color: '#f87171' }]}>{fmt(d.withdrawalsToday || 0)} ETB</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700' as any }}>{d.withdrawalCountToday || 0} txs</Text>
            <Text style={{ color: '#475569', fontSize: 10 }}>Total: {fmtK(d.totalWithdrawals || 0)}</Text>
          </View>
        </View>
      </View>

      {/* ═══ Charts Row ═══ */}
      <View style={[st.chartsRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[st.chartCard, { flex: 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={st.chartTitle}>DEPOSITS OVER TIME</Text>
              <Text style={st.chartSub}>Click a point to see depositors</Text>
            </View>
            <Text style={[st.chartTotal, { color: '#34d399' }]}>{fmtK(d.totalDeposits || 0)} ETB</Text>
          </View>
          <View style={{ height: 220 }}>
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(depositChartData).length > 0 ? (
              <React.Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="small" color="#00daf3" /></View>}>
                <PrimeChart type="line" data={depositChartData} options={chartOpts} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#475569', fontSize: 12 }}>Chart loading...</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[st.chartCard, { flex: 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={st.chartTitle}>WITHDRAWALS OVER TIME</Text>
              <Text style={st.chartSub}>Click a point to see payees</Text>
            </View>
            <Text style={[st.chartTotal, { color: '#f87171' }]}>{fmtK(d.totalWithdrawals || 0)} ETB</Text>
          </View>
          <View style={{ height: 220 }}>
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(withdrawalChartData).length > 0 ? (
              <React.Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="small" color="#00daf3" /></View>}>
                <PrimeChart type="line" data={withdrawalChartData} options={chartOpts} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#475569', fontSize: 12 }}>Chart loading...</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Drill-down panel */}
      {(drillData || drillLoading) && (
        <View style={st.drillPanel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={st.drillTitle}>
              {drillData?.type === 'withdrawals' ? '💸 Withdrawal' : '💰 Deposit'} Users — {selectedDate && !isNaN(new Date(selectedDate).getTime()) ? new Date(selectedDate).toLocaleDateString() : ''}
            </Text>
            <TouchableOpacity onPress={() => { setDrillData(null); setSelectedDate(null); }}>
              <Ionicons name="close-circle" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          {drillLoading ? <ActivityIndicator size="small" color={C.primary} /> : (
            <View>
              <View style={st.drillHeader}>
                <Text style={[st.drillCell, { flex: 2 }]}>User</Text>
                <Text style={[st.drillCell, { flex: 1.5 }]}>Phone</Text>
                <Text style={[st.drillCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                <Text style={[st.drillCell, { flex: 0.5, textAlign: 'right' }]}>Txs</Text>
              </View>
              {(drillData?.users || []).map((u: any, i: number) => (
                <TouchableOpacity key={i} style={st.drillRow} onPress={() => router.push(`/admin/user-detail?id=${u.user_id}` as any)}>
                  <Text style={[st.drillCellVal, { flex: 2 }]}>{u.username || '—'}</Text>
                  <Text style={[st.drillCellVal, { flex: 1.5, color: '#64748b' }]}>{u.number || '—'}</Text>
                  <Text style={[st.drillCellVal, { flex: 1, textAlign: 'right', color: drillData?.type === 'withdrawals' ? '#f87171' : '#34d399', fontWeight: '800' as any }]}>
                    {fmt(u.total_amount)}
                  </Text>
                  <Text style={[st.drillCellVal, { flex: 0.5, textAlign: 'right' }]}>{u.tx_count}</Text>
                </TouchableOpacity>
              ))}
              {(!drillData?.users || drillData.users.length === 0) && (
                <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 20 }}>No transactions for this date</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* ═══ Profit Impact Section ═══ */}
      <Text style={st.sectionTitle}>PROFIT IMPACT BREAKDOWN</Text>
      <Text style={st.sectionSub}>Items that reduce your pure platform profit</Text>
      <View style={[st.impactRow, isMobile && { flexDirection: 'column' }]}>
        {[
          { label: 'Welcome & Referral Bonuses', value: d.bonusesGiven, count: d.bonusCount, color: '#fbbf24', icon: 'gift' as any },
          { label: 'Leaderboard Giveaways', value: d.giveawaysGiven, count: d.giveawayCount, color: '#a78bfa', icon: 'trophy' as any },
          { label: 'System Refunds', value: d.systemRefunds, count: d.systemRefundCount, color: '#fb923c', icon: 'refresh-circle' as any },
          { label: 'Admin Manual Refunds', value: d.adminRefunds, count: d.adminRefundCount, color: '#f87171', icon: 'person' as any },
        ].map((item, i) => {
          const pct = d.purePlatformProfit > 0 ? ((item.value / d.purePlatformProfit) * 100).toFixed(1) : '0';
          return (
            <View key={i} style={[st.impactCard, { borderColor: item.color + '40' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={[st.impactIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={st.impactLabel}>{item.label}</Text>
              </View>
              <Text style={[st.impactVal, { color: item.color }]}>-{fmt(item.value || 0)} ETB</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={st.impactMeta}>{item.count || 0} entries</Text>
                <Text style={[st.impactMeta, { color: item.color }]}>{pct}% of profit</Text>
              </View>
              {/* Mini progress bar */}
              <View style={st.impactBar}>
                <View style={[st.impactBarFill, { width: `${Math.min(Number(pct), 100)}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* ═══ Data Tables ═══ */}
      <Text style={[st.sectionTitle, { marginTop: 24 }]}>DETAILED RECORDS</Text>
      <View style={st.tabRow}>
        {([
          { key: 'bonuses' as TabKey, label: 'Bonuses', icon: 'gift' as any },
          { key: 'giveaways' as TabKey, label: 'Giveaways', icon: 'trophy' as any },
          { key: 'refunds' as TabKey, label: 'Refunds', icon: 'refresh-circle' as any },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[st.tab, activeTab === tab.key && st.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#fff' : C.onSurfaceVariant} />
            <Text style={[st.tabText, activeTab === tab.key && { color: '#fff', fontWeight: '800' as any }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={st.tableCard}>
        {activeTab === 'bonuses' && (
          <View>
            {!isMobile && (
              <View style={st.tableHeader}>
                <Text style={[st.thCell, { flex: 2 }]}>User</Text>
                <Text style={[st.thCell, { flex: 1.5 }]}>Amount</Text>
                <Text style={[st.thCell, { flex: 3 }]}>Reason</Text>
                <Text style={[st.thCell, { flex: 1.5, textAlign: 'right' }]}>Date</Text>
              </View>
            )}
            {(d.recentBonuses || []).map((b: any, i: number) => (
              isMobile ? (
                <View key={i} style={{ padding: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: C.outlineVariant, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{b.username || '—'}</Text>
                    <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '800' }}>{fmt(b.amount)} ETB</Text>
                  </View>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>{b.reason || '—'}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, alignSelf: 'flex-end' }}>
                    {b.created_at && !isNaN(new Date(b.created_at).getTime()) ? new Date(b.created_at).toLocaleDateString() : '—'}
                  </Text>
                </View>
              ) : (
                <View key={i} style={st.tableRow}>
                  <Text style={[st.tdCell, { flex: 2 }]}>{b.username || '—'}</Text>
                  <Text style={[st.tdCell, { flex: 1.5, color: '#fbbf24', fontWeight: '700' as any }]}>{fmt(b.amount)} ETB</Text>
                  <Text style={[st.tdCell, { flex: 3, color: '#64748b' }]} numberOfLines={1}>{b.reason || '—'}</Text>
                  <Text style={[st.tdCell, { flex: 1.5, textAlign: 'right', color: '#475569' }]}>
                    {b.created_at && !isNaN(new Date(b.created_at).getTime()) ? new Date(b.created_at).toLocaleDateString() : '—'}
                  </Text>
                </View>
              )
            ))}
            {(!d.recentBonuses || d.recentBonuses.length === 0) && (
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 30 }}>No bonus records</Text>
            )}
          </View>
        )}

        {activeTab === 'giveaways' && (
          <View>
            <View style={st.tableHeader}>
              <Text style={[st.thCell, { flex: 1 }]}>Rank</Text>
              <Text style={[st.thCell, { flex: 2 }]}>User</Text>
              <Text style={[st.thCell, { flex: 1 }]}>Wins</Text>
              <Text style={[st.thCell, { flex: 1.5 }]}>Prize</Text>
              <Text style={[st.thCell, { flex: 1.5, textAlign: 'right' }]}>Week</Text>
            </View>
            {(d.recentGiveaways || []).map((g: any, i: number) => (
              <View key={i} style={st.tableRow}>
                <Text style={[st.tdCell, { flex: 1 }]}>
                  <Text style={{ color: g.rank === 1 ? '#fbbf24' : g.rank === 2 ? '#94a3b8' : '#cd7f32' }}>
                    #{g.rank}
                  </Text>
                </Text>
                <Text style={[st.tdCell, { flex: 2 }]}>{g.username || '—'}</Text>
                <Text style={[st.tdCell, { flex: 1, color: C.secondary }]}>{g.wins}</Text>
                <Text style={[st.tdCell, { flex: 1.5, color: '#34d399', fontWeight: '700' as any }]}>{fmt(g.prize_amount)} ETB</Text>
                <Text style={[st.tdCell, { flex: 1.5, textAlign: 'right', color: '#475569' }]}>{g.week_start}</Text>
              </View>
            ))}
            {(!d.recentGiveaways || d.recentGiveaways.length === 0) && (
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 30 }}>No giveaway records</Text>
            )}
          </View>
        )}

        {activeTab === 'refunds' && (
          <View>
            <View style={st.tableHeader}>
              <Text style={[st.thCell, { flex: 2 }]}>User</Text>
              <Text style={[st.thCell, { flex: 1.5 }]}>Amount</Text>
              <Text style={[st.thCell, { flex: 1.5 }]}>Type</Text>
              <Text style={[st.thCell, { flex: 1.5, textAlign: 'right' }]}>Date</Text>
            </View>
            {(d.recentRefunds || []).map((r: any, i: number) => (
              <View key={i} style={st.tableRow}>
                <Text style={[st.tdCell, { flex: 2 }]}>{r.username || '—'}</Text>
                <Text style={[st.tdCell, { flex: 1.5, color: '#f87171', fontWeight: '700' as any }]}>{fmt(r.amount)} ETB</Text>
                <Text style={[st.tdCell, { flex: 1.5 }]}>
                  <View style={[st.typeBadge, { borderColor: r.provider === 'ADMIN_REFUND' ? 'rgba(248,113,113,0.3)' : 'rgba(251,146,60,0.3)' }]}>
                    <Text style={{ color: r.provider === 'ADMIN_REFUND' ? '#f87171' : '#fb923c', fontSize: 9, fontWeight: '800' as any }}>
                      {r.provider === 'ADMIN_REFUND' ? 'ADMIN' : 'SYSTEM'}
                    </Text>
                  </View>
                </Text>
                <Text style={[st.tdCell, { flex: 1.5, textAlign: 'right', color: '#475569' }]}>
                  {r.created_at && !isNaN(new Date(r.created_at).getTime()) ? new Date(r.created_at).toLocaleDateString() : '—'}
                </Text>
              </View>
            ))}
            {(!d.recentRefunds || d.recentRefunds.length === 0) && (
              <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', padding: 30 }}>No refund records</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  subtitle: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600', marginTop: 2 },
  tfSelector: { flexDirection: 'row', gap: 3, padding: 3, backgroundColor: C.surfaceContainerLowest, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  tfOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  tfText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: C.onSurfaceVariant },
  refreshBtn: { backgroundColor: C.primary, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // KPI Cards
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  kpiValue: { color: '#ffffff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  kpiMini: { color: '#94a3b8', fontSize: 9, fontWeight: '600' },
  kpiMiniVal: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // Today row
  todayRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  todayCard: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16,
  },
  todayIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todayLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  todayVal: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  // Charts
  chartsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chartCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 20, overflow: 'hidden',
  },
  chartTitle: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  chartSub: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '600', marginTop: 2 },
  chartTotal: { fontSize: 16, fontWeight: '900' },

  // Drill-down
  drillPanel: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 20, marginBottom: 16,
  },
  drillTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  drillHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border },
  drillCell: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  drillRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border },
  drillCellVal: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },

  // Section titles
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4, marginTop: 8 },
  sectionSub: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600', marginBottom: 16 },

  // Impact cards
  impactRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  impactCard: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderRadius: 16, padding: 16,
  },
  impactIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  impactLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', flex: 1 },
  impactVal: { fontSize: 18, fontWeight: '900' },
  impactMeta: { color: '#94a3b8', fontSize: 9, fontWeight: '600' },
  impactBar: { height: 3, backgroundColor: 'rgba(31, 37, 64, 0.6)', borderRadius: 2, marginTop: 8 },
  impactBarFill: { height: 3, borderRadius: 2 },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  tabActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  tabText: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' },

  // Tables
  tableCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border },
  thCell: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border, alignItems: 'center' },
  tdCell: { color: '#e2e8f0', fontSize: 12, fontWeight: '500' },
  typeBadge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
