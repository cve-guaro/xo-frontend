// components/game/SpinWheel.tsx
// ────────────────────────────────────────────────────────────────────────────
// Animated multiplayer spin wheel for the Spin game.
// Receives player data + winning slice from server, then animates.
// ────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState } from "react";
import { View, Animated, Easing, StyleSheet, Text, Platform } from "react-native";
import Svg, { Circle, Path, G, Rect, Text as SvgText, Defs, RadialGradient, Stop, LinearGradient } from "react-native-svg";
import { initPinTickAudio, playPinTick, playWhooshSound, startSpinSoundLoop, stopSpinSoundLoop } from "../../lib/pinTickAudio";

export const SPIN_PALETTE = [
  { name: 'Bitcoin Gold',     light: '#F59E0B', mid: '#D97706', dark: '#78350F', hex: '#F59E0B', accent: '#FEF08A' },
  { name: 'Turquoise Cyan',   light: '#06B6D4', mid: '#0891B2', dark: '#0E7490', hex: '#06B6D4', accent: '#67E8F9' },
  { name: 'Emerald Green',    light: '#10B981', mid: '#059669', dark: '#064E3B', hex: '#10B981', accent: '#6EE7B7' },
  { name: 'Bright Orange',    light: '#F97316', mid: '#EA580C', dark: '#7C2D12', hex: '#F97316', accent: '#FDBA74' },
  { name: 'Crimson Red',      light: '#EF4444', mid: '#DC2626', dark: '#7F1D1D', hex: '#EF4444', accent: '#FCA5A5' },
  { name: 'Royal Violet',     light: '#8B5CF6', mid: '#7C3AED', dark: '#4C1D95', hex: '#8B5CF6', accent: '#DDD6FE' },
  { name: 'Magenta Pink',     light: '#EC4899', mid: '#DB2777', dark: '#831843', hex: '#EC4899', accent: '#FBCFE8' },
  { name: 'Sea Green / Mint', light: '#14B8A6', mid: '#0D9488', dark: '#134E4A', hex: '#14B8A6', accent: '#5EEAD4' },
  { name: 'Ruby Scarlet',     light: '#E11D48', mid: '#BE123C', dark: '#881337', hex: '#E11D48', accent: '#FDA4AF' },
  { name: 'Amber Glow',       light: '#FBBF24', mid: '#D97706', dark: '#78350F', hex: '#FBBF24', accent: '#FEF3C7' },
];

export const getPlayerPalette = (player: any, idx: number, currentUserId?: string) => {
  const isUser = Boolean(
    (currentUserId && String(player?.userId) === String(currentUserId)) ||
    player?.isUser ||
    (currentUserId && String(player?.id) === String(currentUserId))
  );
  if (isUser) {
    return SPIN_PALETTE[0]; // Purple (YOU)
  }
  const oppIdx = (idx % (SPIN_PALETTE.length - 1)) + 1;
  return SPIN_PALETTE[oppIdx];
};

type Player = {
  userId: string;
  username: string;
  seatIndex: number;
  avatar?: string | null;
  stake?: number;
  percent?: number;
  isUser?: boolean;
};

type SpinWheelProps = {
  size: number;
  players: Player[];
  isSpinning: boolean;
  winningSlice?: number | null;
  winnerId?: string | null;
  winnerName?: string | null;
  prizeAmount?: number | null;
  spinDuration?: number; // ms
  onSpinComplete?: () => void;
  status: "waiting" | "locked" | "spinning" | "resolved" | "paid" | "cancelled" | "idle";
  mode?: "5_PLAYER" | "RAIL";
  speakingUserIds?: string[];
  countdown?: number;
  countdownText?: string;
  currentUserId?: string;
  flashingUserIds?: string[];
};

