// components/rps/RPSOverlays.tsx
// ────────────────────────────────────────────────────────────────────────────
// Match overlays:
// - ReadyCountdownOverlay: 3s pre-match countdown (3.. 2.. 1..)
// - RoundResultBanner: Round outcome with punchy move breakdown
// - MatchFinalSheet: Payout / Forfeit settlement modal
// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { RoundOutcome } from '../../lib/rps/rpsTypes';
import { colors } from '../../theme/tokens';

// ── ReadyCountdownOverlay ───────────────────────────────────────────────────
interface ReadyCountdownOverlayProps {
  count: number; // 3, 2, 1
  bestOf: number;
}

export const ReadyCountdownOverlay: React.FC<ReadyCountdownOverlayProps> = ({
  count,
  bestOf,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count]);

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.readyTitle}>Rock • Paper • Scissors</Text>
      <Text style={styles.readySubtitle}>
        Best of {bestOf}. First to {Math.ceil(bestOf / 2)} wins.
      </Text>
      <Animated.Text
        style={[
          styles.countdownNumber,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {count}
      </Animated.Text>
    </View>
  );
};

// ── RoundResultBanner ───────────────────────────────────────────────────────
interface RoundResultBannerProps {
  outcome: RoundOutcome;
  moveDescription: string;
}

export const RoundResultBanner: React.FC<RoundResultBannerProps> = ({
  outcome,
  moveDescription,
}) => {
  const isWin = outcome === 'win';
  const isLoss = outcome === 'lose';

  const headline = isWin
    ? 'ROUND WON!'
    : isLoss
    ? 'ROUND LOST'
    : 'ROUND DRAW';

  const accentColor = isWin
    ? colors.success
    : isLoss
    ? colors.danger
    : colors.textMuted;

  return (
    <View style={[styles.roundBanner, { borderColor: accentColor }]}>
      <Text style={[styles.roundHeadline, { color: accentColor }]}>
        {headline}
      </Text>
      <Text style={styles.roundSub}>{moveDescription}</Text>
    </View>
  );
};

// ── MatchFinalSheet ─────────────────────────────────────────────────────────
interface MatchFinalSheetProps {
  visible: boolean;
  won: boolean;
  scoreYou: number;
  scoreOpponent: number;
  stakeAmount: number;
  prizeAmount: number;
  feeAmount: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

export const MatchFinalSheet: React.FC<MatchFinalSheetProps> = ({
  visible,
  won,
  scoreYou,
  scoreOpponent,
  stakeAmount,
  prizeAmount,
  feeAmount,
  onPlayAgain,
  onExit,
}) => {
  if (!visible) return null;

  const potAmount = stakeAmount * 2;
  const netProfit = won ? prizeAmount - stakeAmount : -stakeAmount;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {won ? (
                <Ionicons name="trophy" size={26} color={colors.gold} />
              ) : (
                <Ionicons name="close-circle" size={26} color={colors.danger} />
              )}
              <Text style={styles.sheetTitle}>{won ? 'Victory!' : 'Match Over'}</Text>
            </View>
            <Text style={styles.sheetScore}>
              {scoreYou} - {scoreOpponent}
            </Text>
          </View>

          {/* Big Amount */}
          <View style={styles.amountBox}>
            <Text
              style={[
                styles.amountText,
                { color: won ? colors.gold : colors.textMuted },
              ]}
            >
              {won ? `+${prizeAmount}` : `-${stakeAmount}`} <Text style={styles.etbUnit}>ETB</Text>
            </Text>
            <Text style={styles.amountLabel}>
              {won ? `Net Profit: +${netProfit} ETB` : 'Stake Deducted'}
            </Text>
          </View>

          {/* Details breakdown */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Pot</Text>
              <Text style={styles.detailValue}>{potAmount} ETB</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Platform Fee (20%)</Text>
              <Text style={styles.detailValue}>-{feeAmount} ETB</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowHighlight]}>
              <Text style={[styles.detailLabel, { color: colors.text, fontWeight: '700' }]}>
                {won ? 'You Receive' : 'Your Stake'}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: won ? colors.gold : colors.text, fontWeight: '800' },
                ]}
              >
                {won ? `${prizeAmount} ETB` : `${stakeAmount} ETB`}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.sheetActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPlayAgain}
              style={styles.playAgainButton}
            >
              <Ionicons name="refresh" size={18} color={colors.bgDeep} />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onExit}
              style={styles.exitButton}
            >
              <Text style={styles.exitText}>Back to Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  countdownContainer: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  readyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  readySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  roundBanner: {
    position: 'absolute',
    top: '44%',
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 11, 22, 0.94)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  roundHeadline: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roundSub: {
    fontSize: 12,
    color: colors.textSoft,
    fontWeight: '600',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 7, 14, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  sheetScore: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  amountBox: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.cardRaised,
    borderRadius: 16,
    marginBottom: 16,
  },
  amountText: {
    fontSize: 34,
    fontWeight: '900',
  },
  etbUnit: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  detailsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  sheetActions: {
    gap: 10,
  },
  playAgainButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playAgainText: {
    color: colors.bgDeep,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  exitButton: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exitText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
});
