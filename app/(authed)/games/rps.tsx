// app/(authed)/games/rps.tsx
// ────────────────────────────────────────────────────────────────────────────
// Rock Paper Scissors (RPS) — Real-Money Realtime Multiplayer PvP Arena
//
// Compliant with:
// - xoet-router (hard rules v2)
// - .ux-profile.md (dark neon theme, tokens only, single focal glow)
// - Server-authoritative Commit-Reveal protocol
// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const rpsBg = require('../../../assets/dashboard/rps-background.webp');

import { useAuth } from '../../../context/authContext';
import { useSocketActions } from '../../../context/socketContext';
import { useToast } from '../../../context/ToastContext';
import { colors, radius, space } from '../../../theme/tokens';
import { playWinSound, playLoseSound, playTickSound } from '../../../lib/pinTickAudio';
import { triggerWinCelebration } from '../../../components/ui/confetti';

import {
  Choice,
  Pose,
  Phase,
  RoundOutcome,
  RPSMatchState,
} from '../../../lib/rps/rpsTypes';
import {
  BET_TIERS,
  calculatePrize,
  getMoveDescription,
  capitalize,
} from '../../../lib/rps/rpsEngine';

import { HandFigure } from '../../../components/rps/HandFigure';
import { ScoreBar, TimerBar } from '../../../components/rps/Bars';
import { ChoiceRow, LockInButton } from '../../../components/rps/ChoiceRow';
import {
  ReadyCountdownOverlay,
  RoundResultBanner,
  MatchFinalSheet,
  RpsLeaveConfirmModal,
} from '../../../components/rps/RPSOverlays';
import DesktopRpsArena from '../../../components/rps/DesktopRpsArena';
import FriendMatchModal from '../../../components/game/FriendMatchModal';
import SearchingView from '../../../components/game/SearchingView';
import RpsBetSelectModal from '../../../components/game/RpsBetSelectModal';

