// app/(authed)/admin/notifications.tsx — Admin Notification Control Center
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFmt = (d: string) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const TEMPLATES = [
  { label: '🎉 Congratulations!', title: 'Congratulations!', message: 'You did an amazing job! Keep winning on XO Ethiopia.' },
  { label: '💰 Refund Processed', title: 'Refund Processed', message: 'A refund has been credited to your account. Check your balance.' },
  { label: '👋 Welcome Back', title: 'Welcome Back!', message: 'We missed you! Come back and play some games on XO Ethiopia.' },
  { label: '🔔 Account Update', title: 'Account Update', message: 'Your account has been updated. If you did not request this, contact support.' },
  { label: '🎁 Bonus Added', title: 'Bonus Added!', message: 'A bonus has been added to your account. Play a game to use it!' },
  { label: '⚠️ Important Notice', title: 'Important Notice', message: 'Please read this important update about your account.' },
];

export default function AdminNotifications() {
  const { token } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [tab, setTab] = useState<'send' | 'history' | 'refunds'>('send');
  const [loading, setLoading] = useState(false);

  // Send form
  const [targetPhone, setTargetPhone] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('admin_message');
  const [sendResult, setSendResult] = useState<any>(null);
  const [sending, setSending] = useState(false);

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Refund log
  const [refunds, setRefunds] = useState<any[]>([]);

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

  useEffect(() => {
    if (tab === 'history') fetchHistory();
    if (tab === 'refunds') fetchRefunds();
  }, [tab, fetchHistory, fetchRefunds]);

  const handleSend = useCallback(async () => {
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
      } else {
        setSendResult({ ok: false, error: data.error });
      }
    } catch (e: any) {
      setSendResult({ ok: false, error: e.message });
    }
    finally { setSending(false); }
  }, [token, targetPhone, notifTitle, notifMessage, notifType]);

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
            <Text style={s.headerTitle}>Notification Control</Text>
            <Text style={s.headerSub}>ADMIN / NOTIFICATIONS</Text>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {([
          { key: 'send', label: 'Send Message', icon: 'paper-plane' },
          { key: 'history', label: 'History', icon: 'time' },
          { key: 'refunds', label: 'Refund Log', icon: 'refresh-circle' },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={14} color={tab === t.key ? '#0a0f1c' : '#64748b'} />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SEND TAB */}
      {tab === 'send' && (
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
          <TouchableOpacity onPress={handleSend} disabled={sending || !notifTitle.trim() || !notifMessage.trim()} style={[s.sendBtn, (sending || !notifTitle.trim() || !notifMessage.trim()) && { opacity: 0.5 }]}>
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
        </View>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <View style={s.section}>
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
      )}

      {/* REFUND LOG TAB */}
      {tab === 'refunds' && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>REFUND LOG ({refunds.length})</Text>
          {loading && <ActivityIndicator color="#00e5ff" style={{ marginVertical: 20 }} />}
          {!loading && refunds.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#475569', fontSize: 12 }}>No refunds recorded</Text>
            </View>
          )}
          {/* Table header */}
          {!isMobile && refunds.length > 0 && (
            <View style={s.tableHead}>
              <Text style={[s.th, { flex: 1 }]}>DATE</Text>
              <Text style={[s.th, { flex: 1 }]}>USER</Text>
              <Text style={[s.th, { flex: 0.8 }]}>PHONE</Text>
              <Text style={[s.th, { flex: 0.6 }]}>AMOUNT</Text>
              <Text style={[s.th, { flex: 1.2 }]}>REASON</Text>
            </View>
          )}
          {refunds.map((r, i) => {
            const meta = r.meta || {};
            if (isMobile) {
              return (
                <View key={r.id || i} style={s.refundCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '900' }}>ETB {fmt(r.amount)}</Text>
                    <Text style={{ color: '#334155', fontSize: 10 }}>{timeFmt(r.created_at)}</Text>
                  </View>
                  <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>{r.username || 'Unknown'}</Text>
                  <Text style={{ color: '#64748b', fontSize: 10 }}>{r.number || '—'}</Text>
                  <Text style={{ color: '#fbbf24', fontSize: 10, marginTop: 4 }}>{meta.reason || 'Manual refund'}</Text>
                </View>
              );
            }
            return (
              <View key={r.id || i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                <Text style={[s.td, { flex: 1 }]}>{timeFmt(r.created_at)}</Text>
                <Text style={[s.td, { flex: 1, fontWeight: '700' }]}>{r.username || 'Unknown'}</Text>
                <Text style={[s.td, { flex: 0.8, color: '#64748b' }]}>{r.number || '—'}</Text>
                <Text style={[s.td, { flex: 0.6, color: '#34d399', fontWeight: '900' }]}>ETB {fmt(r.amount)}</Text>
                <Text style={[s.td, { flex: 1.2, color: '#fbbf24' }]}>{meta.reason || 'Manual refund'}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1c', padding: 24, paddingTop: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },

  tabBar: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
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

  historyCard: { backgroundColor: 'rgba(15,20,35,0.6)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },

  refundCard: { backgroundColor: 'rgba(15,20,35,0.6)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.08)' },

  tableHead: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  th: { color: '#334155', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  td: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
});
