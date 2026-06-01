// app/(authed)/admin/controls.tsx — Admin Control Center
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, TextInput, Modal, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFmt = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// removed old showConfirm

const TEMPLATES = [
  { label: '🎉 Congratulations!', title: 'Congratulations!', message: 'You did an amazing job! Keep winning on XO Ethiopia.' },
  { label: '💰 Refund Processed', title: 'Refund Processed', message: 'A refund has been credited to your account. Check your balance.' },
  { label: '👋 Welcome Back', title: 'Welcome Back!', message: 'We missed you! Come back and play some games on XO Ethiopia.' },
  { label: '🔔 Account Update', title: 'Account Update', message: 'Your account has been updated. If you did not request this, contact support.' },
  { label: '🎁 Bonus Added', title: 'Bonus Added!', message: 'A bonus has been added to your account. Play a game to use it!' },
  { label: '⚠️ Important Notice', title: 'Important Notice', message: 'Please read this important update about your account.' },
];

export default function AdminControls() {
  const { token, showAlert } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [tab, setTab] = useState<'notifications' | 'ticker' | 'refunds' | 'live_queue'>((params?.activeTab as any) || 'notifications');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params?.activeTab) {
      setTab(params.activeTab as any);
    }
  }, [params?.activeTab]);

  // Live queue stats state
  const [liveStats, setLiveStats] = useState<any>({
    roomStats: {},
    shadowBanned: [],
    activeGamesCount: 0
  });

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({ visible: false, message: '', onConfirm: () => {}, onCancel: () => {} });

  const showConfirmModal = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        visible: true,
        message,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, visible: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, visible: false }));
          resolve(false);
        }
      });
    });
  };

  // Global Settings Toggles State
  const [settings, setSettings] = useState<any>({
    fake_ticker_enabled: false,
    real_ticker_enabled: true,
  });

  // ----------------------------------------------------
  // 1. NOTIFICATIONS STATE
  // ----------------------------------------------------
  const [targetPhone, setTargetPhone] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('admin_message');
  const [sendResult, setSendResult] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // ----------------------------------------------------
  // 3. TICKER STATE
  // ----------------------------------------------------
  const [tickerEntries, setTickerEntries] = useState<any[]>([]);
  const [tickerUsername, setTickerUsername] = useState('');
  const [tickerAmount, setTickerAmount] = useState('');
  const [tickerResult, setTickerResult] = useState<any>(null);

  // ----------------------------------------------------
  // 4. REFUNDS STATE
  // ----------------------------------------------------
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundUser, setRefundUser] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundTarget, setRefundTarget] = useState<'available' | 'withdrawable' | 'both'>('available');
  const [refundResult, setRefundResult] = useState<any>(null);

  // ----------------------------------------------------
  // API ACTIONS
  // ----------------------------------------------------
  
  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSettings({
            fake_ticker_enabled: data.config.fake_ticker_enabled === true,
            real_ticker_enabled: data.config.real_ticker_enabled !== false,
          });
        }
      }
    } catch (e) { console.error('Fetch settings error:', e); }
  }, [token]);

  // Update Toggle Setting
  const updateToggle = async (key: string, val: boolean) => {
    const confirmed = await showConfirmModal(`Toggle ${key.replace(/_/g, ' ')} to ${val ? 'ON' : 'OFF'}?`);
    if (!confirmed) return;
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-platform': 'web',
        },
        body: JSON.stringify({ [key]: val }),
      });
      if (!res.ok) {
        // Revert on failure
        setSettings(settings);
        showAlert('Error', 'Failed to update setting');
      }
    } catch (e) {
      setSettings(settings);
      showAlert('Error', 'Network error updating setting');
    }
  };

  // Fetch Notification History
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications/admin/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.notifications || []);
        setHistoryTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // Send Notification
  const handleSendNotification = useCallback(async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      let url = `${API_URL}/notifications/admin/broadcast`;
      let body: any = { type: notifType, title: notifTitle, message: notifMessage };

      if (targetPhone.trim()) {
        url = `${API_URL}/notifications/admin/send-by-phone`;
        body.phone = targetPhone.trim();
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, sent: data.sent, user: data.user });
        setNotifTitle('');
        setNotifMessage('');
        setTargetPhone('');
        fetchHistory();
      } else {
        setSendResult({ ok: false, error: data.error });
      }
    } catch (e: any) {
      setSendResult({ ok: false, error: e.message });
    }
    finally { setSending(false); }
  }, [token, targetPhone, notifTitle, notifMessage, notifType, fetchHistory]);

  // Leaderboard functions removed (real data only)

  // Fetch Ticker Entries
  const fetchTicker = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/fake-ticker`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setTickerEntries(data.entries || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // Add Ticker Entry
  const handleAddTicker = async () => {
    if (!tickerUsername.trim() || !tickerAmount.trim()) return;
    const confirmed = await showConfirmModal(`Add ticker entry for ${tickerUsername.trim()}?`);
    if (!confirmed) return;
    setTickerResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/fake-ticker`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-platform': 'web',
        },
        body: JSON.stringify({
          username: tickerUsername.trim(),
          amount: Number(tickerAmount) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTickerResult({ ok: true, message: `Added ticker entry for ${tickerUsername}` });
        setTickerUsername('');
        setTickerAmount('');
        fetchTicker();
      } else {
        setTickerResult({ ok: false, error: data.error });
      }
    } catch (e: any) {
      setTickerResult({ ok: false, error: e.message });
    }
  };

  // Delete Ticker Entry
  const handleDeleteTicker = async (id: number) => {
    const confirmed = await showConfirmModal('Delete this ticker entry?');
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_URL}/admin/leaderboard/fake-ticker/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        fetchTicker();
      } else {
        showAlert('Error', 'Failed to delete ticker entry');
      }
    } catch (e) {
      showAlert('Error', 'Network error deleting ticker entry');
    }
  };

  // Fetch Refunds
  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications/admin/refund-log`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.refunds || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // Issue Manual Refund
  const handleIssueRefund = async () => {
    if (!refundUser.trim() || !refundAmount.trim()) return;
    const confirmed = await showConfirmModal(`Issue refund of ${refundAmount} ETB to ${refundUser.trim()}?`);
    if (!confirmed) return;
    setRefundResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-platform': 'web',
        },
        body: JSON.stringify({
          phoneOrUsername: refundUser.trim(),
          amount: Number(refundAmount),
          reason: refundReason.trim(),
          target: refundTarget,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefundResult({ ok: true, message: data.message });
        setRefundUser('');
        setRefundAmount('');
        setRefundReason('');
        setRefundTarget('available');
        fetchRefunds();
      } else {
        setRefundResult({ ok: false, error: data.error });
      }
    } catch (e: any) {
      setRefundResult({ ok: false, error: e.message });
    }
  };

  // Fetch Live Queue Stats
  const fetchLiveStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/live-queue-stats`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setLiveStats(data);
      }
    } catch (e) {
      console.error('Fetch live queue stats error:', e);
    }
  }, [token]);

  useEffect(() => {
    if (tab === 'live_queue') {
      fetchLiveStats();
      const interval = setInterval(fetchLiveStats, 2000);
      return () => clearInterval(interval);
    }
  }, [tab, fetchLiveStats]);

  const combinedBreakdown = React.useMemo(() => {
    const flat: Record<number, { searching: number; liveMatches: number }> = {};
    [1, 2, 3].forEach(roomNum => {
      const breakdown = liveStats.roomStats?.[roomNum]?.betBreakdown || {};
      Object.entries(breakdown).forEach(([bet, item]: [string, any]) => {
        const betNum = Number(bet);
        if (!flat[betNum]) {
          flat[betNum] = { searching: 0, liveMatches: 0 };
        }
        flat[betNum].searching += item.searching || 0;
        flat[betNum].liveMatches += item.liveMatches || 0;
      });
    });
    return flat;
  }, [liveStats]);

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


  const renderBetBreakdown = (breakdown: any, betsToShow: number[]) => {
    return (
      <View style={{ gap: 8 }}>
        {betsToShow.map(bet => {
          const item = breakdown[bet] || { searching: 0, liveMatches: 0 };
          return (
            <View key={bet} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
              <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '700' }}>{bet} ETB</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '600' }}>
                  {item.searching || 0} searching
                </Text>
                <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '600' }}>
                  {item.liveMatches || 0} live games
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Initial Data Loading
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (tab === 'notifications') fetchHistory();
    if (tab === 'ticker') fetchTicker();
    if (tab === 'refunds') fetchRefunds();
  }, [tab, fetchHistory, fetchTicker, fetchRefunds]);

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setNotifTitle(t.title);
    setNotifMessage(t.message);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={[s.headerBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backCircle}>
            <Ionicons name="arrow-back" size={18} color="#00e5ff" />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>System Control Center</Text>
            <Text style={s.headerSub}>ADMIN / CONTROLLER PANEL</Text>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {([
          { key: 'notifications', label: 'Notifications', icon: 'notifications' },
          { key: 'ticker', label: 'Ticker Feed', icon: 'list' },
          { key: 'refunds', label: 'Refund System', icon: 'refresh' },
          { key: 'live_queue', label: 'Live Queue', icon: 'pulse' },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive, isMobile && { paddingHorizontal: 8 }]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={14} color={tab === t.key ? '#0a0f1c' : '#64748b'} />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* NOTIFICATIONS TAB */}
      {tab === 'notifications' && (
        <View style={s.section}>
          {/* Templates */}
          <Text style={s.sectionLabel}>QUICK TEMPLATES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {TEMPLATES.map((t, i) => (
              <TouchableOpacity key={i} onPress={() => applyTemplate(t)} style={s.templateBtn}>
                <Text style={s.templateText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target */}
          <Text style={s.fieldLabel}>TARGET PHONE (leave empty for broadcast to ALL)</Text>
          <View style={s.inputRow}>
            <Ionicons name="call-outline" size={16} color="#475569" />
            <TextInput
              value={targetPhone}
              onChangeText={setTargetPhone}
              placeholder="e.g. 0939484533 (leave empty for broadcast)"
              style={s.input}
              placeholderTextColor="#334155"
              inputMode="tel"
            />
          </View>

          {/* Type selector */}
          <Text style={s.fieldLabel}>NOTIFICATION TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {['admin_message', 'broadcast', 'refund', 'system'].map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setNotifType(t)}
                style={[s.typeBtn, notifType === t && { backgroundColor: '#00e5ff', borderColor: '#00e5ff' }]}
              >
                <Text style={[s.typeBtnText, notifType === t && { color: '#0a0f1c' }]}>{t.toUpperCase().replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={s.fieldLabel}>TITLE</Text>
          <View style={s.inputRow}>
            <Ionicons name="text" size={16} color="#475569" />
            <TextInput value={notifTitle} onChangeText={setNotifTitle} placeholder="Notification title" style={s.input} placeholderTextColor="#334155" />
          </View>

          {/* Message */}
          <Text style={s.fieldLabel}>MESSAGE</Text>
          <View style={[s.inputRow, { minHeight: 80, alignItems: 'flex-start', paddingVertical: 12 }]}>
            <Ionicons name="chatbubble-outline" size={16} color="#475569" style={{ marginTop: 2 }} />
            <TextInput
              value={notifMessage}
              onChangeText={setNotifMessage}
              placeholder="Write your notification message..."
              style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholderTextColor="#334155"
              multiline
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity onPress={handleSendNotification} disabled={sending || !notifTitle.trim() || !notifMessage.trim()} style={[s.sendBtn, (sending || !notifTitle.trim() || !notifMessage.trim()) && { opacity: 0.5 }]}>
            {sending ? <ActivityIndicator color="#0a0f1c" size="small" /> : <Ionicons name="paper-plane" size={16} color="#0a0f1c" />}
            <Text style={s.sendBtnText}>{sending ? 'Sending...' : targetPhone.trim() ? 'Send to User' : 'Broadcast to ALL Users'}</Text>
          </TouchableOpacity>

          {/* Result */}
          {sendResult && (
            <View style={[s.resultBox, { borderColor: sendResult.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)', backgroundColor: sendResult.ok ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)' }]}>
              <Ionicons name={sendResult.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={sendResult.ok ? '#34d399' : '#f87171'} />
              <Text style={{ color: sendResult.ok ? '#34d399' : '#f87171', fontSize: 12, fontWeight: '700', flex: 1 }}>
                {sendResult.ok
                  ? `✅ Sent to ${sendResult.sent} user(s)${sendResult.user ? ` — ${sendResult.user.username || sendResult.user.number}` : ''}`
                  : `❌ ${sendResult.error}`}
              </Text>
            </View>
          )}

          {/* History */}
          <View style={{ marginTop: 30 }}>
            <Text style={s.sectionLabel}>NOTIFICATION HISTORY ({historyTotal})</Text>
            {loading && <ActivityIndicator color="#00e5ff" style={{ marginVertical: 20 }} />}
            {!loading && history.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#475569', fontSize: 12 }}>No notifications sent yet</Text>
              </View>
            )}
            {history.map((n, i) => (
              <View key={n.id || i} style={s.historyCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={[s.typePill, { borderColor: n.type === 'broadcast' ? '#a78bfa40' : '#00e5ff40' }]}>
                    <Text style={{ color: n.type === 'broadcast' ? '#a78bfa' : '#00e5ff', fontSize: 9, fontWeight: '800' }}>{(n.type || 'system').toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: '#334155', fontSize: 10, fontWeight: '600' }}>{timeFmt(n.created_at)}</Text>
                </View>
                <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '800', marginBottom: 2 }}>{n.title}</Text>
                <Text style={{ color: '#64748b', fontSize: 11, lineHeight: 16 }}>{n.message}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: '#334155', fontSize: 10 }}>To: {n.username || n.number || 'Unknown'}</Text>
                  <Text style={{ color: n.read ? '#34d399' : '#f59e0b', fontSize: 10, fontWeight: '700' }}>{n.read ? 'READ' : 'UNREAD'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}



      {/* TICKER FEED TAB */}
      {tab === 'ticker' && (
        <View style={s.section}>
          {/* Controls */}
          <View style={s.controlCard}>
            <Text style={s.controlCardTitle}>Scrolling Ticker Controls</Text>
            
            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchLabel}>Show Real Winners</Text>
                <Text style={s.switchDesc}>Stream actual real game completion wins</Text>
              </View>
              <Switch
                value={settings.real_ticker_enabled}
                onValueChange={(val) => updateToggle('real_ticker_enabled', val)}
                trackColor={{ false: '#1e293b', true: '#00e5ff' }}
                thumbColor={settings.real_ticker_enabled ? '#0a0f1c' : '#94a3b8'}
              />
            </View>

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchLabel}>Show Fake Ticker Data</Text>
                <Text style={s.switchDesc}>Display randomized simulated winner entries</Text>
              </View>
              <Switch
                value={settings.fake_ticker_enabled}
                onValueChange={(val) => updateToggle('fake_ticker_enabled', val)}
                trackColor={{ false: '#1e293b', true: '#00e5ff' }}
                thumbColor={settings.fake_ticker_enabled ? '#0a0f1c' : '#94a3b8'}
              />
            </View>
          </View>

          {/* Add Ticker Form */}
          <View style={[s.section, { marginTop: 24 }]}>
            <Text style={s.sectionLabel}>ADD SIMULATED TICKER ENTRY</Text>
            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 14 }}>
              <View style={[s.inputRow, { flex: 1, marginBottom: 0 }]}>
                <Ionicons name="person-outline" size={16} color="#475569" />
                <TextInput
                  value={tickerUsername}
                  onChangeText={tickerUsername => setTickerUsername(tickerUsername)}
                  placeholder="Username (e.g. Dawit_X)"
                  style={s.input}
                  placeholderTextColor="#334155"
                />
              </View>
              <View style={[s.inputRow, { flex: 0.8, marginBottom: 0 }]}>
                <Ionicons name="logo-bitcoin" size={16} color="#475569" />
                <TextInput
                  value={tickerAmount}
                  onChangeText={tickerAmount => setTickerAmount(tickerAmount)}
                  placeholder="Amount in ETB (e.g. 50)"
                  style={s.input}
                  placeholderTextColor="#334155"
                  inputMode="numeric"
                />
              </View>
              <TouchableOpacity onPress={handleAddTicker} style={s.addTickerBtn}>
                <Text style={s.addTickerBtnText}>Add Entry</Text>
              </TouchableOpacity>
            </View>

            {tickerResult && (
              <View style={[s.resultBox, { borderColor: tickerResult.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)', backgroundColor: tickerResult.ok ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', marginBottom: 14 }]}>
                <Ionicons name={tickerResult.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={tickerResult.ok ? '#34d399' : '#f87171'} />
                <Text style={{ color: tickerResult.ok ? '#34d399' : '#f87171', fontSize: 12, fontWeight: '700' }}>
                  {tickerResult.ok ? tickerResult.message : tickerResult.error}
                </Text>
              </View>
            )}
          </View>

          {/* Ticker Entries Pool */}
          <Text style={s.sectionLabel}>TICKER ENTRIES POOL ({tickerEntries.length})</Text>
          {loading && <ActivityIndicator color="#00e5ff" style={{ marginVertical: 20 }} />}
          {!loading && tickerEntries.length === 0 && (
            <View style={s.emptyState}>
              <Text style={{ color: '#475569', fontSize: 12 }}>No ticker entries found</Text>
            </View>
          )}

          <View style={s.tickerGrid}>
            {tickerEntries.map((t, i) => (
              <View key={t.id || i} style={s.tickerCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t.username}</Text>
                  <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '800', marginTop: 2 }}>{t.amount} ETB</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteTicker(t.id)} style={s.deleteActionBtn}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* REFUNDS TAB */}
      {tab === 'refunds' && (
        <View style={s.section}>
          {/* Issue Refund Form */}
          <View style={s.controlCard}>
            <Text style={s.controlCardTitle}>Issue Manual Refund</Text>
            <Text style={s.switchDesc}>Credits the specified user's wallet immediately and logs the audit trial.</Text>

            <Text style={s.fieldLabel}>USER (PHONE, USERNAME OR USER ID)</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={16} color="#475569" />
              <TextInput
                value={refundUser}
                onChangeText={setRefundUser}
                placeholder="e.g. 0939484533 or Almaz_Winner"
                style={s.input}
                placeholderTextColor="#334155"
              />
            </View>

            <Text style={s.fieldLabel}>REFUND AMOUNT (IN ETB)</Text>
            <View style={s.inputRow}>
              <Ionicons name="wallet-outline" size={16} color="#475569" />
              <TextInput
                value={refundAmount}
                onChangeText={setRefundAmount}
                placeholder="e.g. 50"
                style={s.input}
                placeholderTextColor="#334155"
                inputMode="numeric"
              />
            </View>

            <Text style={s.fieldLabel}>REFUND TARGET BALANCE</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {([
                { key: 'available', label: 'Available Only' },
                { key: 'withdrawable', label: 'Withdrawable Only' },
                { key: 'both', label: 'Both Balances' }
              ] as const).map(option => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setRefundTarget(option.key)}
                  style={[s.targetBtn, refundTarget === option.key && s.targetBtnActive]}
                >
                  <Text style={[s.targetBtnText, refundTarget === option.key && s.targetBtnTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>REASON / NOTIFICATION MESSAGE</Text>
            <View style={s.inputRow}>
              <Ionicons name="document-text-outline" size={16} color="#475569" />
              <TextInput
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder="e.g. A refund of 50 ETB has been credited to your account."
                style={s.input}
                placeholderTextColor="#334155"
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                'System anomaly refund',
                'Manual deposit correction',
                'Game dispute resolution',
                'Platform bonus'
              ].map((tmpl, i) => (
                <TouchableOpacity key={i} onPress={() => setRefundReason(tmpl)} style={s.templateBtn}>
                  <Text style={s.templateText}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleIssueRefund} style={s.refundSubmitBtn}>
              <Ionicons name="refresh" size={16} color="#0a0f1c" />
              <Text style={s.refundSubmitBtnText}>Submit Refund Transaction</Text>
            </TouchableOpacity>

            {refundResult && (
              <View style={[s.resultBox, { borderColor: refundResult.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)', backgroundColor: refundResult.ok ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', marginTop: 14 }]}>
                <Ionicons name={refundResult.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={refundResult.ok ? '#34d399' : '#f87171'} />
                <Text style={{ color: refundResult.ok ? '#34d399' : '#f87171', fontSize: 12, fontWeight: '700', flex: 1 }}>
                  {refundResult.ok ? refundResult.message : refundResult.error}
                </Text>
              </View>
            )}
          </View>

          {/* Refund Logs */}
          <View style={{ marginTop: 24 }}>
            <Text style={s.sectionLabel}>REFUND TRANSACTION LOG ({refunds.length})</Text>
            {loading && <ActivityIndicator color="#00e5ff" style={{ marginVertical: 20 }} />}
            {!loading && refunds.length === 0 && (
              <View style={s.emptyState}>
                <Text style={{ color: '#475569', fontSize: 12 }}>No refunds recorded</Text>
              </View>
            )}

            {refunds.map((r, i) => {
              const meta = r.meta || {};
              const targetBalance = meta.targetBalance || 'available';
              const targetLabels: Record<string, string> = {
                available: 'Available Only',
                withdrawable: 'Withdrawable Only',
                both: 'Both Balances'
              };
              return (
                <View key={r.id || i} style={s.historyCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '900' }}>+{r.amount / 100} ETB</Text>
                    <Text style={{ color: '#475569', fontSize: 10 }}>{timeFmt(r.created_at)}</Text>
                  </View>
                  <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '700' }}>{r.username || 'Unknown'}</Text>
                  <Text style={{ color: '#64748b', fontSize: 11 }}>Phone: {r.number || '—'}</Text>
                  <Text style={{ color: '#fbbf24', fontSize: 11, marginTop: 4 }}>Reason: {meta.reason || 'Manual refund'}</Text>
                  <View style={[s.targetPill, { marginTop: 6, borderColor: targetBalance === 'both' ? '#a78bfa40' : targetBalance === 'withdrawable' ? '#38bdf840' : '#00e5ff40' }]}>
                    <Text style={{ color: targetBalance === 'both' ? '#a78bfa' : targetBalance === 'withdrawable' ? '#38bdf8' : '#00e5ff', fontSize: 9, fontWeight: '800' }}>
                      TARGET: {targetLabels[targetBalance]?.toUpperCase() || 'AVAILABLE ONLY'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* LIVE QUEUE TAB */}
      {tab === 'live_queue' && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>LIVE QUEUES & ACTIVE MATCHES</Text>
          
          <View style={{ gap: 16 }}>
            {/* Room 1 */}
            {(() => {
              const r1Totals = getRoomTotals([10, 25, 50, 100]);
              return (
                <View style={s.controlCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={s.controlCardTitle}>Room 1 - Beginner (10-100 ETB)</Text>
                    <View style={[s.typePill, { borderColor: '#00e5ff40', backgroundColor: 'rgba(0,229,255,0.05)' }]}>
                      <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '800' }}>
                        {r1Totals.searching} live searchers
                      </Text>
                    </View>
                  </View>
                  {renderBetBreakdown(combinedBreakdown, [10, 25, 50, 100])}
                </View>
              );
            })()}

            {/* Room 2 */}
            {(() => {
              const r2Totals = getRoomTotals([100, 250, 500, 1000]);
              return (
                <View style={s.controlCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={s.controlCardTitle}>Room 2 - Intermediate (100-1000 ETB)</Text>
                    <View style={[s.typePill, { borderColor: '#00e5ff40', backgroundColor: 'rgba(0,229,255,0.05)' }]}>
                      <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '800' }}>
                        {r2Totals.searching} live searchers
                      </Text>
                    </View>
                  </View>
                  {renderBetBreakdown(combinedBreakdown, [100, 250, 500, 1000])}
                </View>
              );
            })()}

            {/* Room 3 */}
            {(() => {
              const r3Totals = getRoomTotals([1000, 2500, 5000, 10000]);
              return (
                <View style={s.controlCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={s.controlCardTitle}>Room 3 - Advanced (1000-10000 ETB)</Text>
                    <View style={[s.typePill, { borderColor: '#00e5ff40', backgroundColor: 'rgba(0,229,255,0.05)' }]}>
                      <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '800' }}>
                        {r3Totals.searching} live searchers
                      </Text>
                    </View>
                  </View>
                  {renderBetBreakdown(combinedBreakdown, [1000, 2500, 5000, 10000])}
                </View>
              );
            })()}
          </View>

          {/* Shadow Banned Cooldowns */}
          <View style={{ marginTop: 24 }}>
            <Text style={s.sectionLabel}>SHADOW BANNED COOLDOWNS (3-MIN BAN ON 3 STREAK WINS)</Text>
            {(!liveStats.shadowBanned || liveStats.shadowBanned.length === 0) ? (
              <View style={s.emptyState}>
                <Text style={{ color: '#475569', fontSize: 12 }}>No users currently shadow banned</Text>
              </View>
            ) : (
              liveStats.shadowBanned.map((sb: any, i: number) => (
                <View key={sb.userId + i} style={s.historyCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '900' }}>
                      {sb.username || sb.number || 'Unknown User'}
                    </Text>
                    <View style={[s.typePill, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }]}>
                      <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '800' }}>
                        {Math.floor(sb.expiresIn / 60)}m {sb.expiresIn % 60}s LEFT
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#64748b', fontSize: 11 }}>Range: {sb.rangeKey} ETB</Text>
                  <Text style={{ color: '#334155', fontSize: 9, marginTop: 4 }}>ID: {sb.userId}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}


      {/* Confirm Modal */}
      <Modal transparent visible={confirmState.visible} animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Ionicons name="warning" size={40} color="#00daf3" style={{ marginBottom: 12 }} />
            <Text style={s.modalTitle}>Confirm Action</Text>
            <Text style={s.modalMessage}>{confirmState.message}</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={confirmState.onCancel}>
                <Text style={s.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={confirmState.onConfirm}>
                <Text style={s.modalConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 24, paddingTop: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },

  tabBar: { flexDirection: 'row', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 4 },
  tabActive: { backgroundColor: '#00e5ff', borderColor: '#00e5ff' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  tabTextActive: { color: '#0a0f1c' },

  section: {},
  sectionLabel: { color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },

  fieldLabel: { color: 'rgba(0,229,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  inputRow: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, color: '#fff', padding: 12, fontSize: 14 },

  templateBtn: { backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  templateText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

  typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  typeBtnText: { color: '#64748b', fontSize: 10, fontWeight: '800' },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00e5ff', paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  sendBtnText: { color: '#0a0f1c', fontSize: 14, fontWeight: '900' },

  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },

  historyCard: { backgroundColor: 'rgba(24, 24, 27, 0.65)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(39,39,42,0.4)' },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },

  emptyState: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(24, 24, 27, 0.3)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(39,39,42,0.2)' },

  // Control Center Style
  controlCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 18, borderColor: 'rgba(39,39,42,0.4)', borderWidth: 1 },
  controlCardTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  switchLabel: { color: '#f3f4f6', fontSize: 13, fontWeight: '700' },
  switchDesc: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  systemRuleText: { color: '#fbbf24', fontSize: 11, lineHeight: 16, marginTop: 14, backgroundColor: 'rgba(251,191,36,0.04)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.1)' },

  addBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00e5ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#0a0f1c', fontSize: 11, fontWeight: '800' },

  fakeUserCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(24, 24, 27, 0.65)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(39,39,42,0.4)' },
  fakeUserRank: { color: '#64748b', fontSize: 12, fontWeight: '800', marginRight: 4 },
  fakeUsername: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fakeUserStats: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  inactiveBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  inactiveBadgeText: { color: '#ef4444', fontSize: 8, fontWeight: '800' },

  editActionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  deleteActionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },

  // Ticker Style
  addTickerBtn: { backgroundColor: '#00e5ff', paddingHorizontal: 18, justifyContent: 'center', borderRadius: 12 },
  addTickerBtnText: { color: '#0a0f1c', fontSize: 13, fontWeight: '900' },
  tickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tickerCard: { width: Platform.OS === 'web' ? '23%' : '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(24, 24, 27, 0.65)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(39,39,42,0.4)' },

  // Refund Style
  refundSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00e5ff', paddingVertical: 12, borderRadius: 12, marginTop: 14 },
  refundSubmitBtnText: { color: '#0a0f1c', fontSize: 13, fontWeight: '800' },

  // Back to game header button Style
  backToGameBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00e5ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backToGameBtnText: { color: '#0a0f1c', fontSize: 12, fontWeight: '800' },

  // Refund Target Selector Style
  targetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  targetBtnActive: { backgroundColor: '#00e5ff', borderColor: '#00e5ff' },
  targetBtnText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  targetBtnTextActive: { color: '#0a0f1c' },
  targetPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },

  // Modal Style
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#18181b', borderRadius: 16, width: '100%', maxWidth: 450, borderWidth: 1, borderColor: 'rgba(39,39,42,0.4)', padding: 24, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalBody: { padding: 16 },
  modalMessage: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalCancelBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  modalConfirmBtn: { flex: 1, backgroundColor: '#00e5ff', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalConfirmBtnText: { color: '#0a0f1c', fontSize: 13, fontWeight: '800' },
  modalSubmitBtn: { backgroundColor: '#00e5ff', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#0a0f1c', fontSize: 13, fontWeight: '800' },
});
