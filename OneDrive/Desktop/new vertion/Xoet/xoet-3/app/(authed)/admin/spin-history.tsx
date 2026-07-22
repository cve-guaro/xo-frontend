// app/(authed)/admin/spin-history.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeFmt = (d: string) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function SpinHistoryPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spinHistory, setSpinHistory] = useState<any[]>([]);
  const [spinHistoryPage, setSpinHistoryPage] = useState(0);
  const [spinHistoryTotal, setSpinHistoryTotal] = useState(0);

  const headers = { Authorization: `Bearer ${token}`, 'x-platform': 'web' };

  const fetchSpinHistory = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/spin/history?page=${page}&limit=10`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSpinHistory(data.rounds || []);
        setSpinHistoryTotal(data.total || 0);
        setSpinHistoryPage(page);
      }
    } catch (e) {
      console.error('spin history err', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSpinHistory(0);
  }, [fetchSpinHistory]);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>SPIN HISTORY</Text>
          <Text style={s.subtitle}>Rounds log of completed Spin Wheel matches</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => fetchSpinHistory(spinHistoryPage)} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#0a0f1c" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : spinHistory.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="time-outline" size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: 12 }} />
          <Text style={s.emptyStateText}>No spin history records found.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {spinHistory.map((round: any, i: number) => (
            <View key={round.id || i} style={s.historyCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={[s.historyStatusPill, { borderColor: round.status === 'paid' ? 'rgba(34,197,94,0.3)' : 'rgba(245,57,57,0.3)' }]}>
                  <Text style={{ color: round.status === 'paid' ? C.success : C.error, fontSize: 9, fontWeight: '800' }}>{round.status?.toUpperCase()}</Text>
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>{timeFmt(round.created_at)}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View>
                  <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '800' }}>Winner: {round.winner_username || '—'}</Text>
                  {round.winner_phone && <Text style={{ color: C.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>{round.winner_phone}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: C.success, fontSize: 15, fontWeight: '900' }}>+{fmt((round.prize_amount || 0) / 100)} ETB</Text>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>Pot: {fmt((round.pot_amount || 0) / 100)} ETB</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: C.outlineVariant, paddingTop: 8, marginTop: 4 }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Config ID: <Text style={{ color: '#fff' }}>{round.config_id}</Text></Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Players: <Text style={{ color: '#fff' }}>{round.real_players} real / {round.total_players} total</Text></Text>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>Winning Slice: <Text style={{ color: C.secondary }}>#{round.winning_slice ?? '—'}</Text></Text>
              </View>
            </View>
          ))}

          {/* Pagination */}
          {spinHistoryTotal > 10 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                disabled={spinHistoryPage === 0}
                onPress={() => fetchSpinHistory(spinHistoryPage - 1)}
                style={[s.pageBtn, spinHistoryPage === 0 && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-back" size={14} color={C.primary} />
                <Text style={s.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <View style={{ justifyContent: 'center' }}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>Page {spinHistoryPage + 1} of {Math.ceil(spinHistoryTotal / 10)}</Text>
              </View>
              <TouchableOpacity
                disabled={(spinHistoryPage + 1) * 10 >= spinHistoryTotal}
                onPress={() => fetchSpinHistory(spinHistoryPage + 1)}
                style={[s.pageBtn, (spinHistoryPage + 1) * 10 >= spinHistoryTotal && { opacity: 0.3 }]}
              >
                <Text style={s.pageBtnText}>Next</Text>
                <Ionicons name="chevron-forward" size={14} color={C.primary} />
              </TouchableOpacity>
            </View>
          )}
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
  emptyState: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyStateText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historyCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 20, padding: 18 },
  historyStatusPill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant },
  pageBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },
});
