// app/(authed)/admin/audit.tsx — System view
// Redesigned to match reference SystemPanel: emergency kill switch,
// maintenance mode, lockdown whitelist, provider health, and audit trail.
// Uses real backend APIs for maintenance settings, whitelist, and audit logs.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import {
  AdminPanel, AdminPill, AdminButton, AdminToggle, AdminPager,
} from '../../../components/admin/ui';

/* ── helpers ─────────────────────────────────────────── */
const timeSince = (iso?: string) => {
  if (!iso) return '--';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

const getActionTone = (action: string): 'coral' | 'positive' | 'brand' | 'muted' => {
  if (action.includes('reject') || action.includes('ban') || action.includes('lockdown') || action.includes('delete')) return 'coral';
  if (action.includes('approve') || action.includes('unban') || action.includes('release')) return 'positive';
  if (action.includes('balance') || action.includes('payout')) return 'brand';
  return 'muted';
};

/* ── service health definitions ──────────────────────── */
const SERVICES: { key: string; label: string; kind: string }[] = [
  { key: 'chapa', label: 'Chapa', kind: 'Payments API · payout dispatch' },
  { key: 'geezsms', label: 'GeezSMS', kind: 'OTP and player notifications' },
  { key: 'telebirr', label: 'Telebirr', kind: 'Wallet rail' },
  { key: 'cbe', label: 'CBE Birr', kind: 'Wallet rail' },
  { key: 'postgres', label: 'PostgreSQL', kind: 'Ledger and player records' },
  { key: 'redis', label: 'Redis', kind: 'Lockdown flag and session cache' },
  { key: 'ws', label: 'WebSocket', kind: 'Live player connections' },
];

type HealthStatus = 'unknown' | 'checking' | 'healthy' | 'degraded';

/* ── types ───────────────────────────────────────────── */
interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_number: string;
  action: string;
  target_id: string;
  target_name: string;
  details: any;
  created_at: string;
}

