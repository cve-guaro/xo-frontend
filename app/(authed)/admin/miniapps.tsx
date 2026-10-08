// app/(authed)/admin/miniapps.tsx — API & Mini-App Controller (Maintenance Manager)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, useWindowDimensions, TextInput, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { useToast } from '../../../context/ToastContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';
import ActionConfirmModal from '../../../components/ActionConfirmModal';

// ─── Standard Permission Definitions ──────────────────────────────
const ALL_PERMISSIONS = [
  { key: 'read:users', label: 'Read Users', icon: 'people-outline', desc: 'Read user profiles and stats' },
  { key: 'write:users', label: 'Write Users', icon: 'person-add-outline', desc: 'Modify user profile data' },
  { key: 'read:wallet', label: 'Read Wallet', icon: 'wallet-outline', desc: 'Read user balances and transactions' },
  { key: 'write:wallet', label: 'Write Wallet', icon: 'cash-outline', desc: 'Execute balance updates & payouts' },
  { key: 'read:games', label: 'Read Games', icon: 'game-controller-outline', desc: 'Read live game sessions and records' },
  { key: 'send:notifications', label: 'Send Notifications', icon: 'notifications-outline', desc: 'Dispatch user push alerts' },
  { key: 'read:stats', label: 'Read Stats', icon: 'stats-chart-outline', desc: 'Access platform metrics & rankings' },
  { key: 'read:miniapp_data', label: 'Read App Data', icon: 'folder-open-outline', desc: 'Read custom mini-app storage' },
  { key: 'write:miniapp_data', label: 'Write App Data', icon: 'create-outline', desc: 'Write custom mini-app storage' },
];

const CATEGORIES = [
  { key: 'general', label: 'General', icon: 'apps-outline' },
  { key: 'marketplace', label: 'Marketplace', icon: 'cart-outline' },
  { key: 'games', label: 'Games', icon: 'game-controller-outline' },
  { key: 'utilities', label: 'Utilities', icon: 'construct-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' },
  { key: 'finance', label: 'Finance', icon: 'card-outline' },
];

const RATE_LIMIT_PRESETS = [60, 100, 300, 600, 1200];

const timeSince = (iso?: string) => {
  if (!iso) return 'Never';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

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

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  target_user_id: string | null;
  target_username: string | null;
  app_name?: string;
  response_status: number;
  ip_address: string;
  created_at: string;
}

