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
import { Feather, Ionicons } from '@expo/vector-icons';
import RpsHand3D from './RpsHand3D';
import Avatar from '../ui/Avatar';
import { Choice, Phase, Pose, RoundOutcome } from '../../lib/rps/rpsTypes';
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

  const choices: { id: Choice; label: string; emoji: string }[] = [
    { id: 'rock', label: 'Rock', emoji: '✊' },
    { id: 'paper', label: 'Paper', emoji: '✋' },
    { id: 'scissors', label: 'Scissors', emoji: '✌️' },
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
          accessibilityLabel="Leave Game"
        >
          <Feather name="arrow-left" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Round & Pot Subtle Badges */}
        <View style={s.matchMetaPills}>
          <View style={s.metaPill}>
            <Text style={s.metaPillText}>Round {round} of {bestOf}</Text>
          </View>
          <View style={[s.metaPill, s.potPill]}>
            <Ionicons name="trophy" size={13} color="#F59E0B" />
            <Text style={s.potPillText}>Pot: {potAmount} ETB</Text>
          </View>
        </View>

        <View style={{ width: 40 }} />
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
                <Ionicons name="person" size={24} color="#000000" />
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
              <Text style={s.lockedBadgeText}>Ready ✓</Text>
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
                color={secondsRemaining <= 3 ? '#EF4444' : '#00DAF3'}
              />
              <Text style={[s.timerPillText, secondsRemaining <= 3 && s.timerPillTextUrgent]}>
                {secondsRemaining}s
              </Text>
            </View>
          )}
          {phase === 'countdown' && (
            <View style={s.timerPill}>
              <Text style={s.timerPillText}>Get Ready...</Text>
            </View>
          )}
          {phase === 'roundResult' && roundOutcome && (
            <View style={[
              s.roundOutcomePill,
              roundOutcome === 'win' && s.roundOutcomeWin,
              roundOutcome === 'lose' && s.roundOutcomeLose,
            ]}>
              <Text style={s.roundOutcomePillText}>
                {roundOutcome === 'win' ? 'ROUND WON!' : roundOutcome === 'lose' ? 'ROUND LOST' : 'DRAW'}
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
              <Text style={s.lockedBadgeText}>Ready ✓</Text>
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
                <Text style={s.choiceEmoji}>{c.emoji}</Text>
                <Text style={[s.choiceText, isSelected && s.choiceTextSelected]}>
                  {c.label}
                </Text>
                {isSelected && isLocked && (
                  <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
    backgroundColor: '#080B10',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 28,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchMetaPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaPill: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  metaPillText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  potPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  potPillText: {
    color: '#F59E0B',
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
    paddingHorizontal: 20,
    marginTop: 4,
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
    borderColor: '#F59E0B',
    backgroundColor: '#F59E0B',
  },
  avatarOppRing: {
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  batmanAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentQuestionMark: {
    color: '#94A3B8',
    fontSize: 22,
    fontWeight: '900',
  },
  playerLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  winPipsRow: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    gap: 4,
  },
  pipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pipDotEmpty: {
    backgroundColor: '#334155',
  },
  pipDotWonYou: {
    backgroundColor: '#00DAF3',
  },
  pipDotWonOpp: {
    backgroundColor: '#EF4444',
  },
  lockedBadgePill: {
    marginTop: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lockedBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },

  // VS Center Container
  vsCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsMainText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timerPillUrgent: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  timerPillText: {
    color: '#00DAF3',
    fontSize: 13,
    fontWeight: '800',
  },
  timerPillTextUrgent: {
    color: '#EF4444',
  },
  roundOutcomePill: {
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  roundOutcomeWin: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  roundOutcomeLose: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#EF4444',
  },
  roundOutcomePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    paddingHorizontal: 10,
    marginVertical: 10,
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
    marginBottom: 8,
  },
  pillsDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: 6,
    gap: 8,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55)',
        } as any)
      : {}),
  },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
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
    backgroundColor: '#4F46E5',
    borderColor: '#818CF8',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 16px rgba(79, 70, 229, 0.45)',
        } as any)
      : {}),
  },
  choicePillDisabled: {
    opacity: 0.55,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'not-allowed',
        } as any)
      : {}),
  },
  choiceEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  choiceText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

export default DesktopRpsArena;
