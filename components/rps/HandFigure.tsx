// components/rps/HandFigure.tsx
// ────────────────────────────────────────────────────────────────────────────
// Vector Hand Figure implemented with react-native-svg and Animated.
// Supports 4 poses: 'fist' | 'rock' | 'paper' | 'scissors'.
// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { G, Rect, Path } from 'react-native-svg';
import { Pose, Phase, RoundOutcome } from '../../lib/rps/rpsTypes';
import { colors } from '../../theme/tokens';

interface HandFigureProps {
  side: 'top' | 'bottom';
  pose: Pose;
  phase: Phase;
  locked: boolean;
  outcome?: RoundOutcome | null;
  shakeCount?: number; // 3, 2, 1 beat
  scale?: number;
}

const FINGERS = [
  { name: 'pinky', x: 56, y: 68, w: 19, h: 62, pivotX: 65.5, pivotY: 122 },
  { name: 'ring', x: 78, y: 58, w: 19, h: 72, pivotX: 87.5, pivotY: 122 },
  { name: 'middle', x: 100, y: 51, w: 20, h: 79, pivotX: 110, pivotY: 122 },
  { name: 'index', x: 123, y: 62, w: 21, h: 68, pivotX: 133.5, pivotY: 122 },
] as const;

const ANGLES: Record<Pose, readonly number[]> = {
  fist: [70, 70, -70, -70],
  rock: [95, 95, -95, -95],
  paper: [0, 0, 0, 0],
  scissors: [95, 95, -11, 7],
};

const THUMB: Record<Pose, number> = {
  fist: 0,
  rock: -70,
  paper: 45,
  scissors: -70,
};

export const HandFigure: React.FC<HandFigureProps> = ({
  side,
  pose,
  phase,
  locked,
  outcome,
  shakeCount,
  scale = 1,
}) => {
  const isTop = side === 'top';
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Colors from design tokens
  const fillColor = '#F4F5F8'; // Off-white hand surface
  const rimColor = isTop ? colors.primary : colors.violet; // Cyan for opponent, Violet for player
  const inkColor = '#10101F'; // Deep ink for creases
  const isWinner = outcome === (isTop ? 'lose' : 'win');
  const isLoser = outcome === (isTop ? 'win' : 'lose');

  // Trigger shake animation when in 'reveal' phase or when shakeCount changes
  useEffect(() => {
    if (phase === 'reveal') {
      // 3-beat fist shake (up-down rhythmic strike)
      const shakeSequence = Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: isTop ? 28 : -28,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: isTop ? -10 : 10,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

      Animated.loop(shakeSequence, { iterations: 3 }).start();
    } else {
      shakeAnim.setValue(0);
    }
  }, [phase, isTop]);

  // Winner celebratory bounce
  useEffect(() => {
    if (phase === 'roundResult' && isWinner) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.12,
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (phase === 'roundResult' && isLoser) {
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [phase, isWinner, isLoser]);

  // Selection pulse animation when locking
  useEffect(() => {
    if (locked) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [locked]);

  // Dynamic finger angles
  const effectivePose = phase === 'reveal' ? 'fist' : pose;
  const angles = effectivePose === 'fist' && locked ? ANGLES.rock : ANGLES[effectivePose];
  const thumbAngle = effectivePose === 'fist' && locked ? -15 : THUMB[effectivePose];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scaleY: isTop ? -1 : 1 }, // Flip opponent hand upside down
            { translateY: shakeAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <Svg width={Math.round(140 * scale)} height={Math.round(220 * scale)} viewBox="0 0 200 320">
        {/* Forearm */}
        <G>
          <Rect
            x={76}
            y={155}
            width={52}
            height={180}
            rx={22}
            fill={fillColor}
            stroke={isWinner ? colors.success : rimColor}
            strokeWidth={isWinner ? 7 : 5}
          />
        </G>

        {/* 4 Fingers */}
        {FINGERS.map((finger, i) => {
          const rot = angles[i] || 0;
          return (
            <G
              key={finger.name}
              transform={`rotate(${rot}, ${finger.pivotX}, ${finger.pivotY})`}
            >
              <Rect
                x={finger.x}
                y={finger.y}
                width={finger.w}
                height={finger.h}
                rx={finger.w / 2}
                fill={fillColor}
                stroke={isWinner ? colors.success : rimColor}
                strokeWidth={isWinner ? 7 : 5}
              />
              <Path
                d={`M${finger.x + 5} ${finger.y + finger.h - 18} Q${finger.x + finger.w / 2} ${finger.y + finger.h - 14} ${finger.x + finger.w - 5} ${finger.y + finger.h - 18}`}
                fill="none"
                stroke={inkColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </G>
          );
        })}

        {/* Palm */}
        <G>
          <Path
            d="M55 121 Q55 104 75 104 H128 Q149 104 149 124 V151 Q149 180 121 180 H82 Q55 180 55 153 Z"
            fill={fillColor}
            stroke={isWinner ? colors.success : rimColor}
            strokeWidth={isWinner ? 7 : 5}
            strokeLinejoin="round"
          />
          <Path
            d="M77 165 Q98 172 125 164"
            fill="none"
            stroke={inkColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </G>

        {/* Thumb */}
        <G transform={`rotate(${thumbAngle}, 146, 150)`}>
          <Path
            d="M144 142 C142 127 145 111 153 103 C162 98 170 105 170 115 V144 C170 159 158 166 146 159 Z"
            fill={fillColor}
            stroke={isWinner ? colors.success : rimColor}
            strokeWidth={isWinner ? 7 : 5}
            strokeLinejoin="round"
          />
          <Path
            d="M149 131 Q154 137 162 135"
            fill="none"
            stroke={inkColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </G>

        {/* Knuckles */}
        <G opacity={effectivePose === 'rock' ? 0.7 : locked ? 0.4 : 0}>
          <Path
            d="M68 106 Q75 102 82 106 M89 102 Q97 99 104 103 M111 101 Q119 99 126 104 M132 109 Q139 105 145 110"
            fill="none"
            stroke={inkColor}
            strokeWidth={2.75}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
