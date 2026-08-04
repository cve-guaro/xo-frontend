// app/(authed)/admin/spin-leaderboard.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminTheme as C } from './_layout';

export default function SpinLeaderboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/spin?tab=leaderboard' as any);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );
}
