import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { playTickSound } from "../../../lib/pinTickAudio";
import { haptics } from "../../../lib/haptcs";

// ------------------ Types & Constants ------------------
type SymbolXO = "X" | "O";
type Move = { ts: string; user: string; index: number; symbol: SymbolXO };

type ParamPayload = {
  id?: string;
  moves?: string;
  bet?: string;
  created_at?: string;
  p1?: string;
  p2?: string;
  px_name?: string;
  po_name?: string;
};

const THEME = {
  bgSurface: '#07090e',
  surfaceCard: '#0f1629',
  surfaceCardHover: '#16203a',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#00daf3',
  primaryGlow: 'rgba(0, 218, 243, 0.35)',
  accentRuby: '#ff3366',
  accentRubyGlow: 'rgba(255, 51, 102, 0.35)',
  accentGold: '#f59e0b',
  accentSuccess: '#10b981',
  textWhite: '#ffffff',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
};

const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const CELL_NAMES = [
  "Top-Left", "Top-Center", "Top-Right",
  "Mid-Left", "Center", "Mid-Right",
  "Bottom-Left", "Bottom-Center", "Bottom-Right",
];

// ------------------ Helpers ------------------
function chunkMoves(moves: Move[]): Move[][] {
  const out: Move[][] = [];
  for (let i = 0; i < moves.length; i += 9) out.push(moves.slice(i, i + 9));
  return out;
}

function computeWinnerDetails(board: (SymbolXO | "_")[]): { winner: SymbolXO; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== "_" && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as SymbolXO, line };
    }
  }
  return null;
}

function safeParseMoves(maybeJson: string | undefined): Move[] | null {
  if (!maybeJson) return null;
  try {
    const arr = JSON.parse(decodeURIComponent(maybeJson));
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

// ------------------ Memoized Sub-components ------------------
const RoundTab = memo(function RoundTab({
  index,
  active,
  outcome,
  onPress,
}: {
  index: number;
  active: boolean;
  outcome?: "win" | "loss" | "draw" | null;
  onPress: (i: number) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        playTickSound();
        haptics.tap();
        onPress(index);
      }}
      style={[styles.tab, active && styles.tabActive]}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        ROUND {index + 1}
      </Text>
      {outcome === "win" && (
        <View style={styles.tabBadgeWin}>
          <Ionicons name="checkmark" size={10} color="#10b981" />
        </View>
      )}
      {outcome === "loss" && (
        <View style={styles.tabBadgeLoss}>
          <Ionicons name="close" size={10} color="#ff3366" />
        </View>
      )}
    </TouchableOpacity>
  );
});

