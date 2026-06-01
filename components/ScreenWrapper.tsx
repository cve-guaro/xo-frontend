import React, { memo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  bottomPad?: number; // extra padding if you want (ex: tab bar height)
  edges?: ("top" | "bottom" | "left" | "right")[];
};

function ScreenWrapperBase({ children, bottomPad = 0, edges = ["top", "left", "right", "bottom"] }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.background}>
      <LinearGradient colors={["#060614", "#0c0c1f"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={edges}>
          {children}
      </SafeAreaView>
    </View>
  );
}

export default memo(ScreenWrapperBase);

const styles = StyleSheet.create({
  background: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1 },
});
