// components/rps/DesktopRpsArena.tsx
// High-fidelity PC / Desktop gameplay screen for Rock Paper Scissors on XO ET.
// Matches reference screenshot (media_1795363784831_82719432.png):
// - Minimal dark aesthetic with clean contrast
// - Top Header: Left "You" (avatar + label), Center "VS" with round/pot/timer, Right "Opponent" (avatar + label)
// - Central Arena: Left 3D Hand (You) facing right, Right 3D Hand (Opponent) facing left
// - Bottom Dock: 3 clean pill buttons [ ✊ Rock ] [ ✋ Paper ] [ ✌️ Scissors ]
// - Direct 1-tap lock-in with sound, haptics, and instant server transmission
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import RpsHand3D from './RpsHand3D';
import Avatar from '../ui/Avatar';
import { Choice, Phase, Pose, RoundOutcome } from '../../lib/rps/rpsTypes';
import { colors, radius, space } from '../../theme/tokens';
import { haptics } from '../../lib/haptcs';
import { playTickSound } from '../../lib/pinTickAudio';

interface DesktopRpsArenaProps {
  phase: Phase;
  round: number;
  bestOf: number;
  potAmount: number;
  scoreYou: number;
  scoreOpponent: number;
  winsNeeded: number;
  youName: string;
  opponentName: string;
  youAvatar?: string | null;
  opponentAvatar?: string | null;
  selectedChoice: Choice | null;
  isLocked: boolean;
  opponentLocked: boolean;
  secondsRemaining: number;
  totalSeconds?: number;
  opponentPose: Pose;
  playerPose: Pose;
  roundOutcome?: RoundOutcome | null;
  onSelectChoice: (choice: Choice) => void;
  onLockChoice: () => void;
  onLeaveGame: () => void;
}