// ------------------ Main Screen ------------------
export default function GameViewer() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const layoutWidth = isDesktop ? 600 : Math.min(width, 480);

  // Dynamic board cell dimensioning
  const paddedWidth = layoutWidth - (isDesktop ? 100 : 48);
  const CELL = Math.min(Math.floor(paddedWidth / 3) - 12, 108);

  const { user } = useAuth();
  const myId = user?.id ?? null;

  const params = useLocalSearchParams<ParamPayload>();
  const movesFromParams = safeParseMoves(params.moves);
  const pxName = params.px_name;
  const poName = params.po_name;

  const players = useMemo(() => {
    let p = [params.p1, params.p2].filter(Boolean) as string[];
    if (p.length === 1 && p[0].startsWith('(') && p[0].endsWith(')')) {
      p = p[0].slice(1, -1).split(',');
    }
    return p.map((id, index) => {
      if (!id || id.length < 10) return id || `Player ${index + 1}`;
      if (id === myId) return "You";
      if (index === 0 && pxName) return pxName;
      if (index === 1 && poName) return poName;
      return id.slice(0, 6) + "..." + id.slice(-4);
    });
  }, [params.p1, params.p2, pxName, poName, myId]);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") StatusBar.setTranslucent(false);
  }, []);

  const rounds = useMemo(() => chunkMoves(movesFromParams || []), [movesFromParams]);
  const [round, setRound] = useState(0);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);

  const winAnim = useRef(new Animated.Value(0)).current;

  const currentRoundMoves = rounds[round] ?? [];
  const len = currentRoundMoves.length;

  // Re-sync on round change
  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
  }, [round]);

  // Autoplay Timer Loop with selectable speed
  useEffect(() => {
    if (!isPlaying) return;
    if (step >= len) {
      setIsPlaying(false);
      return;
    }
    const stepDelay = speedMultiplier === 2 ? 380 : 700;
    const timer = setTimeout(() => {
      setStep(s => Math.min(s + 1, len));
    }, stepDelay);
    return () => clearTimeout(timer);
  }, [isPlaying, step, len, speedMultiplier]);

  const togglePlay = () => {
    if (step >= len) {
      setStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => {
    playTickSound();
    haptics.tap();
    setSpeedMultiplier(s => (s === 1 ? 2 : 1));
  };

  // Build live board up to current step
  const board = useMemo(() => {
    const b: (SymbolXO | "_")[] = Array(9).fill("_");
    const m = currentRoundMoves;
    const upto = Math.min(step, m.length);
    for (let i = 0; i < upto; i++) b[m[i].index] = m[i].symbol;
    return b;
  }, [currentRoundMoves, step]);

  const winnerInfo = useMemo(() => computeWinnerDetails(board), [board]);
  const winningLine = winnerInfo?.line ?? null;

  const lastMove = useMemo(() => {
    if (!currentRoundMoves.length || step <= 0) return null;
    return currentRoundMoves[Math.min(step - 1, currentRoundMoves.length - 1)];
  }, [currentRoundMoves, step]);

  const iWon = useMemo(() => {
    if (!winnerInfo || !lastMove || !myId) return false;
    return lastMove.user === myId;
  }, [winnerInfo, lastMove, myId]);

  useEffect(() => {
    if (iWon && step === len) {
      winAnim.setValue(0);
      Animated.timing(winAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    }
  }, [iWon, step, len, winAnim]);

  const next = () => { setIsPlaying(false); setStep(s => Math.min(s + 1, len)); };
  const prev = () => { setIsPlaying(false); setStep(s => Math.max(s - 1, 0)); };
  const toStart = () => { setIsPlaying(false); setStep(0); };
  const toEnd = () => { setIsPlaying(false); setStep(len); };

  // Determine outcome for each round
  const roundOutcomes = useMemo(() => {
    return rounds.map(rMoves => {
      const b: (SymbolXO | "_")[] = Array(9).fill("_");
      for (const m of rMoves) b[m.index] = m.symbol;
      const wInfo = computeWinnerDetails(b);
      if (!wInfo) return rMoves.length === 9 ? "draw" : null;
      const last = rMoves[rMoves.length - 1];
      if (last && myId) {
        return last.user === myId ? "win" : "loss";
      }
      return null;
    });
  }, [rounds, myId]);

  // Match telemetry description
  const statusDescription = useMemo(() => {
    if (step === 0) return "Match started · Tap play to watch replay";
    if (!lastMove) return `Viewing move ${step}`;
    const actor = lastMove.user === myId ? "You" : (players[1] || "Opponent");
    const cellName = CELL_NAMES[lastMove.index] || `position ${lastMove.index + 1}`;
    if (step === len && winnerInfo) {
      return `Final move: ${actor} won with ${winnerInfo.winner} at ${cellName}!`;
    }
    return `Move ${step}: ${actor} placed ${lastMove.symbol} on ${cellName}`;
  }, [step, len, lastMove, myId, players, winnerInfo]);

  // Fallback if no moves
  if (!movesFromParams || !movesFromParams.length) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, backgroundColor: THEME.bgSurface, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="eye-off-outline" size={38} color={THEME.primary} />
          </View>
          <Text style={styles.errorTitle}>MATCH ABORTED</Text>
          <Text style={styles.errorDescription}>
            No gameplay telemetry was recorded for this session. The match may have concluded or ended before moves were registered.
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.premiumBackBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#00daf3', '#00b4cc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Ionicons name="arrow-back" size={16} color="#080f17" style={{ marginRight: 8 }} />
              <Text style={styles.premiumBackText}>RETURN TO DASHBOARD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ flex: 1, backgroundColor: THEME.bgSurface }}>
        <LinearGradient
          colors={["#080c16", "#060910", "#080c16"]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView edges={["left", "right", "top"]} style={{ flex: 1 }}>
          {/* Top Bar Navigation & Match Meta */}
          <View style={[styles.topBar, isDesktop && { maxWidth: 640, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity
              onPress={() => {
                playTickSound();
                haptics.tap();
                router.back();
              }}
              style={styles.backCircle}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.matchMetaCenter}>
              <Text style={styles.matchMetaTitle}>MATCH REPLAY</Text>
              <Text style={styles.matchMetaSubtitle}>
                {params.id ? `#${params.id.slice(-6).toUpperCase()}` : 'SESSION'}
              </Text>
            </View>

            {/* Staked Bet Badge */}
            <View style={styles.betPill}>
              <Ionicons name="cash-outline" size={12} color={THEME.accentGold} />
              <Text style={styles.betPillText}>
                {params.bet ? `${params.bet} ETB` : 'FREE'}
              </Text>
            </View>
          </View>

          {/* Scrolling Arena */}
          <ScrollView
            contentContainerStyle={[styles.scrollContent, isDesktop && { maxWidth: 640, alignSelf: 'center', width: '100%' }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Player VS Arena Card */}
            <View style={styles.arenaCard}>
              {/* Player 1 (You) */}
              <View style={styles.playerColumn}>
                <View style={[styles.avatarRing, { borderColor: THEME.primary }]}>
                  <Ionicons name="person" size={18} color={THEME.primary} />
                </View>
                <Text style={styles.playerName} numberOfLines={1}>{players[0]}</Text>
                <View style={styles.symbolBadgeX}>
                  <Text style={styles.symbolBadgeXText}>X</Text>
                </View>
              </View>

              {/* VS & Match Outcome */}
              <View style={styles.vsCenterColumn}>
                <View style={styles.vsBadge}>
                  <Text style={styles.vsBadgeText}>VS</Text>
                </View>
                {winnerInfo ? (
                  <View style={[
                    styles.outcomePill,
                    { backgroundColor: iWon ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 51, 102, 0.15)",
                      borderColor: iWon ? "rgba(16, 185, 129, 0.35)" : "rgba(255, 51, 102, 0.35)" }
                  ]}>
                    <Text style={[styles.outcomePillText, { color: iWon ? "#10b981" : "#ff3366" }]}>
                      {iWon ? "VICTORY" : "DEFEAT"}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.outcomePillNeutral}>
                    <Text style={styles.outcomePillNeutralText}>ROUND {round + 1}</Text>
                  </View>
                )}
              </View>

              {/* Player 2 (Opponent) */}
              <View style={styles.playerColumn}>
                <View style={[styles.avatarRing, { borderColor: THEME.accentRuby }]}>
                  <Ionicons name="skull" size={18} color={THEME.accentRuby} />
                </View>
                <Text style={styles.playerName} numberOfLines={1}>{players[1]}</Text>
                <View style={styles.symbolBadgeO}>
                  <Text style={styles.symbolBadgeOText}>O</Text>
                </View>
              </View>
            </View>

            {/* Rounds Selector Tabs */}
            {rounds.length > 1 && (
              <View style={styles.roundsWrap}>
                <FlatList
                  horizontal
                  data={rounds}
                  keyExtractor={(_, i) => String(i)}
                  renderItem={({ index }) => (
                    <RoundTab
                      index={index}
                      active={round === index}
                      outcome={roundOutcomes[index]}
                      onPress={setRound}
                    />
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.roundsContent}
                />
              </View>
            )}

            {/* High-Tech 3D XO Stadium Grid */}
            <View style={[styles.stadiumBoard, { width: CELL * 3 + 40, alignSelf: 'center' }]}>
              <View style={styles.gridContainer}>
                {[0, 1, 2].map((r) => (
                  <View key={r} style={styles.gridRow}>
                    {[0, 1, 2].map((c) => {
                      const idx = r * 3 + c;
                      const val = board[idx];
                      const isLastMove = lastMove?.index === idx && val !== "_";
                      const isWinningCell = winningLine?.includes(idx);

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.boardCell,
                            { width: CELL, height: CELL },
                            isLastMove && styles.boardCellLastMove,
                            isWinningCell && styles.boardCellWinning,
                          ]}
                        >
                          {/* Empty Cell Subtle Indicator */}
                          {val === "_" && (
                            <View style={styles.emptyDot} />
                          )}

                          {/* X Mark */}
                          {val === "X" && (
                            <View style={styles.markWrapper}>
                              <Ionicons
                                name="close"
                                size={Math.floor(CELL * 0.72)}
                                color={THEME.primary}
                                style={styles.xMarkGlow}
                              />
                            </View>
                          )}

                          {/* O Mark */}
                          {val === "O" && (
                            <View style={styles.markWrapper}>
                              <Ionicons
                                name="radio-button-off"
                                size={Math.floor(CELL * 0.64)}
                                color={THEME.accentRuby}
                                style={styles.oMarkGlow}
                              />
                            </View>
                          )}

                          {/* Active Move Pill Indicator */}
                          {isLastMove && (
                            <View style={styles.activeMovePill}>
                              <Text style={styles.activeMovePillText}>#{step}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Victory Banner Overlay */}
              {iWon && step === len && !isPlaying && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.victoryOverlay,
                    {
                      opacity: winAnim,
                      transform: [
                        { scale: winAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(16, 185, 129, 0.95)", "rgba(5, 150, 105, 0.95)"]}
                    style={styles.victoryBanner}
                  >
                    <Ionicons name="trophy" size={26} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.victoryBannerText}>VICTORY</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>

            {/* Live Telemetry Info Strip */}
            <View style={styles.telemetryStrip}>
              <Ionicons name="information-circle-outline" size={14} color={THEME.primary} />
              <Text style={styles.telemetryText} numberOfLines={1}>
                {statusDescription}
              </Text>
            </View>

            {/* Playback Console (High-Precision Controls) */}
            <View style={[styles.consoleCard, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
              {/* Header: Move Count & Speed Toggle */}
              <View style={styles.consoleHeader}>
                <View style={styles.moveCounterBox}>
                  <Text style={styles.moveCounterLabel}>STEP</Text>
                  <Text style={styles.moveCounterValue}>{step}</Text>
                  <Text style={styles.moveCounterTotal}>/ {len}</Text>
                </View>

                {/* Progress Bar Track */}
                <View style={styles.progressTrackContainer}>
                  <View style={styles.progressTrackBg}>
                    <View
                      style={[
                        styles.progressTrackFill,
                        { width: len > 0 ? `${(step / len) * 100}%` : '0%' }
                      ]}
                    />
                  </View>
                </View>

                {/* Speed Multiplier Pill */}
                <TouchableOpacity
                  onPress={toggleSpeed}
                  style={styles.speedToggleBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.speedToggleText}>{speedMultiplier}x</Text>
                </TouchableOpacity>
              </View>

              {/* 5 Playback Action Buttons */}
              <View style={styles.playbackButtonsRow}>
                {/* 1. Jump to Start */}
                <TouchableOpacity
                  onPress={() => {
                    playTickSound();
                    haptics.tap();
                    toStart();
                  }}
                  disabled={step <= 0}
                  style={[styles.stepBtn, step <= 0 && styles.btnDisabled]}
                  activeOpacity={0.7}
                  accessibilityLabel="First Move"
                >
                  <Ionicons name="play-skip-back" size={18} color="#cbd5e1" />
                </TouchableOpacity>

                {/* 2. Step Backward */}
                <TouchableOpacity
                  onPress={() => {
                    playTickSound();
                    haptics.tap();
                    prev();
                  }}
                  disabled={step <= 0}
                  style={[styles.stepBtn, step <= 0 && styles.btnDisabled]}
                  activeOpacity={0.7}
                  accessibilityLabel="Previous Move"
                >
                  <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>

                {/* 3. Main Glowing Play/Pause Center Action */}
                <TouchableOpacity
                  onPress={() => {
                    playTickSound(900);
                    haptics.impact();
                    togglePlay();
                  }}
                  style={styles.mainPlayBtn}
                  activeOpacity={0.85}
                  accessibilityLabel="Play / Pause"
                >
                  <Ionicons
                    name={isPlaying ? "pause" : (step === len ? "reload" : "play")}
                    size={30}
                    color="#080f17"
                    style={{ marginLeft: (!isPlaying && step !== len) ? 3 : 0 }}
                  />
                </TouchableOpacity>

                {/* 4. Step Forward */}
                <TouchableOpacity
                  onPress={() => {
                    playTickSound();
                    haptics.tap();
                    next();
                  }}
                  disabled={step >= len}
                  style={[styles.stepBtn, step >= len && styles.btnDisabled]}
                  activeOpacity={0.7}
                  accessibilityLabel="Next Move"
                >
                  <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                </TouchableOpacity>

                {/* 5. Jump to End */}
                <TouchableOpacity
                  onPress={() => {
                    playTickSound();
                    haptics.tap();
                    toEnd();
                  }}
                  disabled={step >= len}
                  style={[styles.stepBtn, step >= len && styles.btnDisabled]}
                  activeOpacity={0.7}
                  accessibilityLabel="Last Move"
                >
                  <Ionicons name="play-skip-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer / Branding */}
            <View style={styles.footerWrap}>
              <Text style={styles.footerText}>XO ETHIOPIA · VERIFIED MATCH REPLAY</Text>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </ScreenWrapper>
  );
}

// ------------------ Stylesheet ------------------
const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#12182b',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchMetaCenter: {
    alignItems: 'center',
  },
  matchMetaTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  matchMetaSubtitle: {
    color: '#00daf3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  betPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  betPillText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },

  // Player Arena Card
  arenaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1629',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
    elevation: 4,
  } as any,
  playerColumn: {
    alignItems: 'center',
    width: 90,
    gap: 6,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16203a',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 88,
    textAlign: 'center',
  },
  symbolBadgeX: {
    backgroundColor: 'rgba(0, 218, 243, 0.15)',
    borderWidth: 1,
    borderColor: '#00daf3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  symbolBadgeXText: {
    color: '#00daf3',
    fontSize: 11,
    fontWeight: '900',
  },
  symbolBadgeO: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderWidth: 1,
    borderColor: '#ff3366',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  symbolBadgeOText: {
    color: '#ff3366',
    fontSize: 11,
    fontWeight: '900',
  },

  vsCenterColumn: {
    alignItems: 'center',
    gap: 6,
  },
  vsBadge: {
    backgroundColor: '#16203a',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vsBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  outcomePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  outcomePillText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  outcomePillNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  outcomePillNeutralText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },

  // Rounds Tab Strip
  roundsWrap: {
    height: 38,
    justifyContent: 'center',
  },
  roundsContent: {
    alignItems: 'center',
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0f1629',
  },
  tabActive: {
    backgroundColor: 'rgba(0, 218, 243, 0.15)',
    borderColor: '#00daf3',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadgeWin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeLoss: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 51, 102, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stadium XO Board
  stadiumBoard: {
    position: 'relative',
    backgroundColor: '#0c1221',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 218, 243, 0.2)',
    padding: 16,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    elevation: 8,
  } as any,
  gridContainer: {
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  boardCell: {
    backgroundColor: '#121a30',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  boardCellLastMove: {
    borderColor: '#00daf3',
    backgroundColor: '#162442',
    boxShadow: '0 0 16px rgba(0, 218, 243, 0.35)',
  } as any,
  boardCellWinning: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    boxShadow: '0 0 18px rgba(16, 185, 129, 0.45)',
  } as any,
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  markWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  xMarkGlow: {
    textShadowColor: '#00daf3',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  oMarkGlow: {
    textShadowColor: '#ff3366',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  activeMovePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 218, 243, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeMovePillText: {
    color: '#00daf3',
    fontSize: 9,
    fontWeight: '900',
  },

  victoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  victoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    boxShadow: '0 6px 24px rgba(16, 185, 129, 0.5)',
  } as any,
  victoryBannerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // Telemetry Strip
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  telemetryText: {
    color: '#cbd5e1',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Playback Console
  consoleCard: {
    backgroundColor: '#0f1629',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
    elevation: 6,
  } as any,
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moveCounterBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  moveCounterLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  moveCounterValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  moveCounterTotal: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrackContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  progressTrackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: '#00daf3',
    borderRadius: 3,
  },
  speedToggleBtn: {
    backgroundColor: '#16203a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  speedToggleText: {
    color: '#00daf3',
    fontSize: 11,
    fontWeight: '900',
  },

  playbackButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#16203a',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  mainPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00daf3',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0, 218, 243, 0.65)',
    elevation: 8,
  } as any,

  // Footer
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Error State
  errorIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 218, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 218, 243, 0.25)',
    marginBottom: 20,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  errorDescription: {
    color: '#94a3b8',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
  },
  premiumBackBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  premiumBackText: {
    color: '#080f17',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
