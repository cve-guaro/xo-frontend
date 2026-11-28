// app/account.tsx
// Direct /account alias route — prevents unmatched 404 redirect loops and renders a dark skeleton while booting.
import React from "react";
import { View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/authContext";
import { colors, space } from "../theme/tokens";
import { SkeletonBox, SkeletonRow } from "../components/SkeletonLoading";

export default function AccountRedirectRoute() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <SkeletonBox width={140} height={24} borderRadius={8} />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(authed)/home/account" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 420,
    gap: space.md,
  },
});
