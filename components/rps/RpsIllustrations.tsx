// components/rps/RpsIllustrations.tsx
// High-fidelity 3D vector graphics matching the reference design:
// - Robotic Hand (Opponent, electric blue joints, metallic shell)
// - Human Hand (Player, red wrist gadget, navy sleeve, natural tones)
// - Rock, Paper, Scissors selection card 3D illustrations
import React from 'react';
import Svg, {
  G,
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Polygon,
} from 'react-native-svg';
import { Pose, Choice } from '../../lib/rps/rpsTypes';

// ────────────────────────────────────────────────────────────────────────────
// 1. ROBOTIC HAND (Opponent — Facing Right towards center)
// ────────────────────────────────────────────────────────────────────────────
export function RoboticHandIllustration({
  pose = 'fist',
  width = 280,
  height = 190,
}: {
  pose?: Pose;
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 220" fill="none">
      <Defs>
        {/* Arm shell gradient */}
        <LinearGradient id="roboArmGrad" x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0%" stopColor="#8EA3BE" />
          <Stop offset="30%" stopColor="#D5E3F2" />
          <Stop offset="70%" stopColor="#9AB0CB" />
          <Stop offset="100%" stopColor="#607693" />
        </LinearGradient>

        {/* Deep blue mechanical joint gradient */}
        <LinearGradient id="roboJointGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0B2B5C" />
          <Stop offset="50%" stopColor="#0052CC" />
          <Stop offset="100%" stopColor="#051937" />
        </LinearGradient>

        {/* Electric cyan glow gradient */}
        <LinearGradient id="roboGlowGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#00DAF3" />
          <Stop offset="50%" stopColor="#0091FF" />
          <Stop offset="100%" stopColor="#00DAF3" />
        </LinearGradient>

        {/* Finger segment gradient */}
        <LinearGradient id="roboFingerGrad" x1="0" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="35%" stopColor="#CDDCED" />
          <Stop offset="80%" stopColor="#8A9FB9" />
          <Stop offset="100%" stopColor="#4A607A" />
        </LinearGradient>
      </Defs>

      {/* Forearm & Cuff */}
      <Path
        d="M-20 60 L100 70 C115 72 125 80 128 95 L135 150 C132 165 118 172 100 172 L-20 180 Z"
        fill="url(#roboArmGrad)"
      />
      {/* Arm metallic panel seam lines */}
      <Path d="M20 65 L25 177" stroke="#485D77" strokeWidth="2.5" />
      <Path d="M70 68 L76 173" stroke="#485D77" strokeWidth="2.5" />

      {/* Blue LED accent strip along arm */}
      <Path
        d="M-10 118 L90 120"
        stroke="url(#roboGlowGrad)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Mechanical Wrist Collar (Cylinder Ring) */}
      <Rect
        x="105"
        y="75"
        width="28"
        height="90"
        rx="8"
        fill="url(#roboJointGrad)"
        stroke="#00DAF3"
        strokeWidth="1.5"
      />
      {/* Wrist glowing circular node */}
      <Circle cx="119" cy="120" r="7" fill="#00DAF3" />
      <Circle cx="119" cy="120" r="3" fill="#FFFFFF" />

      {/* Palm Core Housing */}
      <Path
        d="M130 85 C140 75 165 72 195 80 C220 88 230 102 230 125 C230 148 215 162 185 165 C155 168 135 155 130 145 Z"
        fill="url(#roboArmGrad)"
        stroke="#607693"
        strokeWidth="1.5"
      />
      {/* Palm blue hydraulic ring */}
      <Circle cx="175" cy="122" r="14" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1.5" />
      <Circle cx="175" cy="122" r="6" fill="#00DAF3" />

      {/* ── FINGERS ACCORDING TO POSE ── */}
      {pose === 'scissors' ? (
        /* SCISSORS: Index and middle fingers extended right in V shape */
        <G>
          {/* Index Finger (Extended slightly upward) */}
          <G transform="rotate(-7 195 95)">
            {/* Knuckle 1 */}
            <Circle cx="205" cy="95" r="9" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1.5" />
            {/* Phalanx 1 */}
            <Rect x="210" y="87" width="38" height="16" rx="6" fill="url(#roboFingerGrad)" />
            {/* Joint 2 */}
            <Circle cx="248" cy="95" r="7.5" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            {/* Phalanx 2 (Tip) */}
            <Path d="M250 88 L298 90 C306 91 310 96 308 101 C306 106 300 106 294 105 L250 102 Z" fill="url(#roboFingerGrad)" />
          </G>

          {/* Middle Finger (Extended straight forward) */}
          <G transform="rotate(8 195 125)">
            {/* Knuckle 1 */}
            <Circle cx="208" cy="122" r="9" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1.5" />
            {/* Phalanx 1 */}
            <Rect x="213" y="114" width="40" height="16" rx="6" fill="url(#roboFingerGrad)" />
            {/* Joint 2 */}
            <Circle cx="253" cy="122" r="7.5" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            {/* Phalanx 2 (Tip) */}
            <Path d="M255 115 L306 117 C314 118 318 123 316 128 C314 133 308 133 302 132 L255 129 Z" fill="url(#roboFingerGrad)" />
          </G>

          {/* Ring Finger (Curled Inward) */}
          <Rect x="188" y="138" width="28" height="15" rx="7" fill="url(#roboFingerGrad)" stroke="#4A607A" strokeWidth="1" />
          <Circle cx="196" cy="145" r="5" fill="url(#roboJointGrad)" />

          {/* Pinky (Curled Inward) */}
          <Rect x="180" y="152" width="24" height="14" rx="7" fill="url(#roboFingerGrad)" stroke="#4A607A" strokeWidth="1" />

          {/* Thumb (Clamping curled fingers) */}
          <Path
            d="M155 105 C165 95 180 96 195 106 C205 114 204 125 194 130 C182 135 170 130 162 120 Z"
            fill="url(#roboFingerGrad)"
            stroke="#607693"
            strokeWidth="1.5"
          />
          <Circle cx="185" cy="114" r="6" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
        </G>
      ) : pose === 'paper' ? (
        /* PAPER: All fingers flat and extended right */
        <G>
          {/* Index Finger */}
          <G transform="rotate(-10 195 85)">
            <Rect x="200" y="78" width="42" height="14" rx="6" fill="url(#roboFingerGrad)" />
            <Circle cx="242" cy="85" r="7" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            <Path d="M244 79 L295 81 C302 82 305 87 302 91 C300 95 294 95 288 94 L244 92 Z" fill="url(#roboFingerGrad)" />
          </G>

          {/* Middle Finger */}
          <G transform="rotate(-2 195 105)">
            <Rect x="208" y="98" width="45" height="15" rx="6" fill="url(#roboFingerGrad)" />
            <Circle cx="253" cy="105" r="7" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            <Path d="M255 99 L310 101 C318 102 320 107 318 111 C315 115 310 115 304 114 L255 112 Z" fill="url(#roboFingerGrad)" />
          </G>

          {/* Ring Finger */}
          <G transform="rotate(6 195 125)">
            <Rect x="204" y="118" width="42" height="14" rx="6" fill="url(#roboFingerGrad)" />
            <Circle cx="246" cy="125" r="7" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            <Path d="M248 119 L298 121 C305 122 308 127 305 131 C302 135 296 135 290 134 L248 132 Z" fill="url(#roboFingerGrad)" />
          </G>

          {/* Pinky */}
          <G transform="rotate(14 195 145)">
            <Rect x="195" y="138" width="36" height="13" rx="5" fill="url(#roboFingerGrad)" />
            <Circle cx="231" cy="144" r="6" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            <Path d="M233 139 L276 141 C282 142 284 146 282 149 C280 152 275 152 270 151 L233 149 Z" fill="url(#roboFingerGrad)" />
          </G>

          {/* Thumb extended below */}
          <G transform="rotate(28 175 130)">
            <Rect x="180" y="125" width="34" height="16" rx="7" fill="url(#roboFingerGrad)" />
            <Circle cx="214" cy="133" r="7" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
            <Path d="M216 126 L254 128 C260 129 262 134 260 137 C258 141 253 141 248 140 L216 139 Z" fill="url(#roboFingerGrad)" />
          </G>
        </G>
      ) : (
        /* FIST / ROCK: Powerful curled robotic fist punching right */
        <G>
          {/* Curled Knuckles Column */}
          <G>
            {/* Knuckle 1 (Top / Index) */}
            <Rect x="198" y="78" width="38" height="20" rx="9" fill="url(#roboFingerGrad)" stroke="#4A607A" strokeWidth="1" />
            <Circle cx="228" cy="88" r="6" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />

            {/* Knuckle 2 (Middle) */}
            <Rect x="206" y="98" width="40" height="20" rx="9" fill="url(#roboFingerGrad)" stroke="#4A607A" strokeWidth="1" />
            <Circle cx="236" cy="108" r="6" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />

            {/* Knuckle 3 (Ring) */}
            <Rect x="202" y="118" width="38" height="20" rx="9" fill="url(#roboFingerGrad)" stroke="#4A607A" strokeWidth="1" />
            <Circle cx="232" cy="128" r="6" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />

            {/* Knuckle 4 (Pinky) */}
            <Rect x="192" y="138" width="34" height="18" rx="8" fill="url(#roboFingerGrad)" stroke="#4A607A" strokeWidth="1" />
            <Circle cx="218" cy="147" r="5" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1" />
          </G>

          {/* Clamped Thumb across front of knuckles */}
          <Path
            d="M165 92 C180 84 200 86 215 96 C225 104 225 118 212 125 C198 132 178 128 168 116 Z"
            fill="url(#roboFingerGrad)"
            stroke="#607693"
            strokeWidth="1.5"
          />
          <Circle cx="204" cy="108" r="7" fill="url(#roboJointGrad)" stroke="#00DAF3" strokeWidth="1.5" />
          <Circle cx="204" cy="108" r="3" fill="#FFFFFF" />
        </G>
      )}
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 2. HUMAN HAND (Player — Facing Left towards center)
// ────────────────────────────────────────────────────────────────────────────
export function HumanHandIllustration({
  pose = 'fist',
  width = 280,
  height = 190,
}: {
  pose?: Pose;
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 220" fill="none">
      <Defs>
        {/* Navy Tech Suit Sleeve */}
        <LinearGradient id="humanSleeveGrad" x1="1" y1="0" x2="0" y2="0.8">
          <Stop offset="0%" stopColor="#1E2842" />
          <Stop offset="50%" stopColor="#2D3B5C" />
          <Stop offset="100%" stopColor="#121828" />
        </LinearGradient>

        {/* Red Glowing Wrist Gadget */}
        <LinearGradient id="humanCuffGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#2A101A" />
          <Stop offset="50%" stopColor="#551425" />
          <Stop offset="100%" stopColor="#1E0A12" />
        </LinearGradient>

        <LinearGradient id="humanRedGlow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FF3B57" />
          <Stop offset="50%" stopColor="#FF1744" />
          <Stop offset="100%" stopColor="#FF6B81" />
        </LinearGradient>

        {/* 3D Stylized Warm Human Skin Gradient */}
        <LinearGradient id="humanSkinGrad" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFD8B8" />
          <Stop offset="40%" stopColor="#F5B98A" />
          <Stop offset="80%" stopColor="#D98A55" />
          <Stop offset="100%" stopColor="#A8572A" />
        </LinearGradient>

        {/* Shadow Skin Gradient */}
        <LinearGradient id="humanShadowSkin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#D98A55" />
          <Stop offset="100%" stopColor="#8A401C" />
        </LinearGradient>
      </Defs>

      {/* Forearm / Navy Suit Sleeve */}
      <Path
        d="M340 60 L220 70 C205 72 195 80 192 95 L185 150 C188 165 202 172 220 172 L340 180 Z"
        fill="url(#humanSleeveGrad)"
      />
      {/* Sleeve seam stitches */}
      <Path d="M300 65 L295 177" stroke="#121828" strokeWidth="2.5" />
      <Path d="M250 68 L244 173" stroke="#121828" strokeWidth="2.5" />

      {/* High-Tech Wrist Cuff */}
      <Rect
        x="184"
        y="75"
        width="30"
        height="90"
        rx="8"
        fill="url(#humanCuffGrad)"
        stroke="#FF3B57"
        strokeWidth="1.5"
      />
      {/* Red Glowing LED Node / Status Display */}
      <Rect x="194" y="108" width="14" height="24" rx="4" fill="#FF1744" />
      <Rect x="197" y="113" width="8" height="14" rx="2" fill="#FFA1B0" />

      {/* Hand Palm Flesh Core */}
      <Path
        d="M190 85 C180 75 155 72 125 80 C100 88 90 102 90 125 C90 148 105 162 135 165 C165 168 185 155 190 145 Z"
        fill="url(#humanSkinGrad)"
      />

      {/* ── FINGERS ACCORDING TO POSE (Facing Left) ── */}
      {pose === 'scissors' ? (
        /* SCISSORS: Index and middle fingers extended left in V shape */
        <G>
          {/* Index Finger (Extended slightly upward left) */}
          <G transform="rotate(7 125 95)">
            <Path
              d="M115 86 L65 88 C55 89 50 94 52 100 C54 105 60 105 68 104 L115 101 Z"
              fill="url(#humanSkinGrad)"
            />
            {/* Knuckle crease */}
            <Path d="M100 88 L102 101" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
            <Path d="M78 89 L80 102" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Middle Finger (Extended straight forward left) */}
          <G transform="rotate(-8 125 125)">
            <Path
              d="M112 113 L56 115 C46 116 42 121 44 127 C46 132 52 132 60 131 L112 128 Z"
              fill="url(#humanSkinGrad)"
            />
            {/* Knuckle crease */}
            <Path d="M96 115 L98 128" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
            <Path d="M74 116 L76 129" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Ring Finger (Curled Inward) */}
          <Rect x="104" y="138" width="30" height="17" rx="8.5" fill="url(#humanSkinGrad)" />
          {/* Pinky (Curled Inward) */}
          <Rect x="114" y="153" width="26" height="15" rx="7.5" fill="url(#humanSkinGrad)" />

          {/* Thumb curled across front */}
          <Path
            d="M165 105 C155 95 140 96 125 106 C115 114 116 125 126 130 C138 135 150 130 158 120 Z"
            fill="url(#humanSkinGrad)"
            stroke="url(#humanShadowSkin)"
            strokeWidth="1"
          />
        </G>
      ) : pose === 'paper' ? (
        /* PAPER: All fingers flat and extended left */
        <G>
          {/* Index Finger */}
          <G transform="rotate(10 125 85)">
            <Path d="M120 78 L68 80 C60 81 56 86 58 91 C60 95 66 95 74 94 L120 92 Z" fill="url(#humanSkinGrad)" />
            <Path d="M98 80 L100 92" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Middle Finger */}
          <G transform="rotate(2 125 105)">
            <Path d="M112 98 L52 100 C44 101 40 106 42 111 C45 115 50 115 58 114 L112 112 Z" fill="url(#humanSkinGrad)" />
            <Path d="M90 100 L92 112" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Ring Finger */}
          <G transform="rotate(-6 125 125)">
            <Path d="M116 118 L64 120 C56 121 52 126 55 130 C58 134 64 134 72 133 L116 131 Z" fill="url(#humanSkinGrad)" />
            <Path d="M94 120 L96 132" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Pinky */}
          <G transform="rotate(-14 125 145)">
            <Path d="M125 138 L84 140 C78 141 74 145 76 149 C78 152 84 152 90 151 L125 149 Z" fill="url(#humanSkinGrad)" />
            <Path d="M106 140 L108 150" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Thumb */}
          <G transform="rotate(-28 145 130)">
            <Path d="M140 125 L102 127 C96 128 92 133 94 137 C96 141 102 141 108 140 L140 139 Z" fill="url(#humanSkinGrad)" />
          </G>
        </G>
      ) : (
        /* FIST / ROCK: Powerful human fist punching left (matches reference image!) */
        <G>
          {/* Curled Knuckles Column (Facing Left) */}
          <G>
            {/* Knuckle 1 (Top / Index) */}
            <Rect x="84" y="78" width="40" height="21" rx="10" fill="url(#humanSkinGrad)" stroke="#B36537" strokeWidth="1" />
            <Path d="M102 82 C104 88 104 94 102 98" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />

            {/* Knuckle 2 (Middle — Most Prominent) */}
            <Rect x="74" y="98" width="44" height="22" rx="10.5" fill="url(#humanSkinGrad)" stroke="#B36537" strokeWidth="1" />
            <Path d="M94 102 C96 108 96 114 94 118" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />

            {/* Knuckle 3 (Ring) */}
            <Rect x="80" y="119" width="42" height="21" rx="10" fill="url(#humanSkinGrad)" stroke="#B36537" strokeWidth="1" />
            <Path d="M100 123 C102 129 102 135 100 139" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />

            {/* Knuckle 4 (Pinky) */}
            <Rect x="94" y="139" width="36" height="19" rx="9" fill="url(#humanSkinGrad)" stroke="#B36537" strokeWidth="1" />
            <Path d="M112 143 C114 148 114 153 112 156" stroke="url(#humanShadowSkin)" strokeWidth="1.5" />
          </G>

          {/* Clamped Thumb across front of knuckles */}
          <Path
            d="M155 92 C140 84 120 86 105 96 C95 104 95 118 108 125 C122 132 142 128 152 116 Z"
            fill="url(#humanSkinGrad)"
            stroke="#B36537"
            strokeWidth="1.5"
          />
          {/* Thumb knuckle fold line */}
          <Path d="M125 96 C129 104 129 114 123 120" stroke="url(#humanShadowSkin)" strokeWidth="2" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 3. 3D SELECTION CARD ILLUSTRATIONS (Rock, Paper, Scissors)
// ────────────────────────────────────────────────────────────────────────────

// 3a. Realistic 3D Rock / Boulder
export function RockCardIllustration({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <RadialGradient id="rockHighlight" cx="35%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#E2E8F0" />
          <Stop offset="35%" stopColor="#94A3B8" />
          <Stop offset="70%" stopColor="#475569" />
          <Stop offset="100%" stopColor="#1E293B" />
        </RadialGradient>
        <LinearGradient id="rockFacet1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#CBD5E1" />
          <Stop offset="100%" stopColor="#64748B" />
        </LinearGradient>
        <LinearGradient id="rockFacet2" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#64748B" />
          <Stop offset="100%" stopColor="#334155" />
        </LinearGradient>
        <LinearGradient id="rockShadow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#334155" />
          <Stop offset="100%" stopColor="#0F172A" />
        </LinearGradient>
      </Defs>

      {/* Ground Soft Glow/Shadow */}
      <Path d="M12 78 C25 88 75 88 88 78 C75 84 25 84 12 78 Z" fill="rgba(0, 218, 243, 0.25)" />

      {/* Main Boulder Silhouette */}
      <Polygon
        points="30,18 62,14 84,32 88,64 74,82 34,84 14,68 12,38"
        fill="url(#rockHighlight)"
      />

      {/* Facet Polygons for 3D Chiseled Look */}
      <Polygon points="30,18 62,14 54,38 32,42" fill="url(#rockFacet1)" opacity="0.9" />
      <Polygon points="62,14 84,32 68,48 54,38" fill="url(#rockFacet2)" opacity="0.8" />
      <Polygon points="84,32 88,64 66,62 68,48" fill="url(#rockShadow)" opacity="0.85" />
      <Polygon points="88,64 74,82 52,70 66,62" fill="url(#rockShadow)" opacity="0.95" />
      <Polygon points="74,82 34,84 38,62 52,70" fill="url(#rockFacet2)" opacity="0.9" />
      <Polygon points="34,84 14,68 26,52 38,62" fill="url(#rockShadow)" opacity="0.8" />
      <Polygon points="14,68 12,38 32,42 26,52" fill="url(#rockFacet1)" opacity="0.85" />
      <Polygon points="12,38 30,18 32,42" fill="#E2E8F0" opacity="0.6" />

      {/* Center Highlight Plateau */}
      <Polygon points="32,42 54,38 68,48 66,62 52,70 38,62 26,52" fill="url(#rockFacet1)" opacity="0.7" />

      {/* Crag detail lines */}
      <Path d="M38 62 L48 50 L64 54" stroke="#1E293B" strokeWidth="1.2" opacity="0.7" />
      <Path d="M52 70 L58 60" stroke="#0F172A" strokeWidth="1" opacity="0.8" />
    </Svg>
  );
}

// 3b. 3D Paper Document / Scroll
export function PaperCardIllustration({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="paperSheetGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="60%" stopColor="#F1F5F9" />
          <Stop offset="100%" stopColor="#CBD5E1" />
        </LinearGradient>
        <LinearGradient id="paperClipGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#94A3B8" />
          <Stop offset="50%" stopColor="#475569" />
          <Stop offset="100%" stopColor="#1E293B" />
        </LinearGradient>
      </Defs>

      {/* Paper Drop Shadow */}
      <Path
        d="M26 22 L74 22 C78 22 81 25 81 29 L81 81 C81 85 78 88 74 88 L26 88 C22 88 19 85 19 81 L19 29 C19 25 22 22 26 22 Z"
        fill="rgba(0, 0, 0, 0.4)"
        transform="translate(4, 4)"
      />

      {/* Main Paper Sheet (Angled slightly) */}
      <Path
        d="M26 18 L74 18 C78 18 81 21 81 25 L81 79 C81 83 78 86 74 86 L26 86 C22 86 19 83 19 79 L19 25 C19 21 22 18 26 18 Z"
        fill="url(#paperSheetGrad)"
        stroke="#E2E8F0"
        strokeWidth="1.5"
      />

      {/* Top Clipboard Clip */}
      <Rect x="38" y="12" width="24" height="12" rx="3" fill="url(#paperClipGrad)" stroke="#CBD5E1" strokeWidth="1" />
      <Circle cx="50" cy="18" r="2.5" fill="#E2E8F0" />

      {/* Ruled Text Lines on Document */}
      <Path d="M30 34 L70 34" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <Path d="M30 42 L70 42" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <Path d="M30 50 L64 50" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <Path d="M30 58 L70 58" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <Path d="M30 66 L56 66" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <Path d="M30 74 L68 74" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

      {/* Folded Bottom-Right Corner Accent */}
      <Path d="M69 86 L81 74 L69 74 Z" fill="#94A3B8" opacity="0.6" />
    </Svg>
  );
}

// 3c. 3D Scissors with Red Handles
export function ScissorsCardIllustration({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="bladeSteel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#E2E8F0" />
          <Stop offset="80%" stopColor="#94A3B8" />
          <Stop offset="100%" stopColor="#475569" />
        </LinearGradient>
        <LinearGradient id="scissorRedHandle" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FF4D6D" />
          <Stop offset="50%" stopColor="#E11D48" />
          <Stop offset="100%" stopColor="#9F1239" />
        </LinearGradient>
      </Defs>

      {/* Shadow */}
      <Circle cx="48" cy="52" r="32" fill="rgba(255, 39, 87, 0.2)" />

      {/* Blade 1 (Upper Left to Center) */}
      <Path
        d="M20 25 L48 48 L46 54 L14 31 Z"
        fill="url(#bladeSteel)"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      {/* Blade 1 Cutting Bevel Line */}
      <Path d="M15 30 L46 52" stroke="#FFFFFF" strokeWidth="1" />

      {/* Blade 2 (Lower Left to Center) */}
      <Path
        d="M20 75 L48 52 L46 46 L14 69 Z"
        fill="url(#bladeSteel)"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      {/* Blade 2 Cutting Bevel Line */}
      <Path d="M15 70 L46 48" stroke="#FFFFFF" strokeWidth="1" />

      {/* Pivot Screw in Center */}
      <Circle cx="48" cy="50" r="5" fill="#475569" stroke="#E2E8F0" strokeWidth="1.5" />
      <Circle cx="48" cy="50" r="2" fill="#E2E8F0" />

      {/* Scissor Shorter Arm 1 to Handle */}
      <Path d="M49 48 L64 38 L68 42 L52 52 Z" fill="url(#bladeSteel)" />
      {/* Scissor Shorter Arm 2 to Handle */}
      <Path d="M49 52 L64 62 L68 58 L52 48 Z" fill="url(#bladeSteel)" />

      {/* Red Finger Loop 1 (Top Right) */}
      <Path
        d="M62 38 C58 30 65 18 76 18 C87 18 92 28 88 38 C84 48 72 48 62 38 Z"
        fill="url(#scissorRedHandle)"
        stroke="#FF758F"
        strokeWidth="1.5"
      />
      {/* Inner Hole 1 */}
      <Path
        d="M68 34 C66 28 71 24 76 24 C81 24 84 28 82 34 C80 40 72 40 68 34 Z"
        fill="#0C1527"
      />

      {/* Red Finger Loop 2 (Bottom Right) */}
      <Path
        d="M62 62 C58 70 65 82 76 82 C87 82 92 72 88 62 C84 52 72 52 62 62 Z"
        fill="url(#scissorRedHandle)"
        stroke="#FF758F"
        strokeWidth="1.5"
      />
      {/* Inner Hole 2 */}
      <Path
        d="M68 66 C66 72 71 76 76 76 C81 76 84 72 82 66 C80 60 72 60 68 66 Z"
        fill="#0C1527"
      />
    </Svg>
  );
}
