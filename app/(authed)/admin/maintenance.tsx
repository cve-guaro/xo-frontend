import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AdminTheme as C } from './_layout';
import { useAuth } from '../../../context/authContext';
import { useToast } from '../../../context/ToastContext';
import { API_URL } from '../../../config';
import ActionConfirmModal from '../../../components/ActionConfirmModal';

export default function Maintenance() {
  const router = useRouter();
  const { token, user, isSuperAdmin } = useAuth();
  const toast = useToast();
  
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [whitelistIdentifier, setWhitelistIdentifier] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    key: string;
    currentValue: any;
    title: string;
    message: string;
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    confirmColor: 'red' | 'yellow' | 'blue';
  } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/maintenance/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      toast.error('Error', 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSettings();
  }, [token]);

  const requestToggle = (key: string, currentValue: any, title: string, message: string, iconName: React.ComponentProps<typeof Ionicons>['name'], confirmColor: 'red' | 'yellow' | 'blue') => {
    setConfirmModal({
      visible: true,
      key,
      currentValue,
      title,
      message,
      iconName,
      confirmColor
    });
  };

  const confirmToggle = async () => {
    if (!confirmModal) return;
    const { key, currentValue } = confirmModal;
    setConfirmModal(null);
    
    try {
      setIsUpdating(true);
      const newValue = !(currentValue === true || currentValue === 'true');
      
      // Optimistic UI update
      setSettings(prev => ({ ...prev, [key]: newValue }));

      const res = await fetch(`${API_URL}/admin/maintenance/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ key, value: newValue })
      });

      if (!res.ok) throw new Error('Failed to update');
      toast.success('Updated', `Setting ${key} updated successfully.`);
    } catch (e) {
      // Revert optimistic update
      setSettings(prev => ({ ...prev, [key]: currentValue }));
      toast.error('Error', 'Failed to update setting');
    } finally {
      setIsUpdating(false);
    }
  };

  const addWhitelist = async () => {
    if (!whitelistIdentifier.trim()) return;
    try {
      setIsUpdating(true);
      const res = await fetch(`${API_URL}/admin/maintenance/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ identifier: whitelistIdentifier.trim() })
      });
      
      if (res.ok) {
        toast.success('Added', `User added to whitelist`);
        setWhitelistIdentifier('');
        fetchSettings(); // Refresh whitelist
      } else {
        toast.error('Error', 'Failed to add user');
      }
    } catch (e) {
      toast.error('Error', 'Network error');
    } finally {
      setIsUpdating(false);
    }
  };

  const removeWhitelist = async (identifier: string) => {
    try {
      setIsUpdating(true);
      const res = await fetch(`${API_URL}/admin/maintenance/whitelist/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ identifier })
      });
      
      if (res.ok) {
        toast.success('Removed', `User removed from whitelist`);
        fetchSettings();
      } else {
        toast.error('Error', 'Failed to remove user');
      }
    } catch (e) {
      toast.error('Error', 'Network error');
    } finally {
      setIsUpdating(false);
    }
  };

  const isEmergencyLocked = settings['system_emergency_lockout'] === true || settings['system_emergency_lockout'] === 'true';
  const whitelist = Array.isArray(settings['lockdown_whitelist']) ? settings['lockdown_whitelist'] : [];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const FeatureRow = ({ title, desc, featureKey, warning }: { title: string, desc: string, featureKey: string, warning?: boolean }) => {
    const isActive = settings[featureKey] === true || settings[featureKey] === 'true';
    return (
      <View style={s.featureRow}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={s.featureTitle}>{title}</Text>
          <Text style={s.featureDesc}>{desc}</Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={() => requestToggle(
            featureKey, 
            isActive, 
            isActive ? `Disable ${title}?` : `Enable ${title}?`,
            `Are you sure you want to ${isActive ? 'disable' : 'enable'} this feature system-wide?`,
            warning ? 'warning' : 'settings',
            warning ? 'red' : 'blue'
          )}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: warning ? C.error : C.primary }}
          thumbColor={isActive ? '#fff' : '#aaa'}
          disabled={isUpdating}
        />
      </View>
    );
  };

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View>
          <Text style={s.pageTitle}>System Maintenance</Text>
          <Text style={s.pageSubtitle}>System operational toggles, maintenance mode, and emergency access</Text>
        </View>
      </View>

      {/* API & Mini-App Infrastructure Gateway Card */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/admin/miniapps' as any)}
        style={[s.card, { borderColor: 'rgba(124,58,237,0.4)', backgroundColor: 'rgba(19, 24, 44, 0.85)' }]}
      >
        <LinearGradient
          colors={['rgba(124,58,237,0.18)', 'rgba(34,211,238,0.08)']}
          style={{ ...StyleSheet.absoluteFillObject, borderRadius: 24 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 12 }}>
            <View style={[s.iconBg, { backgroundColor: 'rgba(124,58,237,0.25)', width: 46, height: 46, borderRadius: 14 }]}>
              <Ionicons name="apps" size={24} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.cardTitle, { marginBottom: 2 }]}>API & Mini-App Controller</Text>
                <View style={{ backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: C.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>LOCKED GATE</Text>
                </View>
              </View>
              <Text style={[s.cardDesc, { marginBottom: 0 }]}>
                Manage registered developer mini-apps, API credentials, permission scopes, rate limits, and audit logs.
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: C.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Emergency Lockout Card */}
      <LinearGradient colors={isEmergencyLocked ? ['rgba(253,111,133,0.15)', 'rgba(138,22,50,0.1)'] : ['rgba(167,139,250,0.1)', 'rgba(0,218,243,0.05)']} style={[s.card, isEmergencyLocked && { borderColor: 'rgba(253,111,133,0.3)' }]}>
        <View style={s.lockdownHeader}>
          <View style={s.lockdownTitleWrap}>
            <View style={[s.iconBg, { backgroundColor: isEmergencyLocked ? 'rgba(253,111,133,0.2)' : 'rgba(166,140,255,0.2)' }]}>
              <Ionicons name="warning" size={20} color={isEmergencyLocked ? C.error : C.primary} />
            </View>
            <Text style={[s.cardTitle, isEmergencyLocked && { color: C.error, textShadowColor: 'rgba(253,111,133,0.5)', textShadowRadius: 10 }]}>Emergency Maintenance Lockout</Text>
          </View>
          <Switch
            value={isEmergencyLocked}
            onValueChange={() => requestToggle(
              'system_emergency_lockout', 
              isEmergencyLocked,
              isEmergencyLocked ? 'Disable Lockdown?' : 'Enable Emergency Lockdown?',
              isEmergencyLocked 
                ? 'Are you sure you want to open the platform to normal users?' 
                : 'WARNING: This will block ALL users from the platform except those on the whitelist.',
              'warning',
              'red'
            )}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: C.error }}
            thumbColor={'#fff'}
            disabled={isUpdating}
          />
        </View>
        <Text style={s.cardDesc}>
          When active, all normal users will be completely blocked from accessing the platform and will see a maintenance screen. Whitelisted users can bypass this.
        </Text>

        {isEmergencyLocked && (
          <View style={s.whitelistContainer}>
            <Text style={s.sectionTitle}>Bypass Whitelist</Text>
            <View style={s.whitelistInputRow}>
              <TextInput
                style={s.input}
                placeholder="Enter phone number or username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={whitelistIdentifier}
                onChangeText={setWhitelistIdentifier}
              />
              <TouchableOpacity style={s.addBtn} onPress={addWhitelist} disabled={isUpdating}>
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={s.whitelistList}>
              {whitelist.map((item, idx) => (
                <View key={idx} style={s.whitelistChip}>
                  <Text style={s.whitelistText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeWhitelist(item)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>
              ))}
              {whitelist.length === 0 && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>No whitelisted users.</Text>}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Feature Toggles */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Payment Features</Text>
        <Text style={s.cardDesc}>Enable or disable payment functionality system-wide.</Text>
        <FeatureRow title="Deposits" desc="Allow users to add funds to their wallet." featureKey="feature_deposits" />
        <FeatureRow title="Withdrawals" desc="Allow users to withdraw their available balance." featureKey="feature_withdrawals" />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Gameplay Features</Text>
        <Text style={s.cardDesc}>Control access to different game modes.</Text>
        <FeatureRow title="Matchmaking" desc="Allow users to search for random opponents." featureKey="feature_matchmaking" />
        <FeatureRow title="Friend Matches" desc="Allow users to invite specific friends." featureKey="feature_friend_match" />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Social & Competition Features</Text>
        <Text style={s.cardDesc}>Manage leaderboards, rewards, and social elements.</Text>
        <FeatureRow title="Master Leaderboard Active" desc="Master switch. When OFF, leaderboard is disabled, UI shows maintenance state, and auto-payout cron is paused." featureKey="leaderboard_enabled" warning={true} />
        <FeatureRow title="Leaderboard Feature" desc="Show the global leaderboard tab to users." featureKey="feature_leaderboard" />
      </View>

    </ScrollView>
      
      <ActionConfirmModal
        visible={confirmModal?.visible || false}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        iconName={confirmModal?.iconName || 'warning'}
        confirmColor={confirmModal?.confirmColor || 'blue'}
        confirmText="Confirm"
        onConfirm={confirmToggle}
        onCancel={() => setConfirmModal(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 60, maxWidth: 800, marginHorizontal: Platform.OS === 'web' ? 'auto' : 0, width: '100%' },
  header: { marginBottom: 30 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: C.onSurface, marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: C.onSurfaceVariant },
  
  card: {
    backgroundColor: 'rgba(24, 24, 27, 0.65)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 6, letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, color: C.onSurfaceVariant, marginBottom: 20, lineHeight: 20 },
  
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lockdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  lockdownTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  featureDesc: { fontSize: 12, color: C.onSurfaceVariant },
  
  whitelistContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.onSurface, marginBottom: 12 },
  whitelistInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#ffffff', fontWeight: 'bold' },
  whitelistList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whitelistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
    gap: 8,
  },
  whitelistText: { color: C.secondary, fontSize: 13, fontWeight: '800' }
});
