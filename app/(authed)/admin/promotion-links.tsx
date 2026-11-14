// app/(authed)/admin/promotion-links.tsx — Promotions + Notifications
// Redesigned to match reference PromotionsPanel + NotificationsPanel layout.
// Uses real backend APIs for promotion links, promo popups, and bulk SMS.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import {
  AdminPanel, AdminPill, AdminButton, AdminMeter, AdminPager,
} from '../../../components/admin/ui';

/* ── helpers ─────────────────────────────────────────── */
const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtETB = (n: number) => `ETB ${fmtInt(n)}`;
const fmtDay = (iso: string) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const timeSince = (iso?: string) => {
  if (!iso) return '--';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

/* ── types ───────────────────────────────────────────── */
interface PromotionLink {
  id: string;
  code: string;
  name: string;
  bonus_amount: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  total_claims: number;
  total_registrations: number;
}

interface SmsHistoryItem {
  id: string;
  message: string;
  target_count: number;
  sent_count: number;
  status: string;
  created_at: string;
  admin_name?: string;
}

/* ── audiences ──────────────────────────────────────── */
const AUDIENCES: { key: string; label: string }[] = [
  { key: 'all', label: 'All players' },
  { key: 'active7', label: 'Active last 7 days' },
  { key: 'depositors', label: 'Funded wallets' },
  { key: 'dormant', label: 'Dormant / losing streak' },
];

const BALANCE_RANGES: { key: string; label: string }[] = [
  { key: 'all', label: 'Any balance' },
  { key: '0-100', label: '0 - 100 ETB' },
  { key: '100-1000', label: '100 - 1,000 ETB' },
  { key: '1000-10000', label: '1,000 - 10,000 ETB' },
  { key: '10000-100000', label: '10,000+ ETB' },
];

/* ════════════════════════════════════════════════════════════════════ */
export default function PromotionLinks() {
  const { theme: C } = useAdminTheme();
  const { token, isSuperAdmin, showAlert } = useAuth();
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' }),
    [token],
  );

  /* ── tab state ─────────────────────────────────────── */
  type Tab = 'promos' | 'notifications';
  const [tab, setTab] = useState<Tab>('promos');

  /* ══════════ PROMO STATE ═══════════ */
  const [links, setLinks] = useState<PromotionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [gift, setGift] = useState('100');
  const [cap, setCap] = useState('1000');
  const [days, setDays] = useState('14');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/promotion-links`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : (data.links || []));
      }
    } catch (e) { console.error('[admin/promotion]', e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const createPromo = async () => {
    if (!code.trim()) { setError('Code is required'); return; }
    try {
      const res = await fetch(`${API_URL}/admin/promotion-links`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: code,
          bonus_amount: Number(gift),
          code: code.trim().toUpperCase(),
          expires_at: days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null,
        }),
      });
      if (res.ok) {
        setCode(''); setError(null);
        fetchLinks();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to create');
      }
    } catch { setError('Network error'); }
  };

  const togglePromo = async (link: PromotionLink) => {
    try {
      await fetch(`${API_URL}/admin/promotion-links/${link.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: !link.is_active }),
      });
      fetchLinks();
    } catch (e) { console.error('[admin/promo/toggle]', e); }
  };

  const now = Date.now();
  const live = links.filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at).getTime() > now));
  const totalClaims = links.reduce((s, p) => s + (p.total_claims || 0), 0);
  const paged = links.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(links.length / PER_PAGE));

  /* ══════════ NOTIFICATION / SMS STATE ═══════════ */
  const [channel, setChannel] = useState<'sms'>('sms');
  const [audience, setAudience] = useState('all');
  const [balanceRange, setBalanceRange] = useState('all');
  const [smsBody, setSmsBody] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsHistory, setSmsHistory] = useState<SmsHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmSms, setConfirmSms] = useState(false);

  const isUnicode = /[^\x00-\x7F]/.test(smsBody);
  const segments = smsBody ? Math.max(1, Math.ceil(smsBody.length / (isUnicode ? 70 : 160))) : 0;
  const recipients = previewCount ?? 0;
  const estCost = Math.round(recipients * segments * 0.35);

  const fetchPreviewCount = useCallback(async () => {
    try {
      setPreviewLoading(true);
      const payload: any = {};
      if (audience !== 'all') payload.role = audience;
      if (balanceRange !== 'all') {
        const [min, max] = balanceRange.split('-');
        if (min) payload.min_balance = Number(min);
        if (max) payload.max_balance = Number(max);
      }
      const res = await fetch(`${API_URL}/admin/bulk-sms/preview`, {
        method: 'POST', headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewCount(data.count || 0);
      }
    } catch (e) { console.error('[sms/preview]', e); }
    finally { setPreviewLoading(false); }
  }, [token, audience, balanceRange]);

  const fetchSmsHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_URL}/admin/bulk-sms/history`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setSmsHistory(data.history || []);
      }
    } catch (e) { console.error('[sms/history]', e); }
    finally { setHistoryLoading(false); }
  }, [token]);

  useEffect(() => {
    if (tab === 'notifications') {
      fetchPreviewCount();
      fetchSmsHistory();
    }
  }, [tab, fetchPreviewCount, fetchSmsHistory]);

  const sendBulkSms = async () => {
    if (!smsBody.trim()) { showAlert('Validation', 'Message cannot be empty'); setConfirmSms(false); return; }
    try {
      setSmsSending(true);
      const payload: any = { message: smsBody };
      if (audience !== 'all') payload.role = audience;
      if (balanceRange !== 'all') {
        const [min, max] = balanceRange.split('-');
        if (min) payload.min_balance = Number(min);
        if (max) payload.max_balance = Number(max);
      }
      const res = await fetch(`${API_URL}/admin/bulk-sms`, {
        method: 'POST', headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Success', `Queued ${data.queuedCount || 0} messages`);
        setSmsBody('');
        setConfirmSms(false);
        fetchSmsHistory();
      } else {
        showAlert('Error', data.error || 'Failed');
        setConfirmSms(false);
      }
    } catch { showAlert('Error', 'Network error'); setConfirmSms(false); }
    finally { setSmsSending(false); }
  };

  /* ── styles ────────────────────────────────────────── */
  const sLabel: any = { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 6 };
  const sInput: any = { height: 36, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.surface, paddingHorizontal: 12, fontSize: 12, color: C.onSurface, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) };

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Tab bar ── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, gap: 8 }}>
        {(['promos', 'notifications'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
              backgroundColor: tab === t ? C.primary : C.surfaceContainerLow,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t ? '#fff' : C.onSurfaceVariant }}>
              {t === 'promos' ? 'Promo codes' : 'Notifications'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        {tab === 'promos' ? (
          /* ═══ PROMOTIONS TAB ═══ */
          <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : { gap: 16 }}>
            {/* ── Left column: create promo ── */}
            <View style={Platform.OS === 'web' ? { width: 340, gap: 16 } : { gap: 16 }}>
              <AdminPanel title="Create promo code" kicker="Gift amount, usage cap, and expiry">
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={sLabel}>Code</Text>
                    <TextInput
                      value={code}
                      onChangeText={t => setCode(t.toUpperCase())}
                      placeholder="e.g. TIMKET200"
                      placeholderTextColor={C.onSurfaceVariant}
                      maxLength={16}
                      autoCapitalize="characters"
                      style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }]}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={sLabel}>Gift ETB</Text>
                      <TextInput
                        value={gift}
                        onChangeText={t => setGift(t.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sLabel}>Usage cap</Text>
                      <TextInput
                        value={cap}
                        onChangeText={t => setCap(t.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sLabel}>Days</Text>
                      <TextInput
                        value={days}
                        onChangeText={t => setDays(t.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }]}
                      />
                    </View>
                  </View>
                  {error && <Text style={{ fontSize: 11, fontWeight: '700', color: C.error }}>{error}</Text>}
                  <AdminButton tone="brand" icon="add-circle-outline" onPress={createPromo} disabled={!code || !isSuperAdmin}>
                    Create promo code
                  </AdminButton>
                </View>
              </AdminPanel>
            </View>

            {/* ── Right column: promo table ── */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <AdminPanel
                title="Promo codes"
                kicker={`${live.length} live · ${fmtInt(totalClaims)} total claims`}
                noPadBody
                right={<AdminPill tone="brand">Growth</AdminPill>}
              >
                {loading ? (
                  <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />
                ) : (
                  <>
                    {/* Table header */}
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surfaceContainerHighest, borderBottomWidth: 1, borderBottomColor: C.border }}>
                      {['Code', 'Gift', 'Claims', 'Expires', 'Status', ''].map((h, i) => (
                        <Text key={h || `col${i}`} style={{ flex: i === 0 ? 1.3 : 1, fontSize: 10, fontWeight: '700', color: C.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {h}
                        </Text>
                      ))}
                    </View>
                    {/* Rows */}
                    {paged.map(p => {
                      const expired = p.expires_at ? new Date(p.expires_at).getTime() <= now : false;
                      const tone = expired ? 'muted' as const : p.is_active ? 'positive' as const : 'gold' as const;
                      const statusLabel = expired ? 'Expired' : p.is_active ? 'Active' : 'Paused';
                      return (
                        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                          <Text style={{ flex: 1.3, fontSize: 12, fontWeight: '800', color: C.onSurface, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}>{p.code}</Text>
                          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: C.primary }}>{fmtETB(p.bonus_amount)}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>{fmtInt(p.total_claims || 0)}</Text>
                            <View style={{ marginTop: 4, width: 80 }}>
                              <AdminMeter value={cap ? ((p.total_claims || 0) / Number(cap)) * 100 : 0} tone="brand" />
                            </View>
                          </View>
                          <Text style={{ flex: 1, fontSize: 11, color: C.onSurfaceVariant }}>{p.expires_at ? fmtDay(p.expires_at) : 'Never'}</Text>
                          <View style={{ flex: 1 }}>
                            <AdminPill tone={tone}>{statusLabel}</AdminPill>
                          </View>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <AdminButton size="xs" tone="ghost" onPress={() => togglePromo(p)} disabled={expired}>
                              {p.is_active ? 'Pause' : 'Activate'}
                            </AdminButton>
                          </View>
                        </View>
                      );
                    })}
                    {links.length === 0 && (
                      <Text style={{ textAlign: 'center', color: C.onSurfaceVariant, paddingVertical: 40, fontSize: 12 }}>
                        No promo codes yet. Create one to start a campaign.
                      </Text>
                    )}
                    {totalPages > 1 && (
                      <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                        <AdminPager page={page} pages={totalPages} count={links.length} size={PER_PAGE} label="promo codes" onPage={setPage} />
                      </View>
                    )}
                  </>
                )}
              </AdminPanel>
            </View>
          </View>
        ) : (
          /* ═══ NOTIFICATIONS TAB ═══ */
          <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : { gap: 16 }}>
            {/* ── Left: compose ── */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <AdminPanel title="Compose message" kicker="Send bulk SMS to players via GeezSMS">
                <View style={{ gap: 16 }}>
                  {/* Audience */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={sLabel}>Audience</Text>
                      {Platform.OS === 'web' ? (
                        <select
                          value={audience}
                          onChange={(e: any) => setAudience(e.target.value)}
                          style={{
                            height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
                            backgroundColor: C.surface, paddingLeft: 12, fontSize: 12,
                            color: C.onSurface, outline: 'none',
                          } as any}
                        >
                          {AUDIENCES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                        </select>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {AUDIENCES.map(a => (
                            <TouchableOpacity
                              key={a.key}
                              onPress={() => setAudience(a.key)}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                                borderWidth: 1,
                                borderColor: audience === a.key ? C.primary + '66' : C.border,
                                backgroundColor: audience === a.key ? C.primary + '18' : C.surface,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '600', color: audience === a.key ? C.primary : C.onSurfaceVariant }}>{a.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sLabel}>Balance filter</Text>
                      {Platform.OS === 'web' ? (
                        <select
                          value={balanceRange}
                          onChange={(e: any) => setBalanceRange(e.target.value)}
                          style={{
                            height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
                            backgroundColor: C.surface, paddingLeft: 12, fontSize: 12,
                            color: C.onSurface, outline: 'none',
                          } as any}
                        >
                          {BALANCE_RANGES.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                        </select>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {BALANCE_RANGES.map(b => (
                            <TouchableOpacity
                              key={b.key}
                              onPress={() => setBalanceRange(b.key)}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                                borderWidth: 1,
                                borderColor: balanceRange === b.key ? C.primary + '66' : C.border,
                                backgroundColor: balanceRange === b.key ? C.primary + '18' : C.surface,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '600', color: balanceRange === b.key ? C.primary : C.onSurfaceVariant }}>{b.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Message body */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={sLabel}>Message</Text>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>
                        {smsBody.length} chars · {segments} segment{segments !== 1 ? 's' : ''}{isUnicode ? ' (Amharic/Unicode)' : ''}
                      </Text>
                    </View>
                    <TextInput
                      value={smsBody}
                      onChangeText={setSmsBody}
                      placeholder="Write the message players will receive..."
                      placeholderTextColor={C.onSurfaceVariant}
                      multiline
                      numberOfLines={4}
                      style={[sInput, { height: 100, paddingVertical: 8, textAlignVertical: 'top' }]}
                    />
                  </View>

                  {/* KPI row */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Recipients</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.onSurface, marginTop: 4 }}>
                        {previewLoading ? '...' : fmtInt(recipients)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>SMS segments</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.onSurface, marginTop: 4 }}>
                        {fmtInt(recipients * segments)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Est. SMS cost</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.primary, marginTop: 4 }}>
                        {fmtETB(estCost)}
                      </Text>
                    </View>
                  </View>

                  {/* Send */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: C.onSurfaceVariant, maxWidth: '60%' as any }}>
                      Banned accounts are excluded automatically. SMS at ETB 0.35/segment.
                    </Text>
                    <AdminButton tone="brand" icon="send-outline" onPress={() => setConfirmSms(true)} disabled={!isSuperAdmin || !smsBody}>
                      Send now
                    </AdminButton>
                  </View>
                </View>
              </AdminPanel>
            </View>

            {/* ── Right: preview + history ── */}
            <View style={Platform.OS === 'web' ? { width: 400, gap: 16 } : { gap: 16 }}>
              {/* Preview */}
              <AdminPanel title="Preview" kicker="How players see it">
                <View style={{
                  marginLeft: 'auto' as any,
                  maxWidth: '85%' as any,
                  backgroundColor: C.primary,
                  borderRadius: 16,
                  borderBottomRightRadius: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}>
                  <Text style={{ fontSize: 11, lineHeight: 18, color: '#fff' }}>
                    {smsBody || 'SMS text appears here.'}
                  </Text>
                  <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginTop: 4 }}>
                    XOETHIOPIA
                  </Text>
                </View>
              </AdminPanel>

              {/* Sent history */}
              <AdminPanel title="Sent history" kicker={`${smsHistory.length} broadcasts`} noPadBody>
                {historyLoading ? (
                  <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} />
                ) : smsHistory.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: C.onSurfaceVariant, paddingVertical: 30, fontSize: 12 }}>
                    No broadcasts sent yet.
                  </Text>
                ) : (
                  smsHistory.slice(0, 10).map(b => (
                    <View key={b.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.onSurface, flex: 1 }} numberOfLines={1}>
                          {b.message?.slice(0, 40)}...
                        </Text>
                        <AdminPill tone={b.status === 'delivered' || b.status === 'completed' ? 'positive' : b.status === 'sending' ? 'gold' : 'muted'}>
                          {b.status || 'sent'}
                        </AdminPill>
                      </View>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
                        {b.message}
                      </Text>
                      <View style={{ marginTop: 6 }}>
                        <AdminMeter value={b.target_count ? ((b.sent_count || 0) / b.target_count) * 100 : 100} tone="brand" />
                      </View>
                      <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }}>
                        {fmtInt(b.sent_count || 0)}/{fmtInt(b.target_count || 0)} · {timeSince(b.created_at)}
                      </Text>
                    </View>
                  ))
                )}
              </AdminPanel>
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Confirm SMS modal ── */}
      <Modal visible={confirmSms} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: 400, maxWidth: '90%' as any, borderRadius: 16, backgroundColor: C.surface, padding: 24 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.onSurface }}>Confirm bulk SMS</Text>
            <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>
              {`Send ${fmtInt(recipients)} messages (${fmtInt(recipients * segments)} segments) for an estimated cost of ${fmtETB(estCost)}.`}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <AdminButton tone="ghost" onPress={() => setConfirmSms(false)}>Cancel</AdminButton>
              <AdminButton tone="brand" icon="send-outline" onPress={sendBulkSms} disabled={smsSending}>
                {smsSending ? 'Sending...' : 'Confirm and send'}
              </AdminButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
