// app/(authed)/admin/spin-rooms.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SpinRoomsPage() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [spinLive, setSpinLive] = useState<any[]>([]);

  const headers = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };

  const fetchSpinLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/spin/live`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSpinLive(data.rooms || []);
      }
    } catch (e) {
      console.error('spin live err', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSpinLive();
    const id = setInterval(fetchSpinLive, 3000);
    return () => clearInterval(id);
  }, [fetchSpinLive]);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>SPIN ROOMS</Text>
          <Text style={s.subtitle}>Live Matchmaking & Active Round Lobbies</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchSpinLive} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#0a0f1c" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : spinLive.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="game-controller-outline" size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: 12 }} />
          <Text style={s.emptyStateText}>No Spin Wheel lobbies are running right now.</Text>
          <Text style={{ color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Lobbies spin up dynamically when players join the queue.</Text>
        </View>
      ) : (
        <View style={isMobile ? { gap: 16 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {spinLive.map((room: any, i: number) => (
            <View key={room.roundId || i} style={[s.liveRoomCard, !isMobile && { width: '48%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.statusDot, { backgroundColor: room.status === 'waiting' ? '#fbbf24' : room.status === 'spinning' ? C.success : C.secondary }]} />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{room.roomName || room.mode}</Text>
                </View>
                <View style={s.liveStatusBadge}>
                  <Text style={{ color: room.status === 'waiting' ? '#fbbf24' : C.success, fontSize: 9, fontWeight: '800' }}>{room.status?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: C.outlineVariant, paddingBottom: 12, marginBottom: 12 }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 13 }}>Players Count: <Text style={{ color: '#fff', fontWeight: '700' }}>{room.realPlayersCount}/{room.maxPlayers}</Text> (bots: {room.botsCount})</Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 13 }}>Lobby Pot: <Text style={{ color: C.success, fontWeight: '700' }}>{fmt(room.pot / 100)} ETB</Text></Text>
                {room.countdown > 0 && <Text style={{ color: C.onSurfaceVariant, fontSize: 13 }}>Countdown Timer: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{room.countdown}s</Text></Text>}
              </View>

              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 }}>LOBBY PLAYERS</Text>
              {room.players && room.players.length > 0 ? (
                <View style={{ gap: 6 }}>
                  {room.players.map((p: any, pi: number) => (
                    <View key={pi} style={s.livePlayerRow}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>#{p.seatIndex + 1}</Text>
                      <Text style={{ color: p.isBot ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: 12, fontWeight: '700', flex: 1 }}>{p.username}{p.isBot ? ' (Bot)' : ''}</Text>
                      <Text style={{ color: C.success, fontSize: 12, fontWeight: '700' }}>{fmt(p.stake / 100)} ETB</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>No players in lobby.</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20, paddingTop: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  subtitle: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '500', marginTop: 2 },
  refreshBtn: { backgroundColor: C.primary, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyState: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  emptyStateText: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 8 },
  liveRoomCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 20, padding: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  liveStatusBadge: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.outlineVariant, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  livePlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant },
});
