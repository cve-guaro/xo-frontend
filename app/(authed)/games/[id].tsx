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
  bgSurface: '#0A090E',
  onSurface: '#ffffff',
  surfaceContainerLow: '#14131A',
  surfaceContainer: '#1B1A24',
  surfaceVariant: '#252535',
  surfaceBright: '#323247',
  primary: '#00daf3',
  primaryDim: '#00daf3',
  primaryContainer: '#00daf3',
  onPrimaryContainer: '#0a0a0f',
  secondary: '#00daf3',
  onSurfaceVariant: '#CDCCF3',
  outlineVariant: '#56568A',
  error: '#ff4766',
  errorDim: '#ff4766'
};

const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ------------------ Helpers ------------------
function chunkMoves(moves: Move[]): Move[][] {
  const out: Move[][] = [];
  for (let i = 0; i < moves.length; i += 9) out.push(moves.slice(i, i + 9));
  return out;
}

function computeWinner(board: (SymbolXO | "_")[]): SymbolXO | null {
  for (const [a, b, c] of LINES) {
    if (board[a] !== "_" && board[a] === board[b] && board[a] === board[c]) return board[a] as SymbolXO;
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
  index, active, onPress,
}: { index: number; active: boolean; onPress: (i: number) => void }) {
  return (
    <TouchableOpacity onPress={() => onPress(index)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.85}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>ROUND {index + 1}</Text>
    </TouchableOpacity>
  );
});

