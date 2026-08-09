// app/(authed)/admin/xo-controls.tsx — XO specific controls with 3-Switch Granular Locks
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
import { SkeletonRow } from '../../../components/SkeletonLoading';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function XOControlsPage() {
  const { token, user, isSuperAdmin, showAlert } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 3 Granular XO Lock Switches
  const [xoLockAll, setXoLockAll] = useState(false);
  const [xoLockRooms, setXoLockRooms] = useState(false);
  const [xoLockFriends, setXoLockFriends] = useState(false);

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
        const lockAll = config.xo_lock_all === true || config.xo_lock_all === 'true' || config.rooms_locked === true || config.rooms_locked === 'true';
        setXoLockAll(lockAll);
        setXoLockRooms(config.xo_lock_rooms === true || config.xo_lock_rooms === 'true');
        setXoLockFriends(config.xo_lock_friends === true || config.xo_lock_friends === 'true');
      }
    } catch (e) {
      console.error('[XO Controls] Fetch settings config failed:', e);
    }
  }, [token]);

  // Toggle Granular XO Lock Switch
  const toggleXoLockSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    if (!isSuperAdmin) {
      showAlert('Access Denied', 'Only Super Admins can update system lock controls.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { [key]: value };
      if (key === 'xo_lock_all') {
        payload.rooms_locked = value; // Keep backward compatibility
      }
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setter(value);
        showAlert('XO Lock Controls Updated', `${key.replace(/_/g, ' ').toUpperCase()} is now ${value ? 'LOCKED' : 'UNLOCKED'}.`);
      } else {
        showAlert('Error', 'Failed to update lock configuration.');
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
      if (combinedBreakdown[b]) {
        searching += combinedBreakdown[b].searching;
        liveMatches += combinedBreakdown[b].liveMatches;
      }
    });
    return { searching, liveMatches };
  };

  const renderBetBreakdown = (bets: number[]) => {
    const breakdown = combinedBreakdown;
    return (
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 }}>
        {bets.map(bet => {
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
            <Text style={s.headerSub}>MATCHMAKING & 3-SWITCH GRANULAR ROOM REGULATION</Text>
          </View>
        </View>
      </View>

      {/* 3-Switch Granular XO Lock Controls */}
      <View style={s.lockSectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Ionicons name="lock-closed" size={20} color={xoLockAll ? C.error : C.primary} />
          <View>
            <Text style={s.sectionHeaderTitle}>XO 3-SWITCH LOCK CONTROL PANEL</Text>
            <Text style={s.sectionHeaderSub}>Manage global emergency locks for matchmaking rooms and friend requests.</Text>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          {/* Switch 1: Lock ALL XO */}
          <View style={[s.switchRowBox, xoLockAll && s.switchRowBoxActive]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.switchTitle, xoLockAll && { color: C.error }]}>Switch 1: Lock ALL XO Games</Text>
                {xoLockAll && <View style={s.activeLockBadge}><Text style={s.activeLockText}>LOCKED</Text></View>}
              </View>
              <Text style={s.switchDesc}>Locks BOTH public matchmaking rooms AND direct friend requests globally.</Text>
            </View>
            <Switch
              value={xoLockAll}
              disabled={!isSuperAdmin || saving}
              onValueChange={(val) => toggleXoLockSetting('xo_lock_all', val, setXoLockAll)}
              trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(239,68,68,0.35)' }}
              thumbColor={xoLockAll ? C.error : '#f4f3f4'}
            />
          </View>

          {/* Switch 2: Lock Rooms Only */}
          <View style={[s.switchRowBox, xoLockRooms && s.switchRowBoxActive]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.switchTitle, xoLockRooms && { color: '#f59e0b' }]}>Switch 2: Lock Rooms Only</Text>
                {xoLockRooms && <View style={[s.activeLockBadge, { backgroundColor: 'rgba(245,158,11,0.2)' }]}><Text style={[s.activeLockText, { color: '#f59e0b' }]}>LOCKED</Text></View>}
              </View>
              <Text style={s.switchDesc}>Locks public matchmaking lobbies only. Direct friend requests remain open.</Text>
            </View>
            <Switch
              value={xoLockRooms}
              disabled={!isSuperAdmin || saving}
              onValueChange={(val) => toggleXoLockSetting('xo_lock_rooms', val, setXoLockRooms)}
              trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(245,158,11,0.35)' }}
              thumbColor={xoLockRooms ? '#f59e0b' : '#f4f3f4'}
            />
          </View>

          {/* Switch 3: Lock Friend Requests Only */}
          <View style={[s.switchRowBox, xoLockFriends && s.switchRowBoxActive]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.switchTitle, xoLockFriends && { color: '#38bdf8' }]}>Switch 3: Lock Friend Requests Only</Text>
                {xoLockFriends && <View style={[s.activeLockBadge, { backgroundColor: 'rgba(56,189,248,0.2)' }]}><Text style={[s.activeLockText, { color: '#38bdf8' }]}>LOCKED</Text></View>}
              </View>
              <Text style={s.switchDesc}>Locks direct 1v1 friend challenges. Matchmaking rooms remain open.</Text>
            </View>
            <Switch
              value={xoLockFriends}
              disabled={!isSuperAdmin || saving}
              onValueChange={(val) => toggleXoLockSetting('xo_lock_friends', val, setXoLockFriends)}
              trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(56,189,248,0.35)' }}
              thumbColor={xoLockFriends ? '#38bdf8' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* Live Queues */}
      <Text style={s.sectionLabel}>LIVE QUEUES & ACTIVE MATCHES</Text>
      {loading ? (
        <View style={{ gap: 12, marginVertical: 16 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Room 1 */}
          {(() => {
            const r1Totals = getRoomTotals([10, 25, 50, 100]);
            return (
              <View style={s.card}>
                <View style={s.roomHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.statusDot, { backgroundColor: '#38bdf8' }]} />
                    <Text style={s.cardTitle}>Room 1 — Beginner (10 - 100 ETB)</Text>
                  </View>
                </View>
                <View style={s.statsGrid}>
                  <View style={s.statBox}>
                    <Text style={s.statLabel}>Searching Players</Text>
                    <Text style={[s.statVal, { color: C.secondary }]}>{r1Totals.searching}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statLabel}>Live Matches</Text>
                    <Text style={[s.statVal, { color: '#a78bfa' }]}>{r1Totals.liveMatches}</Text>
                  </View>
                </View>
                {renderBetBreakdown([10, 25, 50, 100])}
              </View>
            );
          })()}

          {/* Room 2 */}
          {(() => {
            const r2Totals = getRoomTotals([100, 250, 500, 1000]);
            return (
              <View style={s.card}>
                <View style={s.roomHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.statusDot, { backgroundColor: C.secondary }]} />
                    <Text style={s.cardTitle}>Room 2 — Intermediate (100 - 1,000 ETB)</Text>
                  </View>
                </View>
                <View style={s.statsGrid}>
                  <View style={s.statBox}>
                    <Text style={s.statLabel}>Searching Players</Text>
                    <Text style={[s.statVal, { color: C.secondary }]}>{r2Totals.searching}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statLabel}>Live Matches</Text>
                    <Text style={[s.statVal, { color: '#a78bfa' }]}>{r2Totals.liveMatches}</Text>
                  </View>
                </View>
                {renderBetBreakdown([100, 250, 500, 1000])}
              </View>
            );
          })()}

          {/* Room 3 */}
          {(() => {
            const r3Totals = getRoomTotals([1000, 2500, 5000, 7500, 10000]);
            return (
              <View style={s.card}>
                <View style={s.roomHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.statusDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={s.cardTitle}>Room 3 — Advanced (1,000 - 10,000 ETB)</Text>
                  </View>
                </View>
                <View style={s.statsGrid}>
                  <View style={s.statBox}>
                    <Text style={s.statLabel}>Searching Players</Text>
                    <Text style={[s.statVal, { color: C.secondary }]}>{r3Totals.searching}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statLabel}>Live Matches</Text>
                    <Text style={[s.statVal, { color: '#a78bfa' }]}>{r3Totals.liveMatches}</Text>
                  </View>
                </View>
                {renderBetBreakdown([1000, 2500, 5000, 7500, 10000])}
              </View>
            );
          })()}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    padding: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: C.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  lockSectionCard: {
    backgroundColor: 'rgba(17,17,25,0.8)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionHeaderSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  switchRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  switchRowBoxActive: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  switchTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  switchDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  activeLockBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeLockText: {
    color: C.error,
    fontSize: 9,
    fontWeight: '900',
  },
  sectionLabel: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(17,17,25,0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  betRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  betStake: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
