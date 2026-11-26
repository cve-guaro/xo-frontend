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
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const rpsBg = require('../../../assets/dashboard/rps-background.png');

import { useAuth } from '../../../context/authContext';
import { useSocket } from '../../../context/socketContext';
import { colors } from '../../../theme/tokens';
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
  TIMINGS,
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
  const socketApi = useSocket();
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
  const [queuePosition, setQueuePosition] = useState<number>(1);

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
  const [friendModalVisible, setFriendModalVisible] = useState<boolean>(false);
  const [inviteResult, setInviteResult] = useState<any>(null);

  // Radar Pulse animation for searching state
  const radarAnim = useRef(new Animated.Value(0.4)).current;

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
    if (!params.roomId || !socketApi?.emitAck) return;
    socketApi.emitAck('rps:sync', { roomId: params.roomId, token }).then((resp: any) => {
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
            startChooseTimer(10);
          }
        }
      }
    }).catch(() => {});
  }, [params.roomId, socketApi?.emitAck, token]);

  useEffect(() => {
    if (phase === 'searching') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(radarAnim, {
            toValue: 0.4,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase]);

  // ── Socket Message Handler ────────────────────────────────────────────────
  useEffect(() => {
    if (!socketApi?.onMessage) return;

    const unsubscribe = socketApi.onMessage((msg) => {
      switch (msg.type) {
        case 'rps:searching': {
          setPhase('searching');
          setQueuePosition(msg.payload?.position || 1);
          break;
        }

        case 'rps:match_found': {
          const p = msg.payload;
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
          Alert.alert('Match Cancelled', msg.payload?.reason || 'The match was cancelled.');
          resetToLobby();
          refreshProfile();
          break;
        }

        case 'rps:error': {
          Alert.alert('Game Alert', msg.payload?.message || msg.payload?.code || 'An error occurred.');
          break;
        }

        case 'friend_invite_result': {
          setInviteResult(msg.payload);
          break;
        }

        case 'friend_invite_declined': {
          Alert.alert('Challenge Declined', 'Your friend declined the match challenge.');
          setInviteResult((prev: any) => ({ ...prev, declined: true }));
          break;
        }
      }
    });

    return () => unsubscribe();
  }, [socketApi, match?.youAre, user?.id]);

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
    if (phase === 'countdown' && countdownNum > 0) {
      const timer = setTimeout(() => {
        playTickSound();
        setCountdownNum((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, countdownNum]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleFindMatch = async () => {
    const totalBalance = (user?.available_balance || 0) + (user?.bonus_balance || 0);
    if (totalBalance < selectedTier) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least ${selectedTier} ETB to join this match. Available: ${totalBalance} ETB.`
      );
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    setPhase('searching');
    socketApi?.ensureConnected?.(token || undefined);
    socketApi?.send('rps:find_match', { stakeAmount: selectedTier, token });
  };

  const handleCancelSearch = () => {
    socketApi?.send('rps:cancel_search');
    resetToLobby();
  };

  const handleSendInvite = (targetUsername: string, betAmount: number) => {
    socketApi?.send('friend_invite', { token, targetUsername, betAmount });
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
    socketApi?.send('rps:lock_choice', {
      roomId: match.roomId,
      choice,
      token,
    });
  };

  const handleLeaveGame = () => {
    if (phase !== 'idle' && phase !== 'searching' && phase !== 'final') {
      Alert.alert(
        'Forfeit Match?',
        `Leaving an active game will forfeit your stake of ${match?.stakeAmount || selectedTier} ETB. Are you sure?`,
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Forfeit & Leave',
            style: 'destructive',
            onPress: () => {
              if (match?.roomId) {
                socketApi?.send('rps:leave', { roomId: match.roomId });
              }
              resetToLobby();
              safeGoBack();
            },
          },
        ]
      );
    } else {
      if (phase === 'searching') {
        socketApi?.send('rps:cancel_search');
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
      <View style={{ flex: 1, backgroundColor: '#06090e' }}>
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
            socketApi?.ensureConnected?.(token || undefined);
            socketApi?.send('rps:find_match', { stakeAmount: stake, token });
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
  const { pot, fee, prize } = calculatePrize(match?.stakeAmount || selectedTier);

  return (
    <SafeAreaView style={[styles.container, isDesktop && { backgroundColor: '#080B10' }]}>
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
          potAmount={pot}
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
            <TouchableOpacity onPress={handleLeaveGame} style={styles.backButton}>
              <Feather name="arrow-left" size={20} color={colors.textSoft} />
            </TouchableOpacity>

            <View style={styles.matchMetaRow}>
              <View style={styles.roundBadge}>
                <Text style={styles.matchRoundText}>
                  Round {match?.currentRound || 1} of {match?.bestOf || 3}
                </Text>
              </View>
              <View style={styles.potBadge}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
                <Text style={styles.matchPotText}>Pot: {pot} ETB</Text>
              </View>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{phase.toUpperCase()}</Text>
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
                  <Text style={styles.opponentLockedText}>Opponent Locked</Text>
                </View>
              )}
            </View>

            {/* Center Clash Dividing Line */}
            <View style={styles.centerClashLineWrap}>
              <View style={styles.clashLineBeam} />
              <View style={styles.clashCenterNode}>
                <Ionicons name="flash" size={13} color="#00DAF3" />
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
      {phase === 'countdown' && (
        <ReadyCountdownOverlay count={countdownNum} bestOf={match?.bestOf || 3} />
      )}

      {/* Center Reveal Animation Badge */}
      {phase === 'reveal' && (
        <View style={styles.shootBadge}>
          <Text style={styles.shootBadgeText}>
            ⚡ SHOOT! ⚡
          </Text>
        </View>
      )}

      {/* Center Round Banner */}
      {roundBanner && phase === 'roundResult' && (
        <RoundResultBanner
          outcome={roundBanner.outcome}
          moveDescription={roundBanner.desc}
        />
      )}

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
          setShowFinalSheet(false);
          handleFindMatch();
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  lobbyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSoft,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  tierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  tierCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  tierCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tintPrimary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  tierCardDisabled: {
    opacity: 0.4,
  },
  tierStake: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  tierPrizeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tierPrizeAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.gold,
  },
  breakdownCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownHighlight: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  findMatchButton: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  findMatchText: {
    color: colors.bgDeep,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  searchingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  radarCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  radarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardRaised,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  searchingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  searchingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  queuePosText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 32,
  },
  cancelSearchButton: {
    height: 44,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSearchText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
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
  arenaWrapperDesktop: {
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  potBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  matchRoundText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  matchPotText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 218, 243, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.35)',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#00DAF3',
    letterSpacing: 0.8,
  },
  gameStage: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: 'rgba(0, 218, 243, 0.5)',
    shadowColor: '#00DAF3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  clashCenterNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0D111A',
    borderWidth: 1.5,
    borderColor: '#00DAF3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00DAF3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  shootBadge: {
    position: 'absolute',
    zIndex: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 218, 243, 0.25)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00DAF3',
    shadowColor: '#00DAF3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  shootBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  opponentLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
    marginTop: 6,
  },
  opponentLockedText: {
    fontSize: 10,
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
    paddingBottom: 6,
  },
});
