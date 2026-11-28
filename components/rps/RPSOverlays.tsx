// components/rps/RPSOverlays.tsx
// ────────────────────────────────────────────────────────────────────────────
// Match overlays:
// - ReadyCountdownOverlay: 3s pre-match countdown (3.. 2.. 1..)
// - RoundResultBanner: Round outcome with move breakdown
// - MatchFinalSheet: Payout / Match Over Modal
// - RpsLeaveConfirmModal: Cross-platform forfeit confirmation modal (replaces Alert.alert)
// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoundOutcome } from '../../lib/rps/rpsTypes';
import { colors, radius, space } from '../../theme/tokens';
import { playTickSound } from '../../lib/pinTickAudio';
import { haptics } from '../../lib/haptcs';

// ── ReadyCountdownOverlay ───────────────────────────────────────────────────
interface ReadyCountdownOverlayProps {
  count: number; // 3, 2, 1
  bestOf: number;
}

export const ReadyCountdownOverlay: React.FC<ReadyCountdownOverlayProps> = ({
  count,
  bestOf,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [count, scaleAnim, opacityAnim]);

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.readyTitle}>Rock, Paper, Scissors</Text>
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
    ? 'Round won'
    : isLoss
    ? 'Round lost'
    : 'Round draw';

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

// ── MatchFinalSheet (Payout & Match Over Modal) ─────────────────────────────
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
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enterAnim.setValue(0);
      return;
    }
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, enterAnim]);

  if (!visible) return null;

  const potAmount = stakeAmount * 2;
  const netProfit = won ? prizeAmount - stakeAmount : -stakeAmount;

  const handlePlayAgainPress = () => {
    try { playTickSound(); } catch {}
    haptics.impact();
    onPlayAgain();
  };

  const handleExitPress = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    onExit();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleExitPress}>
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[
            styles.modalSheet,
            {
              opacity: enterAnim,
              transform: [
                { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ width: 44 }} />
            <Text style={styles.sheetTitle}>{won ? 'Victory' : 'Match ended'}</Text>
            <TouchableOpacity
              onPress={handleExitPress}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close match result"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.amountText, { color: won ? colors.success : colors.danger }]}>
            {won ? `+${prizeAmount.toLocaleString()} ETB` : `-${stakeAmount.toLocaleString()} ETB`}
          </Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>
              You {scoreYou} — {scoreOpponent} Opponent
            </Text>
          </View>

          <View style={styles.sheetBody}>
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Match pot</Text>
                <Text style={styles.detailValue}>{potAmount.toLocaleString()} ETB</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform fee</Text>
                <Text style={styles.detailValue}>-{feeAmount.toLocaleString()} ETB</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowHighlight]}>
                <Text style={[styles.detailLabel, { color: colors.text, fontWeight: '700' }]}>
                  {won ? 'Net profit' : 'Your entry'}
                </Text>
                <Text style={[styles.detailValue, { color: won ? colors.gold : colors.text, fontWeight: '800' }]}>
                  {won ? `+${netProfit.toLocaleString()} ETB` : `${stakeAmount.toLocaleString()} ETB`}
                </Text>
              </View>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePlayAgainPress}
                style={styles.playAgainButton}
                accessibilityRole="button"
                accessibilityLabel="Play again"
              >
                <Text style={styles.playAgainText}>Play again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleExitPress}
                style={styles.exitButton}
                accessibilityRole="button"
                accessibilityLabel="Return to lobby"
              >
                <Text style={styles.exitText}>Return to lobby</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ── RpsLeaveConfirmModal (Replaces Alert.alert on Web & Native) ─────────────
interface RpsLeaveConfirmModalProps {
  visible: boolean;
  stakeAmount: number;
  onStay: () => void;
  onForfeit: () => void;
}

export const RpsLeaveConfirmModal: React.FC<RpsLeaveConfirmModalProps> = ({
  visible,
  stakeAmount,
  onStay,
  onForfeit,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={styles.modalBackdrop}>
        <View style={styles.confirmSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.confirmTitle}>Forfeit match?</Text>
            <TouchableOpacity
              onPress={onStay}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close forfeit dialog"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.confirmHelp}>
            Leaving an active match forfeits your {stakeAmount.toLocaleString()} ETB entry.
          </Text>

          <View style={styles.sheetActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onForfeit}
              style={styles.forfeitButton}
              accessibilityRole="button"
              accessibilityLabel="Forfeit match"
            >
              <Text style={styles.forfeitButtonText}>Forfeit match</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onStay}
              style={styles.exitButton}
              accessibilityRole="button"
              accessibilityLabel="Stay in match"
            >
              <Text style={styles.exitText}>Stay in match</Text>
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
  },
  readySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.primary,
  },
  roundBanner: {
    position: 'absolute',
    top: '44%',
    alignSelf: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: space.xxl,
    paddingVertical: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    zIndex: 25,
  },
  roundHeadline: {
    fontSize: 17,
    fontWeight: '800',
  },
  roundSub: {
    fontSize: 13,
    color: colors.textSoft,
    fontWeight: '600',
    marginTop: space.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.xl,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: space.md,
  },
  confirmSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: space.xl,
    gap: space.lg,
  },
  sheetHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSoft,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  confirmHelp: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  scoreRow: {
    marginTop: space.md,
    backgroundColor: colors.cardRaised,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  sheetBody: {
    width: '100%',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: space.sm,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    marginBottom: space.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSoft,
  },
  sheetActions: {
    width: '100%',
    flexDirection: 'row',
    gap: space.md,
  },
  playAgainButton: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer' } as any)
      : {}),
  },
  playAgainText: {
    color: colors.bgDeep,
    fontSize: 14,
    fontWeight: '800',
  },
  forfeitButton: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer' } as any)
      : {}),
  },
  forfeitButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  exitButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer' } as any)
      : {}),
  },
  exitText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
});
