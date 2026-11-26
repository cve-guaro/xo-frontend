// components/User360View.tsx — Dynamic themed SaaS user view with multi-game statistics
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './ui/Avatar';
import { useAdminTheme } from '../constants/adminTheme';

const fmt = (n: number) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const timeSince = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  const s = Math.floor((Date.now() - time) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface User360ViewProps {
  data: {
    user: any;
    wallet: any;
    stats: any;
    gameBreakdown?: {
      xo?: { total: number; wins: number; losses: number; draws: number; staked: number };
      rps?: { total: number; wins: number; losses: number; draws: number; staked: number };
      spin_5p?: { total: number; wins: number; losses: number; draws: number; staked: number };
      spin_rail?: { total: number; wins: number; losses: number; draws: number; staked: number };
    };
    games: any[];
    transactions: any[];
    totals: any;
    entries: any;
  };
  onReplayGame?: (game: any) => void;
  onViewReferrals?: () => void;
  hideActions?: boolean;
}

export default function User360View({
  data,
  onReplayGame,
  onViewReferrals,
  hideActions = false,
}: User360ViewProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { theme: C, isDark } = useAdminTheme();
  const { user: targetUser, wallet, stats, gameBreakdown, games, transactions, totals, entries } = data;

  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'transactions'>('overview');

  // Dynamic theme palette
  const P = useMemo(() => ({
    bg: C.background,
    surface: C.surface,
    surfaceSubtle: isDark ? C.surfaceContainerLow : '#FAFAFC',
    surfaceHigh: isDark ? C.surfaceContainerHigh : '#F1F3F5',
    text: C.onSurface,
    textMuted: C.onSurfaceVariant,
    border: C.border,
    accent: '#00DAF3',
    accentSubtle: isDark ? 'rgba(0, 218, 243, 0.12)' : '#E0F7FA',
    success: C.success,
    successSubtle: isDark ? 'rgba(83, 205, 150, 0.15)' : '#ECFDF5',
    warning: C.accentGold,
    warningSubtle: isDark ? 'rgba(239, 177, 108, 0.15)' : '#FFFBEB',
    danger: C.error,
    dangerSubtle: isDark ? 'rgba(255, 120, 136, 0.15)' : '#FEF2F2',
  }), [C, isDark]);

  const isBanned = targetUser?.banned;
  const tier = (stats?.totalGames || 0) > 50 ? 'PRO' : (stats?.totalGames || 0) > 10 ? 'REGULAR' : 'STANDARD';
  const avatarUrl = targetUser?.avatar;

  const txTypeLabel = (t: string) => {
    const map: Record<string, { label: string; icon: any; color: string }> = {
      'DEPOSIT': { label: 'DEPOSIT', icon: 'arrow-down-circle-outline', color: P.success },
      'WITHDRAW_REQUEST': { label: 'WITHDRAWAL', icon: 'arrow-up-circle-outline', color: P.danger },
      'WITHDRAW_SETTLED': { label: 'WITHDRAWAL', icon: 'arrow-up-circle-outline', color: P.danger },
      'PRIZE': { label: 'PRIZE', icon: 'trophy-outline', color: P.warning },
      'BONUS': { label: 'BONUS', icon: 'gift-outline', color: P.accent },
      'STAKE': { label: 'STAKE', icon: 'game-controller-outline', color: P.accent },
      'ADMIN_CREDIT': { label: 'ADMIN CREDIT', icon: 'build-outline', color: P.accent },
      'ADMIN_DEBIT': { label: 'ADMIN DEBIT', icon: 'build-outline', color: P.danger },
    };
    return map[t] || { label: t, icon: 'ellipse-outline', color: P.textMuted };
  };

  // Safe game breakdown
  const gb = {
    xo: gameBreakdown?.xo || { total: 0, wins: 0, losses: 0, draws: 0, staked: 0 },
    rps: gameBreakdown?.rps || { total: 0, wins: 0, losses: 0, draws: 0, staked: 0 },
    spin_5p: gameBreakdown?.spin_5p || { total: 0, wins: 0, losses: 0, draws: 0, staked: 0 },
    spin_rail: gameBreakdown?.spin_rail || { total: 0, wins: 0, losses: 0, draws: 0, staked: 0 },
  };

  const gameCards = [
    {
      id: 'xo',
      name: 'XO Battles',
      subtitle: 'Tic-Tac-Toe Arena',
      icon: 'game-controller-outline',
      color: P.accent,
      total: gb.xo.total,
      wins: gb.xo.wins,
      losses: gb.xo.losses,
      draws: gb.xo.draws,
      staked: gb.xo.staked,
      winRate: gb.xo.total > 0 ? Math.round((gb.xo.wins / gb.xo.total) * 100) : 0,
    },
    {
      id: 'spin_5p',
      name: '5-Player Spin',
      subtitle: 'Multiplayer Wheel',
      icon: 'disc-outline',
      color: P.warning,
      total: gb.spin_5p.total,
      wins: gb.spin_5p.wins,
      losses: gb.spin_5p.losses,
      draws: 0,
      staked: gb.spin_5p.staked,
      winRate: gb.spin_5p.total > 0 ? Math.round((gb.spin_5p.wins / gb.spin_5p.total) * 100) : 0,
    },
    {
      id: 'spin_rail',
      name: 'Real Spin Rail',
      subtitle: 'Continuous Wheel',
      icon: 'aperture-outline',
      color: P.success,
      total: gb.spin_rail.total,
      wins: gb.spin_rail.wins,
      losses: gb.spin_rail.losses,
      draws: 0,
      staked: gb.spin_rail.staked,
      winRate: gb.spin_rail.total > 0 ? Math.round((gb.spin_rail.wins / gb.spin_rail.total) * 100) : 0,
    },
    {
      id: 'rps',
      name: 'Rock Paper Scissors',
      subtitle: 'Best-of-3 Duel',
      icon: 'cut-outline',
      color: '#F43F5E',
      total: gb.rps.total,
      wins: gb.rps.wins,
      losses: gb.rps.losses,
      draws: gb.rps.draws,
      staked: gb.rps.staked,
      winRate: gb.rps.total > 0 ? Math.round((gb.rps.wins / gb.rps.total) * 100) : 0,
    },
  ];

  return (
    <View style={s.root}>
      {/* ── Section 1: Page Navigation Tabs ──────────────────────────────── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[
            s.tabBtn,
            { backgroundColor: P.surface, borderColor: P.border },
            activeTab === 'overview' && { backgroundColor: P.accent, borderColor: P.accent },
          ]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="pie-chart-outline"
            size={15}
            color={activeTab === 'overview' ? '#070A12' : P.textMuted}
          />
          <Text style={[s.tabText, { color: activeTab === 'overview' ? '#070A12' : P.textMuted }]}>
            Overview & Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.tabBtn,
            { backgroundColor: P.surface, borderColor: P.border },
            activeTab === 'games' && { backgroundColor: P.accent, borderColor: P.accent },
          ]}
          onPress={() => setActiveTab('games')}
        >
          <Ionicons
            name="game-controller-outline"
            size={15}
            color={activeTab === 'games' ? '#070A12' : P.textMuted}
          />
          <Text style={[s.tabText, { color: activeTab === 'games' ? '#070A12' : P.textMuted }]}>
            Game History ({games?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.tabBtn,
            { backgroundColor: P.surface, borderColor: P.border },
            activeTab === 'transactions' && { backgroundColor: P.accent, borderColor: P.accent },
          ]}
          onPress={() => setActiveTab('transactions')}
        >
          <Ionicons
            name="wallet-outline"
            size={15}
            color={activeTab === 'transactions' ? '#070A12' : P.textMuted}
          />
          <Text style={[s.tabText, { color: activeTab === 'transactions' ? '#070A12' : P.textMuted }]}>
            Banking History ({transactions?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ================= TAB 1: OVERVIEW & STATS ================= */}
        {activeTab === 'overview' && (
          <View style={{ gap: 16 }}>
            {/* ── Section 2: Two-Column Profile & Wallet Overview ──────────── */}
            <View style={[s.twoColRow, isMobile && { flexDirection: 'column' }]}>
              {/* Left: User Profile Card */}
              <View style={[s.profileCard, { backgroundColor: P.surface, borderColor: P.border, flex: isMobile ? undefined : 1.1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ position: 'relative' }}>
                    <Avatar
                      uri={avatarUrl}
                      name={targetUser?.username}
                      size={54}
                      showOnlineDot={!isBanned}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={[s.profileUsername, { color: P.text }]} numberOfLines={1}>
                        {targetUser?.display_name || targetUser?.username || 'Player'}
                      </Text>
                      <View style={[s.statusBadge, { backgroundColor: isBanned ? P.dangerSubtle : P.successSubtle }]}>
                        <View style={[s.statusDot, { backgroundColor: isBanned ? P.danger : P.success }]} />
                        <Text style={[s.statusBadgeText, { color: isBanned ? P.danger : P.success }]}>
                          {isBanned ? 'Suspended' : 'Active'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.profilePhone, { color: P.textMuted }]}>
                      @{targetUser?.username || 'unknown'} · {targetUser?.number || 'No phone'}
                    </Text>
                  </View>
                </View>

                <View style={[s.profileCardMeta, { borderTopColor: P.border }]}>
                  <View style={s.metaItem}>
                    <Text style={[s.metaLabel, { color: P.textMuted }]}>ACCOUNT LEVEL</Text>
                    <View style={[s.tierPill, { backgroundColor: P.accentSubtle }]}>
                      <Text style={[s.tierPillText, { color: P.accent }]}>{tier}</Text>
                    </View>
                  </View>
                  <View style={s.metaItem}>
                    <Text style={[s.metaLabel, { color: P.textMuted }]}>ROLE</Text>
                    <Text style={[s.metaValText, { color: P.text }]}>{String(targetUser?.role || 'user').toUpperCase()}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Text style={[s.metaLabel, { color: P.textMuted }]}>USER ID</Text>
                    <Text style={[s.metaValText, { color: P.text, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
                      #{targetUser?.id ? targetUser.id.slice(0, 8).toUpperCase() : '----'}
                    </Text>
                  </View>
                </View>

                {onViewReferrals && !hideActions && (
                  <TouchableOpacity onPress={onViewReferrals} style={[s.referralBtn, { backgroundColor: P.accentSubtle }]} activeOpacity={0.8}>
                    <Ionicons name="people-outline" size={14} color={P.accent} />
                    <Text style={[s.referralBtnText, { color: P.accent }]}>View Referral Analytics</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Right: Wallet Balances Card */}
              <View style={[s.walletCard, { backgroundColor: P.surface, borderColor: P.border, flex: isMobile ? undefined : 1.3 }]}>
                <View style={s.sectionHeaderWrap}>
                  <Text style={[s.sectionKicker, { color: P.textMuted }]}>WALLET BALANCES</Text>
                  <Ionicons name="shield-checkmark-outline" size={14} color={P.textMuted} />
                </View>

                <View style={s.walletGrid}>
                  <View style={[s.balanceTile, { backgroundColor: P.accentSubtle, borderColor: isDark ? 'rgba(0, 218, 243, 0.3)' : '#B2EBF2' }]}>
                    <Text style={[s.balanceTileLabel, { color: P.accent }]}>Available Balance</Text>
                    <Text style={[s.balanceTileNum, { color: P.accent }]}>
                      {fmt(wallet?.available)} <Text style={{ fontSize: 13, fontWeight: '600' }}>ETB</Text>
                    </Text>
                  </View>

                  <View style={[s.balanceTile, { backgroundColor: P.successSubtle, borderColor: isDark ? 'rgba(83,205,150,0.3)' : '#D1FAE5' }]}>
                    <Text style={[s.balanceTileLabel, { color: P.success }]}>Withdrawable Balance</Text>
                    <Text style={[s.balanceTileNum, { color: P.success }]}>
                      {fmt(wallet?.withdrawable)} <Text style={{ fontSize: 13, fontWeight: '600' }}>ETB</Text>
                    </Text>
                  </View>

                  <View style={[s.balanceTile, { backgroundColor: P.warningSubtle, borderColor: isDark ? 'rgba(239,177,108,0.3)' : '#FEF3C7' }]}>
                    <Text style={[s.balanceTileLabel, { color: P.warning }]}>Bonus Balance</Text>
                    <Text style={[s.balanceTileNum, { color: P.warning }]}>
                      {fmt(wallet?.bonus)} <Text style={{ fontSize: 13, fontWeight: '600' }}>ETB</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Section 3: Statistics ──────────────────────────────────── */}
            <View style={[s.twoColRow, isMobile && { flexDirection: 'column' }]}>
              {/* Gameplay Statistics */}
              <View style={[s.contentCard, { backgroundColor: P.surface, borderColor: P.border, flex: 1 }]}>
                <View style={s.sectionHeaderWrap}>
                  <Text style={[s.sectionKicker, { color: P.textMuted }]}>OVERALL GAMEPLAY STATISTICS</Text>
                  <Text style={{ fontSize: 11, color: P.textMuted }}>Across all 4 game modes</Text>
                </View>
                <View style={s.metricsRow}>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Total Games</Text>
                    <Text style={[s.metricValue, { color: P.text }]}>{stats?.totalGames || 0}</Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Wins</Text>
                    <Text style={[s.metricValue, { color: P.success }]}>{stats?.wins || 0}</Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Losses</Text>
                    <Text style={[s.metricValue, { color: P.danger }]}>{stats?.losses || 0}</Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Win Rate</Text>
                    <Text style={[s.metricValue, { color: P.accent }]}>
                      {(stats?.totalGames || 0) > 0 ? Math.round(((stats?.wins || 0) / stats.totalGames) * 100) : 0}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Volume Totals */}
              <View style={[s.contentCard, { backgroundColor: P.surface, borderColor: P.border, flex: 1 }]}>
                <View style={s.sectionHeaderWrap}>
                  <Text style={[s.sectionKicker, { color: P.textMuted }]}>VOLUME TOTALS</Text>
                  <Text style={{ fontSize: 11, color: P.textMuted }}>Lifetime cash flow</Text>
                </View>
                <View style={s.metricsRow}>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Total Deposited</Text>
                    <Text style={[s.metricValue, { color: P.success }]}>
                      ETB {fmt(totals?.totalDeposited)}
                    </Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Total Withdrawn</Text>
                    <Text style={[s.metricValue, { color: P.danger }]}>
                      ETB {fmt(totals?.totalWithdrawn)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Section 4: Real Game Activity Breakdown (Replacing fake caps) ── */}
            <View style={[s.contentCard, { backgroundColor: P.surface, borderColor: P.border }]}>
              <View style={s.sectionHeaderWrap}>
                <View>
                  <Text style={[s.sectionKicker, { color: P.textMuted }]}>ACTUAL GAME ACTIVITY BREAKDOWN</Text>
                  <Text style={{ fontSize: 11, color: P.textMuted, marginTop: 2 }}>
                    Real stakes and performance records per game
                  </Text>
                </View>
                <View style={[s.tierPill, { backgroundColor: P.accentSubtle }]}>
                  <Text style={[s.tierPillText, { color: P.accent }]}>4 Active Games</Text>
                </View>
              </View>

              <View style={[s.gameBreakdownGrid, isMobile && { flexDirection: 'column' }]}>
                {gameCards.map(gc => (
                  <View key={gc.id} style={[s.gameStatCard, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.gameIconBox, { backgroundColor: `${gc.color}15` }]}>
                          <Ionicons name={gc.icon as any} size={16} color={gc.color} />
                        </View>
                        <View>
                          <Text style={[s.gameCardTitle, { color: P.text }]}>{gc.name}</Text>
                          <Text style={[s.gameCardSubtitle, { color: P.textMuted }]}>{gc.subtitle}</Text>
                        </View>
                      </View>
                      <View style={[s.winRateBadge, { backgroundColor: gc.total > 0 ? `${gc.color}20` : P.border }]}>
                        <Text style={[s.winRateBadgeText, { color: gc.total > 0 ? gc.color : P.textMuted }]}>
                          {gc.winRate}% WIN
                        </Text>
                      </View>
                    </View>

                    <View style={s.gameMetricStrip}>
                      <View style={s.gameMetricCol}>
                        <Text style={[s.gameMetricNum, { color: P.text }]}>{gc.total}</Text>
                        <Text style={[s.gameMetricLbl, { color: P.textMuted }]}>Played</Text>
                      </View>
                      <View style={[s.gameMetricSep, { backgroundColor: P.border }]} />
                      <View style={s.gameMetricCol}>
                        <Text style={[s.gameMetricNum, { color: P.success }]}>{gc.wins}</Text>
                        <Text style={[s.gameMetricLbl, { color: P.textMuted }]}>Wins</Text>
                      </View>
                      <View style={[s.gameMetricSep, { backgroundColor: P.border }]} />
                      <View style={s.gameMetricCol}>
                        <Text style={[s.gameMetricNum, { color: P.danger }]}>{gc.losses}</Text>
                        <Text style={[s.gameMetricLbl, { color: P.textMuted }]}>Losses</Text>
                      </View>
                      <View style={[s.gameMetricSep, { backgroundColor: P.border }]} />
                      <View style={s.gameMetricCol}>
                        <Text style={[s.gameMetricNum, { color: P.accent }]}>{fmt(gc.staked)}</Text>
                        <Text style={[s.gameMetricLbl, { color: P.textMuted }]}>ETB Staked</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* App Visit Frequency */}
            {entries && (
              <View style={[s.contentCard, { backgroundColor: P.surface, borderColor: P.border }]}>
                <View style={s.sectionHeaderWrap}>
                  <Text style={[s.sectionKicker, { color: P.textMuted }]}>APP ENGAGEMENT FREQUENCY</Text>
                  <Text style={{ fontSize: 11, color: P.textMuted }}>Platform visits recorded</Text>
                </View>
                <View style={s.metricsRow}>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Today</Text>
                    <Text style={[s.metricValue, { color: P.text }]}>{entries.today || 0}</Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>This Week</Text>
                    <Text style={[s.metricValue, { color: P.text }]}>{entries.thisWeek || 0}</Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>This Month</Text>
                    <Text style={[s.metricValue, { color: P.text }]}>{entries.thisMonth || 0}</Text>
                  </View>
                  <View style={[s.metricBox, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                    <Text style={[s.metricLabel, { color: P.textMuted }]}>Total Sessions</Text>
                    <Text style={[s.metricValue, { color: P.text }]}>{entries.total || 0}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: GAME HISTORY ================= */}
        {activeTab === 'games' && (
          <View style={[s.contentCard, { backgroundColor: P.surface, borderColor: P.border }]}>
            <View style={s.sectionHeaderWrap}>
              <Text style={[s.sectionKicker, { color: P.textMuted }]}>RECENT GAME SESSIONS</Text>
              <Text style={{ fontSize: 11, color: P.textMuted }}>Across XO, RPS, and Spin Wheels</Text>
            </View>

            {(!games || games.length === 0) ? (
              <View style={s.emptyState}>
                <Ionicons name="game-controller-outline" size={32} color={P.textMuted} />
                <Text style={[s.emptyText, { color: P.textMuted }]}>No games recorded for this player yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {games.map((g: any, idx: number) => {
                  const gType = g.game_type || 'xo';
                  const isWon = g.winner === targetUser?.id;
                  const isDraw = g.status === 'completed' && !g.winner;
                  
                  let gName = 'Tic-Tac-Toe';
                  let gIcon = 'game-controller-outline';
                  let gColor = P.accent;

                  if (gType === 'rps') {
                    gName = 'Rock Paper Scissors';
                    gIcon = 'cut-outline';
                    gColor = '#F43F5E';
                  } else if (gType === 'spin_5p') {
                    gName = '5-Player Spin';
                    gIcon = 'disc-outline';
                    gColor = P.warning;
                  } else if (gType === 'spin_rail') {
                    gName = 'Real Spin Rail';
                    gIcon = 'aperture-outline';
                    gColor = P.success;
                  }

                  const opponentName = g.player_x === targetUser?.id
                    ? (g.player_o_name || g.player_o_number || 'Opponent')
                    : (g.player_x_name || g.player_x_number || 'Opponent');

                  return (
                    <View key={g.id || idx} style={[s.historyRow, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View
                          style={[
                            s.historyIconWrap,
                            {
                              backgroundColor: isDraw ? (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6') : isWon ? P.successSubtle : P.dangerSubtle,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isDraw ? 'remove-outline' : isWon ? 'trophy-outline' : 'close-outline'}
                            size={16}
                            color={isDraw ? P.textMuted : isWon ? P.success : P.danger}
                          />
                        </View>
                        <View style={{ gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={[s.roleChip, { backgroundColor: `${gColor}20` }]}>
                              <Ionicons name={gIcon as any} size={10} color={gColor} />
                              <Text style={[s.roleChipText, { color: gColor }]}>{gName}</Text>
                            </View>
                            <Text style={[s.historyTitle, { color: P.text }]}>vs {opponentName}</Text>
                            {g.score_p1 !== undefined && g.score_p2 !== undefined && (
                              <View style={[s.roleChip, { backgroundColor: P.surfaceHigh }]}>
                                <Text style={[s.roleChipText, { color: P.textMuted }]}>
                                  Score: {g.score_p1}-{g.score_p2}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={[s.historySub, { color: P.textMuted }]}>
                            {timeSince(g.created_at)} · Stake: {g.bet_amount} ETB
                            {g.winning_slice ? ` · Slice: #${g.winning_slice}` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text
                          style={[
                            s.historyAmount,
                            { color: isDraw ? P.textMuted : isWon ? P.success : P.danger },
                          ]}
                        >
                          {isDraw ? '' : isWon ? '+' : '-'} ETB {isDraw ? g.bet_amount : isWon ? (g.prize_amount || Number(g.bet_amount) * 1.8) : g.bet_amount}
                        </Text>
                        {gType === 'xo' && onReplayGame && (
                          <TouchableOpacity
                            onPress={() => onReplayGame(g)}
                            style={[s.replayBtn, { backgroundColor: P.accentSubtle }]}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="play" size={10} color={P.accent} />
                            <Text style={[s.replayBtnText, { color: P.accent }]}>Board Replay</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 3: BANKING HISTORY ================= */}
        {activeTab === 'transactions' && (
          <View style={[s.contentCard, { backgroundColor: P.surface, borderColor: P.border }]}>
            <View style={s.sectionHeaderWrap}>
              <Text style={[s.sectionKicker, { color: P.textMuted }]}>BANKING & WALLET TRANSACTIONS</Text>
              <Text style={{ fontSize: 11, color: P.textMuted }}>Audited financial records</Text>
            </View>

            {(!transactions || transactions.length === 0) ? (
              <View style={s.emptyState}>
                <Ionicons name="wallet-outline" size={32} color={P.textMuted} />
                <Text style={[s.emptyText, { color: P.textMuted }]}>No financial transactions recorded.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {transactions.map((tx: any, idx: number) => {
                  const txType = String(tx.type || tx.tx_type || '').toUpperCase();
                  const isDeposit = txType === 'DEPOSIT' || txType === 'ADMIN_CREDIT';
                  const isSucc = tx.status === 'COMPLETED' || tx.status === 'success' || tx.status === 'PAID';
                  const isPending = String(tx.status).toUpperCase().includes('PENDING');
                  const tLabel = txTypeLabel(txType);

                  return (
                    <View key={tx.id || idx} style={[s.historyRow, { backgroundColor: P.surfaceSubtle, borderColor: P.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[s.historyIconWrap, { backgroundColor: isDeposit ? P.successSubtle : P.dangerSubtle }]}>
                          <Ionicons name={tLabel.icon} size={16} color={tLabel.color} />
                        </View>
                        <View style={{ gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[s.historyTitle, { color: P.text }]}>{tLabel.label}</Text>
                            <View
                              style={[
                                s.statusBadge,
                                {
                                  backgroundColor: isSucc ? P.successSubtle : isPending ? P.warningSubtle : P.dangerSubtle,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  s.statusBadgeText,
                                  { color: isSucc ? P.success : isPending ? P.warning : P.danger },
                                ]}
                              >
                                {isPending ? 'Pending' : isSucc ? 'Success' : 'Failed'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[s.historySub, { color: P.textMuted }]}>
                            {timeSince(tx.created_at)} · Ref: {tx.id?.slice(0, 12)}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          s.historyAmount,
                          { color: isDeposit ? P.success : P.danger },
                        ]}
                      >
                        {isDeposit ? '+' : '-'} ETB {fmt(tx.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ── Layout Rows ──
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // ── Profile Card ──
  profileCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } : {}),
  },
  profileUsername: {
    fontSize: 16,
    fontWeight: '800',
  },
  profilePhone: {
    fontSize: 12,
  },
  profileCardMeta: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metaItem: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaValText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tierPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  referralBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  referralBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Wallet Balances Card ──
  walletCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } : {}),
  },
  walletGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  balanceTile: {
    flex: 1,
    minWidth: 110,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  balanceTileLabel: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  balanceTileNum: {
    fontSize: 17,
    fontWeight: '900',
  },

  // ── Content Card Common ──
  contentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } : {}),
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Metrics ──
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricBox: {
    flex: 1,
    minWidth: 90,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Game Breakdown Grid ──
  gameBreakdownGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  gameStatCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  gameIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  gameCardSubtitle: {
    fontSize: 10.5,
  },
  winRateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  winRateBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  gameMetricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  gameMetricCol: {
    alignItems: 'center',
    gap: 2,
  },
  gameMetricNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  gameMetricLbl: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  gameMetricSep: {
    width: 1,
    height: 20,
  },

  // ── History List Rows ──
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  historySub: {
    fontSize: 10.5,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleChipText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  replayBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Status Badges ──
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  // ── Empty State ──
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
  },
});
