import React, { useEffect, useRef } from "react";
import { View, Animated, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SpeakingWaveAnimation() {
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(12)).current;
  const bar3 = useRef(new Animated.Value(8)).current;
  const bar4 = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, min: number, max: number, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration, useNativeDriver: false }),
          Animated.timing(anim, { toValue: min, duration, useNativeDriver: false }),
        ])
      );

    const anim1 = createLoop(bar1, 4, 18, 250);
    const anim2 = createLoop(bar2, 3, 16, 320);
    const anim3 = createLoop(bar3, 5, 20, 280);
    const anim4 = createLoop(bar4, 4, 14, 350);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
    };
  }, [bar1, bar2, bar3, bar4]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 18, gap: 2, marginLeft: 6 }}>
      <Animated.View style={{ width: 3, height: bar1, backgroundColor: "#22c55e", borderRadius: 2 }} />
      <Animated.View style={{ width: 3, height: bar2, backgroundColor: "#22c55e", borderRadius: 2 }} />
      <Animated.View style={{ width: 3, height: bar3, backgroundColor: "#22c55e", borderRadius: 2 }} />
      <Animated.View style={{ width: 3, height: bar4, backgroundColor: "#22c55e", borderRadius: 2 }} />
    </View>
  );
}

export function AnimatedUserMicButton({
  isSelf,
  isBot,
  isMutedLocally,
  isRemoteMuted,
  isSpeaking,
  onPress,
}: {
  isSelf?: boolean;
  isBot?: boolean;
  isMutedLocally?: boolean;
  isRemoteMuted?: boolean;
  isSpeaking?: boolean;
  onPress: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isSpeaking) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 380, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== "web" }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isSpeaking, pulseAnim]);

  let iconName: "mic" | "mic-off" | "volume-mute" = "mic";
  let activeColor = "#22c55e";
  let activeBg = "rgba(34, 197, 94, 0.22)";
  let activeBorder = "#22c55e";

  if (isBot) {
    iconName = "mic-off";
    activeColor = "#475569";
    activeBg = "rgba(15, 23, 42, 0.4)";
    activeBorder = "rgba(255, 255, 255, 0.05)";
  } else if (isSelf) {
    if (isMutedLocally) {
      iconName = "mic-off";
      activeColor = "#64748b";
      activeBg = "rgba(100, 116, 139, 0.15)";
      activeBorder = "rgba(100, 116, 139, 0.35)";
    } else {
      iconName = "mic";
      activeColor = isSpeaking ? "#22c55e" : "#3ddc78";
      activeBg = isSpeaking ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.18)";
      activeBorder = "#22c55e";
    }
  } else if (isMutedLocally) {
    iconName = "volume-mute";
    activeColor = "#f43f5e";
    activeBg = "rgba(244, 63, 94, 0.18)";
    activeBorder = "#f43f5e";
  } else if (isRemoteMuted) {
    iconName = "mic-off";
    activeColor = "#64748b";
    activeBg = "rgba(100, 116, 139, 0.12)";
    activeBorder = "rgba(100, 116, 139, 0.25)";
  } else if (isSpeaking) {
    iconName = "mic";
    activeColor = "#22c55e";
    activeBg = "rgba(34, 197, 94, 0.3)";
    activeBorder = "#22c55e";
  } else {
    iconName = "mic";
    activeColor = "#00f0ff";
    activeBg = "rgba(0, 240, 255, 0.12)";
    activeBorder = "rgba(0, 240, 255, 0.35)";
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: isBot ? 0.35 : 1,
      }}
      activeOpacity={0.8}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1.5,
          borderColor: activeBorder,
          backgroundColor: activeBg,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Ionicons name={iconName} size={18} color={activeColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}
