// app/(authed)/admin/spin.tsx — Spin Game Management (Admin Portal)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

export default function SpinAdminPage() {
  const { token, role, showAlert } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSuperAdmin = role === 'superadmin' || role === 'maintenance';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botsEnabled, setBotsEnabled] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };

  // Fetch settings config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, { headers });
      if (res.ok) {
        const data = await res.json();
        const config = data.config || data;
        setBotsEnabled(config.spin_bots_enabled === true || config.spin_bots_enabled === 'true');
      }
    } catch (e) {
      console.error('[Spin controls] Fetch config error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Toggle Spin Bots
  const toggleBots = async (value: boolean) => {
    if (!isSuperAdmin) {
      showAlert('Access Denied', 'Only Super Admins can configure bot activities.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify({ spin_bots_enabled: value })
      });
      if (res.ok) {
        setBotsEnabled(value);
        showAlert('Spin Bots State Updated', `Spin wheel bots are now ${value ? 'ACTIVE & ENGAGING' : 'DEACTIVATED'}.`);
      } else {
        showAlert('Error', 'Failed to update bots configuration.');
      }
    } catch (e) {
      showAlert('Error', 'Failed to connect to configuration server.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[s.headerBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backCircle}>
            <Ionicons name="arrow-back" size={18} color={C.primary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Spin Game Dashboard</Text>
            <Text style={s.headerSub}>BOT MANAGEMENT & ACTIVE ROOM VISITS</Text>
          </View>
        </View>
      </View>

      {/* Bot Control Card */}
      <View style={[s.card, { borderTopWidth: 4, borderTopColor: botsEnabled ? '#34d399' : '#a1a1aa', marginBottom: 24 }]}>
        {loading ? (
          <ActivityIndicator color={C.primary} />
        ) : (
          <View style={s.switchRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={s.cardTitle}>Spin Wheel Bot Assistance</Text>
              <Text style={s.cardSubTitle}>
                When active, bots will automatically seed empty seats in Spin Rooms to initiate countdowns and maintain platform liquidity.
              </Text>
            </View>
            <Switch
              value={botsEnabled}
              disabled={!isSuperAdmin || saving}
              onValueChange={toggleBots}
              trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(52,211,153,0.3)' }}
              thumbColor={botsEnabled ? '#34d399' : '#f4f3f4'}
            />
          </View>
        )}
      </View>

      {/* Bot Payout Cost Widget */}
      <View style={[s.card, { marginBottom: 24 }]}>
        <Text style={s.sectionLabel}>BOT PAYOUT COST TRACKING</Text>
        <View style={s.costGrid}>
          <View style={s.costBox}>
            <Text style={s.costBoxLabel}>Paid Out to Humans (Bot Pots)</Text>
            <Text style={[s.costBoxVal, { color: C.success }]}>ETB 0.00</Text>
          </View>
          <View style={s.costBox}>
            <Text style={s.costBoxLabel}>Paid Out to Bots (Total Seeding)</Text>
            <Text style={s.costBoxVal}>ETB 0.00</Text>
          </View>
          <View style={s.costBox}>
            <Text style={s.costBoxLabel}>Net Seeding Expense</Text>
            <Text style={[s.costBoxVal, { color: C.error }]}>ETB 0.00</Text>
          </View>
        </View>
      </View>

      {/* Active Room View */}
      <Text style={s.sectionLabel}>ACTIVE SPIN LOBBIES</Text>
      <View style={{ gap: 16 }}>
        {/* Beginner Room */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Spin L1 - Beginner Lobbies</Text>
            <View style={s.pill}>
              <Text style={s.pillText}>0 Lobbies Active</Text>
            </View>
          </View>
          <View style={s.emptyState}>
            <Ionicons name="game-controller-outline" size={24} color="rgba(255,255,255,0.1)" />
            <Text style={s.emptyStateText}>No Spin Wheel lobbies are running. Lobbies spin up dynamically when players enter.</Text>
          </View>
        </View>

        {/* Intermediate Room */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Spin L2 - High Roller Lobbies</Text>
            <View style={s.pill}>
              <Text style={s.pillText}>0 Lobbies Active</Text>
            </View>
          </View>
          <View style={s.emptyState}>
            <Ionicons name="game-controller-outline" size={24} color="rgba(255,255,255,0.1)" />
            <Text style={s.emptyStateText}>No Spin Wheel lobbies are running. Lobbies spin up dynamically when players enter.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 24, paddingTop: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,218,243,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  card: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cardSubTitle: { color: C.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800' },
  costGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  costBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 12,
  },
  costBoxLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' },
  costBoxVal: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 6 },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  emptyStateText: { color: C.onSurfaceVariant, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