export const DesktopRpsArena: React.FC<DesktopRpsArenaProps> = ({
  phase,
  round,
  bestOf,
  potAmount,
  scoreYou,
  scoreOpponent,
  winsNeeded,
  youName,
  opponentName,
  youAvatar,
  opponentAvatar,
  selectedChoice,
  isLocked,
  opponentLocked,
  secondsRemaining,
  totalSeconds = 10,
  opponentPose,
  playerPose,
  roundOutcome,
  onSelectChoice,
  onLockChoice,
  onLeaveGame,
}) => {
  const isChoosing = phase === 'choose';
  const isShaking = phase === 'reveal';

  const handleCardPress = (choice: Choice) => {
    if (isLocked || !isChoosing) return;
    try { playTickSound(); } catch {}
    haptics.impact();
    onSelectChoice(choice);
  };

  const choices: { id: Choice; label: string; iconName: 'hand-rock' | 'hand-paper' | 'hand-scissors' }[] = [
    { id: 'rock', label: 'Rock', iconName: 'hand-rock' },
    { id: 'paper', label: 'Paper', iconName: 'hand-paper' },
    { id: 'scissors', label: 'Scissors', iconName: 'hand-scissors' },
  ];

  return (
    <View style={s.arenaRoot}>
      {/* ──────────────── TOP BAR: BACK BUTTON ──────────────── */}
      <View style={s.topActionBar}>
        <TouchableOpacity
          onPress={onLeaveGame}
          style={s.backBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Leave match"
        >
          <Feather name="arrow-left" size={20} color={colors.textSoft} />
        </TouchableOpacity>

        {/* Round & Pot Subtle Badges */}
        <View style={s.matchMetaPills}>
          <View style={s.metaPill}>
            <Text style={s.metaPillText}>Round {round} of {bestOf}</Text>
          </View>
          <View style={[s.metaPill, s.potPill]}>
            <Ionicons name="trophy" size={13} color={colors.gold} />
            <Text style={s.potPillText}>Pot: {potAmount} ETB</Text>
          </View>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* ──────────────── VS & PLAYER HEADER (Matches Reference Image) ──────────────── */}
      <View style={s.versusHeaderRow}>
        {/* Left: You Avatar & Label */}
        <View style={s.playerNode}>
          <View style={[s.avatarCircle, s.avatarYouRing]}>
            {youAvatar ? (
              <Avatar uri={youAvatar} name={youName} size={48} />
            ) : (
              <View style={s.batmanAvatarCircle}>
                <Ionicons name="person" size={24} color={colors.bgDeep} />
              </View>
            )}
            {/* Wins Pip Dots */}
            <View style={s.winPipsRow}>
              {Array.from({ length: winsNeeded }).map((_, i) => (
                <View
                  key={`you-pip-${i}`}
                  style={[s.pipDot, i < scoreYou ? s.pipDotWonYou : s.pipDotEmpty]}
                />
              ))}
            </View>
          </View>
          <Text style={s.playerLabel}>You</Text>
          {isLocked && isChoosing && (
            <View style={s.lockedBadgePill}>
              <Feather name="check" size={12} color={colors.success} />
              <Text style={s.lockedBadgeText}>Locked</Text>
            </View>
          )}
        </View>

        {/* Center: VS & Timer */}
        <View style={s.vsCenterContainer}>
          <Text style={s.vsMainText}>VS</Text>
          {isChoosing && (
            <View style={[s.timerPill, secondsRemaining <= 3 && s.timerPillUrgent]}>
              <Ionicons
                name="time-outline"
                size={14}
                color={secondsRemaining <= 3 ? colors.danger : colors.primary}
              />
              <Text style={[s.timerPillText, secondsRemaining <= 3 && s.timerPillTextUrgent]}>
                {secondsRemaining}s
              </Text>
            </View>
          )}
          {phase === 'countdown' && (
            <View style={s.timerPill}>
              <Text style={s.timerPillText}>Get ready</Text>
            </View>
          )}
          {phase === 'roundResult' && roundOutcome && (
            <View style={[
              s.roundOutcomePill,
              roundOutcome === 'win' && s.roundOutcomeWin,
              roundOutcome === 'lose' && s.roundOutcomeLose,
            ]}>
              <Text style={s.roundOutcomePillText}>
                {roundOutcome === 'win' ? 'Round won' : roundOutcome === 'lose' ? 'Round lost' : 'Draw'}
              </Text>
            </View>
          )}
        </View>

        {/* Right: Opponent Avatar & Label */}
        <View style={s.playerNode}>
          <View style={[s.avatarCircle, s.avatarOppRing]}>
            {opponentAvatar ? (
              <Avatar uri={opponentAvatar} name={opponentName} size={48} />
            ) : (
              <View style={s.opponentAvatarCircle}>
                <Text style={s.opponentQuestionMark}>?</Text>
              </View>
            )}
            {/* Wins Pip Dots */}
            <View style={s.winPipsRow}>
              {Array.from({ length: winsNeeded }).map((_, i) => (
                <View
                  key={`opp-pip-${i}`}
                  style={[s.pipDot, i < scoreOpponent ? s.pipDotWonOpp : s.pipDotEmpty]}
                />
              ))}
            </View>
          </View>
          <Text style={s.playerLabel}>{opponentName || 'Opponent'}</Text>
          {opponentLocked && isChoosing && (
            <View style={s.lockedBadgePill}>
              <Feather name="check" size={12} color={colors.success} />
              <Text style={s.lockedBadgeText}>Locked</Text>
            </View>
          )}
        </View>
      </View>

      {/* ──────────────── CENTRAL ARENA: 2 3D HANDS FACING EACH OTHER ──────────────── */}
      <View style={s.handsArenaRow}>
        {/* Left Hand: Player (Facing Right) */}
        <View style={s.handColumnLeft}>
          <RpsHand3D
            side="left"
            pose={playerPose}
            isShaking={isShaking}
            width={340}
            height={220}
          />
        </View>

        {/* Center Spatial Void between hands */}
        <View style={s.handDivider} />

        {/* Right Hand: Opponent (Facing Left) */}
        <View style={s.handColumnRight}>
          <RpsHand3D
            side="right"
            pose={opponentPose}
            isShaking={isShaking}
            width={340}
            height={220}
          />
        </View>
      </View>

      {/* ──────────────── BOTTOM DOCK: 3 BUTTONS (Rock, Paper, Scissors) ──────────────── */}
      <View style={s.bottomDockContainer}>
        <View style={s.pillsDock}>
          {choices.map((c) => {
            const isSelected = selectedChoice === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                disabled={!isChoosing || isLocked}
                onPress={() => handleCardPress(c.id)}
                style={[
                  s.choicePill,
                  isSelected && s.choicePillSelected,
                  (!isChoosing || isLocked) && !isSelected && s.choicePillDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={c.label}
              >
                <FontAwesome5
                  name={c.iconName}
                  size={16}
                  color={isSelected ? colors.bgDeep : colors.textMuted}
                  style={s.choiceIcon}
                />
                <Text style={[s.choiceText, isSelected && s.choiceTextSelected]}>
                  {c.label}
                </Text>
                {isSelected && isLocked && (
                  <Ionicons name="checkmark-circle" size={15} color={colors.bgDeep} style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  arenaRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgDeep,
    justifyContent: 'space-between',
    paddingVertical: space.xl,
    paddingHorizontal: space.xxl,
  },

  // Top Action Bar
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchMetaPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  metaPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  metaPillText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  potPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.tintGold,
    borderColor: colors.gold,
  },
  potPillText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
  },

  // Versus Header
  versusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.xs,
  },
  playerNode: {
    alignItems: 'center',
    width: 100,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarYouRing: {
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  avatarOppRing: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.cardRaised,
  },
  batmanAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentQuestionMark: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '800',
  },
  playerLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: space.md,
    textAlign: 'center',
  },
  winPipsRow: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    gap: space.xs,
  },
  pipDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  pipDotEmpty: {
    backgroundColor: colors.borderStrong,
  },
  pipDotWonYou: {
    backgroundColor: colors.primary,
  },
  pipDotWonOpp: {
    backgroundColor: colors.danger,
  },
  lockedBadgePill: {
    marginTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.tintSuccess,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 2,
  },
  lockedBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },

  // VS Center Container
  vsCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsMainText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  timerPillUrgent: {
    borderColor: colors.danger,
    backgroundColor: colors.tintDanger,
  },
  timerPillText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  timerPillTextUrgent: {
    color: colors.danger,
  },
  roundOutcomePill: {
    marginTop: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  roundOutcomeWin: {
    backgroundColor: colors.tintSuccess,
    borderColor: colors.success,
  },
  roundOutcomeLose: {
    backgroundColor: colors.tintDanger,
    borderColor: colors.danger,
  },
  roundOutcomePillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  // Hands Arena
  handsArenaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: space.md,
    marginVertical: space.md,
  },
  handColumnLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  handDivider: {
    width: 60,
  },
  handColumnRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // Bottom Choice Dock
  bottomDockContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  pillsDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    padding: space.sm,
    gap: space.md,
  },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          transition: 'all 0.18s ease',
          cursor: 'pointer',
        } as any)
      : {}),
  },
  choicePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primarySoft,
  },
  choicePillDisabled: {
    opacity: 0.55,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'not-allowed',
        } as any)
      : {}),
  },
  choiceIcon: {
    marginRight: space.md,
  },
  choiceText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: colors.bgDeep,
    fontWeight: '800',
  },
});

export default DesktopRpsArena;
