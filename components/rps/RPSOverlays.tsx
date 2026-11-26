// components/rps/RPSOverlays.tsx
// ────────────────────────────────────────────────────────────────────────────
// Match overlays:
// - ReadyCountdownOverlay: 3s pre-match countdown (3.. 2.. 1..)
// - RoundResultBanner: Round outcome with punchy move breakdown
// - MatchFinalSheet: Professional Payout / Match Over Modal
// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RoundOutcome } from '../../lib/rps/rpsTypes';
import { colors } from '../../theme/tokens';
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
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
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
    ? '#10B981'
    : isLoss
    ? '#EF4444'
    : '#94A3B8';

  return (
    <View style={[styles.roundBanner, { borderColor: accentColor }]}>
      <Text style={[styles.roundHeadline, { color: accentColor }]}>
        {headline}
      </Text>
      <Text style={styles.roundSub}>{moveDescription}</Text>
    </View>
  );
};

// ── MatchFinalSheet (Professional Victory & Defeat Modal) ───────────────────
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
      duration: 240,
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
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[
            styles.modalSheet,
            {
              opacity: enterAnim,
              transform: [
                { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={
              won
                ? ['rgba(22, 163, 74, 0.36)', 'rgba(22, 163, 74, 0.1)', '#0A0D12']
                : ['rgba(220, 38, 38, 0.36)', 'rgba(220, 38, 38, 0.1)', '#0A0D12']
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.topGlowHeader}
          >
            {/* Status Seal */}
            <View style={[styles.medallionWrap, won ? styles.medallionWin : styles.medallionLose]}>
              <View style={[styles.medallionInner, { backgroundColor: won ? '#22C55E' : '#EF4444' }]}>
                <Ionicons
                  name={won ? 'checkmark' : 'close'}
                  size={24}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text style={styles.sheetTitle}>{won ? 'Victory' : 'Match ended'}</Text>

            <Text style={styles.amountText}>
              {won ? `+${prizeAmount.toLocaleString()} ETB` : `-${stakeAmount.toLocaleString()} ETB`}
            </Text>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>
                You <Text style={{ color: won ? '#34D399' : '#CBD5E1', fontWeight: '900' }}>{scoreYou}</Text> —{' '}
                <Text style={{ color: !won ? '#F87171' : '#CBD5E1', fontWeight: '900' }}>{scoreOpponent}</Text> Opponent
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.sheetBody}>
            {/* Financial Details Card */}
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Match pot</Text>
                <Text style={styles.detailValue}>{potAmount} ETB</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform fee (20%)</Text>
                <Text style={styles.detailValue}>-{feeAmount} ETB</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowHighlight]}>
                <Text style={[styles.detailLabel, { color: '#FFFFFF', fontWeight: '700' }]}>
                  {won ? 'Net profit' : 'Your entry'}
                </Text>
                <Text style={[styles.detailValue, { color: won ? '#F59E0B' : '#FFFFFF', fontWeight: '900' }]}>
                  {won ? `+${netProfit} ETB` : `${stakeAmount} ETB`}
                </Text>
              </View>
            </View>

            {/* Symmetric Actions */}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePlayAgainPress}
                style={styles.playAgainButton}
                accessibilityRole="button"
                accessibilityLabel="Play Again"
              >
                <Text style={styles.playAgainText}>Play again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleExitPress}
                style={styles.exitButton}
                accessibilityRole="button"
                accessibilityLabel="Back to Lobby"
              >
                <Text style={styles.exitText}>Back to lobby</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
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
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  readySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#00DAF3',
  },
  roundBanner: {
    position: 'absolute',
    top: '44%',
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 17, 26, 0.95)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    zIndex: 25,
  },
  roundHeadline: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roundSub: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0A0D12',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.65)',
        } as any)
      : {}),
  },
  topGlowHeader: {
    width: '100%',
    paddingTop: 30,
    paddingBottom: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  medallionWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
  },
  medallionInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionWin: {
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  medallionLose: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  scoreRow: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoreText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sheetBody: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  amountBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
  },
  amountBoxWin: {
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    borderColor: 'rgba(0, 218, 243, 0.25)',
  },
  amountBoxLose: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  amountText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  etbUnit: {
    fontSize: 18,
    fontWeight: '800',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    gap: 7,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 7,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  sheetActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  playAgainButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#00DAF3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer' } as any)
      : {}),
  },
  playAgainText: {
    color: '#07090E',
    fontSize: 13.5,
    fontWeight: '800',
  },
  exitButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer' } as any)
      : {}),
  },
  exitText: {
    color: '#CBD5E1',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
