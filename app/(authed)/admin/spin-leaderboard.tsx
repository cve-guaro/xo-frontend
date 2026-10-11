import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdminTheme } from './_layout';

export default function SpinLeaderboardPage() {
  const router = useRouter();
  const { theme: C } = useAdminTheme();
  useEffect(() => {
    router.replace('/admin/spin?tab=leaderboard' as any);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );
}
