// app/(authed)/admin/xo-controls.tsx — XO specific controls
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

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function XOControlsPage() {
  const { token, role, showAlert } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSuperAdmin = role === 'superadmin' || role === 'maintenance';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roomsLocked, setRoomsLocked] = useState(false);
  
  // Live queue stats state
  const [liveStats, setLiveStats] = useState<any>({
    roomStats: {},
    shadowBanned: [],
    activeGamesCount: 0
  });

  const headers = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };

  // Fetch rooms settings config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, { headers });
      if (res.ok) {
        const data = await res.json();
        const config = data.config || data;
        setRoomsLocked(config.rooms_locked === true || config.rooms_locked === 'true');
      }
    } catch (e) {
      console.error('[XO Controls] Fetch settings config failed:', e);
    }
  }, [token]);

  // Toggle Rooms Lock
  const toggleRoomsLock = async (value: boolean) => {
    if (!isSuperAdmin) {
      showAlert('Access Denied', 'Only Super Admins can lock/unlock game rooms.');
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
        body: JSON.stringify({ rooms_locked: value })
      });
      if (res.ok) {
        setRoomsLocked(value);
        showAlert('Rooms Locked State Updated', `Game rooms are now ${value ? 'LOCKED' : 'UNLOCKED'}.`);
      } else {
        showAlert('Error', 'Failed to update rooms lock state.');
      }
    } catch (e) {
      showAlert('Error', 'Failed to contact settings server.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch Live Queue Stats
  const fetchLiveStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/live-queue-stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLiveStats(data);
      }
    } catch (e) {
      console.error('[XO Controls] Fetch live queue stats error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
    fetchLiveStats();
    const statsInterval = setInterval(fetchLiveStats, 3000);
    return () => clearInterval(statsInterval);
  }, [fetchConfig, fetchLiveStats]);

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
            <View key={bet} style={s.betRow}>
              <Text style={s.betStake}>{bet} ETB</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ color: C.secondary, fontSize: 11, fontWeight: '700' }}>
                  {item.searching || 0} searching
                </Text>
                <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '700' }}>
                  {item.liveMatches || 0} live games
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[s.headerBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backCircle}>
            <Ionicons name="arrow-back" size={18} color={C.primary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>XO Game Controls</Text>
            <Text style={s.headerSub}>MATCHMAKING & ROOM REGULATION</Text>
          </View>
        </View>
      </View>

      {/* Game Rooms Lock Switch */}
      <View style={[s.card, { borderColor: roomsLocked ? 'rgba(239,68,68,0.3)' : C.outlineVariant, borderTopWidth: 4, borderTopColor: roomsLocked ? C.error : C.primary, marginBottom: 24 }]}>
        <View style={s.switchRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.cardTitle, roomsLocked && { color: C.error }]}>Game Rooms Emergency Lock</Text>
            <Text style={s.cardSubTitle}>When ON, all matchmaking lobbies (10 ETB up to 10k ETB) are globally disabled. Ongoing matches will not be disrupted.</Text>
          </View>
          <Switch
            value={roomsLocked}
            disabled={!isSuperAdmin || saving}
            onValueChange={toggleRoomsLock}
            trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(253,111,133,0.3)' }}
            thumbColor={roomsLocked ? C.error : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Live Queues */}
      <Text style={s.sectionLabel}>LIVE QUEUES & ACTIVE MATCHES</Text>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} />
      ) : (
        <View style={{ gap: 16 }}>
          {/* Room 1 */}
          {(() => {
            const r1Totals = getRoomTotals([10, 25, 50, 100]);
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>Room 1 - Beginner (10-100 ETB)</Text>
                  <View style={s.livePill}>
                    <Text style={s.livePillText}>{r1Totals.searching} active searchers</Text>
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
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>Room 2 - Intermediate (100-1000 ETB)</Text>
                  <View style={s.livePill}>
                    <Text style={s.livePillText}>{r2Totals.searching} active searchers</Text>
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
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>Room 3 - Advanced (1000-10000 ETB)</Text>
                  <View style={s.livePill}>
                    <Text style={s.livePillText}>{r3Totals.searching} active searchers</Text>
                  </View>
                </View>
                {renderBetBreakdown(combinedBreakdown, [1000, 2500, 5000, 10000])}
              </View>
            );
          })()}
        </View>
      )}

      {/* Shadow Banned List */}
      <View style={{ marginTop: 24 }}>
        <Text style={s.sectionLabel}>SHADOW BANNED COOLDOWNS (3-MIN SPEED LIMIT BANS)</Text>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} />
        ) : (!liveStats.shadowBanned || liveStats.shadowBanned.length === 0) ? (
          <View style={s.emptyState}>
            <Text style={{ color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600' }}>No users currently speed restricted.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {liveStats.shadowBanned.map((sb: any, i: number) => (
              <View key={sb.userId + i} style={s.banCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: C.error, fontSize: 13, fontWeight: '800' }}>
                    {sb.username || sb.number || 'User'}
                  </Text>
                  <View style={s.timeBadge}>
                    <Text style={{ color: C.error, fontSize: 10, fontWeight: '800' }}>
                      {Math.floor(sb.expiresIn / 60)}m {sb.expiresIn % 60}s LEFT
                    </Text>
                  </View>
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Stake Range: {sb.rangeKey} ETB</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, marginTop: 4 }}>User ID: {sb.userId}</Text>
              </View>
            ))}
          </View>
        )}
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
  livePill: {
    backgroundColor: 'rgba(0,218,243,0.08)',
    borderColor: 'rgba(0,218,243,0.2)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  livePillText: { color: C.primary, fontSize: 10, fontWeight: '800' },
  betRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  betStake: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  banCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  timeBadge: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