export default function RPSScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const params = useLocalSearchParams<{
    roomId?: string;
    stakeAmount?: string;
    prizeAmount?: string;
    youAre?: string;
    opponentUsername?: string;
    opponentId?: string;
    feePercent?: string;
    bestOf?: string;
  }>();
  const { user, token, refreshProfile } = useAuth();
  const { onMessage, send, emitAck, ensureConnected } = useSocketActions();
  const toast = useToast();
  const safeGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(authed)/home/gameplay' as any);
    }
  }, [router]);


  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedTier, setSelectedTier] = useState<number>(BET_TIERS[0]);

  // Match state
  const [match, setMatch] = useState<RPSMatchState | null>(null);
  const matchRef = useRef<RPSMatchState | null>(null);
  matchRef.current = match;
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [opponentLocked, setOpponentLocked] = useState<boolean>(false);

  // Timers & Countdown
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);
  const chooseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Overlays
  const [roundBanner, setRoundBanner] = useState<{
    outcome: RoundOutcome;
    desc: string;
  } | null>(null);
  const [showFinalSheet, setShowFinalSheet] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [friendModalVisible, setFriendModalVisible] = useState<boolean>(false);
  const [inviteResult, setInviteResult] = useState<any>(null);

  // Initialize match from route params (handles instant redirect from match_found)
  useEffect(() => {
    if (params.roomId && !match) {
      const stake = Number(params.stakeAmount) || 10;
      const prize = Number(params.prizeAmount) || 16;
      const fee = Number(params.feePercent) || 20;
      const best = Number(params.bestOf) || 3;
      setMatch({
        roomId: params.roomId,
        stakeAmount: stake,
        potAmount: stake * 2,
        feeAmount: Math.floor((stake * 2 * fee) / 100),
        feePercent: fee,
        prizeAmount: prize,
        bestOf: best,
        winsNeeded: Math.ceil(best / 2),
        youAre: (params.youAre as any) || 'p1',
        opponentId: params.opponentId || '',
        opponentUsername: params.opponentUsername || 'Opponent',
        scoreYou: 0,
        scoreOpponent: 0,
        currentRound: 1,
        yourChoice: null,
        yourLocked: false,
        opponentLocked: false,
      });
      setPhase('countdown');
      setCountdownNum(3);
    }
  }, [params.roomId, match, params.stakeAmount, params.prizeAmount, params.feePercent, params.bestOf, params.youAre, params.opponentId, params.opponentUsername]);

  // Sync with server state on mount/reconnect
  useEffect(() => {
    if (!params.roomId || !emitAck) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureConnected(token || undefined);
        if (cancelled) return;
        const resp: any = await emitAck('rps:sync', { roomId: params.roomId, token });
        if (cancelled) return;
        const g = resp?.data || resp?.game;
        if (resp?.ok && g) {
          setMatch((prev) => ({
            roomId: g.roomId,
            stakeAmount: g.stakeAmount,
            potAmount: g.potAmount,
            feeAmount: Math.floor((g.stakeAmount * 2 * (g.feePercent || 20)) / 100),
            feePercent: g.feePercent || 20,
            prizeAmount: g.prizeAmount,
            bestOf: g.bestOf || 3,
            winsNeeded: g.winsNeeded || 2,
            youAre: g.youAre,
            opponentId: g.opponentId,
            opponentUsername: g.opponentUsername || 'Opponent',
            scoreYou: g.scoreYou || 0,
            scoreOpponent: g.scoreOpponent || 0,
            currentRound: g.currentRound || 1,
            yourChoice: prev?.yourChoice || null,
            yourLocked: !!g.yourLocked,
            opponentLocked: !!g.opponentLocked,
          }));
          setIsLocked(!!g.yourLocked);
          setOpponentLocked(!!g.opponentLocked);
          if (g.phase) {
            setPhase(g.phase as Phase);
            if (g.phase === 'choose') {
              const rem =
                typeof g.secondsRemaining === 'number'
                  ? Math.max(1, g.secondsRemaining)
                  : typeof g.remainingMs === 'number'
                  ? Math.max(1, Math.ceil(g.remainingMs / 1000))
                  : 10;
              startChooseTimer(rem);
            } else if (g.phase === 'final') {
              setShowFinalSheet(true);
            }
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [params.roomId, emitAck, ensureConnected, token]);

  // ── Socket Message Handler ────────────────────────────────────────────────
  useEffect(() => {
    if (!onMessage) return;

    const unsubscribe = onMessage((msg) => {
      switch (msg.type) {
        case 'rps:searching': {
          setPhase('searching');
          break;
        }

        case 'rps:match_found': {
          const p = msg.payload;
          clearChooseTimer();
          setSelectedChoice(null);
          setIsLocked(false);
          setOpponentLocked(false);
          setRoundBanner(null);
          setShowFinalSheet(false);
          setShowLeaveConfirm(false);
          setMatch({
            roomId: p.roomId,
            stakeAmount: p.stakeAmount,
            potAmount: p.stakeAmount * 2,
            feeAmount: Math.floor((p.stakeAmount * 2 * p.feePercent) / 100),
            feePercent: p.feePercent,
            prizeAmount: p.prizeAmount,
            bestOf: p.bestOf || 3,
            winsNeeded: Math.ceil((p.bestOf || 3) / 2),
            youAre: p.youAre,
            opponentId: p.opponentId,
            opponentUsername: p.opponentUsername || 'Opponent',
            scoreYou: 0,
            scoreOpponent: 0,
            currentRound: 1,
            yourChoice: null,
            yourLocked: false,
            opponentLocked: false,
          });
          setPhase('countdown');
          setCountdownNum(3);
          break;
        }

        case 'rps:phase_change': {
          const nextPhase = msg.payload?.phase;
          if (nextPhase === 'countdown') {
            setPhase('countdown');
          } else if (nextPhase === 'choose') {
            setPhase('choose');
            setSelectedChoice(null);
            setIsLocked(false);
            setOpponentLocked(false);
            setRoundBanner(null);
            if (msg.payload?.round) {
              setMatch((prev) => prev ? { ...prev, currentRound: msg.payload.round } : null);
            }
            setSecondsRemaining(Math.round((msg.payload?.duration || 10000) / 1000));
            startChooseTimer(Math.round((msg.payload?.duration || 10000) / 1000));
          } else if (nextPhase === 'reveal') {
            setPhase('reveal');
            clearChooseTimer();
          } else if (nextPhase === 'roundResult') {
            setPhase('roundResult');
          }
          break;
        }

        case 'rps:opponent_locked': {
          setOpponentLocked(true);
          break;
        }

        case 'rps:choice_confirmed': {
          setIsLocked(true);
          break;
        }

        case 'rps:round_reveal': {
          const p = msg.payload;
          const isP1 = (matchRef.current?.youAre || params.youAre) === 'p1';
          const yourChoice = isP1 ? p.choiceP1 : p.choiceP2;
          const oppChoice = isP1 ? p.choiceP2 : p.choiceP1;

          let outcome: RoundOutcome = 'draw';
          if (p.result === 'draw') {
            outcome = 'draw';
          } else if (p.roundWinner) {
            outcome = String(p.roundWinner) === String(user?.id) ? 'win' : 'lose';
          } else if (p.result === 'win') {
            outcome = isP1 ? 'win' : 'lose';
          } else if (p.result === 'lose') {
            outcome = isP1 ? 'lose' : 'win';
          }

          // Sound & Haptics
          if (outcome === 'win') {
            playWinSound();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
          } else if (outcome === 'lose') {
            playLoseSound();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            }
          }

          setMatch((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              scoreYou: isP1 ? p.scoreP1 : p.scoreP2,
              scoreOpponent: isP1 ? p.scoreP2 : p.scoreP1,
              lastRound: {
                round: p.round,
                choiceYou: yourChoice,
                choiceOpponent: oppChoice,
                outcome,
              },
            };
          });

          setRoundBanner({
            outcome,
            desc: getMoveDescription(yourChoice, oppChoice),
          });
          break;
        }

        case 'rps:match_result': {
          const p = msg.payload;
          const isWinner = String(p.winnerId) === String(user?.id);
          clearChooseTimer();

          if (isWinner) {
            triggerWinCelebration();
          }

          setMatch((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              finalResult: {
                winnerId: p.winnerId,
                won: isWinner,
                prizeAmount: p.prizeAmount,
                feeAmount: p.feeAmount,
              },
            };
          });

          setPhase('final');
          setShowFinalSheet(true);
          refreshProfile();
          break;
        }

        case 'rps:match_cancelled': {
          toast.warning('Match cancelled', msg.payload?.reason || 'The match was cancelled.');
          resetToLobby();
          refreshProfile();
          break;
        }

        case 'rps:error': {
          toast.error('Match error', msg.payload?.message || msg.payload?.code || 'Something went wrong. Please try again.');
          break;
        }

        case 'friend_invite_result': {
          setInviteResult(msg.payload);
          break;
        }

        case 'friend_invite_declined': {
          const byUsername = msg.payload?.byUsername;
          toast.info(
            'Challenge declined',
            `${byUsername || 'Your friend'} declined the match challenge.`
          );
          setInviteResult((prev: any) => ({
            ...prev,
            declined: true,
            declinedByUsername: byUsername,
          }));
          break;
        }
      }
    });

    return () => unsubscribe();
  }, [onMessage, user?.id]);

  // ── Choose Phase Timer ────────────────────────────────────────────────────
  const startChooseTimer = (seconds: number) => {
    clearChooseTimer();
    setSecondsRemaining(seconds);

    chooseTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearChooseTimer();
          return 0;
        }
        if (prev <= 4) {
          playTickSound();
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearChooseTimer = () => {
    if (chooseTimerRef.current) {
      clearInterval(chooseTimerRef.current);
      chooseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearChooseTimer();
  }, []);

  // ── Countdown Tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'countdown' && countdownNum > 1) {
      const timer = setTimeout(() => {
        playTickSound();
        setCountdownNum((prev) => Math.max(1, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, countdownNum]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleFindMatch = async (overrideStake?: number) => {
    const stakeToCheck = typeof overrideStake === 'number' ? overrideStake : selectedTier;
    const totalBalance = (user?.available_balance || 0) + (user?.bonus_balance || 0);
    if (totalBalance < stakeToCheck) {
      toast.warning(
        'Insufficient balance',
        `You need at least ${stakeToCheck} ETB to join. Available: ${totalBalance} ETB.`
      );
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    setPhase('searching');
    await ensureConnected(token || undefined);
    send('rps:find_match', { stakeAmount: stakeToCheck, token });
  };

  const handleCancelSearch = () => {
    send('rps:cancel_search');
    resetToLobby();
  };

  const handleSendInvite = (targetUsername: string, betAmount: number) => {
    send('friend_invite', { token, targetUsername, betAmount, gameType: 'rps' });
  };

  const handleLockChoice = (choiceToLock?: Choice) => {
    const choice = choiceToLock || selectedChoice;
    if (!match?.roomId || !choice || isLocked) return;
    try { playTickSound(); } catch {}
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setSelectedChoice(choice);
    setIsLocked(true);
    send('rps:lock_choice', {
      roomId: match.roomId,
      choice,
      token,
    });
  };

  const confirmForfeitAndLeave = () => {
    setShowLeaveConfirm(false);
    if (match?.roomId) {
      send('rps:leave', { roomId: match.roomId });
    }
    resetToLobby();
    safeGoBack();
  };

  const handleLeaveGame = () => {
    if (phase !== 'idle' && phase !== 'searching' && phase !== 'final') {
      setShowLeaveConfirm(true);
    } else {
      if (phase === 'searching') {
        send('rps:cancel_search');
      }
      resetToLobby();
      safeGoBack();
    }
  };

  const resetToLobby = () => {
    clearChooseTimer();
    setPhase('idle');
    setMatch(null);
    setSelectedChoice(null);
    setIsLocked(false);
    setOpponentLocked(false);
    setRoundBanner(null);
    setShowFinalSheet(false);
    setShowLeaveConfirm(false);
  };

  // ── Poses for Hand Figures ────────────────────────────────────────────────
  const getPlayerPose = (): Pose => {
    if (phase === 'reveal') return 'fist';
    if ((phase === 'roundResult' || phase === 'final') && match?.lastRound) {
      return match.lastRound.choiceYou;
    }
    if (isLocked && selectedChoice) return selectedChoice;
    if (selectedChoice) return selectedChoice;
    return 'fist';
  };

  const getOpponentPose = (): Pose => {
    if (phase === 'reveal') return 'fist';
    if ((phase === 'roundResult' || phase === 'final') && match?.lastRound) {
      return match.lastRound.choiceOpponent;
    }
    return 'fist'; // Hidden until reveal
  };

  // ── Render: Searching State (Standard XOET Radar Scan View) ───────────────
  if (phase === 'searching') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
        <SearchingView
          onCancel={handleCancelSearch}
          betMin={selectedTier}
          betMax={selectedTier}
          gameType="rps"
        />
      </View>
    );
  }

  // ── Render: Idle / Pre-match State (Clean Popup Modal, No Foreign Lobby) ──
  if (phase === 'idle') {
    const totalBalance = (user?.available_balance || 0) + (user?.bonus_balance || 0);

    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <RpsBetSelectModal
          visible={true}
          onClose={() => safeGoBack()}
          onConfirm={(stake: number) => {
            setSelectedTier(stake);
            setPhase('searching');
            ensureConnected(token || undefined);
            send('rps:find_match', { stakeAmount: stake, token });
          }}
          onOpenFriendMatch={(stake?: number) => {
            if (typeof stake === 'number') setSelectedTier(stake);
            setFriendModalVisible(true);
          }}
          userBalance={totalBalance}
          language="en"
          defaultAmount={selectedTier}
        />
        <FriendMatchModal
          visible={friendModalVisible}
          onClose={() => { setFriendModalVisible(false); setInviteResult(null); }}
          onSendInvite={handleSendInvite}
          inviteResult={inviteResult}
          gameType="rps"
        />
      </SafeAreaView>
    );
  }

  // ── Render: Live Match Stage ──────────────────────────────────────────────
  const { fee, prize } = calculatePrize(match?.stakeAmount || selectedTier);

  return (
    <SafeAreaView style={[styles.container, isDesktop && { backgroundColor: colors.bgDeep }]}>
      {/* Background Plate & Ambient Overlay on Mobile only */}
      {!isDesktop && (
        <>
          <Image source={rpsBg} style={styles.bgPlate} resizeMode="cover" />
          <View style={styles.bgOverlay} />
        </>
      )}

      {isDesktop ? (
        <DesktopRpsArena
          phase={phase}
          round={match?.currentRound || 1}
          bestOf={match?.bestOf || 3}
          potAmount={calculatePrize(match?.stakeAmount || selectedTier).pot}
          scoreYou={match?.scoreYou || 0}
          scoreOpponent={match?.scoreOpponent || 0}
          winsNeeded={match?.winsNeeded || 2}
          youName={user?.display_name || user?.username || 'You'}
          opponentName={match?.opponentUsername || 'Opponent'}
          youAvatar={user?.avatar}
          opponentAvatar={(match as any)?.opponentAvatar}
          selectedChoice={selectedChoice}
          isLocked={isLocked}
          opponentLocked={opponentLocked}
          secondsRemaining={secondsRemaining}
          totalSeconds={10}
          opponentPose={getOpponentPose()}
          playerPose={getPlayerPose()}
          roundOutcome={match?.lastRound?.outcome}
          onSelectChoice={handleLockChoice}
          onLockChoice={handleLockChoice}
          onLeaveGame={handleLeaveGame}
        />
      ) : (
        <View style={styles.arenaWrapper}>
          {/* Game Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity
              onPress={handleLeaveGame}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Leave match"
            >
              <Feather name="arrow-left" size={20} color={colors.textSoft} />
            </TouchableOpacity>

            <View style={styles.matchMetaRow}>
              <View style={styles.roundBadge}>
                <Text style={styles.matchRoundText}>
                  Round {match?.currentRound || 1} of {match?.bestOf || 3}
                </Text>
              </View>
              <View style={styles.potBadge}>
                <Ionicons name="trophy" size={12} color={colors.gold} />
                <Text style={styles.matchPotText}>Pot: {calculatePrize(match?.stakeAmount || selectedTier).pot} ETB</Text>
              </View>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{capitalize(phase)}</Text>
            </View>
          </View>

          {/* Score Bar */}
          <ScoreBar
            scoreYou={match?.scoreYou || 0}
            scoreOpponent={match?.scoreOpponent || 0}
            winsNeeded={match?.winsNeeded || 2}
            youName={user?.display_name || user?.username || 'You'}
            opponentName={match?.opponentUsername || 'Opponent'}
            youAvatar={user?.avatar}
            opponentAvatar={(match as any)?.opponentAvatar}
          />

          {/* Game Stage (Hands with Center Clash Line) */}
          <View style={styles.gameStage}>
            {/* Opponent Hand (Top) */}
            <View style={styles.opponentHandArea}>
              <HandFigure
                side="top"
                pose={getOpponentPose()}
                phase={phase}
                locked={opponentLocked}
                outcome={match?.lastRound?.outcome}
                scale={1}
              />
              {opponentLocked && phase === 'choose' && (
                <View style={styles.opponentLockedBadge}>
                  <Feather name="check" size={12} color={colors.success} />
                  <Text style={styles.opponentLockedText}>Opponent locked</Text>
                </View>
              )}
            </View>

            {/* Center Clash Dividing Line */}
            <View style={styles.centerClashLineWrap}>
              <View style={styles.clashLineBeam} />
              <View style={styles.clashCenterNode}>
                <Ionicons name="flash" size={13} color={colors.primary} />
              </View>
            </View>

            {/* Player Hand (Bottom) */}
            <View style={styles.playerHandArea}>
              <HandFigure
                side="bottom"
                pose={getPlayerPose()}
                phase={phase}
                locked={isLocked}
                outcome={match?.lastRound?.outcome}
                scale={1}
              />
            </View>
          </View>

          {/* Bottom Controls Area */}
          <View style={styles.bottomControlsArea}>
            {/* Timer Bar (during choose phase) */}
            {phase === 'choose' && (
              <TimerBar secondsRemaining={secondsRemaining} totalSeconds={10} />
            )}

            {/* Choice Row */}
            <ChoiceRow
              selected={selectedChoice}
              locked={isLocked}
              disabled={phase !== 'choose'}
              onSelect={(choice) => setSelectedChoice(choice)}
            />

            {/* Lock In Button */}
            <LockInButton
              phase={phase}
              selected={selectedChoice}
              locked={isLocked}
              onLock={handleLockChoice}
            />
          </View>
        </View>
      )}

      {/* Countdown Overlay */}
      {phase === 'countdown' && countdownNum > 0 && (
        <ReadyCountdownOverlay count={countdownNum} bestOf={match?.bestOf || 3} />
      )}

      {/* Center Reveal Animation Badge */}
      {phase === 'reveal' && (
        <View style={styles.shootBadge}>
          <Ionicons name="flash" size={16} color={colors.primary} />
          <Text style={styles.shootBadgeText}>Reveal</Text>
        </View>
      )}

      {/* Center Round Banner */}
      {roundBanner && phase === 'roundResult' && (
        <RoundResultBanner
          outcome={roundBanner.outcome}
          moveDescription={roundBanner.desc}
        />
      )}

      {/* Forfeit Confirmation Modal */}
      <RpsLeaveConfirmModal
        visible={showLeaveConfirm}
        stakeAmount={match?.stakeAmount || selectedTier}
        onStay={() => setShowLeaveConfirm(false)}
        onForfeit={confirmForfeitAndLeave}
      />

      {/* Final Payout Sheet */}
      <MatchFinalSheet
        visible={showFinalSheet}
        won={match?.finalResult?.won ?? false}
        scoreYou={match?.scoreYou || 0}
        scoreOpponent={match?.scoreOpponent || 0}
        stakeAmount={match?.stakeAmount || selectedTier}
        prizeAmount={match?.finalResult?.prizeAmount || prize}
        feeAmount={match?.finalResult?.feeAmount || fee}
        onPlayAgain={() => {
          const stakeToPlay = match?.stakeAmount || selectedTier;
          setSelectedTier(stakeToPlay);
          resetToLobby();
          handleFindMatch(stakeToPlay);
        }}
        onExit={() => {
          setShowFinalSheet(false);
          resetToLobby();
          safeGoBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bgPlate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 11, 18, 0.82)',
  },
  arenaWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    width: '100%',
  },
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  roundBadge: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.md,
  },
  potBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.tintGold,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.md,
  },
  matchRoundText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  matchPotText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold,
  },
  statusBadge: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.tintPrimary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  gameStage: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    position: 'relative',
    width: '100%',
  },
  opponentHandArea: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  centerClashLineWrap: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 24,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  clashLineBeam: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    height: 2,
    backgroundColor: colors.borderStrong,
  },
  clashCenterNode: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shootBadge: {
    position: 'absolute',
    top: '44%',
    zIndex: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shootBadgeText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  opponentLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    marginTop: space.xs,
  },
  opponentLockedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '700',
  },
  playerHandArea: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  bottomControlsArea: {
    width: '100%',
    paddingBottom: space.sm,
  },
});