export default function AdminMiniApps() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { token, user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // ─── Security Gate Unlock State ───
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(() => {
    if (Platform.OS === 'web') {
      try { return sessionStorage.getItem('xoet_maintenance_gate_unlocked') === 'true'; } catch (e) {}
    }
    return false;
  });
  const [gatePassword, setGatePassword] = useState('');
  const [showGatePassword, setShowGatePassword] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  // ─── Dashboard Data State ───
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'apps' | 'logs' | 'create'>('apps');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected App for Detail / Edit
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State (Create / Edit)
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formDesc, setFormDesc] = useState('');
  const [formIconUrl, setFormIconUrl] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const [formRateLimit, setFormRateLimit] = useState('100');
  const [formWebhook, setFormWebhook] = useState('');
  const [formIpWhitelist, setFormIpWhitelist] = useState('');
  const [savingApp, setSavingApp] = useState(false);

  // Created Credentials One-Time Modal
  const [createdCredentials, setCreatedCredentials] = useState<{ api_key: string; api_secret: string; app_name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilterApp, setLogFilterApp] = useState<string>('all');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: 'red' | 'yellow' | 'blue';
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Headers ───
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-platform': 'web',
  }), [token]);

  // ─── Security Gate Verification ───
  const handleUnlockGate = async () => {
    if (!gatePassword.trim()) {
      setGateError('Security password is required');
      return;
    }
    setGateLoading(true);
    setGateError('');
    try {
      const res = await fetch(`${API_URL}/admin/maintenance/verify-gate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password: gatePassword.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsGateUnlocked(true);
        if (Platform.OS === 'web') {
          try { sessionStorage.setItem('xoet_maintenance_gate_unlocked', 'true'); } catch (e) {}
        }
        toastRef.current.success('Access Granted', 'Maintenance Security Gate unlocked');
      } else {
        setGateError(data.error || 'Invalid maintenance security password');
      }
    } catch (e) {
      setGateError('Network connection error. Please try again.');
    } finally {
      setGateLoading(false);
    }
  };

  const handleLockGate = () => {
    setIsGateUnlocked(false);
    setGatePassword('');
    if (Platform.OS === 'web') {
      try { sessionStorage.removeItem('xoet_maintenance_gate_unlocked'); } catch (e) {}
    }
    toastRef.current.info('Workspace Locked', 'Security Gate has been locked');
  };

  // ─── Fetch Mini Apps ───
  const fetchApps = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/miniapps`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-platform': 'web',
        }
      });
      if (res.ok) {
        const d = await res.json();
        setApps(d.miniApps || []);
      }
    } catch (e) {
      console.error('[admin/miniapps] fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ─── Fetch API Logs ───
  const fetchLogs = useCallback(async (appId = 'all') => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const url = appId === 'all'
        ? `${API_URL}/admin/miniapps-logs?limit=100`
        : `${API_URL}/admin/miniapps/${appId}/logs?limit=100`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-platform': 'web',
        }
      });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch (e) {
      console.error('[admin/miniapps] logs error', e);
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isGateUnlocked && token) {
      fetchApps();
    }
  }, [isGateUnlocked, token, fetchApps]);

  useEffect(() => {
    if (activeTab === 'logs' && isGateUnlocked && token) {
      fetchLogs(logFilterApp);
    }
  }, [activeTab, logFilterApp, isGateUnlocked, token, fetchLogs]);

  // ─── Clipboard Helper ───
  const copyToClipboard = (text: string, type: 'key' | 'secret' | 'headers') => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'key') { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
      if (type === 'secret') { setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }
      if (type === 'headers') { setCopiedHeaders(true); setTimeout(() => setCopiedHeaders(false), 2000); }
      toastRef.current.success('Copied', 'Credential copied to clipboard');
    }
  };

  // ─── Open Create / Edit Form ───
  const openCreateForm = () => {
    setSelectedApp(null);
    setIsEditing(false);
    setFormName('');
    setFormCategory('general');
    setFormDesc('');
    setFormIconUrl('');
    setFormPerms([]);
    setFormRateLimit('100');
    setFormWebhook('');
    setFormIpWhitelist('');
    setActiveTab('create');
  };

  const openEditForm = (app: MiniApp) => {
    setSelectedApp(app);
    setIsEditing(true);
    setFormName(app.name);
    setFormCategory(app.category || 'general');
    setFormDesc(app.description || '');
    setFormIconUrl(app.icon_url || '');
    setFormPerms(app.permissions || []);
    setFormRateLimit(String(app.rate_limit || 100));
    setFormWebhook(app.webhook_url || '');
    setFormIpWhitelist((app.ip_whitelist || []).join(', '));
    setActiveTab('create');
  };

  // ─── Save / Submit Form ───
  const handleSaveApp = async () => {
    if (!formName.trim()) {
      toastRef.current.error('Validation Error', 'Application name is required (min 2 characters)');
      return;
    }
    setSavingApp(true);
    try {
      const parsedIps = formIpWhitelist
        .split(',')
        .map(ip => ip.trim())
        .filter(Boolean);

      if (isEditing && selectedApp) {
        // PATCH
        const res = await fetch(`${API_URL}/admin/miniapps/${selectedApp.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim() || null,
            category: formCategory,
            icon_url: formIconUrl.trim() || null,
            permissions: formPerms,
            rate_limit: parseInt(formRateLimit) || 100,
            webhook_url: formWebhook.trim() || null,
            ip_whitelist: parsedIps,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          toastRef.current.success('Updated', `Mini-app '${formName}' updated successfully`);
          fetchApps();
          setActiveTab('apps');
        } else {
          toastRef.current.error('Error', data.error || 'Failed to update mini-app');
        }
      } else {
        // POST
        const res = await fetch(`${API_URL}/admin/miniapps`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim() || null,
            category: formCategory,
            icon_url: formIconUrl.trim() || null,
            permissions: formPerms,
            rate_limit: parseInt(formRateLimit) || 100,
            webhook_url: formWebhook.trim() || null,
            ip_whitelist: parsedIps,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setCreatedCredentials({
            api_key: data.credentials.api_key,
            api_secret: data.credentials.api_secret,
            app_name: formName.trim(),
          });
          toastRef.current.success('Registered', `Mini-app '${formName}' registered successfully`);
          fetchApps();
          setActiveTab('apps');
        } else {
          toastRef.current.error('Error', data.error || 'Failed to create mini-app');
        }
      }
    } catch (e) {
      toastRef.current.error('Network Error', 'Failed to save application');
    } finally {
      setSavingApp(false);
    }
  };

  // ─── Actions with Confirmations ───
  const requestRotateKeys = (app: MiniApp) => {
    setConfirmModal({
      visible: true,
      title: `Rotate API Keys for ${app.name}?`,
      message: `WARNING: This will immediately invalidate the existing API secret. Any external systems currently using the old credentials will stop functioning until updated with the new credentials.`,
      confirmText: 'Rotate & Generate New Keys',
      confirmColor: 'red',
      iconName: 'key',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_URL}/admin/miniapps/${app.id}/rotate-key`, {
            method: 'POST',
            headers,
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            setCreatedCredentials({
              api_key: data.credentials.api_key,
              api_secret: data.credentials.api_secret,
              app_name: app.name,
            });
            toastRef.current.success('Keys Rotated', `New credentials generated for ${app.name}`);
            fetchApps();
          } else {
            toastRef.current.error('Error', data.error || 'Failed to rotate keys');
          }
        } catch (e) {
          toastRef.current.error('Network Error', 'Failed to rotate keys');
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const requestToggleActive = (app: MiniApp) => {
    const willBeActive = !app.is_active;
    setConfirmModal({
      visible: true,
      title: willBeActive ? `Activate ${app.name}?` : `Deactivate ${app.name}?`,
      message: willBeActive
        ? `Re-enabling this mini-app will allow its API keys to make requests and access permitted data.`
        : `Deactivating will block all incoming API calls from '${app.name}' immediately.`,
      confirmText: willBeActive ? 'Activate Application' : 'Deactivate Application',
      confirmColor: willBeActive ? 'blue' : 'yellow',
      iconName: willBeActive ? 'play-circle' : 'pause-circle',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_URL}/admin/miniapps/${app.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ is_active: willBeActive }),
          });
          if (res.ok) {
            toastRef.current.success('Status Updated', `${app.name} is now ${willBeActive ? 'active' : 'deactivated'}`);
            fetchApps();
          } else {
            toastRef.current.error('Error', 'Failed to update application status');
          }
        } catch (e) {
          toastRef.current.error('Network Error', 'Failed to update status');
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const requestToggleLock = (app: MiniApp) => {
    const willBeLocked = !app.is_locked;
    setConfirmModal({
      visible: true,
      title: willBeLocked ? `Lock ${app.name} for Maintenance?` : `Unlock ${app.name}?`,
      message: willBeLocked
        ? `Putting this mini-app into Maintenance Lock will reject all API requests with 503 Service Unavailable.`
        : `Unlocking will restore normal API request processing for '${app.name}'.`,
      confirmText: willBeLocked ? 'Lock for Maintenance' : 'Remove Maintenance Lock',
      confirmColor: willBeLocked ? 'red' : 'blue',
      iconName: willBeLocked ? 'lock-closed' : 'lock-open',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_URL}/admin/miniapps/${app.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ is_locked: willBeLocked }),
          });
          if (res.ok) {
            toastRef.current.success('Lockout Updated', `${app.name} ${willBeLocked ? 'is now locked' : 'is unlocked'}`);
            fetchApps();
          } else {
            toastRef.current.error('Error', 'Failed to update lockout state');
          }
        } catch (e) {
          toastRef.current.error('Network Error', 'Failed to update lockout state');
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const requestDeleteApp = (app: MiniApp) => {
    setConfirmModal({
      visible: true,
      title: `Delete '${app.name}'?`,
      message: `Are you sure you want to permanently deactivate and archive this mini-app? Its API keys will be revoked and its webhook subscriptions cancelled.`,
      confirmText: 'Delete & Revoke Access',
      confirmColor: 'red',
      iconName: 'trash',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_URL}/admin/miniapps/${app.id}`, {
            method: 'DELETE',
            headers,
          });
          if (res.ok) {
            toastRef.current.success('Deleted', `Mini-app '${app.name}' has been deactivated`);
            fetchApps();
          } else {
            toastRef.current.error('Error', 'Failed to delete mini-app');
          }
        } catch (e) {
          toastRef.current.error('Network Error', 'Failed to delete application');
        } finally {
          setActionLoading(false);
          setConfirmModal(null);
        }
      },
    });
  };

  // ─── Filtered Applications ───
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      // Status filter
      if (statusFilter === 'active' && (!app.is_active || app.is_locked)) return false;
      if (statusFilter === 'inactive' && app.is_active) return false;
      if (statusFilter === 'locked' && !app.is_locked) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(q);
        const matchDesc = (app.description || '').toLowerCase().includes(q);
        const matchCategory = (app.category || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCategory) return false;
      }
      return true;
    });
  }, [apps, statusFilter, searchQuery]);

  // ─── Metrics Calculations ───
  const totalAppsCount = apps.length;
  const activeAppsCount = apps.filter(a => a.is_active && !a.is_locked).length;
  const totalCallsCount = apps.reduce((acc, a) => acc + (Number(a.total_api_calls) || 0), 0);
  const callsLast24hCount = apps.reduce((acc, a) => acc + (Number(a.calls_last_24h) || 0), 0);
  const totalErrorsCount = apps.reduce((acc, a) => acc + (Number(a.error_calls) || 0), 0);
  const errorRate = totalCallsCount > 0 ? ((totalErrorsCount / totalCallsCount) * 100).toFixed(1) : '0.0';

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: 1. SECURITY GATE SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!isGateUnlocked) {
    return (
      <View style={s.gateContainer}>
        {/* Ambient Glows */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[s.glow, { top: -150, left: -100, backgroundColor: 'rgba(124,58,237,0.18)' }]} />
          <View style={[s.glow, { bottom: -100, right: -100, backgroundColor: 'rgba(34,211,238,0.12)' }]} />
        </View>

        <View style={s.gateCard}>
          <LinearGradient colors={['rgba(26,29,45,0.95)', 'rgba(18,20,32,0.98)']} style={s.gateCardGradient}>
            {/* Lock Icon Badge */}
            <View style={s.gateIconWrap}>
              <LinearGradient colors={['rgba(124,58,237,0.3)', 'rgba(34,211,238,0.15)']} style={s.gateIconBg}>
                <Ionicons name="lock-closed" size={32} color={C.secondary} />
              </LinearGradient>
            </View>

            <Text style={s.gateTitle}>Maintenance Security Gate</Text>
            <Text style={s.gateSubtitle}>
              API & Mini-App Controller is restricted. Please authenticate with the Maintenance Manager Security Password to continue.
            </Text>

            {/* Error Banner */}
            {gateError ? (
              <View style={s.gateErrorBox}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={s.gateErrorText}>{gateError}</Text>
              </View>
            ) : null}

            {/* Password Input */}
            <View style={s.gateInputWrap}>
              <Ionicons name="key-outline" size={18} color={C.onSurfaceVariant} style={{ marginLeft: 14 }} />
              <TextInput
                style={s.gateInput}
                placeholder="Enter Maintenance Password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry={!showGatePassword}
                value={gatePassword}
                onChangeText={t => { setGatePassword(t); setGateError(''); }}
                onSubmitEditing={handleUnlockGate}
              />
              <TouchableOpacity
                onPress={() => setShowGatePassword(!showGatePassword)}
                style={{ padding: 12 }}
              >
                <Ionicons
                  name={showGatePassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={C.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            {/* Unlock Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleUnlockGate}
              disabled={gateLoading}
              style={s.gateUnlockBtn}
            >
              <LinearGradient colors={[C.primary, C.primaryContainer]} style={s.gateBtnGradient}>
                {gateLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#ffffff" />
                    <Text style={s.gateBtnText}>Verify & Unlock Controller</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Return Link */}
            <TouchableOpacity
              onPress={() => router.push('/admin/maintenance' as any)}
              style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="arrow-back" size={14} color={C.onSurfaceVariant} />
              <Text style={{ color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600' }}>
                Return to System Maintenance
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: 2. CREDENTIALS ISSUED MODAL
  // ═══════════════════════════════════════════════════════════════
  if (createdCredentials) {
    return (
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.card, { borderColor: C.success, borderWidth: 2 }]}>
          <View style={s.cardHeader}>
            <View style={[s.iconBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Ionicons name="key" size={22} color={C.success} />
            </View>
            <View>
              <Text style={[s.cardTitle, { color: C.success }]}>API Credentials Generated</Text>
              <Text style={s.cardSubtitle}>App: {createdCredentials.app_name}</Text>
            </View>
          </View>

          <View style={s.alertWarningBox}>
            <Ionicons name="warning-outline" size={20} color={C.error} />
            <View style={{ flex: 1 }}>
              <Text style={s.alertWarningTitle}>Important Security Notice</Text>
              <Text style={s.alertWarningDesc}>
                Copy the API Secret now. For security purposes, this secret hash will NEVER be displayed again in cleartext.
              </Text>
            </View>
          </View>

          {/* API Key */}
          <Text style={s.fieldLabel}>API Key (Public Client Identifier)</Text>
          <View style={s.credRow}>
            <Text style={s.credText} selectable>{createdCredentials.api_key}</Text>
            <TouchableOpacity
              style={s.copyBtn}
              onPress={() => copyToClipboard(createdCredentials.api_key, 'key')}
            >
              <Ionicons name={copiedKey ? 'checkmark' : 'copy-outline'} size={16} color={copiedKey ? C.success : C.secondary} />
              <Text style={[s.copyBtnText, copiedKey && { color: C.success }]}>{copiedKey ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* API Secret */}
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>API Secret (Private Master Key)</Text>
          <View style={[s.credRow, { borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Text style={[s.credText, { color: '#fca5a5' }]} selectable>{createdCredentials.api_secret}</Text>
            <TouchableOpacity
              style={s.copyBtn}
              onPress={() => copyToClipboard(createdCredentials.api_secret, 'secret')}
            >
              <Ionicons name={copiedSecret ? 'checkmark' : 'copy-outline'} size={16} color={copiedSecret ? C.success : C.secondary} />
              <Text style={[s.copyBtnText, copiedSecret && { color: C.success }]}>{copiedSecret ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* Integration Headers Snippet */}
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Integration Request Headers</Text>
          <View style={[s.credRow, { backgroundColor: 'rgba(124,58,237,0.08)', flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[s.credText, { fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]} selectable>
              {`X-MiniApp-Key: ${createdCredentials.api_key}\nX-MiniApp-Secret: ${createdCredentials.api_secret}`}
            </Text>
            <TouchableOpacity
              style={[s.copyBtn, { alignSelf: 'flex-end', marginTop: 8 }]}
              onPress={() => copyToClipboard(`X-MiniApp-Key: ${createdCredentials.api_key}\nX-MiniApp-Secret: ${createdCredentials.api_secret}`, 'headers')}
            >
              <Ionicons name={copiedHeaders ? 'checkmark' : 'copy-outline'} size={14} color={copiedHeaders ? C.success : C.secondary} />
              <Text style={[s.copyBtnText, copiedHeaders && { color: C.success }]}>{copiedHeaders ? 'Copied Headers' : 'Copy Headers'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, { marginTop: 24 }]}
            onPress={() => setCreatedCredentials(null)}
          >
            <Ionicons name="checkmark-done" size={18} color="#ffffff" />
            <Text style={s.primaryBtnText}>I Have Stored These Credentials Securely</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAIN DASHBOARD VIEW
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Header Bar */}
        <View style={s.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.pageTitle}>API & Mini-App Controller</Text>
              <View style={s.maintenanceBadge}>
                <Ionicons name="shield-checkmark" size={12} color={C.secondary} />
                <Text style={s.maintenanceBadgeText}>MAINTENANCE MANAGER</Text>
              </View>
            </View>
            <Text style={s.pageSubtitle}>
              Developer applications, API credential lifecycle, permission scopes, rate limits, and audit logs.
            </Text>
          </View>

          <View style={s.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={fetchApps}
              style={s.headerIconBtn}
            >
              <Ionicons name="refresh" size={18} color={C.onSurface} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLockGate}
              style={[s.headerIconBtn, { borderColor: 'rgba(239,68,68,0.3)' }]}
            >
              <Ionicons name="lock-closed" size={18} color={C.error} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openCreateForm}
              style={s.registerBtn}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={s.registerBtnText}>Register Mini-App</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Metrics Cards */}
        <View style={s.metricsGrid}>
          <View style={s.metricCard}>
            <View style={[s.metricIconBg, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
              <Ionicons name="apps" size={20} color={C.primary} />
            </View>
            <Text style={s.metricVal}>{totalAppsCount}</Text>
            <Text style={s.metricLabel}>Total Applications</Text>
          </View>

          <View style={s.metricCard}>
            <View style={[s.metricIconBg, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Ionicons name="checkmark-circle" size={20} color={C.success} />
            </View>
            <Text style={[s.metricVal, { color: C.success }]}>{activeAppsCount}</Text>
            <Text style={s.metricLabel}>Active & Operational</Text>
          </View>

          <View style={s.metricCard}>
            <View style={[s.metricIconBg, { backgroundColor: 'rgba(34,211,238,0.15)' }]}>
              <Ionicons name="pulse" size={20} color={C.secondary} />
            </View>
            <Text style={s.metricVal}>{callsLast24hCount.toLocaleString()}</Text>
            <Text style={s.metricLabel}>API Calls (24h)</Text>
          </View>

          <View style={s.metricCard}>
            <View style={[s.metricIconBg, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Ionicons name="alert-circle" size={20} color={C.error} />
            </View>
            <Text style={[s.metricVal, { color: Number(errorRate) > 5 ? C.error : C.onSurface }]}>{errorRate}%</Text>
            <Text style={s.metricLabel}>Error Rate ({totalErrorsCount} total)</Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.navTab, activeTab === 'apps' && s.navTabActive]}
            onPress={() => { setActiveTab('apps'); setIsEditing(false); }}
          >
            <Ionicons name="grid-outline" size={16} color={activeTab === 'apps' ? C.primary : C.onSurfaceVariant} />
            <Text style={[s.navTabText, activeTab === 'apps' && s.navTabTextActive]}>
              Registered Mini-Apps ({apps.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.navTab, activeTab === 'logs' && s.navTabActive]}
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons name="receipt-outline" size={16} color={activeTab === 'logs' ? C.primary : C.onSurfaceVariant} />
            <Text style={[s.navTabText, activeTab === 'logs' && s.navTabTextActive]}>
              Live API Audit Telemetry
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.navTab, activeTab === 'create' && s.navTabActive]}
            onPress={openCreateForm}
          >
            <Ionicons name={isEditing ? 'create-outline' : 'add-circle-outline'} size={16} color={activeTab === 'create' ? C.primary : C.onSurfaceVariant} />
            <Text style={[s.navTabText, activeTab === 'create' && s.navTabTextActive]}>
              {isEditing ? `Edit: ${selectedApp?.name}` : 'Register New Mini-App'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: APPLICATIONS LIST */}
        {activeTab === 'apps' && (
          <View style={{ marginTop: 16 }}>
            {/* Filter & Search Bar */}
            <View style={s.searchFilterRow}>
              <View style={s.searchBox}>
                <Ionicons name="search" size={16} color={C.onSurfaceVariant} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search by name, description, or category..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={s.filterPillGroup}>
                {(['all', 'active', 'inactive', 'locked'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setStatusFilter(tab)}
                    style={[s.filterPill, statusFilter === tab && s.filterPillActive]}
                  >
                    <Text style={[s.filterPillText, statusFilter === tab && s.filterPillTextActive]}>
                      {tab.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loading ? (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={s.loadingText}>Loading registered mini-apps...</Text>
              </View>
            ) : filteredApps.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="apps-outline" size={48} color={C.onSurfaceVariant} />
                <Text style={s.emptyTitle}>No Mini-Apps Found</Text>
                <Text style={s.emptyDesc}>
                  {searchQuery ? 'No applications match your search query.' : 'No developer mini-apps have been registered yet.'}
                </Text>
                <TouchableOpacity style={[s.primaryBtn, { marginTop: 16 }]} onPress={openCreateForm}>
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={s.primaryBtnText}>Register First Mini-App</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.appsGrid}>
                {filteredApps.map(app => {
                  const isLocked = app.is_locked === true;
                  const isActive = app.is_active === true;
                  const appInitials = (app.name || 'AP').slice(0, 2).toUpperCase();

                  return (
                    <View key={app.id} style={[s.appCard, isLocked && { borderColor: 'rgba(239,68,68,0.4)' }]}>
                      {/* Top App Info */}
                      <View style={s.appCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          {app.icon_url ? (
                            <Image
                              source={{ uri: app.icon_url }}
                              style={s.appLogo}
                            />
                          ) : (
                            <LinearGradient
                              colors={['#7c3aed', '#22d3ee']}
                              style={s.appAvatarFallback}
                            >
                              <Text style={s.appAvatarText}>{appInitials}</Text>
                            </LinearGradient>
                          )}

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={s.appNameText}>{app.name}</Text>
                              {app.category ? (
                                <View style={s.categoryBadge}>
                                  <Text style={s.categoryBadgeText}>{app.category}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={s.appDescText} numberOfLines={2}>
                              {app.description || 'No description provided.'}
                            </Text>
                          </View>
                        </View>

                        {/* Status Badges */}
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          {isLocked ? (
                            <View style={[s.statusBadge, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: C.error }]}>
                              <Ionicons name="lock-closed" size={10} color={C.error} />
                              <Text style={[s.statusBadgeText, { color: C.error }]}>LOCKED</Text>
                            </View>
                          ) : isActive ? (
                            <View style={[s.statusBadge, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: C.success }]}>
                              <Ionicons name="checkmark-circle" size={10} color={C.success} />
                              <Text style={[s.statusBadgeText, { color: C.success }]}>ACTIVE</Text>
                            </View>
                          ) : (
                            <View style={[s.statusBadge, { backgroundColor: 'rgba(148,163,184,0.15)', borderColor: C.onSurfaceVariant }]}>
                              <Ionicons name="pause" size={10} color={C.onSurfaceVariant} />
                              <Text style={[s.statusBadgeText, { color: C.onSurfaceVariant }]}>DEACTIVATED</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Permissions Row */}
                      <View style={s.appPermsSection}>
                        <Text style={s.appSectionLabel}>Permissions ({app.permissions?.length || 0})</Text>
                        <View style={s.permChipsRow}>
                          {(app.permissions || []).map(p => {
                            const def = ALL_PERMISSIONS.find(x => x.key === p);
                            return (
                              <View key={p} style={s.permChipSmall}>
                                <Ionicons name={(def?.icon || 'shield-checkmark-outline') as any} size={11} color={C.secondary} />
                                <Text style={s.permChipSmallText}>{def?.label || p}</Text>
                              </View>
                            );
                          })}
                          {(!app.permissions || app.permissions.length === 0) && (
                            <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>No permissions assigned.</Text>
                          )}
                        </View>
                      </View>

                      {/* Usage Metrics Row */}
                      <View style={s.appStatsRow}>
                        <View style={s.appStatItem}>
                          <Text style={s.appStatVal}>{Number(app.total_api_calls || 0).toLocaleString()}</Text>
                          <Text style={s.appStatLbl}>Total Calls</Text>
                        </View>
                        <View style={s.appStatDivider} />
                        <View style={s.appStatItem}>
                          <Text style={[s.appStatVal, { color: C.secondary }]}>{Number(app.calls_last_24h || 0).toLocaleString()}</Text>
                          <Text style={s.appStatLbl}>24h Volume</Text>
                        </View>
                        <View style={s.appStatDivider} />
                        <View style={s.appStatItem}>
                          <Text style={s.appStatVal}>{app.rate_limit || 100} /m</Text>
                          <Text style={s.appStatLbl}>Rate Limit</Text>
                        </View>
                        <View style={s.appStatDivider} />
                        <View style={s.appStatItem}>
                          <Text style={s.appStatVal}>{timeSince(app.last_api_call || undefined)}</Text>
                          <Text style={s.appStatLbl}>Last Call</Text>
                        </View>
                      </View>

                      {/* Action Bar */}
                      <View style={s.appActionBar}>
                        <TouchableOpacity
                          style={s.appActionBtn}
                          onPress={() => openEditForm(app)}
                        >
                          <Ionicons name="create-outline" size={15} color={C.onSurface} />
                          <Text style={s.appActionText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.appActionBtn}
                          onPress={() => requestRotateKeys(app)}
                        >
                          <Ionicons name="key-outline" size={15} color={C.secondary} />
                          <Text style={[s.appActionText, { color: C.secondary }]}>Rotate Keys</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.appActionBtn}
                          onPress={() => requestToggleLock(app)}
                        >
                          <Ionicons name={isLocked ? 'lock-open-outline' : 'lock-closed-outline'} size={15} color={isLocked ? C.success : C.error} />
                          <Text style={[s.appActionText, { color: isLocked ? C.success : C.error }]}>
                            {isLocked ? 'Unlock' : 'Lock'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.appActionBtn}
                          onPress={() => requestToggleActive(app)}
                        >
                          <Ionicons name={isActive ? 'pause-outline' : 'play-outline'} size={15} color={isActive ? C.accentGold : C.success} />
                          <Text style={[s.appActionText, { color: isActive ? C.accentGold : C.success }]}>
                            {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.appActionBtn}
                          onPress={() => {
                            setLogFilterApp(app.id);
                            setActiveTab('logs');
                          }}
                        >
                          <Ionicons name="receipt-outline" size={15} color={C.onSurfaceVariant} />
                          <Text style={s.appActionText}>Logs</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.appActionBtn, { borderColor: 'rgba(239,68,68,0.2)' }]}
                          onPress={() => requestDeleteApp(app)}
                        >
                          <Ionicons name="trash-outline" size={15} color={C.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: CREATE / EDIT APP FORM */}
        {activeTab === 'create' && (
          <View style={{ marginTop: 16 }}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.iconBadge}>
                  <Ionicons name={isEditing ? 'create' : 'add-circle'} size={22} color={C.primary} />
                </View>
                <View>
                  <Text style={s.cardTitle}>{isEditing ? `Edit Mini-App: ${selectedApp?.name}` : 'Register New Mini-App'}</Text>
                  <Text style={s.cardSubtitle}>Configure permissions, rate limiting, branding, and access controls.</Text>
                </View>
              </View>

              {/* Form Body */}
              <View style={{ gap: 18, marginTop: 12 }}>
                {/* App Name */}
                <View>
                  <Text style={s.fieldLabel}>Application Name *</Text>
                  <TextInput
                    style={s.formInput}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. XO Marketplace, Telegram Bot Hub"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                {/* Category Selection */}
                <View>
                  <Text style={s.fieldLabel}>Category</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {CATEGORIES.map(c => {
                      const selected = formCategory === c.key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          onPress={() => setFormCategory(c.key)}
                          style={[s.categoryChip, selected && s.categoryChipActive]}
                        >
                          <Ionicons name={c.icon as any} size={14} color={selected ? '#ffffff' : C.onSurfaceVariant} />
                          <Text style={[s.categoryChipText, selected && { color: '#ffffff', fontWeight: '800' }]}>{c.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text style={s.fieldLabel}>Description</Text>
                  <TextInput
                    style={[s.formInput, { height: 80, textAlignVertical: 'top' }]}
                    value={formDesc}
                    onChangeText={setFormDesc}
                    placeholder="What functionality or integration does this mini-app perform?"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                  />
                </View>

                {/* Icon URL */}
                <View>
                  <Text style={s.fieldLabel}>App Icon / Logo URL (Optional)</Text>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <TextInput
                      style={[s.formInput, { flex: 1 }]}
                      value={formIconUrl}
                      onChangeText={setFormIconUrl}
                      placeholder="https://example.com/icon.png"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                    {formIconUrl ? (
                      <Image
                        source={{ uri: formIconUrl }}
                        style={s.appLogoPreview}
                      />
                    ) : (
                      <View style={[s.appLogoPreview, { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="image-outline" size={20} color={C.onSurfaceVariant} />
                      </View>
                    )}
                  </View>
                </View>

                {/* Permissions Matrix */}
                <View>
                  <Text style={s.fieldLabel}>Permission Scopes</Text>
                  <Text style={s.fieldDesc}>Select the exact data and operations this mini-app is authorized to perform.</Text>
                  <View style={s.permGrid}>
                    {ALL_PERMISSIONS.map(p => {
                      const selected = formPerms.includes(p.key);
                      return (
                        <TouchableOpacity
                          key={p.key}
                          activeOpacity={0.8}
                          style={[s.permSelectCard, selected && s.permSelectCardActive]}
                          onPress={() => {
                            setFormPerms(prev =>
                              selected ? prev.filter(x => x !== p.key) : [...prev, p.key]
                            );
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons
                              name={p.icon as any}
                              size={16}
                              color={selected ? C.secondary : C.onSurfaceVariant}
                            />
                            <Text style={[s.permSelectTitle, selected && { color: '#ffffff' }]}>{p.label}</Text>
                          </View>
                          <Text style={s.permSelectDesc}>{p.desc}</Text>
                          <View style={[s.permCheckbox, selected && s.permCheckboxActive]}>
                            {selected && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Rate Limit Presets */}
                <View>
                  <Text style={s.fieldLabel}>Rate Limit (Requests / Minute)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {RATE_LIMIT_PRESETS.map(preset => {
                      const selected = formRateLimit === String(preset);
                      return (
                        <TouchableOpacity
                          key={preset}
                          onPress={() => setFormRateLimit(String(preset))}
                          style={[s.presetChip, selected && s.presetChipActive]}
                        >
                          <Text style={[s.presetChipText, selected && { color: '#ffffff', fontWeight: '800' }]}>
                            {preset} req/min
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    style={s.formInput}
                    value={formRateLimit}
                    onChangeText={setFormRateLimit}
                    keyboardType="number-pad"
                    placeholder="Custom rate limit"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                {/* Webhook URL */}
                <View>
                  <Text style={s.fieldLabel}>Webhook Callback URL (Optional)</Text>
                  <TextInput
                    style={s.formInput}
                    value={formWebhook}
                    onChangeText={setFormWebhook}
                    placeholder="https://api.yourdomain.com/webhooks/xoet"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                {/* IP Whitelist */}
                <View>
                  <Text style={s.fieldLabel}>IP Whitelist (Optional, comma-separated)</Text>
                  <TextInput
                    style={s.formInput}
                    value={formIpWhitelist}
                    onChangeText={setFormIpWhitelist}
                    placeholder="e.g. 192.168.1.1, 10.0.0.1"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[s.cancelBtn, { flex: 1 }]}
                    onPress={() => { setActiveTab('apps'); setIsEditing(false); }}
                    disabled={savingApp}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.primaryBtn, { flex: 2 }]}
                    onPress={handleSaveApp}
                    disabled={savingApp}
                  >
                    {savingApp ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name={isEditing ? 'save-outline' : 'checkmark-circle-outline'} size={18} color="#ffffff" />
                        <Text style={s.primaryBtnText}>{isEditing ? 'Save Changes' : 'Register & Generate Keys'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: LIVE TELEMETRY & AUDIT LOGS */}
        {activeTab === 'logs' && (
          <View style={{ marginTop: 16 }}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.iconBadge}>
                  <Ionicons name="pulse" size={22} color={C.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>Live API Telemetry & Audit Logs</Text>
                  <Text style={s.cardSubtitle}>Persistent request inspector and security tracking.</Text>
                </View>
                <TouchableOpacity style={s.headerIconBtn} onPress={() => fetchLogs(logFilterApp)}>
                  <Ionicons name="refresh" size={16} color={C.onSurface} />
                </TouchableOpacity>
              </View>

              {/* App Selector for Logs */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 }}>
                <TouchableOpacity
                  style={[s.filterPill, logFilterApp === 'all' && s.filterPillActive]}
                  onPress={() => setLogFilterApp('all')}
                >
                  <Text style={[s.filterPillText, logFilterApp === 'all' && s.filterPillTextActive]}>
                    ALL APPS ({apps.length})
                  </Text>
                </TouchableOpacity>
                {apps.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.filterPill, logFilterApp === a.id && s.filterPillActive]}
                    onPress={() => setLogFilterApp(a.id)}
                  >
                    <Text style={[s.filterPillText, logFilterApp === a.id && s.filterPillTextActive]}>
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Logs Table / List */}
              {logsLoading ? (
                <View style={s.centerBox}>
                  <ActivityIndicator size="large" color={C.primary} />
                  <Text style={s.loadingText}>Fetching API logs...</Text>
                </View>
              ) : logs.length === 0 ? (
                <View style={s.emptyCard}>
                  <Ionicons name="receipt-outline" size={40} color={C.onSurfaceVariant} />
                  <Text style={s.emptyTitle}>No API Logs Recorded</Text>
                  <Text style={s.emptyDesc}>No API calls have been received for the selected filter yet.</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {logs.map(log => {
                    const isSuccess = log.response_status >= 200 && log.response_status < 300;
                    const isClientErr = log.response_status >= 400 && log.response_status < 500;
                    const statusColor = isSuccess ? C.success : isClientErr ? C.accentGold : C.error;

                    return (
                      <View key={log.id} style={s.logItemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          {/* Method Badge */}
                          <View style={[s.methodBadge, { backgroundColor: log.method === 'GET' ? 'rgba(34,211,238,0.15)' : log.method === 'POST' ? 'rgba(34,197,94,0.15)' : log.method === 'DELETE' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)' }]}>
                            <Text style={[s.methodText, { color: log.method === 'GET' ? C.secondary : log.method === 'POST' ? C.success : log.method === 'DELETE' ? C.error : C.primary }]}>
                              {log.method}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={s.logEndpointText}>{log.endpoint}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              {log.app_name && (
                                <Text style={s.logMetaText}>App: {log.app_name}</Text>
                              )}
                              <Text style={s.logMetaText}>IP: {log.ip_address}</Text>
                              {log.target_username && (
                                <Text style={s.logMetaText}>Target: {log.target_username}</Text>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Status & Time */}
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View style={[s.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}15` }]}>
                            <Text style={[s.statusBadgeText, { color: statusColor }]}>{log.response_status}</Text>
                          </View>
                          <Text style={s.logTimeText}>{timeSince(log.created_at)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Standardized Confirmation Modal for Critical Actions */}
      <ActionConfirmModal
        visible={confirmModal?.visible || false}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText || 'Confirm'}
        confirmColor={confirmModal?.confirmColor || 'red'}
        iconName={confirmModal?.iconName || 'warning'}
        isLoading={actionLoading}
        onCancel={() => setConfirmModal(null)}
        onConfirm={confirmModal?.onConfirm || (async () => {})}
      />
    </>
  );
}

