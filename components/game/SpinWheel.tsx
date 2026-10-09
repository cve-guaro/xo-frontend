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
  winnerId?: string | null;
  spinDuration?: number; // ms
  onSpinComplete?: () => void;
  status: "waiting" | "locked" | "spinning" | "resolved" | "paid" | "cancelled" | "idle";
  mode?: "5_PLAYER" | "RAIL";
  speakingUserIds?: string[];
};

// Slice colors — matches Image 2 (Green, Cyan/Blue, Orange, Purple)
const SLICE_COLORS = [
  "#16a34a", // Vibrant Green (Image 2)
  "#0284c7", // Vibrant Sky/Cyan Blue (Image 2)
  "#ea580c", // Vibrant Orange (Image 2)
  "#7c3aed", // Vibrant Purple (Image 2)
  "#ef4444", // Red
  "#f59e0b", // Amber/Gold
  "#ec4899", // Pink
  "#06b6d4", // Cyan
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
  winnerId,
  spinDuration = 5000,
  onSpinComplete,
  status,
  mode = "RAIL",
  speakingUserIds = [],
}: SpinWheelProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const idleLoopAnim = useRef(new Animated.Value(0)).current;
  const [hasSpun, setHasSpun] = useState(false);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;
  const is5Player = mode === "5_PLAYER";
  const playerCount = is5Player ? 5 : Math.max(players.length, 1);
  const angleStep = 360 / playerCount;

  const hasStakes = !is5Player && players.some(p => (p as any).stake && (p as any).stake > 0);
  const totalStake = !is5Player ? players.reduce((sum, p) => sum + Number((p as any).stake || 0), 0) : 0;

  // Pre-calculate slices cleanly to prevent render mutation glitches
  const slices = React.useMemo(() => {
    let currentAngle = 0;
    return Array.from({ length: playerCount }).map((_, idx) => {
      const startAngle = currentAngle;
      const angle = (hasStakes && totalStake > 0)
        ? (Number((players[idx] as any)?.stake || 0) / totalStake) * 360
        : angleStep;
      const endAngle = startAngle + angle;
      currentAngle = endAngle;
      return { idx, startAngle, angle, endAngle };
    });
  }, [playerCount, hasStakes, totalStake, players, angleStep]);

  // Infinite slow looping rotation animation for home page preview / idle state
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (!isSpinning && status !== "spinning" && status !== "locked" && status !== "resolved") {
      idleLoopAnim.setValue(0);
      loop = Animated.loop(
        Animated.timing(idleLoopAnim, {
          toValue: 360,
          duration: 18000, // smooth 18-second continuous loop
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        })
      );
      loop.start();
    } else {
      idleLoopAnim.setValue(0);
    }

    return () => {
      loop?.stop();
    };
  }, [isSpinning, status, idleLoopAnim]);

  // Trigger spin animation — ONLY when server has declared a confirmed winner
  useEffect(() => {
    const hasValidWinner = (winnerId !== null && winnerId !== undefined && String(winnerId).length > 0) ||
      (typeof winningSlice === "number" && winningSlice >= 0);

    if ((isSpinning || status === "spinning") && !hasSpun && players.length > 0 && hasValidWinner) {
      // Resolve target slice. Prefer winnerId lookup (immune to array reordering).
      // In 5-player mode, slices are ordered by seatIndex; in Rail mode, by players array position.
      let resolvedSliceIdx = -1;
      const winnerPlayer = winnerId ? players.find(p => String(p.userId) === String(winnerId)) : undefined;
      if (winnerPlayer) {
        resolvedSliceIdx = (is5Player && typeof winnerPlayer.seatIndex === "number" && winnerPlayer.seatIndex >= 0)
          ? winnerPlayer.seatIndex
          : players.indexOf(winnerPlayer);
      } else if (typeof winningSlice === "number" && winningSlice >= 0) {
        resolvedSliceIdx = winningSlice;
      }

      // Never default to slice 0 if the winner cannot be resolved
      if (resolvedSliceIdx < 0 || resolvedSliceIdx >= slices.length) {
        console.warn("[SPIN_WHEEL] Unable to resolve slice for winnerId:", winnerId, "winningSlice:", winningSlice);
        return;
      }

      setHasSpun(true);

      // Calculate exact center angle of winning slice from precomputed slices
      const targetSlice = slices[resolvedSliceIdx];
      const sliceCenterAngle = (targetSlice.startAngle + targetSlice.endAngle) / 2;

      const fullRotations = 9; // fast, satisfying spin
      const finalStopAngle = ((360 - sliceCenterAngle) % 360 + 360) % 360;
      const targetAngle = fullRotations * 360 + finalStopAngle;

      Animated.timing(rotation, {
        toValue: targetAngle,
        duration: spinDuration,
        easing: Easing.bezier(0.12, 0.9, 0.2, 1), // punchy start, long smooth deceleration
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        onSpinComplete?.();
      });
    }

    // Reset when a new round starts
    if ((status === "waiting" || status === "idle") && !isSpinning) {
      rotation.setValue(0);
      setHasSpun(false);
    }
  }, [isSpinning, winningSlice, winnerId, status, players, hasStakes, totalStake, angleStep, is5Player, spinDuration, onSpinComplete]);

  const activeRotateStyle = (isSpinning || status === "spinning" || status === "locked" || status === "resolved")
    ? rotation.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] })
    : idleLoopAnim.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });

  // Collapsed/hidden layouts can briefly report a negative size (window tab-switch
  // on web reports width ≈ 1). Rendering the SVG with a negative size spams
  // "attribute r: A negative value is not valid" and breaks the wheel — skip it.
  if (!size || size <= 0) return null;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {/* Animated wheel */}
      <Animated.View
        style={{
          transform: [{ rotate: activeRotateStyle }],
          width: size,
          height: size,
          zIndex: 2,
          ...(Platform.OS === "web" ? ({ willChange: "transform", touchAction: "pan-y" } as any) : {}),
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
          {/* Slices */}
          <G>
            {slices.map(({ idx, startAngle, angle, endAngle }) => {
              const textAngle = startAngle + angle / 2;
              const textPos = polarToCartesian(cx, cy, r * 0.60, textAngle);
              const color = SLICE_COLORS[idx % SLICE_COLORS.length];
              
              let player: Player | undefined;
              if (is5Player) {
                player = players.find(p => p.seatIndex === idx) || (players[idx]?.seatIndex === undefined ? players[idx] : undefined);
              } else {
                player = players[idx];
              }

              const defaultStakes = [10, 20, 30, 50, 100, 150];
              const stakeVal = player 
                ? Number((player as any).stake || (is5Player ? 100 : defaultStakes[idx % defaultStakes.length]))
                : defaultStakes[idx % defaultStakes.length];

              const stakeLabel = `${stakeVal} ETB`;

              return (
                <G key={idx}>
                  <Path
                    d={getArcPath(cx, cy, r, startAngle, endAngle)}
                    fill={color}
                    stroke="#0b0f19"
                    strokeWidth={2}
                  />

                  {/* 3-Coin Stack Icon on slice */}
                  <G transform={`translate(${textPos.x - 7}, ${textPos.y - 15})`}>
                    <Circle cx={7} cy={3} r={5.5} fill="#fef08a" stroke="#ca8a04" strokeWidth={1} />
                    <Circle cx={7} cy={6} r={5.5} fill="#fde047" stroke="#ca8a04" strokeWidth={1} />
                    <Circle cx={7} cy={9} r={5.5} fill="#facc15" stroke="#ca8a04" strokeWidth={1} />
                  </G>

                  {/* Stake Amount */}
                  <SvgText
                    x={textPos.x}
                    y={textPos.y + 11}
                    fill="#ffffff"
                    fontSize={Math.min(size * 0.038, 11.5)}
                    fontWeight="900"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {stakeLabel}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* Gold Studded Metallic Rim */}
          <Circle cx={cx} cy={cy} r={r * 1.04} stroke="url(#goldGrad)" strokeWidth={size * 0.065} fill="none" />
          <Circle cx={cx} cy={cy} r={r * 1.09} fill="none" stroke="url(#goldGrad)" strokeWidth={2.5} />

          {/* Glowing Bulbs / Lights on the rim */}
          <G>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = i * (360 / 20);
              const pos = polarToCartesian(cx, cy, r * 1.04, angle);
              return (
                <G key={i}>
                  <Circle cx={pos.x} cy={pos.y} r={size * 0.016} fill="#ca8a04" opacity={0.4} />
                  <Circle cx={pos.x} cy={pos.y} r={size * 0.010} fill="#fef08a" />
                </G>
              );
            })}
          </G>

          {/* Center 3D Gold Hub with XO ETHIOPIA logo (Image 2) */}
          <Circle cx={cx} cy={cy} r={r * 0.25} fill="url(#goldGrad)" stroke="#78350f" strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={r * 0.21} fill="url(#centerHubGrad)" stroke="#b45309" strokeWidth={1.5} />
          <SvgText
            x={cx}
            y={cy - 2}
            fill="#000000"
            fontSize={Math.max(size * 0.052, 13)}
            fontWeight="900"
            textAnchor="middle"
            alignmentBaseline="middle"
            letterSpacing={1}
          >
            XO
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 9}
            fill="#000000"
            fontSize={Math.max(size * 0.021, 6.5)}
            fontWeight="900"
            textAnchor="middle"
            alignmentBaseline="middle"
            letterSpacing={0.8}
          >
            ETHIOPIA
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
