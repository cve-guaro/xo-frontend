// components/SkeletonLoading.tsx
// Shiny shimmer animated skeleton loading placeholders for cards, tables, and views.
import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet, DimensionValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 10,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180],
  });

  return (
    <View
      style={[
        styles.skeletonBox,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255, 255, 255, 0.08)",
            "rgba(255, 255, 255, 0.18)",
            "rgba(255, 255, 255, 0.08)",
            "transparent",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Preset: Skeleton Total Balance Card
export const SkeletonBalanceCard = () => (
  <View style={styles.cardWrapper}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <SkeletonBox width={120} height={14} borderRadius={6} />
      <SkeletonBox width={70} height={24} borderRadius={12} />
    </View>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ gap: 8 }}>
        <SkeletonBox width={160} height={32} borderRadius={8} />
        <SkeletonBox width={90} height={18} borderRadius={6} />
      </View>
      <SkeletonBox width={70} height={50} borderRadius={12} />
    </View>
  </View>
);

// Preset: Skeleton Quick Action Cards (3 Tiles)
export const SkeletonQuickTiles = () => (
  <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
    <View style={styles.tileWrapper}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <SkeletonBox width={60} height={12} borderRadius={4} />
      <SkeletonBox width={40} height={10} borderRadius={4} />
    </View>
    <View style={styles.tileWrapper}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <SkeletonBox width={60} height={12} borderRadius={4} />
      <SkeletonBox width={40} height={10} borderRadius={4} />
    </View>
    <View style={styles.tileWrapper}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <SkeletonBox width={60} height={12} borderRadius={4} />
      <SkeletonBox width={40} height={10} borderRadius={4} />
    </View>
  </View>
);

// Preset: Skeleton Spin Card
export const SkeletonSpinCard = () => (
  <View style={styles.spinCardWrapper}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
      <SkeletonBox width={110} height={20} borderRadius={6} />
      <SkeletonBox width={80} height={24} borderRadius={12} />
    </View>
    <SkeletonBox width={240} height={240} borderRadius={120} style={{ marginVertical: 12 }} />
    <SkeletonBox width="100%" height={46} borderRadius={23} style={{ marginTop: 12 }} />
  </View>
);

// Preset: Skeleton List Row
export const SkeletonRow = () => (
  <View style={styles.rowWrapper}>
    <SkeletonBox width={36} height={36} borderRadius={18} />
    <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
      <SkeletonBox width="60%" height={14} borderRadius={6} />
      <SkeletonBox width="40%" height={10} borderRadius={4} />
    </View>
    <SkeletonBox width={70} height={16} borderRadius={6} />
  </View>
);

const styles = StyleSheet.create({
  skeletonBox: {
    backgroundColor: "rgba(22, 20, 42, 0.7)",
    overflow: "hidden",
    position: "relative",
  },
  cardWrapper: {
    backgroundColor: "rgba(14, 12, 30, 0.8)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
    marginTop: 8,
  },
  tileWrapper: {
    flex: 1,
    backgroundColor: "rgba(14, 12, 30, 0.8)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  spinCardWrapper: {
    backgroundColor: "rgba(14, 12, 30, 0.8)",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  rowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14, 12, 30, 0.6)",
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
});
