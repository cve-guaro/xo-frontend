// app/(authed)/admin/financial.tsx — Payments view
// Matches reference: FinancialConsole (withdrawal/deposit queue, AML rules, cash-flow drill-down)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, useWindowDimensions, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import {
  AdminPanel, AdminPill, AdminButton, AdminToggle, AdminMeter, AdminPager,
} from '../../../components/admin/ui';

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
const fmtETB = (n: number) => `${fmt(n)} ETB`;
const fmtAgo = (ts: string | number) => {
  const d = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (isNaN(d)) return '--';
  const diff = Date.now() - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};
const fmtDay = (ts: string | number) => {
  const d = new Date(typeof ts === 'number' ? ts : ts);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

type TimeRange = 'day' | 'week' | 'month' | 'all';
type TabKey = 'withdrawals' | 'deposits';

const REJECTION_REASONS = [
  'Name mismatch',
  'Suspected fraud',
  'Duplicate request',
  'Insufficient KYC',
  'Exceeds daily limit',
  'Other',
] as const;

export default function FinancialDashboard() {
  const { theme: C, isDark } = useAdminTheme();
  const { token, isSuperAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<TimeRange>('week');
  const [tab, setTab] = useState<TabKey>('withdrawals');
  const [highRisk, setHighRisk] = useState(false);

  // Drill-down
  const [drillData, setDrillData] = useState<any>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);

  // AML state
  const [forceManual, setForceManual] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState('5000');
  const [maxDaily, setMaxDaily] = useState('50000');

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

  const handleApprove = useCallback(async (txId: string) => {
    try {
      await fetch(`${API_URL}/admin/transactions/${txId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      fetchData();
    } catch (e) { console.error('[FIN] approve error', e); }
  }, [token, fetchData]);

  const handleReject = useCallback(async (txId: string, reason: string) => {
    try {
      await fetch(`${API_URL}/admin/transactions/${txId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify({ reason }),
      });
      fetchData();
    } catch (e) { console.error('[FIN] reject error', e); }
  }, [token, fetchData]);

  // Chart data
  const depositChartData = useMemo(() => {
    if (!data?.depositTimeline?.length) return {};
    return {
      labels: data.depositTimeline.map((i: any) => i.label),
      datasets: [{
        label: 'Deposits (ETB)', fill: true,
        backgroundColor: 'rgba(16,185,129,0.08)', borderColor: '#10B981',
        tension: 0.4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#10B981',
        data: data.depositTimeline.map((i: any) => i.amount),
      }],
    };
  }, [data?.depositTimeline]);

  const withdrawalChartData = useMemo(() => {
    if (!data?.withdrawalTimeline?.length) return {};
    return {
      labels: data.withdrawalTimeline.map((i: any) => i.label),
      datasets: [{
        label: 'Withdrawals (ETB)', fill: true,
        backgroundColor: 'rgba(255,45,85,0.08)', borderColor: '#FF2D55',
        tension: 0.4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#FF2D55',
        data: data.withdrawalTimeline.map((i: any) => i.amount),
      }],
    };
  }, [data?.withdrawalTimeline]);

  const chartOpts = useMemo(() => ({
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: C.surface, borderColor: C.border, borderWidth: 1,
        titleColor: C.onSurface, bodyColor: C.onSurfaceVariant, padding: 10, cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: C.onSurfaceVariant, font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: C.onSurfaceVariant, font: { size: 10 }, callback: (v: number) => fmtK(v) }, grid: { color: C.border + '40' } },
    },
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const timeline = tab === 'withdrawals' ? data?.withdrawalTimeline : data?.depositTimeline;
        if (timeline?.[idx]?.date) fetchDrillDown(tab, timeline[idx].date);
      }
    },
  }), [data, tab, fetchDrillDown, C]);

  // Daily cash-flow groups
  const dailyGroups = useMemo(() => {
    const timeline = data?.depositTimeline || [];
    const wTimeline = data?.withdrawalTimeline || [];
    const map = new Map<string, { date: string; deposits: number; withdrawals: number }>();
    timeline.forEach((t: any) => {
      const g = map.get(t.date) || { date: t.date, deposits: 0, withdrawals: 0 };
      g.deposits += t.amount || 0;
      map.set(t.date, g);
    });
    wTimeline.forEach((t: any) => {
      const g = map.get(t.date) || { date: t.date, deposits: 0, withdrawals: 0 };
      g.withdrawals += t.amount || 0;
      map.set(t.date, g);
    });
    return [...map.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);
  }, [data?.depositTimeline, data?.withdrawalTimeline]);

  if (loading && !data) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ color: C.onSurfaceVariant, marginTop: 12, fontSize: 12 }}>Loading financial data...</Text>
    </View>
  );

  const d = data || {};
  const withdrawals = d.withdrawals || [];
  const deposits = d.deposits || [];
  const filteredWithdrawals = highRisk
    ? withdrawals.filter((w: any) => (w.risk || 0) >= 65)
    : withdrawals;
  const pendingAmount = withdrawals
    .filter((w: any) => w.status === 'pending')
    .reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
  const autoEligible = withdrawals.filter((w: any) =>
    w.status === 'pending' && w.amount <= Number(autoThreshold) && w.kyc_verified,
  ).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ padding: isMobile ? 12 : 20, paddingBottom: 100, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[st.header, isMobile && { flexDirection: 'column', gap: 12 }]}>
        <View>
          <Text style={[st.title, { color: C.onSurface }]}>Financial console</Text>
          <Text style={[st.subtitle, { color: C.onSurfaceVariant }]}>
            Withdrawals dispatch through Chapa; rejections restore the reserved withdrawal balance
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={[st.tfSelector, { backgroundColor: C.surfaceContainerLow, borderColor: C.border }]}>
            {(['day', 'week', 'month', 'all'] as TimeRange[]).map(tf => (
              <TouchableOpacity key={tf} style={[st.tfOpt, range === tf && { backgroundColor: C.primary }]} onPress={() => setRange(tf)}>
                <Text style={[st.tfText, { color: range === tf ? '#fff' : C.onSurfaceVariant }]}>
                  {tf === 'day' ? 'Today' : tf === 'week' ? '7 days' : tf === 'month' ? '30 days' : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <AdminButton icon="refresh" tone="brand" onPress={() => fetchData(true)}>
            {refreshing ? 'Updating...' : 'Update data'}
          </AdminButton>
        </View>
      </View>

      {/* ═══ Financial Request Queue + AML ═══ */}
      <View style={[{ gap: 16 }, !isMobile && { flexDirection: 'row' }]}>
        {/* Queue Panel */}
        <View style={{ flex: 1 }}>
          <AdminPanel
            title="Financial request queue"
            kicker="Withdrawals dispatch through Chapa; rejections restore the reserved withdrawal balance"
            noPadBody
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AdminPill tone="brand">{`${fmtETB(pendingAmount)} pending`}</AdminPill>
                {tab === 'withdrawals' && (
                  <AdminButton
                    tone={highRisk ? 'gold' : 'ghost'}
                    size="xs"
                    onPress={() => setHighRisk(v => !v)}
                  >
                    High risk
                  </AdminButton>
                )}
              </View>
            }
          >
            {/* Tab bar */}
            <View style={[st.tabBar, { borderBottomColor: C.border }]}>
              <View style={[st.tabGroup, { backgroundColor: C.surfaceContainerHighest }]}>
                {(['withdrawals', 'deposits'] as TabKey[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={[st.tabBtn, tab === t && { backgroundColor: C.surface }]}
                  >
                    <Text style={[st.tabBtnText, { color: tab === t ? C.onSurface : C.onSurfaceVariant }]}>
                      {t === 'withdrawals' ? 'Withdrawal requests' : 'Deposit requests'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 10.5, color: C.onSurfaceVariant }}>
                {tab === 'withdrawals' ? `${filteredWithdrawals.length} matches` : `${deposits.length} deposits`}
              </Text>
            </View>

            {/* Table */}
            {tab === 'withdrawals' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
                <View style={{ minWidth: 900 }}>
                  {/* Header */}
                  <View style={[st.tableRow, { backgroundColor: C.surfaceContainerHighest }]}>
                    <Text style={[st.th, { flex: 2 }]}>Player phone</Text>
                    <Text style={[st.th, { flex: 1.2 }]}>Amount</Text>
                    <Text style={[st.th, { flex: 1.5 }]}>Destination</Text>
                    <Text style={[st.th, { flex: 1 }]}>Submitted</Text>
                    <Text style={[st.th, { flex: 0.8 }]}>Status</Text>
                    <Text style={[st.th, { flex: 1.5, textAlign: 'right' }]}>{' '}</Text>
                  </View>
                  {/* Rows */}
                  {filteredWithdrawals.slice(0, 12).map((p: any) => (
                    <View key={p.id || p.transaction_id} style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
                      <View style={{ flex: 2, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ fontWeight: '700', color: C.onSurface, fontSize: 12 }}>{p.username || p.handle || '--'}</Text>
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                          {p.number || p.phone || '--'} {p.kyc_verified ? 'KYC verified' : 'KYC missing'}
                        </Text>
                      </View>
                      <View style={{ flex: 1.2, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ fontWeight: '700', color: C.primary, fontSize: 12 }}>{fmtETB(p.amount)}</Text>
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Risk {p.risk || 0}/100</Text>
                      </View>
                      <View style={{ flex: 1.5, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ fontWeight: '600', color: C.onSurfaceVariant, fontSize: 12 }}>{p.rail || p.method || 'Chapa'}</Text>
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>{p.destination || p.dest || '--'}</Text>
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ color: C.onSurfaceVariant, fontSize: 12 }}>{fmtAgo(p.created_at || p.ts)}</Text>
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>{(p.reference || p.ref || '').slice(0, 12)}</Text>
                      </View>
                      <View style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <AdminPill tone={p.status === 'pending' ? 'gold' : p.status === 'approved' ? 'positive' : p.status === 'rejected' ? 'coral' : 'azure'}>
                          {p.status === 'approved' ? 'Paid' : (p.status || 'Pending')}
                        </AdminPill>
                        {p.rejection_reason && <Text style={{ fontSize: 10, color: C.error, marginTop: 2 }}>{p.rejection_reason}</Text>}
                      </View>
                      <View style={{ flex: 1.5, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                        {p.status === 'pending' ? (
                          <>
                            <AdminButton size="xs" tone="brand" icon="checkmark" onPress={() => handleApprove(p.id || p.transaction_id)}>Approve</AdminButton>
                            <AdminButton size="xs" tone="ghost" icon="arrow-undo" onPress={() => setRejectId(p.id || p.transaction_id)}>Reject</AdminButton>
                          </>
                        ) : (
                          <Text style={{ fontSize: 10.5, color: C.onSurfaceVariant }}>No action required</Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {filteredWithdrawals.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>No withdrawal requests match this window and segment.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
                <View style={{ minWidth: 800 }}>
                  <View style={[st.tableRow, { backgroundColor: C.surfaceContainerHighest }]}>
                    <Text style={[st.th, { flex: 2 }]}>Player</Text>
                    <Text style={[st.th, { flex: 1.2 }]}>Amount</Text>
                    <Text style={[st.th, { flex: 1.2 }]}>Payment method</Text>
                    <Text style={[st.th, { flex: 1 }]}>Received</Text>
                    <Text style={[st.th, { flex: 1.5 }]}>Reference</Text>
                    <Text style={[st.th, { flex: 0.8 }]}>Status</Text>
                  </View>
                  {deposits.slice(0, 20).map((dp: any, i: number) => (
                    <View key={dp.id || i} style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
                      <View style={{ flex: 2, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ fontWeight: '700', color: C.onSurface, fontSize: 12 }}>{dp.username || '--'}</Text>
                        <Text style={{ fontSize: 10, color: C.onSurfaceVariant, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>{dp.user_id?.slice(0, 8) || '--'}</Text>
                      </View>
                      <Text style={{ flex: 1.2, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700', color: C.success, fontSize: 12 }}>+{fmtETB(dp.amount)}</Text>
                      <Text style={{ flex: 1.2, paddingHorizontal: 12, paddingVertical: 10, color: C.onSurfaceVariant, fontSize: 12 }}>{dp.method || dp.rail || 'Chapa'}</Text>
                      <Text style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: C.onSurfaceVariant, fontSize: 12 }}>{fmtAgo(dp.created_at || dp.ts)}</Text>
                      <Text style={{ flex: 1.5, paddingHorizontal: 12, paddingVertical: 10, color: C.onSurfaceVariant, fontSize: 10.5, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>{dp.reference || dp.ref || '--'}</Text>
                      <View style={{ flex: 0.8, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <AdminPill tone="positive">Confirmed</AdminPill>
                      </View>
                    </View>
                  ))}
                  {deposits.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>No deposit requests in this range.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </AdminPanel>
        </View>

        {/* AML Payout Rules */}
        {!isMobile && (
          <View style={{ width: 330 }}>
            <AdminPanel title="AML payout rules" kicker="Superadmin financial safeguards">
              {/* Force manual toggle */}
              <View style={[st.amlRow, { backgroundColor: C.surfaceContainerHighest, borderRadius: 12, padding: 12, marginBottom: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.onSurface }}>Force manual approval</Text>
                  <Text style={{ fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 2 }}>No withdrawal can auto-dispatch.</Text>
                </View>
                <AdminToggle checked={forceManual} disabled={!isSuperAdmin} onChange={setForceManual} label="Force manual approval" />
              </View>
              {/* Threshold inputs */}
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={st.inputLabel}>Auto-payout threshold</Text>
                  <View style={[st.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
                    <TextInput
                      value={autoThreshold}
                      onChangeText={setAutoThreshold}
                      keyboardType="numeric"
                      style={[st.input, { color: C.onSurface }]}
                      {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '600', color: C.onSurfaceVariant }}>ETB</Text>
                  </View>
                </View>
                <View>
                  <Text style={st.inputLabel}>Max daily withdrawal</Text>
                  <View style={[st.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
                    <TextInput
                      value={maxDaily}
                      onChangeText={setMaxDaily}
                      keyboardType="numeric"
                      style={[st.input, { color: C.onSurface }]}
                      {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '600', color: C.onSurfaceVariant }}>ETB</Text>
                  </View>
                </View>
              </View>
              {/* Info */}
              <View style={[st.amlInfo, { borderColor: C.border }]}>
                <Text style={{ fontSize: 11, color: C.onSurfaceVariant, lineHeight: 17 }}>
                  <Text style={{ fontWeight: '700', color: C.onSurface }}>{autoEligible}</Text> KYC-verified requests are below the auto-payout threshold in the current view.{' '}
                  {forceManual ? 'Manual approval is currently forced.' : 'They remain eligible for automated dispatch after server-side checks.'}
                </Text>
              </View>
              {!isSuperAdmin && (
                <Text style={{ fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 8 }}>
                  Admin role can review and process requests; only superadmin can change AML rules.
                </Text>
              )}
            </AdminPanel>
          </View>
        )}
      </View>

      {/* AML on mobile — stacked below */}
      {isMobile && (
        <AdminPanel title="AML payout rules" kicker="Superadmin financial safeguards">
          <View style={[st.amlRow, { backgroundColor: C.surfaceContainerHighest, borderRadius: 12, padding: 12, marginBottom: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.onSurface }}>Force manual approval</Text>
              <Text style={{ fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 2 }}>No withdrawal can auto-dispatch.</Text>
            </View>
            <AdminToggle checked={forceManual} disabled={!isSuperAdmin} onChange={setForceManual} label="Force manual approval" />
          </View>
          <View style={{ gap: 12 }}>
            <View>
              <Text style={st.inputLabel}>Auto-payout threshold</Text>
              <View style={[st.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
                <TextInput value={autoThreshold} onChangeText={setAutoThreshold} keyboardType="numeric" style={[st.input, { color: C.onSurface }]} {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.onSurfaceVariant }}>ETB</Text>
              </View>
            </View>
            <View>
              <Text style={st.inputLabel}>Max daily withdrawal</Text>
              <View style={[st.inputWrap, { borderColor: C.border, backgroundColor: C.surface }]}>
                <TextInput value={maxDaily} onChangeText={setMaxDaily} keyboardType="numeric" style={[st.input, { color: C.onSurface }]} {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.onSurfaceVariant }}>ETB</Text>
              </View>
            </View>
          </View>
        </AdminPanel>
      )}

      {/* ═══ Cash-flow date drill-down ═══ */}
      <AdminPanel title="Cash-flow date drill-down" kicker="Click a calendar day to inspect deposits, withdrawals, referral bonuses, and giveaway outflows">
        {/* Day cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {dailyGroups.map(dg => {
            const sel = selectedDate === dg.date;
            return (
              <TouchableOpacity
                key={dg.date}
                onPress={() => {
                  if (sel) { setSelectedDate(null); setDrillData(null); }
                  else fetchDrillDown('deposits', dg.date);
                }}
                style={[
                  st.dayCard,
                  { borderColor: sel ? C.primary + '60' : C.border },
                  sel && { backgroundColor: C.primaryContainer },
                ]}
              >
                <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>{fmtDay(dg.date)}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.success, marginTop: 4 }}>+{fmtETB(dg.deposits)}</Text>
                <Text style={{ fontSize: 10, color: C.primary, marginTop: 2 }}>-{fmtETB(dg.withdrawals)}</Text>
              </TouchableOpacity>
            );
          })}
          {dailyGroups.length === 0 && (
            <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>No date range data available.</Text>
          )}
        </ScrollView>

        {/* Detail table when a day is selected */}
        {drillLoading && <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 16 }} />}
        {drillData && !drillLoading && (
          <View style={[st.drillTable, { borderColor: C.border, marginTop: 16 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
              <View style={{ minWidth: 640 }}>
                <View style={[st.tableRow, { backgroundColor: C.surfaceContainerHighest }]}>
                  <Text style={[st.th, { flex: 1 }]}>Time</Text>
                  <Text style={[st.th, { flex: 1 }]}>Type</Text>
                  <Text style={[st.th, { flex: 1.5 }]}>Player</Text>
                  <Text style={[st.th, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                  <Text style={[st.th, { flex: 1 }]}>Txs</Text>
                </View>
                {(drillData.users || []).slice(0, 12).map((r: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={[st.tableRow, { borderTopWidth: 1, borderTopColor: C.border }]}
                    onPress={() => router.push(`/admin/user-detail?id=${r.user_id}` as any)}
                  >
                    <Text style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, color: C.onSurfaceVariant, fontSize: 12 }}>{fmtAgo(r.created_at || r.ts || '')}</Text>
                    <Text style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, color: C.onSurfaceVariant, fontSize: 12, textTransform: 'capitalize' }}>{drillData.type || 'deposit'}</Text>
                    <Text style={{ flex: 1.5, paddingHorizontal: 8, paddingVertical: 8, fontWeight: '600', color: C.onSurface, fontSize: 12 }}>{r.username || '--'}</Text>
                    <Text style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, fontWeight: '700', color: drillData.type === 'withdrawals' ? C.primary : C.success, fontSize: 12, textAlign: 'right' }}>
                      {drillData.type === 'withdrawals' ? '-' : '+'}{fmtETB(r.total_amount)}
                    </Text>
                    <Text style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, color: C.onSurfaceVariant, fontSize: 12 }}>{r.tx_count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        {!drillData && !drillLoading && (
          <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 12 }}>Select a date above to open its full transaction breakdown.</Text>
        )}
      </AdminPanel>

      {/* ═══ Charts ═══ */}
      <View style={[{ gap: 16 }, !isMobile && { flexDirection: 'row' }]}>
        <AdminPanel title="Deposits over time" kicker="Click a point to see depositors" style={{ flex: 1 }}
          right={<Text style={{ fontSize: 14, fontWeight: '700', color: C.success }}>{fmtK(d.totalDeposits || 0)} ETB</Text>}
        >
          <View style={{ height: 200 }}>
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(depositChartData).length > 0 ? (
              <React.Suspense fallback={<ActivityIndicator size="small" color={C.primary} />}>
                <PrimeChart type="line" data={depositChartData} options={chartOpts} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Chart available on web only</Text>
              </View>
            )}
          </View>
        </AdminPanel>

        <AdminPanel title="Withdrawals over time" kicker="Click a point to see payees" style={{ flex: 1 }}
          right={<Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>{fmtK(d.totalWithdrawals || 0)} ETB</Text>}
        >
          <View style={{ height: 200 }}>
            {isMounted && Platform.OS === 'web' && PrimeChart && Object.keys(withdrawalChartData).length > 0 ? (
              <React.Suspense fallback={<ActivityIndicator size="small" color={C.primary} />}>
                <PrimeChart type="line" data={withdrawalChartData} options={chartOpts} style={{ height: '100%' }} />
              </React.Suspense>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Chart available on web only</Text>
              </View>
            )}
          </View>
        </AdminPanel>
      </View>

      {/* ═══ KPI Summary ═══ */}
      <View style={[{ gap: 16 }, !isMobile && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {[
          { label: 'Total platform balance', value: fmtETB(d.totalPlatformAmount || 0), icon: 'wallet-outline' as keyof typeof Ionicons.glyphMap, color: C.primary },
          { label: 'Chapa settlement', value: fmtETB(d.chapaBalance || 0), icon: 'card-outline' as keyof typeof Ionicons.glyphMap, color: C.accentCyan },
          { label: 'Gross gaming revenue', value: fmtETB(d.purePlatformProfit || 0), icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, color: C.success },
          { label: 'Net gaming profit', value: fmtETB(d.netPlatformProfit || 0), icon: 'analytics-outline' as keyof typeof Ionicons.glyphMap, color: (d.netPlatformProfit || 0) >= 0 ? C.success : C.error },
        ].map((kpi, i) => (
          <View key={i} style={[st.kpiMini, { backgroundColor: C.surface, borderColor: C.border, flex: isMobile ? undefined : 1, minWidth: isMobile ? undefined : 200 }]}>
            <View style={[st.kpiMiniIcon, { backgroundColor: C.surfaceContainerLow, borderColor: C.border }]}>
              <Ionicons name={kpi.icon} size={18} color={kpi.color} />
            </View>
            <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 8 }}>{kpi.label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: kpi.color, marginTop: 4 }}>{kpi.value}</Text>
          </View>
        ))}
      </View>

      {/* ═══ Profit Impact Breakdown ═══ */}
      <AdminPanel title="Profit impact breakdown" kicker="Items that reduce your pure platform profit">
        <View style={[{ gap: 12 }, !isMobile && { flexDirection: 'row' }]}>
          {[
            { label: 'Welcome and referral bonuses', value: d.bonusesGiven, count: d.bonusCount, color: C.accentGold },
            { label: 'Leaderboard giveaways', value: d.giveawaysGiven, count: d.giveawayCount, color: '#A78BFA' },
            { label: 'System refunds', value: d.systemRefunds, count: d.systemRefundCount, color: '#FB923C' },
            { label: 'Admin manual refunds', value: d.adminRefunds, count: d.adminRefundCount, color: C.error },
          ].map((item, i) => {
            const pct = (d.purePlatformProfit || 0) > 0 ? ((item.value || 0) / d.purePlatformProfit * 100) : 0;
            return (
              <View key={i} style={[st.impactCard, { flex: 1, borderColor: item.color + '40', backgroundColor: C.surface }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.onSurfaceVariant }}>{item.label}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: item.color, marginTop: 4 }}>-{fmtETB(item.value || 0)}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>{item.count || 0} entries</Text>
                  <Text style={{ fontSize: 10, color: item.color }}>{pct.toFixed(1)}% of profit</Text>
                </View>
                <View style={{ marginTop: 6 }}>
                  <AdminMeter value={Math.min(pct, 100)} tone={item.color === C.error ? 'coral' : item.color === C.accentGold ? 'gold' : 'brand'} />
                </View>
              </View>
            );
          })}
        </View>
      </AdminPanel>

      {/* ═══ Reject Dialog (Modal) ═══ */}
      {rejectId && (
        <Modal transparent animationType="fade" visible={!!rejectId}>
          <View style={st.modalOverlay}>
            <View style={[st.modalCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.onSurface }}>Reject and restore balance</Text>
                  <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4, lineHeight: 17 }}>
                    The cash-out is marked rejected and the reserved funds are automatically restored to the player wallet.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRejectId(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={16} color={C.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={st.inputLabel}>Rejection reason</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={rejectReason}
                    onChange={(e: any) => setRejectReason(e.target.value)}
                    style={{
                      height: 40, width: '100%', borderRadius: 8,
                      border: `1px solid ${C.border}`, backgroundColor: C.surface,
                      padding: '0 12px', fontSize: 12, fontWeight: 600, color: C.onSurface,
                      outline: 'none',
                    } as any}
                  >
                    {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <View>
                    {REJECTION_REASONS.map(r => (
                      <TouchableOpacity key={r} onPress={() => setRejectReason(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                        <Ionicons name={rejectReason === r ? 'radio-button-on' : 'radio-button-off'} size={16} color={rejectReason === r ? C.primary : C.onSurfaceVariant} />
                        <Text style={{ fontSize: 12, color: C.onSurface }}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <AdminButton tone="ghost" onPress={() => setRejectId(null)}>Cancel</AdminButton>
                <AdminButton tone="danger" icon="arrow-undo" onPress={() => { handleReject(rejectId, rejectReason); setRejectId(null); }}>Reject and refund</AdminButton>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  tfSelector: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 10, borderWidth: 1 },
  tfOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  tfText: { fontSize: 11, fontWeight: '700' },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  tabGroup: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  tabBtnText: { fontSize: 11, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  th: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 11, fontWeight: '700' },
  amlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amlInfo: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, color: '#8292A6' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, height: 36, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 12, fontWeight: '600', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  dayCard: { minWidth: 104, borderWidth: 1, borderRadius: 12, padding: 12 },
  drillTable: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  kpiMini: { borderWidth: 1, borderRadius: 12, padding: 16 },
  kpiMiniIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  impactCard: { borderWidth: 1, borderRadius: 12, padding: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, padding: 20 },
});
