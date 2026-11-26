// components/rps/Bars.tsx
// ────────────────────────────────────────────────────────────────────────────
// ScoreBar (round segment tracking) & TimerBar (10s choose countdown).
// ────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';
import Avatar from '../ui/Avatar';

// ── ScoreBar ────────────────────────────────────────────────────────────────
interface ScoreBarProps {
  scoreYou: number;
  scoreOpponent: number;
  winsNeeded: number;
  youName: string;
  opponentName: string;
  youAvatar?: string | null;
  opponentAvatar?: string | null;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  scoreYou,
  scoreOpponent,
  winsNeeded,
  youName,
  opponentName,
  youAvatar,
  opponentAvatar,
}) => {
  return (
    <View style={styles.scoreContainer}>
      {/* Opponent Score (Top) */}
      <View style={styles.scoreSide}>
        <Avatar
          uri={opponentAvatar}
          name={opponentName}
          size="md"
        />
        <Text style={styles.playerName} numberOfLines={1}>
          {opponentName}
        </Text>
        <View style={styles.dotsRow}>
          {Array.from({ length: winsNeeded }).map((_, idx) => (
            <View
              key={`opp-dot-${idx}`}
              style={[
                styles.dot,
                idx < scoreOpponent
                  ? { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 }
                  : styles.dotEmpty,
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.vsText}>VS</Text>

      {/* Your Score (Bottom) */}
      <View style={[styles.scoreSide, { alignItems: 'flex-end' }]}>
        <View style={styles.dotsRow}>
          {Array.from({ length: winsNeeded }).map((_, idx) => (
            <View
              key={`you-dot-${idx}`}
              style={[
                styles.dot,
                idx < scoreYou
                  ? { backgroundColor: colors.violet, shadowColor: colors.violet, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 }
                  : styles.dotEmpty,
              ]}
            />
          ))}
        </View>
        <Text style={styles.playerName} numberOfLines={1}>
          You
        </Text>
        <Avatar
          uri={youAvatar}
          name={youName}
          size="md"
        />
      </View>
    </View>
  );
};

// ── TimerBar ────────────────────────────────────────────────────────────────
interface TimerBarProps {
  secondsRemaining: number;
  totalSeconds: number;
}

export const TimerBar: React.FC<TimerBarProps> = ({
  secondsRemaining,
  totalSeconds,
}) => {
  const fraction = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));
  const isLow = secondsRemaining <= 3;

  return (
    <View style={styles.timerContainer}>
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${fraction * 100}%`,
              backgroundColor: isLow ? colors.danger : colors.primary,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.timerSeconds,
          { color: isLow ? colors.danger : colors.text },
        ]}
      >
        {secondsRemaining}s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 16, 31, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  scoreSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerName: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 80,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vsText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  timerTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerSeconds: {
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 26,
    textAlign: 'right',
  },
});