// Sample realistic players matching Reference Mockup Image
const SAMPLE_PREVIEW_PLAYERS: Player[] = [
  { userId: "p1", username: "yared", seatIndex: 0, stake: 200, percent: 20 } as any,
  { userId: "p2", username: "messi", seatIndex: 1, stake: 200, percent: 20 } as any,
  { userId: "p3", username: "yenat", seatIndex: 2, stake: 200, percent: 20 } as any,
  { userId: "p4", username: "abebe", seatIndex: 3, stake: 200, percent: 20 } as any,
  { userId: "p5", username: "dawit", seatIndex: 4, stake: 200, percent: 20 } as any,
  { userId: "user", username: "GUEST_2", seatIndex: 5, stake: 200, percent: 20, isUser: true } as any,
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

// Image 2 Separated Bounded Slice Helper (draws distinct plaque/wedge with angular gaps)
const getSeparatedSlicePath = (
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
  gapDeg: number = 1.4
) => {
  const span = endAngle - startAngle;
  const actualGap = Math.min(gapDeg, span * 0.15);
  const a1 = startAngle + actualGap;
  const a2 = endAngle - actualGap;
  const largeArcFlag = (a2 - a1) <= 180 ? "0" : "1";

  const pOuterStart = polarToCartesian(cx, cy, outerR, a1);
  const pOuterEnd = polarToCartesian(cx, cy, outerR, a2);
  const pInnerEnd = polarToCartesian(cx, cy, innerR, a2);
  const pInnerStart = polarToCartesian(cx, cy, innerR, a1);

  return [
    "M", pInnerStart.x, pInnerStart.y,
    "L", pOuterStart.x, pOuterStart.y,
    "A", outerR, outerR, 0, largeArcFlag, 1, pOuterEnd.x, pOuterEnd.y,
    "L", pInnerEnd.x, pInnerEnd.y,
    "A", innerR, innerR, 0, largeArcFlag, 0, pInnerStart.x, pInnerStart.y,
    "Z",
  ].join(" ");
};

export default function SpinWheel({
  size,
  players,
  isSpinning,
  winningSlice,
  winnerId,
  winnerName,
  prizeAmount,
  spinDuration = 5000,
  onSpinComplete,
  status,
  mode = "RAIL",
  speakingUserIds = [],
  countdown,
  countdownText,
  currentUserId,
  flashingUserIds = [],
}: SpinWheelProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const needleAnim = useRef(new Animated.Value(0)).current;
  const currentAngleRef = useRef(0);
  const idleAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasSpunRef = useRef(false);
  const listenerIdRef = useRef<string | null>(null);
  const spinAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [winningSliceFinal, setWinningSliceFinal] = useState<number | null>(null);

  useEffect(() => {
    initPinTickAudio();
    const id = rotation.addListener(({ value }) => {
      currentAngleRef.current = value;
    });
    return () => {
      rotation.removeListener(id);
    };
  }, [rotation]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;
  const is5Player = mode === "5_PLAYER";

  // Use active players or sample preview players from Reference Image
  const activePlayers = (players && players.length > 0) ? players : SAMPLE_PREVIEW_PLAYERS;
  const playerCount = is5Player ? (players.length > 0 ? 5 : activePlayers.length) : Math.max(activePlayers.length, 1);
  const angleStep = 360 / playerCount;

  const hasStakes = activePlayers.some(p => (p as any).stake && (p as any).stake > 0);
  const totalStake = activePlayers.reduce((sum, p) => sum + Number((p as any).stake || 0), 0);

  // Pre-calculate slices cleanly, centering slice 0 directly at 12 o'clock (0 deg)
  const slices = React.useMemo(() => {
    const slice0Angle = (hasStakes && totalStake > 0 && !is5Player)
      ? ((Number((activePlayers[0] as any)?.stake || 0) / totalStake) * 360)
      : angleStep;
    let currentAngle = -slice0Angle / 2;
    return Array.from({ length: playerCount }).map((_, idx) => {
      const startAngle = currentAngle;
      const angle = (hasStakes && totalStake > 0 && !is5Player)
        ? (Number((activePlayers[idx] as any)?.stake || 0) / totalStake) * 360
        : angleStep;
      const endAngle = startAngle + angle;
      currentAngle = endAngle;
      return { idx, startAngle, angle, endAngle };
    });
  }, [playerCount, hasStakes, totalStake, activePlayers, angleStep, is5Player]);

  // Reset wheel upright and centered at 12 o'clock ONLY when in "waiting" state for a new round
  useEffect(() => {
    if (status === "waiting" && !isSpinning) {
      if (idleAnimRef.current) {
        idleAnimRef.current.stop();
        idleAnimRef.current = null;
      }
      rotation.setValue(0);
      currentAngleRef.current = 0;
      hasSpunRef.current = false;
      setWinningSliceFinal(null);
    }
  }, [status, isSpinning, rotation]);

  // Trigger spin animation — executes whenever isSpinning or status === "spinning"
  useEffect(() => {
    if ((isSpinning || status === "spinning") && !hasSpunRef.current) {
      hasSpunRef.current = true;

      // Stop idle animation immediately
      if (idleAnimRef.current) {
        idleAnimRef.current.stop();
        idleAnimRef.current = null;
      }

      // Resolve target slice. Prefer server winningSlice, fallback to winnerId lookup, or default to 0
      let resolvedSliceIdx = -1;
      const validSliceCount = slices.length > 0 ? slices.length : 1;
      if (typeof winningSlice === "number" && winningSlice >= 0 && winningSlice < validSliceCount) {
        resolvedSliceIdx = winningSlice;
      } else if (winnerId && players && players.length > 0) {
        const winnerPlayer = players.find(p => String(p.userId) === String(winnerId));
        if (winnerPlayer) {
          const sIdx = (is5Player && typeof winnerPlayer.seatIndex === "number" && winnerPlayer.seatIndex >= 0)
            ? winnerPlayer.seatIndex
            : players.indexOf(winnerPlayer);
          if (sIdx >= 0 && sIdx < validSliceCount) {
            resolvedSliceIdx = sIdx;
          }
        }
      }
      // Guaranteed safe fallback to slice 0 so the wheel never freezes
      if (resolvedSliceIdx < 0 || resolvedSliceIdx >= validSliceCount) {
        resolvedSliceIdx = 0;
      }

      initPinTickAudio();
      playWhooshSound();

      // Track each of the 20 rim pins passing the top needle (every 18 degrees)
      const PIN_COUNT = 20;
      const pinAngle = 360 / PIN_COUNT; // 18 degrees
      let lastPinHit = Math.floor(currentAngleRef.current / pinAngle);
      let lastTickTs = 0;

      if (listenerIdRef.current !== null) {
        rotation.removeListener(listenerIdRef.current);
      }

      const listenerId = rotation.addListener(({ value }) => {
        const pinHit = Math.floor(value / pinAngle);
        if (pinHit > lastPinHit) {
          lastPinHit = pinHit;
          const now = Date.now();
          // Rate-limit needle jiggle and tick clicks to prevent JS thread freeze
          if (now - lastTickTs > 38) {
            lastTickTs = now;
            playPinTick(0.85);

            needleAnim.setValue(1);
            Animated.timing(needleAnim, {
              toValue: 0,
              duration: 40,
              useNativeDriver: Platform.OS !== "web",
            }).start();
          }
        }
      });
      listenerIdRef.current = listenerId;

      // Calculate exact center angle of winning slice from precomputed slices
      const targetSlice = slices[resolvedSliceIdx] || { startAngle: 0, endAngle: 360 / validSliceCount };
      const sliceCenterAngle = (targetSlice.startAngle + targetSlice.endAngle) / 2;

      // Start seamlessly from current idle drift position
      const curAngle = currentAngleRef.current;
      const baseRevs = Math.ceil(curAngle / 360) * 360;
      const fullRotations = 8; // fast, satisfying spin
      const finalStopAngle = ((360 - sliceCenterAngle) % 360 + 360) % 360;
      const targetAngle = baseRevs + fullRotations * 360 + finalStopAngle;

      const anim = Animated.sequence([
        Animated.timing(rotation, {
          toValue: curAngle - 6,
          duration: 200,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(rotation, {
          toValue: targetAngle,
          duration: Math.max(spinDuration - 200, 2000),
          easing: Easing.bezier(0.12, 0.9, 0.2, 1),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      spinAnimRef.current = anim;

      anim.start(({ finished }) => {
        if (finished) {
          if (listenerIdRef.current !== null) {
            rotation.removeListener(listenerIdRef.current);
            listenerIdRef.current = null;
          }
          stopSpinSoundLoop();
          setWinningSliceFinal(resolvedSliceIdx);
          onSpinComplete?.();
        }
      });
    }

    return () => {
      // Do not reset rotation on unmount/re-render; only clean up active audio/listeners
      if (listenerIdRef.current !== null) {
        rotation.removeListener(listenerIdRef.current);
        listenerIdRef.current = null;
      }
    };
  }, [isSpinning, winningSlice, winnerId, status, players, hasStakes, totalStake, angleStep, is5Player, spinDuration, onSpinComplete, slices, rotation]);

  // Active winner state: true when spin has completed or status is resolved/paid
  const hasWinner = status === "resolved" || status === "paid" || winningSliceFinal !== null;
  const activeWinningSlice = (typeof winningSliceFinal === "number" && winningSliceFinal >= 0)
    ? winningSliceFinal
    : (typeof winningSlice === "number" && winningSlice >= 0 ? winningSlice : null);

  const winningPlayer = (typeof activeWinningSlice === "number" && activeWinningSlice >= 0 && activeWinningSlice < activePlayers.length)
    ? activePlayers[activeWinningSlice]
    : (winnerId ? activePlayers.find(p => String(p.userId) === String(winnerId)) : null);

  const winnerDisplayName = winnerName || (winningPlayer as any)?.username || (winningPlayer as any)?.display_name || (winningPlayer ? `user_${(activeWinningSlice || 0) + 1}` : "WINNER");
  const winnerPrize = prizeAmount || (totalStake > 0 ? totalStake : (is5Player ? 500 : 1000));

  const activeRotateStyle = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const needleRotate = needleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-13deg"],
  });
  const needlePivotY = cy - r * 1.16;

  // Collapsed/hidden layouts can briefly report a negative size (window tab-switch
  // on web reports width ≈ 1). Rendering the SVG with a negative size spams
  // "attribute r: A negative value is not valid" and breaks the wheel — skip it.
  if (!size || size <= 0) return null;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {/* Subtle Ambient Background Accent (No heavy drop shadow) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: size * 1.1,
          height: size * 1.1,
          left: -size * 0.05,
          top: -size * 0.05,
          borderRadius: (size * 1.1) / 2,
          backgroundColor: hasWinner
            ? "rgba(250, 204, 21, 0.12)"
            : status === "locked"
            ? "rgba(244, 63, 94, 0.08)"
            : (isSpinning || status === "spinning")
            ? "rgba(242, 193, 78, 0.08)"
            : "rgba(56, 189, 248, 0.05)",
          zIndex: 0,
        }}
      />

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
              <Stop offset="0%" stopColor="#00BFFF" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#00BFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="35%" stopColor="#fde047" />
              <Stop offset="75%" stopColor="#ca8a04" />
              <Stop offset="100%" stopColor="#854d0e" />
            </RadialGradient>
            <RadialGradient id="wheelGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#FF1744" stopOpacity={0.35} />
              <Stop offset="70%" stopColor="#FF1744" stopOpacity={0.10} />
              <Stop offset="100%" stopColor="#FF1744" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="goldRimGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#92400e" />
              <Stop offset="25%" stopColor="#d97706" />
              <Stop offset="65%" stopColor="#b45309" />
              <Stop offset="100%" stopColor="#78350f" />
            </RadialGradient>
            <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fde047" />
              <Stop offset="50%" stopColor="#ca8a04" />
              <Stop offset="100%" stopColor="#854d0e" />
            </LinearGradient>

            {/* Per-slice radial gradient matching player's distinct palette */}
            <RadialGradient id="emptySliceGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="15%" stopColor="#080e1c" />
              <Stop offset="70%" stopColor="#0d172a" />
              <Stop offset="100%" stopColor="#132038" />
            </RadialGradient>
            <RadialGradient id="active5pSliceGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="15%" stopColor="#7f1d1d" />
              <Stop offset="65%" stopColor="#dc2626" />
              <Stop offset="100%" stopColor="#b91c1c" />
            </RadialGradient>

            {slices.map(({ idx }) => {
              const player = is5Player
                ? (players.find(p => p.seatIndex === idx) || (players[idx]?.seatIndex === undefined ? players[idx] : undefined))
                : activePlayers[idx];
              const pal = getPlayerPalette(player, idx, currentUserId);
              return (
                <RadialGradient key={`sliceGrad_${idx}`} id={`sliceGrad_${idx}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="15%" stopColor={pal.dark} />
                  <Stop offset="65%" stopColor={pal.mid} />
                  <Stop offset="100%" stopColor={pal.light} />
                </RadialGradient>
              );
            })}
          </Defs>

          {/* Dark Wheel Backing Plate (shows cleanly between slices through the gaps) */}
          <Circle cx={cx} cy={cy} r={r} fill="#070d1e" stroke="#ca8a04" strokeWidth={1} />

          {/* Slices (Bounded, Separated Slices matching Image 2 Inspiration) */}
          <G>
            {slices.map(({ idx, startAngle, angle, endAngle }) => {
              const sliceInnerR = r * 0.35;
              const sliceOuterR = r * 0.97;
              const sliceGap = 1.4;
              const textAngle = startAngle + angle / 2;
              
              let player: Player | undefined;
              if (is5Player) {
                player = players.find(p => p.seatIndex === idx) || (players[idx]?.seatIndex === undefined ? players[idx] : undefined);
              } else {
                player = activePlayers[idx];
              }

              const isEmptySeat = is5Player && !player;
              const pal = getPlayerPalette(player, idx, currentUserId);
              const rawPlayerName = player ? ((player as any).display_name || player.username || `user_${idx + 1}`) : `user_${idx + 1}`;
              const cleanUsername = String(rawPlayerName).trim().slice(0, 10).toLowerCase();
              const rawStake = Number((player as any)?.stake || 100);
              
              const percentStr = (player as any)?.percent 
                ? `${(player as any).percent}%`
                : (totalStake > 0 && (player as any)?.stake)
                ? `${Math.round(((player as any).stake / totalStake) * 100)}%`
                : (is5Player ? "20%" : `${Math.round(100 / playerCount)}%`);

              const isWinningSlice = Boolean(hasWinner && activeWinningSlice === idx);
              const sliceOpacity = hasWinner ? (isWinningSlice ? 1.0 : 0.22) : 1.0;
              const isFlashing = Boolean(player && flashingUserIds.includes(String(player.userId)));

              // Visual center point of this slice wedge
              const midR = r * 0.63;
              const centerPos = polarToCartesian(cx, cy, midR, textAngle);

              // Radial text rotation (aligns along slice ray, flipped in bottom half so always right-side up)
              const normAngle = ((textAngle % 360) + 360) % 360;
              const rot = (normAngle > 90 && normAngle < 270) ? normAngle - 180 : normAngle;

              return (
                <G key={idx} opacity={sliceOpacity}>
                  {/* Slice Segment (Separated Bounded Plaque) */}
                  <Path
                    d={getSeparatedSlicePath(cx, cy, sliceInnerR, sliceOuterR, startAngle, endAngle, sliceGap)}
                    fill={isEmptySeat ? "#1e293b" : pal.light}
                    stroke={isWinningSlice ? "#facc15" : isEmptySeat ? "#475569" : "rgba(255, 255, 255, 0.35)"}
                    strokeWidth={isWinningSlice ? 2.5 : 1.4}
                  />

                  {/* Inset Arc Accent (Top Edge Highlight) */}
                  <Path
                    d={getSeparatedSlicePath(cx, cy, sliceOuterR - 3.5, sliceOuterR - 0.5, startAngle, endAngle, sliceGap)}
                    fill="rgba(255, 255, 255, 0.25)"
                  />

                  {/* Reaction Flash Glow when this player adds a bet */}
                  {isFlashing && (
                    <Path
                      d={getArcPath(cx, cy, r, startAngle, endAngle)}
                      fill="#ffffff"
                      opacity={0.45}
                    />
                  )}

                  {/* Slices Content: 5-Player Empty Seat vs Filled Player (Exact Image 2 Match) */}
                  {isEmptySeat ? (
                    <G transform={`translate(${centerPos.x}, ${centerPos.y}) rotate(${rot})`}>
                      {/* Avatar placeholder circle */}
                      <Circle cx={0} cy={-12} r={Math.min(size * 0.046, 14)} fill="rgba(255, 255, 255, 0.08)" stroke="#475569" strokeWidth={1} />
                      <Circle cx={0} cy={-15} r={Math.min(size * 0.016, 5)} fill="#94a3b8" />
                      <Path d="M -6.5 -7 A 6.5 4.5 0 0 1 6.5 -7 Z" fill="#94a3b8" />

                      {/* Line 1: Empty */}
                      <SvgText
                        x={0}
                        y={8}
                        fill="#cbd5e1"
                        fontSize={Math.min(size * 0.035, 11)}
                        fontWeight="800"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        Empty
                      </SvgText>

                      {/* Line 2: -- */}
                      <SvgText
                        x={0}
                        y={20}
                        fill="#64748b"
                        fontSize={Math.min(size * 0.032, 10)}
                        fontWeight="700"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        --
                      </SvgText>
                    </G>
                  ) : is5Player ? (
                    <G transform={`translate(${centerPos.x}, ${centerPos.y}) rotate(${rot})`}>
                      {/* Golden Winner Crown directly above if this slice won */}
                      {isWinningSlice && (
                        <Path
                          d="M -7 -36 L -9 -45 L -3 -41 L 0 -48 L 3 -41 L 9 -45 L 7 -36 Z"
                          fill="#facc15"
                          stroke="#ca8a04"
                          strokeWidth={0.8}
                        />
                      )}

                      {/* Avatar filled circle */}
                      <Circle cx={0} cy={-14} r={Math.min(size * 0.048, 14)} fill="#dc2626" stroke="#f87171" strokeWidth={1.5} />
                      <Circle cx={0} cy={-17} r={Math.min(size * 0.016, 5)} fill="#ffffff" />
                      <Path d="M -7 -9 A 7 5 0 0 1 7 -9 Z" fill="#ffffff" />

                      {/* Line 1: Username */}
                      <SvgText
                        x={0}
                        y={5}
                        fill="#ffffff"
                        fontSize={Math.min(size * 0.034, 11)}
                        fontWeight="800"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {cleanUsername}
                      </SvgText>

                      {/* Line 2: Stake */}
                      <SvgText
                        x={0}
                        y={18}
                        fill="#ffffff"
                        fontSize={Math.min(size * 0.038, 12)}
                        fontWeight="900"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {rawStake} ETB
                      </SvgText>

                      {/* Line 3: 20% */}
                      <SvgText
                        x={0}
                        y={29}
                        fill="#fca5a5"
                        fontSize={Math.min(size * 0.030, 9.5)}
                        fontWeight="800"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {percentStr}
                      </SvgText>
                    </G>
                  ) : (
                    /* Rail Mode 3-Line Radial Text Layout */
                    <G transform={`translate(${centerPos.x}, ${centerPos.y}) rotate(${rot})`}>
                      {/* Golden Winner Crown directly above stake if this slice won */}
                      {isWinningSlice && (
                        <Path
                          d="M -7 -25 L -9 -34 L -3 -30 L 0 -37 L 3 -30 L 9 -34 L 7 -25 Z"
                          fill="#facc15"
                          stroke="#ca8a04"
                          strokeWidth={0.8}
                        />
                      )}

                      {/* Line 1: Stake (Large Bold White) */}
                      <SvgText
                        x={0}
                        y={-13}
                        fill={isWinningSlice ? "#fde047" : "#ffffff"}
                        fontSize={Math.min(size * 0.044, 13.5)}
                        fontWeight="900"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {rawStake} ETB
                      </SvgText>

                      {/* Line 2: Username (Crisp Clean Text) */}
                      <SvgText
                        x={0}
                        y={2}
                        fill={isWinningSlice ? "#ffffff" : "#e2e8f0"}
                        fontSize={Math.min(size * 0.033, 10.5)}
                        fontWeight="700"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {cleanUsername}
                      </SvgText>

                      {/* Line 3: Percentage (Player's Distinct Accent Color) */}
                      <SvgText
                        x={0}
                        y={16}
                        fill={isWinningSlice ? "#facc15" : pal.accent}
                        fontSize={Math.min(size * 0.030, 9.5)}
                        fontWeight="800"
                        fontFamily="Inter, sans-serif"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {percentStr}
                      </SvgText>
                    </G>
                  )}
                </G>
              );
            })}
          </G>

          {/* Inner Circular Red / Gold Perimeter Ring bounding the slices */}
          <Circle cx={cx} cy={cy} r={r} stroke={is5Player ? "#ca8a04" : "#ef4444"} strokeWidth={2.5} fill="none" />

          {/* Brushed Golden-Amber Outer Wheel Bezel (Matches Prototype) */}
          <Circle cx={cx} cy={cy} r={r * 1.05} stroke="url(#goldRimGrad)" strokeWidth={size * 0.075} fill="none" />
          <Circle cx={cx} cy={cy} r={r * 1.09} fill="none" stroke="#ca8a04" strokeWidth={1.5} />

          {/* 16 Alternating Large & Small Glowing Bulbs on the Golden Rim (Matches Prototype) */}
          <G>
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = i * (360 / 16);
              const pos = polarToCartesian(cx, cy, r * 1.05, angle);
              const isMajor = i % 2 === 0;
              const isLit = true;
              return (
                <G key={i}>
                  {isMajor ? (
                    <>
                      {/* Major Bulb Halo Glow */}
                      <Circle
                        cx={pos.x}
                        cy={pos.y}
                        r={size * (isLit ? 0.024 : 0.016)}
                        fill="#fde047"
                        opacity={isLit ? 0.5 : 0.15}
                      />
                      <Circle
                        cx={pos.x}
                        cy={pos.y}
                        r={size * 0.012}
                        fill="#f59e0b"
                      />
                      <Circle
                        cx={pos.x}
                        cy={pos.y}
                        r={size * 0.007}
                        fill="#ffffff"
                      />
                    </>
                  ) : (
                    /* Minor Bulb */
                    <Circle
                      cx={pos.x}
                      cy={pos.y}
                      r={size * 0.007}
                      fill={isLit ? "#fde68a" : "#b45309"}
                    />
                  )}
                </G>
              );
            })}
          </G>

        </Svg>
      </Animated.View>

      {/* Center Circular Disc Hub with Live Countdown OR Champion Winner Celebration Disc */}
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "none", zIndex: 6, alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
        {(() => {
          const hubRadius = Math.max(r * 0.42, 44);

          return (
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <Defs>
                <RadialGradient id="purpleHubGrad" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#a855f7" />
                  <Stop offset="35%" stopColor="#7c3aed" />
                  <Stop offset="75%" stopColor="#5b21b6" />
                  <Stop offset="100%" stopColor="#2e1065" />
                </RadialGradient>
                <LinearGradient id="hubGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#fef08a" />
                  <Stop offset="30%" stopColor="#facc15" />
                  <Stop offset="70%" stopColor="#ca8a04" />
                  <Stop offset="100%" stopColor="#78350f" />
                </LinearGradient>
                <RadialGradient id="purpleHubGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="50%" stopColor="#a855f7" stopOpacity={0.6} />
                  <Stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </RadialGradient>
              </Defs>

              {/* ── IMAGE 2 EXACT MATCH: ROYAL PURPLE & GOLD MEDALLION CENTER ── */}
              <G>
                {/* Purple Halo Glow */}
                <Circle cx={cx} cy={cy} r={hubRadius * 1.25} fill="url(#purpleHubGlow)" />

                {/* Outer Beveled Gold Rim */}
                <Circle cx={cx} cy={cy} r={hubRadius * 1.08} fill="url(#hubGoldGrad)" stroke="#78350f" strokeWidth={1.8} />

                {/* Inner Gold Inset Accent Ring */}
                <Circle cx={cx} cy={cy} r={hubRadius * 0.98} fill="none" stroke="#fef08a" strokeWidth={1.2} opacity={0.8} />

                {/* Royal Purple Medallion Hub Disc (Image 2 Match) */}
                <Circle cx={cx} cy={cy} r={hubRadius * 0.92} fill="url(#purpleHubGrad)" stroke="#fde047" strokeWidth={2} />

                {/* Inner Ambient Depth */}
                <Circle cx={cx} cy={cy} r={hubRadius * 0.7} fill="#1e1b4b" opacity={0.35} />

                {/* Text Content: SPIN TO WIN or Countdown */}
                {is5Player ? (
                  <>
                    <SvgText
                      x={cx}
                      y={cy - (Platform.OS === "web" ? 5 : 6)}
                      fill="#ffffff"
                      stroke="#3b0764"
                      strokeWidth={0.8}
                      fontSize={Math.max(hubRadius * 0.44, 20)}
                      fontWeight="900"
                      fontFamily="Inter, sans-serif"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      letterSpacing={1.5}
                    >
                      {isSpinning || status === "spinning" ? "SPIN!" : "SPIN"}
                    </SvgText>
                    <SvgText
                      x={cx}
                      y={cy + (Platform.OS === "web" ? 11 : 9)}
                      fill="#fde047"
                      stroke="#78350f"
                      strokeWidth={0.5}
                      fontSize={Math.max(hubRadius * 0.28, 12)}
                      fontWeight="900"
                      fontFamily="Inter, sans-serif"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      letterSpacing={1.5}
                    >
                      TO WIN
                    </SvgText>
                  </>
                ) : (
                  <>
                    <SvgText
                      x={cx}
                      y={cy - (Platform.OS === "web" ? 5 : 6)}
                      fill="#ffffff"
                      fontSize={Math.max(hubRadius * 0.38, 17)}
                      fontWeight="900"
                      fontFamily="Inter, sans-serif"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      letterSpacing={0.5}
                    >
                      {isSpinning || status === "spinning"
                        ? "SPIN!"
                        : status === "locked"
                        ? "0:00"
                        : countdownText || "02:00"}
                    </SvgText>
                    <SvgText
                      x={cx}
                      y={cy + (Platform.OS === "web" ? 10 : 8)}
                      fill="#fde047"
                      stroke="#78350f"
                      strokeWidth={0.5}
                      fontSize={Math.max(hubRadius * 0.24, 10.5)}
                      fontWeight="900"
                      fontFamily="Inter, sans-serif"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      letterSpacing={1.2}
                    >
                      SPIN TO WIN
                    </SvgText>
                  </>
                )}
              </G>
            </Svg>
          );
        })()}
      </View>

      {/* Red Pointer with Inner White Triangle pointing down at top rim */}
      {/* Disney Principle 1 & 8: Animated Needle with Physical Ticker Flick */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            pointerEvents: "none",
            zIndex: 10,
            transform: Platform.OS === "web"
              ? [{ rotate: needleRotate }]
              : [
                  { translateX: cx },
                  { translateY: needlePivotY },
                  { rotate: needleRotate },
                  { translateX: -cx },
                  { translateY: -needlePivotY },
                ],
            ...(Platform.OS === "web" ? ({ transformOrigin: `${cx}px ${needlePivotY}px` } as any) : {}),
          },
        ]}
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="redPointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#fef08a" />
              <Stop offset="40%" stopColor="#f59e0b" />
              <Stop offset="80%" stopColor="#d97706" />
              <Stop offset="100%" stopColor="#78350f" />
            </LinearGradient>
            <LinearGradient id="pointerGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fef08a" />
              <Stop offset="100%" stopColor="#ca8a04" />
            </LinearGradient>
          </Defs>
          <G>
            {/* Main Outer Red Triangle Pointer (Exact Mockup Match) */}
            <Path
              d={`M ${cx - size * 0.052} ${cy - r * 1.07} L ${cx + size * 0.052} ${cy - r * 1.07} L ${cx} ${cy - r * 0.88} Z`}
              fill="url(#redPointerGrad)"
              stroke="url(#pointerGoldBorder)"
              strokeWidth={2}
            />
            {/* Inner Highlight Triangle */}
            <Path
              d={`M ${cx - size * 0.026} ${cy - r * 1.05} L ${cx + size * 0.026} ${cy - r * 1.05} L ${cx} ${cy - r * 0.94} Z`}
              fill="#ffffff"
              opacity={0.88}
            />
          </G>
        </Svg>
      </Animated.View>
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
