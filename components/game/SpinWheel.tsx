// components/game/SpinWheel.tsx
// ────────────────────────────────────────────────────────────────────────────
// Animated multiplayer spin wheel for the Spin game.
// Receives player data + winning slice from server, then animates.
// ────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState } from "react";
import { View, Animated, Easing, StyleSheet, Text, Platform } from "react-native";
import Svg, { Circle, Path, G, Text as SvgText, Defs, RadialGradient, Stop, LinearGradient } from "react-native-svg";

type Player = {
  userId: string;
  username: string;
  seatIndex: number;
  avatar?: string | null;
};

type SpinWheelProps = {
  size: number;
  players: Player[];
  isSpinning: boolean;
  winningSlice?: number | null;
  spinDuration?: number; // ms
  onSpinComplete?: () => void;
  status: "waiting" | "locked" | "spinning" | "resolved" | "paid" | "cancelled" | "idle";
  mode?: "5_PLAYER" | "RAIL";
  speakingUserIds?: string[];
};

// Slice colors — vibrant, distinguishable
const SLICE_COLORS = [
  "#8b5cf6", // violet
  "#22c55e", // green
  "#22d3ee", // cyan
  "#f97316", // orange
  "#ef4444", // red
  "#f5b642", // gold
  "#3b82f6", // blue
  "#ec4899", // pink
];

const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
};

const getArcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
    "Z",
  ].join(" ");
};

