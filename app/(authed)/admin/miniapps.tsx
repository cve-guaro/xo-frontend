// app/(authed)/admin/miniapps.tsx — Mini-apps / Partner API view
// Redesigned to match reference MiniAppsPanel layout.
// Uses real backend APIs for mini-app CRUD and security gate.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { useToast } from '../../../context/ToastContext';
import { API_URL } from '../../../config';
import { useAdminTheme } from '../../../constants/adminTheme';
import {
  AdminPanel, AdminPill, AdminButton, AdminToggle,
} from '../../../components/admin/ui';

/* ── permission scopes ───────────────────────────────── */
const ALL_PERMISSIONS = [
  'read:users', 'write:users', 'read:wallet', 'write:wallet',
  'read:games', 'send:notifications', 'read:stats',
  'read:miniapp_data', 'write:miniapp_data',
];

const RATE_LIMIT_PRESETS = [60, 100, 300, 600, 1200];

/* ── types ───────────────────────────────────────────── */
interface MiniApp {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  is_locked?: boolean;
  icon_url?: string | null;
  category?: string | null;
  ip_whitelist?: string[];
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
  created_by_username: string | null;
  total_api_calls: number;
  calls_last_24h: number;
  error_calls?: number;
  last_api_call: string | null;
}

const timeSince = (iso?: string | null) => {
  if (!iso) return 'Never';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

/* ── Scope picker component ──────────────────────────── */
function ScopePicker({
  value, onChange, theme: C, disabled,
}: {
  value: string[]; onChange: (next: string[]) => void; theme: any; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {ALL_PERMISSIONS.map(scope => {
        const active = value.includes(scope);
        return (
          <TouchableOpacity
            key={scope}
            onPress={() => onChange(active ? value.filter(s => s !== scope) : [...value, scope])}
            disabled={disabled}
            style={{
              borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
              borderColor: active ? C.primary + '55' : C.border,
              backgroundColor: active ? C.primary + '18' : C.surface,
              opacity: disabled ? 0.55 : 1,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: active ? C.primary : C.onSurfaceVariant }}>
              {scope}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── Mini-app card component ─────────────────────────── */
function MiniAppCard({
  app, theme: C, isSuperAdmin, headers, onRefresh,
}: {
  app: MiniApp; theme: any; isSuperAdmin: boolean;
  headers: Record<string, string>; onRefresh: () => void;
}) {
  const [webhook, setWebhook] = useState(app.webhook_url || '');
  const [ipInput, setIpInput] = useState((app.ip_whitelist || []).join(', '));
  const [scopes, setScopes] = useState(app.permissions || []);
  const [rateLimit, setRateLimit] = useState(app.rate_limit || 100);

  const saveSecurity = async () => {
    try {
      const ips = ipInput.split(',').map(x => x.trim()).filter(Boolean);
      await fetch(`${API_URL}/admin/miniapps/${app.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          webhook_url: webhook.trim() || null,
          ip_whitelist: ips,
          permissions: scopes,
          rate_limit: rateLimit,
        }),
      });
      onRefresh();
    } catch {}
  };

  const toggleActive = async (on: boolean) => {
    try {
      await fetch(`${API_URL}/admin/miniapps/${app.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ is_active: on }),
      });
      onRefresh();
    } catch {}
  };

  const sLabel: any = { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 6 };
  const sInput: any = { height: 36, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.surface, paddingHorizontal: 12, fontSize: 11, color: C.onSurface, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) };

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.onSurface }}>{app.name}</Text>
            <AdminPill tone={app.is_active ? 'positive' : 'gold'}>{app.is_active ? 'Active' : 'Paused'}</AdminPill>
          </View>
          {app.description && (
            <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }}>{app.description}</Text>
          )}
          <Text style={{ fontSize: 10, color: C.onSurfaceVariant, marginTop: 2 }}>
            {`${app.total_api_calls || 0} total calls · ${app.calls_last_24h || 0} last 24h · Last call ${timeSince(app.last_api_call)}`}
          </Text>
        </View>
        <AdminToggle
          checked={app.is_active}
          label={`${app.name} active`}
          onChange={toggleActive}
          disabled={!isSuperAdmin}
        />
      </View>

      {/* Fields */}
      <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 12, marginTop: 16 } : { gap: 12, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={sLabel}>Webhook destination</Text>
          <TextInput
            value={webhook}
            onChangeText={setWebhook}
            editable={isSuperAdmin}
            style={[sInput, { opacity: isSuperAdmin ? 1 : 0.55 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sLabel}>IP whitelist</Text>
          <TextInput
            value={ipInput}
            onChangeText={setIpInput}
            editable={isSuperAdmin}
            placeholder="203.0.113.4, 198.51.100.0/24"
            placeholderTextColor={C.onSurfaceVariant}
            style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', opacity: isSuperAdmin ? 1 : 0.55 }]}
          />
        </View>
      </View>

      {/* Scopes */}
      <View style={{ marginTop: 16 }}>
        <Text style={sLabel}>OAuth-style permission scopes</Text>
        <ScopePicker value={scopes} onChange={setScopes} theme={C} disabled={!isSuperAdmin} />
      </View>

      {/* Rate limit + save */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.onSurfaceVariant }}>Rate limit</Text>
          {Platform.OS === 'web' ? (
            <select
              value={rateLimit}
              onChange={(e: any) => setRateLimit(Number(e.target.value))}
              disabled={!isSuperAdmin}
              style={{
                height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                backgroundColor: C.surface, paddingLeft: 8, fontSize: 11,
                color: C.onSurface, outline: 'none', opacity: isSuperAdmin ? 1 : 0.55,
              } as any}
            >
              {RATE_LIMIT_PRESETS.map(r => <option key={r} value={r}>{r} req/min</option>)}
            </select>
          ) : (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {RATE_LIMIT_PRESETS.map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRateLimit(r)}
                  disabled={!isSuperAdmin}
                  style={{
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                    borderWidth: 1,
                    borderColor: rateLimit === r ? C.primary + '55' : C.border,
                    backgroundColor: rateLimit === r ? C.primary + '18' : C.surface,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: rateLimit === r ? C.primary : C.onSurfaceVariant }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <AdminButton size="xs" tone="ghost" onPress={saveSecurity} disabled={!isSuperAdmin}>
          Save webhook and IPs
        </AdminButton>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function AdminMiniApps() {
  const { theme: C } = useAdminTheme();
  const { token, isSuperAdmin } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' }),
    [token],
  );

  /* ── Security gate ─────────────────────────────────── */
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(() => {
    if (Platform.OS === 'web') {
      try { return sessionStorage.getItem('xoet_maintenance_gate_unlocked') === 'true'; } catch {}
    }
    return false;
  });
  const [gatePassword, setGatePassword] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  const handleUnlockGate = async () => {
    if (!gatePassword.trim()) { setGateError('Password is required'); return; }
    setGateLoading(true); setGateError('');
    try {
      const res = await fetch(`${API_URL}/admin/maintenance/verify-gate`, {
        method: 'POST', headers,
        body: JSON.stringify({ password: gatePassword.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsGateUnlocked(true);
        if (Platform.OS === 'web') {
          try { sessionStorage.setItem('xoet_maintenance_gate_unlocked', 'true'); } catch {}
        }
      } else {
        setGateError(data.error || 'Invalid password');
      }
    } catch { setGateError('Network error'); }
    finally { setGateLoading(false); }
  };

  /* ── App state ─────────────────────────────────────── */
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('https://');
  const [scopes, setScopes] = useState<string[]>(['read:stats']);
  const [rateLimit, setRateLimit] = useState(100);
  const [ips, setIps] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Created credentials
  const [credentials, setCredentials] = useState<{ api_key: string; api_secret: string; app_name: string } | null>(null);

  const fetchApps = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/miniapps`, { headers });
      if (res.ok) {
        const d = await res.json();
        setApps(d.miniApps || []);
      }
    } catch (e) { console.error('[miniapps]', e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (isGateUnlocked && token) fetchApps();
  }, [isGateUnlocked, token, fetchApps]);

  const createApp = async () => {
    if (!name.trim()) { setError('App name is required'); return; }
    setSaving(true); setError(null);
    try {
      const parsedIps = ips.split(',').map(x => x.trim()).filter(Boolean);
      const res = await fetch(`${API_URL}/admin/miniapps`, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: name.trim(),
          webhook_url: webhookUrl.trim() || null,
          permissions: scopes,
          rate_limit: rateLimit,
          ip_whitelist: parsedIps,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.api_key && data.api_secret) {
          setCredentials({ api_key: data.api_key, api_secret: data.api_secret, app_name: name });
        }
        setName(''); setWebhookUrl('https://'); setScopes(['read:stats']); setIps('');
        fetchApps();
      } else {
        setError(data.error || 'Failed to create');
      }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const sLabel: any = { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 6 };
  const sInput: any = { height: 36, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.surface, paddingHorizontal: 12, fontSize: 12, color: C.onSurface, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) };

  const activeCount = apps.filter(a => a.is_active).length;

  /* ── Security gate view ────────────────────────────── */
  if (!isGateUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 400, maxWidth: '100%' as any }}>
          <AdminPanel title="Security gate" kicker="Enter the maintenance security password to access mini-app management">
            <View style={{ gap: 12 }}>
              <View>
                <Text style={sLabel}>Password</Text>
                <TextInput
                  value={gatePassword}
                  onChangeText={setGatePassword}
                  placeholder="Maintenance security password"
                  placeholderTextColor={C.onSurfaceVariant}
                  secureTextEntry
                  style={sInput}
                />
              </View>
              {gateError ? <Text style={{ fontSize: 11, fontWeight: '700', color: C.error }}>{gateError}</Text> : null}
              <AdminButton tone="brand" icon="lock-open-outline" onPress={handleUnlockGate} disabled={gateLoading || !gatePassword}>
                {gateLoading ? 'Verifying...' : 'Unlock'}
              </AdminButton>
            </View>
          </AdminPanel>
        </View>
      </View>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={Platform.OS === 'web' ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : { gap: 16 }}>
          {/* ── Left: create form ── */}
          <View style={Platform.OS === 'web' ? { width: 360 } : {}}>
            <AdminPanel title="Create mini-app client" kicker="Telegram webviews and partner API launchers">
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={sLabel}>App name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Campus esports partner"
                    placeholderTextColor={C.onSurfaceVariant}
                    style={sInput}
                  />
                </View>
                <View>
                  <Text style={sLabel}>Webhook URL</Text>
                  <TextInput
                    value={webhookUrl}
                    onChangeText={setWebhookUrl}
                    style={sInput}
                  />
                </View>
                <View>
                  <Text style={sLabel}>IP whitelist (comma separated)</Text>
                  <TextInput
                    value={ips}
                    onChangeText={setIps}
                    placeholder="203.0.113.4, 198.51.100.0/24"
                    placeholderTextColor={C.onSurfaceVariant}
                    style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 11 }]}
                  />
                </View>
                <View>
                  <Text style={sLabel}>Permission scopes</Text>
                  <ScopePicker value={scopes} onChange={setScopes} theme={C} disabled={!isSuperAdmin} />
                </View>
                <View>
                  <Text style={sLabel}>Rate limit</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={rateLimit}
                      onChange={(e: any) => setRateLimit(Number(e.target.value))}
                      style={{
                        height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
                        backgroundColor: C.surface, paddingLeft: 12, fontSize: 12,
                        color: C.onSurface, outline: 'none',
                      } as any}
                    >
                      {RATE_LIMIT_PRESETS.map(r => <option key={r} value={r}>{r} requests/minute</option>)}
                    </select>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {RATE_LIMIT_PRESETS.map(r => (
                        <TouchableOpacity
                          key={r}
                          onPress={() => setRateLimit(r)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                            borderWidth: 1,
                            borderColor: rateLimit === r ? C.primary + '55' : C.border,
                            backgroundColor: rateLimit === r ? C.primary + '18' : C.surface,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: rateLimit === r ? C.primary : C.onSurfaceVariant }}>{r}/min</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {error && <Text style={{ fontSize: 11, fontWeight: '700', color: C.error }}>{error}</Text>}
                <AdminButton tone="brand" icon="add-circle-outline" onPress={createApp} disabled={!isSuperAdmin || !name || saving}>
                  {saving ? 'Creating...' : 'Create client'}
                </AdminButton>
                {!isSuperAdmin && <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}>Superadmin role required to create or update clients.</Text>}
              </View>
            </AdminPanel>
          </View>

          {/* ── Right: client cards ── */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <AdminPanel
              title="Partner API clients"
              kicker={`${activeCount} active integration${activeCount !== 1 ? 's' : ''}`}
              right={<AdminPill tone="brand">Secured</AdminPill>}
            >
              {loading ? (
                <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />
              ) : apps.length === 0 ? (
                <Text style={{ textAlign: 'center', color: C.onSurfaceVariant, paddingVertical: 40, fontSize: 12 }}>
                  No partner API clients yet. Create one to get started.
                </Text>
              ) : (
                apps.map(app => (
                  <MiniAppCard
                    key={app.id}
                    app={app}
                    theme={C}
                    isSuperAdmin={isSuperAdmin}
                    headers={headers}
                    onRefresh={fetchApps}
                  />
                ))
              )}
            </AdminPanel>
          </View>
        </View>

        {/* ── Credentials modal (inline, no Modal import needed since it's one-time) ── */}
        {credentials && (
          <View style={{
            position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
          }}>
            <View style={{ width: 440, maxWidth: '90%' as any, borderRadius: 16, backgroundColor: C.surface, padding: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.onSurface }}>API credentials created</Text>
              <Text style={{ fontSize: 11, color: C.error, fontWeight: '700', marginTop: 8 }}>
                Save these now. The secret will not be shown again.
              </Text>
              <View style={{ gap: 12, marginTop: 16 }}>
                <View>
                  <Text style={sLabel}>API key</Text>
                  <TextInput
                    value={credentials.api_key}
                    editable={false}
                    style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 11 }]}
                  />
                </View>
                <View>
                  <Text style={sLabel}>API secret</Text>
                  <TextInput
                    value={credentials.api_secret}
                    editable={false}
                    style={[sInput, { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: 11 }]}
                  />
                </View>
              </View>
              <View style={{ marginTop: 20 }}>
                <AdminButton tone="brand" onPress={() => setCredentials(null)}>
                  I have saved these credentials
                </AdminButton>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
