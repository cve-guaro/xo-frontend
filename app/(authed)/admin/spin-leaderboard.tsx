// app/(authed)/admin/spin-leaderboard.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminTheme as C } from './_layout';

export default function SpinLeaderboardPage() {
  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.title}>SPIN LEADERBOARD</Text>
        <Text style={s.subtitle}>High Rollers & Top Winning Spin Players</Text>
      </View>

      <View style={s.comingSoonCard}>
        <Ionicons name="podium-outline" size={48} color={C.primary} style={{ marginBottom: 16 }} />
        <Text style={s.cardTitle}>Leaderboard System Coming Soon</Text>
        <Text style={s.cardDescription}>
          The database and API endpoints for Spin Wheel high rollers are currently under development.
          This view will display player rankings, win streaks, and total accumulated earnings.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20, paddingTop: 32 },
  header: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  subtitle: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '500', marginTop: 2 },
  comingSoonCard: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 20, padding: 40,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 20, minHeight: 280,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cardDescription: { color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 440 },
});