// ─── Stylesheet ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: {
    padding: 24,
    paddingBottom: 80,
    maxWidth: 1100,
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    width: '100%',
  },
  glow: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.8,
  },

  // Security Gate Screen
  gateContainer: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gateCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  gateCardGradient: {
    padding: 32,
    alignItems: 'center',
  },
  gateIconWrap: {
    marginBottom: 20,
  },
  gateIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  gateSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  gateErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: C.error,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 16,
  },
  gateErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  gateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    width: '100%',
    marginBottom: 20,
  },
  gateInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  gateUnlockBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  gateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  gateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Main Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: C.onSurface,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginTop: 4,
    maxWidth: 600,
    lineHeight: 18,
  },
  maintenanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderColor: 'rgba(34,211,238,0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  maintenanceBadgeText: {
    color: C.secondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  registerBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Metrics Bar
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: 'rgba(19, 24, 44, 0.7)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
  },
  metricIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: C.onSurface,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 12,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navTabActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  navTabText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: C.primary,
    fontWeight: '800',
  },

  // Search & Filter
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
    minWidth: 260,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filterPillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterPillText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },

  // Cards
  card: {
    backgroundColor: 'rgba(19, 24, 44, 0.75)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // App Grid
  appsGrid: {
    gap: 16,
  },
  appCard: {
    backgroundColor: 'rgba(19, 24, 44, 0.8)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  appCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  appLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surfaceContainerHigh,
  },
  appAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  appNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  appDescText: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: C.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Permissions section
  appPermsSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
    marginBottom: 12,
  },
  appSectionLabel: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permChipSmallText: {
    color: C.secondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Usage stats
  appStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  appStatItem: {
    alignItems: 'center',
  },
  appStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  appStatLbl: {
    fontSize: 10,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  appStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.border,
  },

  // Actions
  appActionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  appActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appActionText: {
    color: C.onSurface,
    fontSize: 12,
    fontWeight: '700',
  },

  // Form styles
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  fieldDesc: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginBottom: 10,
    lineHeight: 16,
  },
  formInput: {
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  appLogoPreview: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  categoryChipText: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: C.border,
  },
  presetChipActive: {
    backgroundColor: C.primaryContainer,
    borderColor: C.primary,
  },
  presetChipText: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },

  // Permissions Grid
  permGrid: {
    gap: 8,
  },
  permSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  permSelectCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  permSelectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurface,
  },
  permSelectDesc: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    flex: 1,
    marginHorizontal: 12,
  },
  permCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCheckboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: C.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '700',
  },

  // Credentials One-Time Modal
  alertWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: C.error,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  alertWarningTitle: {
    color: C.error,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  alertWarningDesc: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  credText: {
    color: C.secondary,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyBtnText: {
    color: C.secondary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Logs View
  logItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '900',
  },
  logEndpointText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  logMetaText: {
    fontSize: 11,
    color: C.onSurfaceVariant,
  },
  logTimeText: {
    fontSize: 10,
    color: C.onSurfaceVariant,
  },

  // State Views
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    marginTop: 12,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: 'rgba(19, 24, 44, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 14,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },
});
