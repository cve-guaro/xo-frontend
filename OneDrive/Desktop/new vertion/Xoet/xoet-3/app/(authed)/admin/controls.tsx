// app/(authed)/admin/controls.tsx — Admin Control Center
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, TextInput, Modal, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

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

  const [tab, setTab] = useState<'notifications' | 'ticker' | 'refunds'>((params?.activeTab as any) || 'notifications');
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

  // Live queue stats and breakdowns removed (moved to xo-controls.tsx)

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
        
        <TouchableOpacity
          onPress={() => router.replace('/(authed)/home/gameplay' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#00e5ff',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            alignSelf: isMobile ? 'flex-start' : 'center',
          }}
        >
          <Ionicons name="home" size={16} color="#0a0f1c" />
          <Text style={{ color: '#0a0f1c', fontSize: 13, fontWeight: '800', fontFamily: 'Inter' }}>
            Back to Home Page
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {([
          { key: 'notifications', label: 'Notifications', icon: 'notifications' },
          { key: 'ticker', label: 'Ticker Feed', icon: 'list' },
          { key: 'refunds', label: 'Refund System', icon: 'refresh' },
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
          <View style={[s.controlCard, { alignItems: 'center', padding: 32, gap: 16 }]}>
            <Ionicons name="trophy-outline" size={48} color="#00e5ff" />
            <Text style={s.controlCardTitle}>Fake Winner Ticker Consolidation</Text>
            <Text style={[s.switchDesc, { textAlign: 'center', maxWidth: 400 }]}>
              Simulated winner entries and announcements configuration has been consolidated into the Leaderboard Hub.
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/admin/leaderboard' as any)} 
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: '#00e5ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10
              }}
            >
              <Text style={{ color: '#0a0f1c', fontWeight: '900', fontSize: 13 }}>Go to Leaderboard Hub</Text>
              <Ionicons name="arrow-forward" size={14} color="#0a0f1c" />
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: 'transparent', padding: 24, paddingTop: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.lightPrimary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5, fontFamily: 'Inter' },
  headerSub: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 2, fontFamily: 'Inter' },

  tabBar: { flexDirection: 'row', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, marginBottom: 4 },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },
  tabTextActive: { color: '#ffffff', fontFamily: 'Inter' },

  section: {},
  sectionLabel: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase', fontFamily: 'Inter' },

  fieldLabel: { color: C.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6, fontFamily: 'Inter' },
  inputRow: { backgroundColor: C.surfaceContainerLowest, borderRadius: 14, borderWidth: 1, borderColor: C.outlineVariant, marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, color: '#fff', padding: 12, fontSize: 14, fontFamily: 'Inter' },

  templateBtn: { backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant },
  templateText: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600', fontFamily: 'Inter' },

  typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant },
  typeBtnText: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700', fontFamily: 'Inter' },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primaryContainer, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  sendBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700', fontFamily: 'Inter' },

  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },

  historyCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.outlineVariant, ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.04)' } as any : {}) },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },

  emptyState: { padding: 40, alignItems: 'center', backgroundColor: C.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: C.outlineVariant },

  // Control Center Style
  controlCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24, borderColor: C.outlineVariant, borderWidth: 1, ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.08)' } as any : {}) },
  controlCardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, fontFamily: 'Inter' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  switchLabel: { color: '#ffffff', fontSize: 14, fontWeight: '700', fontFamily: 'Inter' },
  switchDesc: { color: C.onSurfaceVariant, fontSize: 11, marginTop: 2, fontFamily: 'Inter' },
  systemRuleText: { color: '#fbbf24', fontSize: 12, lineHeight: 18, marginTop: 14, backgroundColor: 'rgba(251,191,36,0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)' },

  addBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700', fontFamily: 'Inter' },

  fakeUserCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.outlineVariant, ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.04)' } as any : {}) },
  fakeUserRank: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700', marginRight: 4, fontFamily: 'Inter' },
  fakeUsername: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
  fakeUserStats: { color: C.onSurfaceVariant, fontSize: 11, marginTop: 2, fontFamily: 'Inter' },
  inactiveBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(245,57,57,0.1)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(245,57,57,0.2)' },
  inactiveBadgeText: { color: C.error, fontSize: 8, fontWeight: '700', fontFamily: 'Inter' },

  editActionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.lightPrimary, alignItems: 'center', justifyContent: 'center' },
  deleteActionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(245,57,57,0.08)', alignItems: 'center', justifyContent: 'center' },

  // Ticker Style
  addTickerBtn: { backgroundColor: C.primary, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 12 },
  addTickerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
  tickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tickerCard: { width: Platform.OS === 'web' ? '23%' : '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.outlineVariant, ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.04)' } as any : {}) },

  // Refund Style
  refundSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primaryContainer, paddingVertical: 12, borderRadius: 14, marginTop: 14 },
  refundSubmitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },

  // Back to game header button Style
  backToGameBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  backToGameBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },

  // Refund Target Selector Style
  targetBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, alignItems: 'center' },
  targetBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  targetBtnText: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '700', fontFamily: 'Inter' },
  targetBtnTextActive: { color: '#ffffff', fontFamily: 'Inter' },
  targetPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },

  // Modal Style
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11,20,55,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: C.surface, borderRadius: 24, width: '100%', maxWidth: 450, borderWidth: 1, borderColor: C.outlineVariant, padding: 24, alignItems: 'center', ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.08)' } as any : {}) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter' },
  modalBody: { padding: 16 },
  modalMessage: { color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: 20, fontFamily: 'Inter' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: C.surfaceContainerLowest, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.outlineVariant },
  modalCancelBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
  modalConfirmBtn: { flex: 1, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalConfirmBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
  modalSubmitBtn: { backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
});

const spinS = StyleSheet.create({
  statCard: {
    width: Platform.OS === 'web' ? '31%' : '47%',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...(Platform.OS === 'web' ? { boxShadow: '14px 17px 40px 4px rgba(112, 144, 176, 0.04)' } as any : {}),
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  statLabel: {
    color: C.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  pageBtnText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