export default function SpinWheel({
  size,
  players,
  isSpinning,
  winningSlice,
  spinDuration = 5000,
  onSpinComplete,
  status,
  mode = "RAIL",
  speakingUserIds = [],
}: SpinWheelProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [hasSpun, setHasSpun] = useState(false);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.40;
  const is5Player = mode === "5_PLAYER";
  const playerCount = is5Player ? 5 : Math.max(players.length, 1);
  const angleStep = 360 / playerCount;

  const hasStakes = !is5Player && players.some(p => (p as any).stake && (p as any).stake > 0);
  const totalStake = !is5Player ? players.reduce((sum, p) => sum + Number((p as any).stake || 0), 0) : 0;

  // Trigger spin animation
  useEffect(() => {
    if ((isSpinning || status === "spinning") && !hasSpun) {
      setHasSpun(true);
      const safeWinningSlice = (typeof winningSlice === "number" && winningSlice >= 0) ? winningSlice : 0;

      // Calculate final angle to land on the winning slice
      let sliceCenterAngle = 0;
      if (is5Player) {
        // Find winner seatIndex
        const winner = players[safeWinningSlice];
        const winnerSeat = winner ? (winner.seatIndex ?? safeWinningSlice) : safeWinningSlice;
        sliceCenterAngle = winnerSeat * 72 + 36;
      } else if (hasStakes && totalStake > 0) {
        let accumulated = 0;
        const validSlice = Math.min(safeWinningSlice, players.length - 1);
        for (let i = 0; i < validSlice; i++) {
          accumulated += (Number((players[i] as any).stake || 0) / totalStake) * 360;
        }
        const winningAngle = (Number((players[validSlice] as any).stake || 0) / totalStake) * 360;
        sliceCenterAngle = accumulated + winningAngle / 2;
      } else {
        sliceCenterAngle = safeWinningSlice * angleStep + angleStep / 2;
      }

      const fullRotations = 5; // 5 full spins
      const targetAngle = fullRotations * 360 + (360 - sliceCenterAngle);

      Animated.timing(rotation, {
        toValue: targetAngle,
        duration: spinDuration,
        easing: Easing.bezier(0.15, 0.85, 0.25, 1), // fast start, slow end
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        onSpinComplete?.();
      });
    }

    // Reset when a new round starts
    if (status === "waiting" || status === "idle") {
      rotation.setValue(0);
      setHasSpun(false);
    }
  }, [isSpinning, winningSlice, status, players, hasStakes, totalStake, angleStep, is5Player]);

  const rotateInterpolation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  let accumulatedAngle = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Base Pedestal / Stand supporting the wheel (Image 2 design) */}
      <View style={{ position: "absolute", bottom: -(size * 0.08), zIndex: 0, alignItems: "center" }}>
        <Svg width={size * 0.48} height={size * 0.22} viewBox="0 0 100 50">
          <Defs>
            <LinearGradient id="standGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1e1b4b" />
              <Stop offset="50%" stopColor="#0f0e26" />
              <Stop offset="100%" stopColor="#060512" />
            </LinearGradient>
            <LinearGradient id="standBorderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <Stop offset="50%" stopColor="#f5b642" stopOpacity={0.9} />
              <Stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
            </LinearGradient>
          </Defs>
          <Path d="M 20 0 L 80 0 L 95 45 Q 98 50 90 50 L 10 50 Q 2 50 5 45 Z" fill="url(#standGrad)" stroke="url(#standBorderGrad)" strokeWidth="1.5" />
          <Path d="M 25 5 L 75 5 L 87 43 L 13 43 Z" fill="none" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="1" />
        </Svg>
      </View>

      {/* Ambient glow */}
      <View
        style={[
          styles.glow,
          {
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: size * 0.65,
            top: -(size * 0.15),
            left: -(size * 0.15),
          },
        ]}
      />

      {/* Animated wheel */}
      <Animated.View
        style={{
          transform: [{ rotate: rotateInterpolation }],
          width: size,
          height: size,
          zIndex: 2,
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="spinGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="35%" stopColor="#fde047" />
              <Stop offset="75%" stopColor="#ca8a04" />
              <Stop offset="100%" stopColor="#854d0e" />
            </RadialGradient>
            <RadialGradient id="wheelGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
              <Stop offset="70%" stopColor="#a855f7" stopOpacity={0.15} />
              <Stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fde047" />
              <Stop offset="50%" stopColor="#ca8a04" />
              <Stop offset="100%" stopColor="#854d0e" />
            </LinearGradient>
          </Defs>

          <Circle cx={cx} cy={cy} r={r * 1.3} fill="url(#spinGlow)" />

          {/* Slices */}
          <G>
            {Array.from({ length: playerCount }).map((_, idx) => {
              const startAngle = accumulatedAngle;
              const angle = (hasStakes && totalStake > 0)
                ? (Number((players[idx] as any).stake || 0) / totalStake) * 360
                : angleStep;
              const endAngle = startAngle + angle;
              accumulatedAngle = endAngle;

              const textAngle = startAngle + angle / 2;
              const textPos = polarToCartesian(cx, cy, r * 0.60, textAngle);
              const color = SLICE_COLORS[idx % SLICE_COLORS.length];
              
              let player: Player | undefined;
              if (is5Player) {
                player = players.find(p => p.seatIndex === idx) || (players[idx]?.seatIndex === undefined ? players[idx] : undefined);
              } else {
                player = players[idx];
              }

              // Abbreviate name to fit (or show 20% Bonus preview when empty)
              const displayName = player
                ? player.username.length > 8
                  ? player.username.slice(0, 7) + "…"
                  : player.username
                : "20%";

              // Include stake percentage or ETB amount under name
              let details = "";
              let isSpeaking = false;
              if (player) {
                isSpeaking = Array.isArray(speakingUserIds) && speakingUserIds.some(id => String(id) === String(player.userId));
                const stakeVal = Number((player as any).stake || (is5Player ? 100 : 0));
                if (is5Player) {
                  details = `${stakeVal} ETB (20%)`;
                } else if (totalStake > 0) {
                  const pct = Math.round((stakeVal / totalStake) * 100);
                  details = `${stakeVal} ETB (${pct}%)`;
                } else {
                  details = `${stakeVal} ETB`;
                }
              } else {
                details = "Bonus";
              }

              return (
                <G key={idx}>
                  <Path
                    d={getArcPath(cx, cy, r, startAngle, endAngle)}
                    fill={color}
                    stroke="#12172a"
                    strokeWidth={2}
                  />
                  {!!displayName && (
                    <SvgText
                      x={textPos.x}
                      y={textPos.y - (details ? 6 : 0)}
                      fill={isSpeaking ? "#34d399" : "#ffffff"}
                      fontSize={Math.min(size * 0.038, 13)}
                      fontWeight="900"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {displayName} {isSpeaking ? "🔊" : ""}
                    </SvgText>
                  )}
                  {!!details && (
                    <SvgText
                      x={textPos.x}
                      y={textPos.y + 8}
                      fill="#e2e8f0"
                      fontSize={Math.min(size * 0.032, 10)}
                      fontWeight="600"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {details}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </G>

          {/* Gold Rim */}
          <Circle cx={cx} cy={cy} r={r * 1.04} stroke="url(#goldGrad)" strokeWidth={size * 0.06} fill="none" />
          <Circle cx={cx} cy={cy} r={r * 1.09} fill="none" stroke="url(#goldGrad)" strokeWidth={3} />

          {/* Glowing Bulbs / Lights on the rim */}
          <G>
            {Array.from({ length: 18 }).map((_, i) => {
              const angle = i * (360 / 18);
              const pos = polarToCartesian(cx, cy, r * 1.04, angle);
              const isYellow = i % 2 === 0;
              return (
                <G key={i}>
                  <Circle cx={pos.x} cy={pos.y} r={size * 0.018} fill={isYellow ? "#ca8a04" : "#ec4899"} opacity={0.4} />
                  <Circle cx={pos.x} cy={pos.y} r={size * 0.010} fill={isYellow ? "#fef08a" : "#fbcfe8"} />
                </G>
              );
            })}
          </G>

          {/* Center 3D gold hub */}
          <Circle cx={cx} cy={cy} r={r * 0.22} fill="url(#goldGrad)" />
          <Circle cx={cx} cy={cy} r={r * 0.18} fill="url(#centerHubGrad)" stroke="#78350f" strokeWidth={1.5} />
          <SvgText
            x={cx}
            y={cy + 1}
            fill="#f5b642"
            fontSize={Math.max(size * 0.045, 11)}
            fontWeight="900"
            textAnchor="middle"
            alignmentBaseline="middle"
            letterSpacing={0.5}
          >
            SPIN
          </SvgText>
        </Svg>
      </Animated.View>

      {/* Red Pointer with Inner White Triangle pointing down at top (Target Design Image 2) */}
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "none", zIndex: 10 }]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="redPointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#ff2a4b" />
              <Stop offset="60%" stopColor="#dc2626" />
              <Stop offset="100%" stopColor="#991b1b" />
            </LinearGradient>
            <LinearGradient id="pointerGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fef08a" />
              <Stop offset="100%" stopColor="#ca8a04" />
            </LinearGradient>
          </Defs>
          <G>
            {/* Outer Drop Shadow */}
            <Path
              d={`M ${cx - size * 0.07} ${cy - r * 1.25} L ${cx + size * 0.07} ${cy - r * 1.25} L ${cx} ${cy - r * 0.94} Z`}
              fill="rgba(0,0,0,0.6)"
            />
            {/* Main Outer Red Triangle Pointer */}
            <Path
              d={`M ${cx - size * 0.065} ${cy - r * 1.26} L ${cx + size * 0.065} ${cy - r * 1.26} L ${cx} ${cy - r * 0.96} Z`}
              fill="url(#redPointerGrad)"
              stroke="url(#pointerGoldBorder)"
              strokeWidth={2}
            />
            {/* Inner White Triangle */}
            <Path
              d={`M ${cx - size * 0.03} ${cy - r * 1.23} L ${cx + size * 0.03} ${cy - r * 1.23} L ${cx} ${cy - r * 1.05} Z`}
              fill="#ffffff"
            />
          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(124, 58, 237, 0.12)",
  },
  pointer: {
    position: "absolute",
    zIndex: 10,
  },
});