/* ════════════════════════════════════════════════════════════════════ */
export default function AdminAudit() {
  const { theme: C, isDark } = useAdminTheme();
  const { token, isSuperAdmin, showAlert } = useAuth();
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' }),
    [token],
  );

  /* ── Settings / lockdown state ─────────────────────── */
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [armed, setArmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [incident, setIncident] = useState('');
  const [whitelistInput, setWhitelistInput] = useState('');

  const isLocked = settings['system_emergency_lockout'] === true || settings['system_emergency_lockout'] === 'true';
  const isMaintenance = settings['maintenance_mode'] === true || settings['maintenance_mode'] === 'true';
  const whitelist: string[] = Array.isArray(settings['lockdown_whitelist']) ? settings['lockdown_whitelist'] : [];

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/maintenance/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSettings(data);
    } catch (e) { console.error('[system/settings]', e); }
    finally { setSettingsLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchSettings(); }, [fetchSettings]);

  const toggleSetting = async (key: string, current: boolean) => {
    try {
      setSettings(prev => ({ ...prev, [key]: !current }));
      await fetch(`${API_URL}/admin/maintenance/settings`, {
        method: 'POST', headers,
        body: JSON.stringify({ key, value: !current }),
      });
    } catch {
      setSettings(prev => ({ ...prev, [key]: current }));
      showAlert('Error', 'Failed to update setting');
    }
  };

  const engageLockdown = async () => {
    if (confirmText !== 'LOCKDOWN') return;
    try {
      setSettings(prev => ({ ...prev, system_emergency_lockout: true }));
      await fetch(`${API_URL}/admin/maintenance/settings`, {
        method: 'POST', headers,
        body: JSON.stringify({ key: 'system_emergency_lockout', value: true }),
      });
      setArmed(false); setConfirmText(''); setIncident('');
    } catch {
      setSettings(prev => ({ ...prev, system_emergency_lockout: false }));
      showAlert('Error', 'Failed to engage lockdown');
    }
  };

  const releaseLockdown = async () => {
    try {
      setSettings(prev => ({ ...prev, system_emergency_lockout: false }));
      await fetch(`${API_URL}/admin/maintenance/settings`, {
        method: 'POST', headers,
        body: JSON.stringify({ key: 'system_emergency_lockout', value: false }),
      });
    } catch {
      setSettings(prev => ({ ...prev, system_emergency_lockout: true }));
      showAlert('Error', 'Failed to release lockdown');
    }
  };

  const addWhitelist = async () => {
    if (!whitelistInput.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/maintenance/whitelist`, {
        method: 'POST', headers,
        body: JSON.stringify({ identifier: whitelistInput.trim() }),
      });
      if (res.ok) { setWhitelistInput(''); fetchSettings(); }
    } catch { showAlert('Error', 'Failed to add'); }
  };

  const removeWhitelist = async (identifier: string) => {
    try {
      await fetch(`${API_URL}/admin/maintenance/whitelist/remove`, {
        method: 'POST', headers,
        body: JSON.stringify({ identifier }),
      });
      fetchSettings();
    } catch { showAlert('Error', 'Failed to remove'); }
  };

  /* ── Health probes ─────────────────────────────────── */
  const [health, setHealth] = useState<Record<string, { status: HealthStatus; latency: number }>>(() => {
    const init: Record<string, { status: HealthStatus; latency: number }> = {};
    SERVICES.forEach(s => { init[s.key] = { status: 'unknown', latency: 0 }; });
    return init;
  });

  const probeHealth = async (key: string) => {
    setHealth(prev => ({ ...prev, [key]: { ...prev[key], status: 'checking' } }));
    const start = Date.now();
    try {
      // Simple health check — just test if the server responds
      const res = await fetch(`${API_URL}/admin/health/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const latency = Date.now() - start;
      setHealth(prev => ({
        ...prev,
        [key]: { status: res.ok ? 'healthy' : 'degraded', latency },
      }));
    } catch {
      setHealth(prev => ({ ...prev, [key]: { status: 'degraded', latency: Date.now() - start } }));
    }
  };

  const probeAll = () => SERVICES.forEach(s => probeHealth(s.key));

  const degradedCount = SERVICES.filter(s => health[s.key].status === 'degraded').length;

  /* ── Audit logs ────────────────────────────────────── */
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/audit-logs?limit=500`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch (e) { console.error('[audit]', e); }
    finally { setLogsLoading(false); }
  }, [token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter(l =>
      l.admin_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.target_name?.toLowerCase().includes(q),
    );
  }, [logs, query]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const formatDetails = (details: any) => {
    if (!details) return 'No context';
    try {
      const d = typeof details === 'string' ? JSON.parse(details) : details;
      return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' | ');
    } catch { return 'Invalid details'; }
  };

  /* ── styles ────────────────────────────────────────── */
  const sLabel: any = { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 6 };
  const sInput: any = { height: 36, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.surface, paddingHorizontal: 12, fontSize: 12, color: C.onSurface, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) };

  if (settingsLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* ── Top row: kill switch + maintenance ── */}
        <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 16 } : { gap: 16 }}>
          {/* Kill switch */}
          <View style={{ flex: 1 }}>
            <AdminPanel
              title="Emergency kill switch"
              kicker="Halts non-admin traffic and voids open matches with refunds"
              right={isLocked
                ? <AdminPill tone="coral" dot>Engaged</AdminPill>
                : <AdminPill tone="positive" dot>Normal</AdminPill>
              }
            >
              {isLocked ? (
                <View style={{ gap: 16 }}>
                  <View style={{
                    borderRadius: 12, borderWidth: 1, borderColor: C.error + '44',
                    backgroundColor: C.error + '11', padding: 16,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: C.error }}>
                      Platform locked
                    </Text>
                    <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 4, lineHeight: 16 }}>
                      Non-admin traffic is halted, live tables are closed, and payouts and balance changes are frozen.
                    </Text>
                  </View>
                  {isSuperAdmin ? (
                    <AdminButton tone="brand" icon="lock-open-outline" onPress={releaseLockdown}>
                      Release lockdown
                    </AdminButton>
                  ) : (
                    <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>A superadmin must release the lockdown.</Text>
                  )}
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {/* Warning bullets */}
                  <View style={{ gap: 8 }}>
                    {[
                      'Stops new wagers and closes all live rooms.',
                      'Refunds every open match stake to player wallets.',
                      'Freezes payouts until a superadmin releases it.',
                    ].map((text, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.error, marginTop: 5 }} />
                        <Text style={{ fontSize: 11, color: C.onSurfaceVariant, lineHeight: 16, flex: 1 }}>{text}</Text>
                      </View>
                    ))}
                  </View>

                  {!armed ? (
                    <AdminButton
                      tone="danger"
                      icon="shield-outline"
                      onPress={() => setArmed(true)}
                      disabled={!isSuperAdmin}
                    >
                      Arm emergency lockdown
                    </AdminButton>
                  ) : (
                    <View style={{ gap: 12, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 16 }}>
                      <View>
                        <Text style={sLabel}>Incident reason</Text>
                        <TextInput
                          value={incident}
                          onChangeText={setIncident}
                          placeholder="e.g. suspected payout fraud on CBE rail"
                          placeholderTextColor={C.onSurfaceVariant}
                          style={sInput}
                        />
                      </View>
                      <View>
                        <Text style={sLabel}>Type LOCKDOWN to confirm</Text>
                        <TextInput
                          value={confirmText}
                          onChangeText={t => setConfirmText(t.toUpperCase())}
                          placeholder="LOCKDOWN"
                          placeholderTextColor={C.onSurfaceVariant}
                          autoCapitalize="characters"
                          style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', letterSpacing: 2 }]}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <AdminButton tone="danger" icon="shield-outline" onPress={engageLockdown} disabled={confirmText !== 'LOCKDOWN'}>
                          Engage lockdown
                        </AdminButton>
                        <AdminButton tone="ghost" onPress={() => { setArmed(false); setConfirmText(''); setIncident(''); }}>
                          Cancel
                        </AdminButton>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </AdminPanel>
          </View>

          {/* Maintenance mode + whitelist */}
          <View style={{ flex: 1, gap: 16 }}>
            <AdminPanel
              title="Maintenance mode"
              kicker="Show a maintenance notice to players"
              right={
                <AdminToggle
                  checked={isMaintenance}
                  label="Maintenance mode"
                  onChange={() => toggleSetting('maintenance_mode', isMaintenance)}
                  disabled={!isSuperAdmin}
                />
              }
            >
              <View style={{ flexDirection: 'row', gap: 12, borderRadius: 12, backgroundColor: C.surfaceContainerLow, padding: 16 }}>
                <View style={{
                  width: 10, height: 10, borderRadius: 5, marginTop: 2,
                  backgroundColor: isMaintenance ? C.primary : (C as any).success || '#10B981',
                }} />
                <Text style={{ fontSize: 12, color: C.onSurfaceVariant, lineHeight: 18, flex: 1 }}>
                  {isMaintenance
                    ? 'Players see a maintenance notice. New matches are paused while deposits and cash-outs remain available to ops.'
                    : 'Players can join matches normally. Turn on maintenance before scheduled database or rail work.'}
                </Text>
              </View>
            </AdminPanel>

            <AdminPanel title="Lockdown whitelist" kicker="Admin IDs or phone numbers allowed during an emergency">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={whitelistInput}
                  onChangeText={setWhitelistInput}
                  placeholder="2519XXXXXXXX or ADM-SELAM-T"
                  placeholderTextColor={C.onSurfaceVariant}
                  editable={isSuperAdmin}
                  style={[sInput, { flex: 1, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 11, opacity: isSuperAdmin ? 1 : 0.55 }]}
                />
                <AdminButton size="sm" tone="ghost" onPress={addWhitelist} disabled={!isSuperAdmin || !whitelistInput}>
                  Add
                </AdminButton>
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                {whitelist.map(entry => (
                  <View key={entry} style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    borderRadius: 8, backgroundColor: C.surfaceContainerLow, paddingHorizontal: 12, paddingVertical: 8,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurfaceVariant, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}>
                      {entry}
                    </Text>
                    <TouchableOpacity onPress={() => removeWhitelist(entry)} disabled={!isSuperAdmin}>
                      <Ionicons name="close" size={14} color={C.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                ))}
                {whitelist.length === 0 && (
                  <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>No entries yet.</Text>
                )}
              </View>
              {!isSuperAdmin && <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 8 }}>Superadmin role required to edit the whitelist.</Text>}
            </AdminPanel>
          </View>
        </View>

        {/* ── Provider health ── */}
        <AdminPanel
          title="Provider and infrastructure health"
          kicker={`Probe payments, messaging, rails, and data stores · ${degradedCount ? `${degradedCount} degraded` : 'all healthy'}`}
          right={
            <AdminButton size="xs" tone="ghost" icon="refresh-outline" onPress={probeAll}>
              Probe all
            </AdminButton>
          }
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {SERVICES.map(s => {
              const h = health[s.key];
              const tone = h.status === 'checking' ? 'muted' as const : h.status === 'degraded' ? 'gold' as const : h.status === 'healthy' ? 'positive' as const : 'muted' as const;
              const text = h.status === 'checking' ? 'Checking' : h.status === 'degraded' ? 'Degraded' : h.status === 'healthy' ? 'Operational' : 'Unknown';
              return (
                <View key={s.key} style={{
                  borderRadius: 12, borderWidth: 1, borderColor: C.border,
                  backgroundColor: C.surface, padding: 16,
                  width: Platform.OS === 'web' ? 'calc(25% - 9px)' as any : '100%' as any,
                  minWidth: 180,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: C.onSurface }}>{s.label}</Text>
                    <AdminPill tone={tone} dot>{text}</AdminPill>
                  </View>
                  <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }}>{s.kind}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>
                      {h.status === 'checking' ? '--' : h.status === 'unknown' ? '--' : `${h.latency} ms`}
                    </Text>
                    <AdminButton size="xs" tone="ghost" onPress={() => probeHealth(s.key)} disabled={h.status === 'checking'}>
                      Probe
                    </AdminButton>
                  </View>
                </View>
              );
            })}
          </View>
        </AdminPanel>

        {/* ── System audit trail ── */}
        <AdminPanel
          title="System audit trail"
          kicker="Lockdowns, maintenance, balance changes, promos, and engine edits"
          noPadBody
          right={
            <View style={{ width: 200 }}>
              <TextInput
                value={query}
                onChangeText={t => { setQuery(t); setPage(1); }}
                placeholder="Search audit..."
                placeholderTextColor={C.onSurfaceVariant}
                style={[sInput, { height: 32, fontSize: 11 }]}
              />
            </View>
          }
        >
          {logsLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Table header */}
              <View style={{
                flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: C.surfaceContainerHighest,
                borderBottomWidth: 1, borderBottomColor: C.border,
              }}>
                {['Admin', 'Action', 'Target', 'Context', 'Time'].map((h, i) => (
                  <Text key={h} style={{
                    flex: i === 3 ? 2 : 1,
                    fontSize: 10, fontWeight: '700', color: C.onSurfaceVariant,
                    textTransform: 'uppercase', letterSpacing: 1,
                    textAlign: i === 4 ? 'right' : 'left',
                  }}>
                    {h}
                  </Text>
                ))}
              </View>
              {/* Rows */}
              {paged.map(l => {
                const tone = getActionTone(l.action);
                return (
                  <View key={l.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: C.border,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.onSurface }}>{l.admin_name || 'System'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AdminPill tone={tone}>
                        {(l.action || 'system').toUpperCase().replace(/_/g, ' ')}
                      </AdminPill>
                    </View>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: C.onSurface }} numberOfLines={1}>
                      {l.target_name || 'System'}
                    </Text>
                    <Text style={{ flex: 2, fontSize: 11, color: C.onSurfaceVariant }} numberOfLines={2}>
                      {formatDetails(l.details)}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 11, color: C.onSurfaceVariant, textAlign: 'right' }}>
                      {timeSince(l.created_at)}
                    </Text>
                  </View>
                );
              })}
              {paged.length === 0 && (
                <Text style={{ textAlign: 'center', color: C.onSurfaceVariant, paddingVertical: 40, fontSize: 12 }}>
                  No audit logs found.
                </Text>
              )}
              {totalPages > 1 && (
                <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                  <AdminPager page={page} pages={totalPages} count={filtered.length} size={PER_PAGE} label="audit logs" onPage={setPage} />
                </View>
              )}
            </>
          )}
        </AdminPanel>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
