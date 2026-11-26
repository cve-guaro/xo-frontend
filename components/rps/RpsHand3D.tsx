// components/rps/RpsHand3D.tsx
// High-fidelity 3D-styled hand component for Rock Paper Scissors on XO ET.
// Matches reference screenshot (media_1795363784831_82719432.png):
// - Natural warm 3D skin tone with realistic specular lighting and deep ambient creases.
// - Supports poses: 'fist' (Rock), 'paper' (Open hand), and 'scissors' (V-sign).
// - Symmetrically mirrored for Opponent (right side) with smooth shake animations.
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  G,
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';
import { Pose } from '../../lib/rps/rpsTypes';

interface RpsHand3DProps {
  side: 'left' | 'right';
  pose: Pose;
  isShaking?: boolean;
  width?: number;
  height?: number;
}

export default function RpsHand3D({
  side,
  pose = 'fist',
  isShaking = false,
  width = 280,
  height = 180,
}: RpsHand3DProps) {
  const isRight = side === 'right';
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Rhythmic 3-beat fist bounce when shaking
  useEffect(() => {
    if (isShaking) {
      const shakeSequence = Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: -24,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 12,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(shakeSequence);
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isShaking]);

  const normalizedPose = pose === 'rock' ? 'fist' : pose;

  return (
    <Animated.View
      style={[
        s.container,
        {
          width,
          height,
          transform: [
            { translateY: shakeAnim },
            { scaleX: isRight ? -1 : 1 },
          ],
        },
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 340 220" fill="none">
        <Defs>
          {/* Main 3D Skin Gradient: Warm golden peach */}
          <LinearGradient id="skinBase" x1="0" y1="0.2" x2="0.8" y2="1">
            <Stop offset="0%" stopColor="#FFD4AC" />
            <Stop offset="30%" stopColor="#F9BA85" />
            <Stop offset="70%" stopColor="#E59458" />
            <Stop offset="100%" stopColor="#BD6932" />
          </LinearGradient>

          {/* Forearm Gradient */}
          <LinearGradient id="forearmGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#F8C69D" />
            <Stop offset="40%" stopColor="#EEA66D" />
            <Stop offset="100%" stopColor="#BF6E38" />
          </LinearGradient>

          {/* Knuckle highlight gradient */}
          <RadialGradient id="knuckleGlow" cx="0.4" cy="0.3" r="0.6">
            <Stop offset="0%" stopColor="#FFF2E4" stopOpacity="0.9" />
            <Stop offset="45%" stopColor="#FABA8A" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#C9743D" stopOpacity="0.3" />
          </RadialGradient>

          {/* Deep crease shadow */}
          <LinearGradient id="creaseShadow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#873F15" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#5E270A" stopOpacity="0.9" />
          </LinearGradient>

          {/* Specular Sheen */}
          <LinearGradient id="specularSheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* ── 1. FOREARM / WRIST (Extends from edge into center) ── */}
        <Path
          d="M-20 70 L95 76 C112 78 124 88 128 104 L132 144 C128 160 114 168 95 168 L-20 172 Z"
          fill="url(#forearmGrad)"
        />
        {/* Forearm Top Light Sheen */}
        <Path
          d="M-15 74 L90 80 C102 82 110 88 114 96"
          stroke="url(#specularSheen)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* ── 2. WRIST CREASE & METACARPAL BASE ── */}
        <Path
          d="M102 85 C108 105 108 140 102 160"
          stroke="#9E4D1D"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.35}
        />

        {/* ── 3. POSES: FIST, PAPER, SCISSORS ── */}
        {normalizedPose === 'fist' ? (
          /* ──────────────── FIST (ROCK) ──────────────── */
          <G>
            {/* Palm Back Core Body */}
            <Path
              d="M110 78 C135 68 180 72 208 86 C232 98 238 122 236 142 C232 165 210 174 175 174 C140 174 116 164 110 148 Z"
              fill="url(#skinBase)"
            />

            {/* Curled Knuckle Column (Index, Middle, Ring, Pinky) */}
            {/* Pinky (Bottom) */}
            <G>
              <Rect x="204" y="142" width="46" height="24" rx="12" fill="url(#skinBase)" />
              <Ellipse cx="232" cy="154" rx="12" ry="7" fill="url(#knuckleGlow)" />
            </G>

            {/* Ring Finger */}
            <G>
              <Rect x="216" y="122" width="48" height="25" rx="12" fill="url(#skinBase)" />
              <Ellipse cx="244" cy="134" rx="13" ry="8" fill="url(#knuckleGlow)" />
            </G>

            {/* Middle Finger (Longest) */}
            <G>
              <Rect x="220" y="100" width="50" height="26" rx="13" fill="url(#skinBase)" />
              <Ellipse cx="250" cy="113" rx="14" ry="8.5" fill="url(#knuckleGlow)" />
            </G>

            {/* Index Finger (Top) */}
            <G>
              <Rect x="212" y="78" width="48" height="26" rx="13" fill="url(#skinBase)" />
              <Ellipse cx="242" cy="91" rx="13" ry="8" fill="url(#knuckleGlow)" />
            </G>

            {/* Knuckle Crease Lines between fingers */}
            <Path d="M214 102 L248 102" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.5} />
            <Path d="M218 124 L252 124" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.5} />
            <Path d="M210 144 L244 144" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.5} />

            {/* Clamped Thumb folded over the front */}
            <Path
              d="M145 92 C168 80 198 84 218 98 C232 108 230 126 214 134 C195 142 168 138 152 124 Z"
              fill="url(#skinBase)"
            />
            {/* Thumb highlight & knuckle */}
            <Ellipse cx="204" cy="112" rx="16" ry="11" fill="url(#knuckleGlow)" />
            {/* Thumb crease */}
            <Path d="M168 106 C180 114 194 116 206 114" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.4} />
          </G>
        ) : normalizedPose === 'paper' ? (
          /* ──────────────── PAPER (OPEN PALM) ──────────────── */
          <G>
            {/* Palm Base */}
            <Path
              d="M110 82 C135 72 175 74 195 86 C215 98 215 130 205 152 C190 172 155 174 125 168 C112 165 106 150 110 132 Z"
              fill="url(#skinBase)"
            />

            {/* 4 Extended Straight Fingers pointing Right */}
            {/* Pinky (Bottom) */}
            <Path
              d="M185 146 L278 148 C288 148 296 156 296 164 C296 172 288 180 278 180 L185 174 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="282" cy="164" rx="10" ry="6" fill="url(#knuckleGlow)" />

            {/* Ring Finger */}
            <Path
              d="M192 122 L300 124 C310 124 318 132 318 140 C318 148 310 156 300 156 L192 148 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="304" cy="140" rx="11" ry="6.5" fill="url(#knuckleGlow)" />

            {/* Middle Finger (Longest) */}
            <Path
              d="M194 98 L314 98 C324 98 332 106 332 114 C332 122 324 130 314 130 L194 124 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="318" cy="114" rx="11" ry="6.5" fill="url(#knuckleGlow)" />

            {/* Index Finger (Top) */}
            <Path
              d="M188 74 L298 76 C308 76 316 84 316 92 C316 100 308 108 298 108 L188 100 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="302" cy="92" rx="10.5" ry="6.5" fill="url(#knuckleGlow)" />

            {/* Creases between fingers */}
            <Path d="M196 100 L280 100" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.4} />
            <Path d="M198 124 L288 124" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.4} />
            <Path d="M194 148 L270 148" stroke="#873F15" strokeWidth="2.5" strokeLinecap="round" opacity={0.4} />

            {/* Outstretched Thumb (pointing slightly down and right) */}
            <Path
              d="M138 120 C155 125 185 142 205 162 C214 172 210 184 198 186 C182 188 160 174 142 152 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="196" cy="172" rx="12" ry="8" fill="url(#knuckleGlow)" />
          </G>
        ) : (
          /* ──────────────── SCISSORS (V-SHAPE) ──────────────── */
          <G>
            {/* Palm Base & Curled Ring/Pinky */}
            <Path
              d="M110 80 C135 70 175 74 196 86 C214 96 218 120 216 138 C212 162 190 172 165 172 C135 172 115 162 110 145 Z"
              fill="url(#skinBase)"
            />

            {/* Curled Ring Finger (held down) */}
            <Rect x="188" y="128" width="42" height="22" rx="11" fill="url(#skinBase)" />
            <Ellipse cx="216" cy="139" rx="10" ry="6" fill="url(#knuckleGlow)" />

            {/* Curled Pinky (held down) */}
            <Rect x="180" y="146" width="38" height="20" rx="10" fill="url(#skinBase)" />
            <Ellipse cx="204" cy="156" rx="9" ry="5.5" fill="url(#knuckleGlow)" />

            {/* ── Scissors Extended Finger 1: Middle Finger (Pointing up-right) ── */}
            <Path
              d="M185 92 L298 62 C308 59 318 65 321 75 C324 85 318 95 308 98 L188 112 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="306" cy="80" rx="11" ry="7" fill="url(#knuckleGlow)" transform="rotate(-15 306 80)" />

            {/* ── Scissors Extended Finger 2: Index Finger (Pointing down-right) ── */}
            <Path
              d="M190 108 L308 126 C318 128 324 138 322 148 C320 158 310 164 300 162 L185 132 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="308" cy="144" rx="11" ry="7" fill="url(#knuckleGlow)" transform="rotate(10 308 144)" />

            {/* Clamped Thumb holding ring & pinky in place */}
            <Path
              d="M142 96 C165 92 188 105 204 122 C214 132 208 146 195 148 C178 150 158 138 145 124 Z"
              fill="url(#skinBase)"
            />
            <Ellipse cx="192" cy="132" rx="13" ry="9" fill="url(#knuckleGlow)" />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