// ------------------ Main Screen ------------------
export default function GameViewer() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const layoutWidth = isDesktop ? 640 : width;
  
  // Calculate cell dynamically based on screen real estate
  const paddedWidth = layoutWidth - (isDesktop ? 120 : 64);
  const CELL = Math.floor(paddedWidth / 3) - 8;

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
      if (!id || id.length < 10) return id;
      if (id === myId) return "You";
      
      // Attempt to map real backend users profile text
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

  const winAnim = useRef(new Animated.Value(0)).current;

  // Track progress natively
  const len = rounds[round]?.length ?? 0;
  
  // Re-sync on round change
  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
  }, [round]);

  // Autoplay Timer Execution Loop
  useEffect(() => {
    if (!isPlaying) return;
    if (step >= len) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStep(s => Math.min(s + 1, len));
    }, 700); // 700ms between each autonomous playback step
    return () => clearTimeout(timer);
  }, [isPlaying, step, len]);

  const togglePlay = () => {
    if (step >= len) {
      setStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const board = useMemo(() => {
    const b: (SymbolXO | "_")[] = Array(9).fill("_");
    const m = rounds[round] ?? [];
    const upto = Math.min(step, m.length);
    for (let i = 0; i < upto; i++) b[m[i].index] = m[i].symbol;
    return b;
  }, [rounds, round, step]);

  const finishedWinner = useMemo(() => computeWinner(board), [board]);
  const lastMove = useMemo(() => {
    const m = rounds[round] ?? [];
    if (!m.length || step <= 0) return null;
    return m[Math.min(step - 1, m.length - 1)];
  }, [rounds, round, step]);

  const iWon = useMemo(() => {
    if (!finishedWinner || !lastMove || !myId) return false;
    return lastMove.user === myId;
  }, [finishedWinner, lastMove, myId]);

  useEffect(() => {
    if (iWon && step === len) {
      winAnim.setValue(0);
      Animated.timing(winAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    }
  }, [iWon, step, round, rounds, winAnim]);

  const next = () => { setIsPlaying(false); setStep(s => Math.min(s + 1, len)); };
  const prev = () => { setIsPlaying(false); setStep(s => Math.max(s - 1, 0)); };
  const toStart = () => { setIsPlaying(false); setStep(0); };
  const toEnd = () => { setIsPlaying(false); setStep(len); };

  // If No Moves
  if (!movesFromParams || !movesFromParams.length) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, backgroundColor: THEME.bgSurface, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          {/* Neon Background Blobs for Abyss vibe */}
          <View style={styles.bgBlobPrimary} />
          <View style={styles.bgBlobSecondary} />

          <View style={[styles.glassPanelWrapper, { width: '100%', maxWidth: 450, paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' }]}>
            <View style={styles.glassBackground} />
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
              style={StyleSheet.absoluteFillObject}
            />
            
            <View style={styles.errorIconContainer}>
              <Ionicons name="eye-off-outline" size={40} color={THEME.primary} />
            </View>

            <Text style={styles.errorTitle}>MATCH ABORTED</Text>
            <Text style={styles.errorDescription}>
              No gameplay telemetry was recorded for this session. This typically occurs when a match is canceled, aborted, or terminated prematurely.
            </Text>

            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.premiumBackBtn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[THEME.primaryContainer, THEME.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="arrow-back" size={16} color={THEME.onSurface} style={{ marginRight: 8 }} />
                <Text style={styles.premiumBackText}>RETURN TO DASHBOARD</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // Active View Render
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, backgroundColor: '#0A090E' }}>
        <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFillObject} />
        
        {/* Neon Background Blobs for Abyss vibe */}
        <View style={styles.bgBlobPrimary} />
        <View style={styles.bgBlobSecondary} />

        <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
          
          {/* Top Bar Navigation Add-back */}
          <View style={[styles.topNavBack, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
              <Ionicons name="arrow-back" size={22} color={THEME.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Scrolling Content Arena */}
          <ScrollView 
             contentContainerStyle={[styles.scrollContent, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]} 
             showsVerticalScrollIndicator={false}
          >

            {/* Players Layout Block */}
            <View style={styles.playersBlock}>
                <View style={styles.vaultPill}>
                    <Ionicons name="person" size={12} color={THEME.onSurfaceVariant} />
                    <Text style={styles.vaultText} numberOfLines={1}>{players[0]}</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={[styles.vaultPill, { borderColor: `rgba(253, 111, 133, 0.2)` }]}>
                    <Ionicons name="skull" size={12} color={THEME.error} />
                    <Text style={[styles.vaultText, { color: THEME.error }]} numberOfLines={1}>{players[1]}</Text>
                </View>
            </View>

            {/* Rounds Ribbon */}
            <View style={styles.tabsWrap}>
              <FlatList
                horizontal
                data={rounds}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ index }) => <RoundTab index={index} active={round === index} onPress={setRound} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContent}
              />
            </View>

            {/* Glass Board Section */}
            <View style={[styles.glassPanelWrapper, { alignSelf: 'center' }]}>
               <View style={styles.glassBackground} />
               <View style={styles.glassGradientTop} />

               {/* Grid */}
               <View style={styles.gridContainer}>
                  {[0, 1, 2].map((r) => (
                    <View key={r} style={{ flexDirection: "row", gap: 16 }}>
                      {[0, 1, 2].map((c) => {
                         const idx = r * 3 + c;
                         const v = board[idx];
                         const isLastMove = lastMove?.index === idx && v !== "_";

                         return (
                           <View key={idx} style={[
                              styles.cell, 
                              { width: CELL, height: CELL },
                              isLastMove && styles.cellActive
                           ]}>
                             {v === "X" && (
                                <View style={styles.iconContainer}>
                                  <Ionicons name="close" size={Math.floor(CELL * 0.7)} color={THEME.error} style={styles.xShadow} />
                                </View>
                             )}
                             {v === "O" && (
                                <View style={styles.iconContainer}>
                                  <Ionicons name="radio-button-off" size={Math.floor(CELL * 0.65)} color={THEME.secondary} style={styles.secondaryShadow} />
                                </View>
                             )}

                             {isLastMove && (
                                <View style={styles.activeLabelBox}>
                                   <Text style={styles.activeLabelSuper}>ACTIVE</Text>
                                   <Text style={styles.activeLabelMain}>MOVE {step}</Text>
                                </View>
                             )}
                           </View>
                         );
                      })}
                    </View>
                  ))}
               </View>
               
               {/* Win Overlay */}
               {iWon && step === len && !isPlaying && (
                 <Animated.View pointerEvents="none" style={[styles.winOverlay, { opacity: winAnim, transform: [{ scale: winAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                   <Text style={[styles.heroTitle, { textShadowColor: THEME.primary, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 20 }]}>VICTORY</Text>
                 </Animated.View>
               )}
            </View>

            {/* Match Controls (Arena Nav) */}
            <View style={[styles.controlsBar, { flexDirection: isDesktop ? 'row' : 'column' }]}>
               <View style={styles.controlSectionLeft}>
                  <View style={styles.progressCircle}>
                     <Text style={styles.progressCircleLabel}>{step}</Text>
                  </View>
                  <View>
                     <Text style={styles.controlSuperText}>PROGRESS</Text>
                     <Text style={styles.controlMainText}>Move {step} / {len}</Text>
                  </View>
               </View>

               <View style={styles.playbackCenter}>
                  <TouchableOpacity onPress={prev} style={styles.iconBtn}>
                     <Ionicons name="play-back" size={24} color={THEME.onSurface} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={togglePlay} style={styles.playBtnMain}>
                     <Ionicons name={isPlaying ? "pause" : (step === len ? "reload" : "play")} size={32} color={THEME.onPrimaryContainer} style={{ marginLeft: (!isPlaying && step !== len) ? 4 : 0 }} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={toEnd} style={styles.iconBtn}>
                     <Ionicons name="play-forward" size={24} color={THEME.onSurface} />
                  </TouchableOpacity>
               </View>

               <View style={styles.controlSectionRight}>
                  {/* Pseudo buttons to match the HTML layout aesthetic */}
                  <TouchableOpacity onPress={toStart} style={styles.analyzeBtn}>
                     <Text style={styles.analyzeText}>RESTART</Text>
                  </TouchableOpacity>
               </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
               <Text style={styles.footerMeta}>© 2026 XO ABYSS SYSTEM. ALL RIGHTS RESERVED.</Text>
            </View>

            {/* Bottom Padding for mobile */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </ScreenWrapper>
  );
}

// ------------------ Stylesheet ------------------
const styles = StyleSheet.create({
  errorContainer: {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: THEME.bgSurface
  },
  errorText: {
     color: THEME.onSurfaceVariant,
     marginTop: 16,
     fontSize: 14,
     fontWeight: '600',
     letterSpacing: 1,
     textTransform: 'uppercase'
  },
  backBtnError: {
     marginTop: 24,
     paddingHorizontal: 24,
     paddingVertical: 12,
     backgroundColor: THEME.surfaceBright,
     borderRadius: 12,
     borderWidth: 1,
     borderColor: 'rgba(68, 68, 107, 0.2)'
  },
  errorIconContainer: {
     width: 80,
     height: 80,
     borderRadius: 40,
     backgroundColor: 'rgba(182, 154, 255, 0.1)',
     alignItems: 'center',
     justifyContent: 'center',
     borderWidth: 1,
     borderColor: 'rgba(182, 154, 255, 0.2)',
     marginBottom: 24
  },
  errorTitle: {
     color: THEME.onSurface,
     fontSize: 20,
     fontWeight: '900',
     letterSpacing: 2,
     marginBottom: 12,
     textAlign: 'center'
  },
  errorDescription: {
     color: THEME.onSurfaceVariant,
     fontSize: 13,
     lineHeight: 20,
     textAlign: 'center',
     marginBottom: 32,
     paddingHorizontal: 16
  },
  premiumBackBtn: {
     width: '100%',
     borderRadius: 16,
     overflow: 'hidden',
     shadowColor: THEME.primary,
     shadowOpacity: 0.3,
     shadowRadius: 10,
     shadowOffset: { width: 0, height: 4 },
     elevation: 5
  },
  gradientBtn: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 16,
     paddingHorizontal: 24
  },
  premiumBackText: {
     color: THEME.onSurface,
     fontSize: 12,
     fontWeight: '900',
     letterSpacing: 1
  },
  
  // Blobs
  bgBlobPrimary: {
     position: 'absolute',
     top: '5%',
     left: -50,
     width: 300,
     height: 300,
     backgroundColor: THEME.primary,
     opacity: 0.15,
     borderRadius: 999,
     transform: [{ scale: 1.5 }],
     ...Platform.select({ web: { filter: 'blur(100px)' } as any })
  },
  
  // Navigation back button
  topNavBack: {
     paddingHorizontal: 16,
     paddingTop: 16,
     zIndex: 100,
     alignItems: 'flex-start'
  },
  backCircle: {
     width: 44,
     height: 44,
     borderRadius: 22,
     backgroundColor: THEME.surfaceContainer,
     alignItems: 'center',
     justifyContent: 'center',
     borderWidth: 1,
     borderColor: 'rgba(68, 68, 107, 0.15)'
  },
  bgBlobSecondary: {
     position: 'absolute',
     bottom: '5%',
     right: -50,
     width: 300,
     height: 300,
     backgroundColor: '#ff4766',
     opacity: 0.1,
     borderRadius: 999,
     transform: [{ scale: 1.5 }],
     ...Platform.select({ web: { filter: 'blur(120px)' } as any })
  },

  // Layout
  scrollContent: {
     paddingTop: 48,
     paddingHorizontal: 16,
  },

  heroTitle: {
     fontSize: 38,
     fontWeight: '900',
     color: THEME.onSurface,
     letterSpacing: -1.5,
     textAlign: 'center'
  },

  // Players
  playersBlock: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     gap: 12,
     marginBottom: 24
  },
  vsText: {
     color: THEME.outlineVariant,
     fontSize: 12,
     fontWeight: '900',
     fontStyle: 'italic',
  },
  vaultPill: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: THEME.surfaceContainerLow,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.08)',
     paddingHorizontal: 14,
     paddingVertical: 8,
     borderRadius: 12,
     gap: 6,
     maxWidth: 140
  },
  vaultText: {
     color: THEME.onSurface,
     fontSize: 11,
     fontWeight: '800',
     letterSpacing: 0.5
  },

  // Tabs
  tabsWrap: {
     height: 48,
     marginBottom: 32,
     justifyContent: 'center'
  },
  tabsContent: {
     alignItems: 'center',
     justifyContent: 'center',
     gap: 12,
     paddingHorizontal: 16,
     flexGrow: 1
  },
  tab: {
     paddingHorizontal: 18,
     paddingVertical: 10,
     borderRadius: 999,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.1)',
     backgroundColor: THEME.surfaceContainerLow
  },
  tabActive: {
     backgroundColor: THEME.surfaceVariant,
     borderColor: THEME.primaryDim
  },
  tabText: {
     color: THEME.onSurfaceVariant,
     fontSize: 11,
     fontWeight: '800',
     letterSpacing: 1
  },
  tabTextActive: {
     color: THEME.onSurface
  },

  // Glass Board
  glassPanelWrapper: {
     position: 'relative',
     padding: 24,
     borderRadius: 48,
     overflow: 'hidden',
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.08)',
     shadowColor: '#000',
     shadowOpacity: 0.3,
     shadowRadius: 30,
     shadowOffset: { width: 0, height: 20 },
     elevation: 20,
     marginBottom: 32
  },
  glassBackground: {
     ...StyleSheet.absoluteFillObject,
     backgroundColor: 'rgba(20, 19, 26, 0.7)',
  },
  glassGradientTop: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     height: '50%',
     backgroundColor: 'rgba(0, 218, 243, 0.05)'
  },
  gridContainer: {
     gap: 16,
     alignItems: 'center',
     justifyContent: 'center'
  },
  cell: {
     backgroundColor: THEME.surfaceContainer,
     borderRadius: 20,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.05)',
     alignItems: 'center',
     justifyContent: 'center',
     shadowColor: '#000',
     shadowOpacity: 0.2,
     shadowRadius: 10,
     elevation: 5
  },
  cellActive: {
     backgroundColor: THEME.surfaceBright,
     transform: [{ scale: 1.05 }],
     borderWidth: 2,
     borderColor: THEME.primary,
     shadowColor: THEME.primary,
     shadowOpacity: 0.3,
     shadowRadius: 15,
     zIndex: 10
  },
  iconContainer: {
     alignItems: 'center',
     justifyContent: 'center',
     ...StyleSheet.absoluteFillObject
  },
  xShadow: {
     textShadowColor: '#ff4766',
     textShadowOffset: { width: 0, height: 0 },
     textShadowRadius: 15
  },
  secondaryShadow: {
     textShadowColor: '#00daf3',
     textShadowOffset: { width: 0, height: 0 },
     textShadowRadius: 15
  },
  activeLabelBox: {
     position: 'absolute',
     alignItems: 'center',
     justifyContent: 'center'
  },
  activeLabelSuper: {
     fontSize: 9,
     color: THEME.primaryDim,
     fontWeight: '900',
     letterSpacing: 2,
     textTransform: 'uppercase',
     marginBottom: 2
  },
  activeLabelMain: {
     fontSize: 16,
     color: THEME.onSurface,
     fontWeight: '900',
     letterSpacing: 1
  },

  winOverlay: {
     ...StyleSheet.absoluteFillObject,
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: 'rgba(12, 12, 31, 0.85)',
     borderRadius: 48,
     zIndex: 20,
  },

  // Match Controls
  controlsBar: {
     flexDirection: Platform.OS === 'web' && Dimensions.get('window').width >= 768 ? 'row' : 'column',
     alignItems: 'center',
     justifyContent: 'space-between',
     backgroundColor: THEME.surfaceContainer,
     borderRadius: 32,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.05)',
     paddingHorizontal: 32,
     paddingVertical: 24,
     gap: 24
  },
  controlSectionLeft: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 16
  },
  progressCircle: {
     width: 48,
     height: 48,
     borderRadius: 24,
     backgroundColor: THEME.surfaceContainerLow,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.1)',
     alignItems: 'center',
     justifyContent: 'center'
  },
  progressCircleLabel: {
     color: THEME.primary,
     fontSize: 18,
     fontWeight: '900'
  },
  controlSuperText: {
     fontSize: 10,
     color: THEME.onSurfaceVariant,
     fontWeight: '800',
     letterSpacing: 2,
     textTransform: 'uppercase',
     marginBottom: 2
  },
  controlMainText: {
     fontSize: 13,
     color: THEME.onSurface,
     fontWeight: '800'
  },
  playbackCenter: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 12
  },
  iconBtn: {
     padding: 16,
     borderRadius: 20,
     backgroundColor: 'transparent'
  },
  playBtnMain: {
     width: 64,
     height: 64,
     borderRadius: 32,
     backgroundColor: THEME.primaryContainer,
     alignItems: 'center',
     justifyContent: 'center',
     shadowColor: THEME.primary,
     shadowOpacity: 0.6,
     shadowRadius: 20,
     shadowOffset: { width: 0, height: 8 },
     elevation: 15
  },
  controlSectionRight: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8
  },
  analyzeBtn: {
     paddingHorizontal: 24,
     paddingVertical: 14,
     backgroundColor: THEME.surfaceBright,
     borderRadius: 14,
     borderWidth: 1,
     borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  analyzeText: {
     color: THEME.onSurface,
     fontSize: 11,
     fontWeight: '900',
     letterSpacing: 1.5
  },

  // Footer
  footer: {
     marginTop: 48,
     alignItems: 'center',
     paddingBottom: 24,
     borderTopWidth: 1,
     borderTopColor: 'rgba(68, 68, 107, 0.1)',
     paddingTop: 32
  },
  footerMeta: {
     fontSize: 10,
     color: 'rgba(168, 167, 212, 0.4)',
     fontWeight: '800',
     letterSpacing: 2
  }
});
