import React, { useState } from 'react';
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

const C = {
  primary: '#00daf3',
  primaryContainer: '#00a3ff',
  secondary: '#00daf3',
  background: '#09090b',
  surface: '#18181b',
  surfaceContainerLowest: '#030303',
  surfaceContainerLow: '#0f0f11',
  surfaceContainer: '#1e1e24',
  surfaceContainerHigh: '#27272a',
  surfaceContainerHighest: '#3f3f46',
  onSurface: '#f4f4f5',
  onSurfaceVariant: '#a1a1aa',
  outlineVariant: 'rgba(39, 39, 42, 0.6)',
  error: '#ef4444',
  success: '#34d399',
  gold: '#fbbf24',
};

const fmt = (n: number) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const timeSince = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  const s = Math.floor((Date.now() - time) / 1000);
  if (s < 0) return 'Just now';
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
  const { user: targetUser, wallet, stats, games, transactions, totals, entries } = data;

  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'transactions'>('overview');

  const initials = (targetUser?.username || targetUser?.number || '??').slice(0, 2).toUpperCase();
  const isBanned = targetUser?.banned;
  const tier = stats?.totalGames > 50 ? 'PRO' : stats?.totalGames > 10 ? 'REGULAR' : 'STANDARD';

  const txTypeLabel = (t: string) => {
    const map: Record<string, { label: string; icon: any; color: string }> = {
      'DEPOSIT': { label: 'DEPOSIT', icon: 'arrow-down-circle', color: '#34d399' },
      'WITHDRAW_REQUEST': { label: 'WITHDRAWAL', icon: 'arrow-up-circle', color: '#f87171' },
      'WITHDRAW_SETTLED': { label: 'WITHDRAWAL', icon: 'arrow-up-circle', color: '#f87171' },
      'PRIZE': { label: 'PRIZE', icon: 'trophy', color: '#fbbf24' },
      'BONUS': { label: 'BONUS', icon: 'gift', color: '#a78bfa' },
      'STAKE': { label: 'STAKE', icon: 'game-controller', color: '#00daf3' },
      'ADMIN_CREDIT': { label: 'ADMIN CREDIT', icon: 'build', color: '#a78bfa' },
      'ADMIN_DEBIT': { label: 'ADMIN DEBIT', icon: 'build', color: '#f87171' },
    };
    return map[t] || { label: t, icon: 'ellipse', color: '#64748b' };
  };

  return (
    <View style={s.root}>
      {/* Dynamic Navigation Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'overview' && s.tabBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons name="person-outline" size={14} color={activeTab === 'overview' ? '#0c0c1f' : C.onSurfaceVariant} />
          <Text style={[s.tabText, activeTab === 'overview' && s.tabTextActive]}>Overview & Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'games' && s.tabBtnActive]}
          onPress={() => setActiveTab('games')}
        >
          <Ionicons name="game-controller-outline" size={14} color={activeTab === 'games' ? '#0c0c1f' : C.onSurfaceVariant} />
          <Text style={[s.tabText, activeTab === 'games' && s.tabTextActive]}>Game History ({games?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'transactions' && s.tabBtnActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Ionicons name="wallet-outline" size={14} color={activeTab === 'transactions' ? '#0c0c1f' : C.onSurfaceVariant} />
          <Text style={[s.tabText, activeTab === 'transactions' && s.tabTextActive]}>Banking History ({transactions?.length || 0})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <View style={s.tabContent}>
            {/* Top Info Grid */}
            <View style={[s.grid, isMobile && { flexDirection: 'column' }]}>
              {/* Profile Card */}
              <View style={[s.card, { flex: 1.5 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={s.avatarContainer}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: isBanned ? C.error : C.success }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.profileName}>{targetUser?.username || `User ${targetUser?.number?.slice(-4)}`}</Text>
                    <Text style={s.profilePhone}>{targetUser?.number || 'No Phone'}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <View style={[s.pill, { backgroundColor: 'rgba(0, 218, 243, 0.08)', borderColor: 'rgba(0, 218, 243, 0.2)' }]}>
                        <Text style={[s.pillText, { color: C.primary }]}>{tier}</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: isBanned ? 'rgba(239, 68, 68, 0.08)' : 'rgba(52, 211, 153, 0.08)', borderColor: isBanned ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)' }]}>
                        <Text style={[s.pillText, { color: isBanned ? C.error : C.success }]}>{isBanned ? 'BANNED' : 'ACTIVE'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {onViewReferrals && !hideActions && (
                  <TouchableOpacity onPress={onViewReferrals} style={s.referralBtn}>
                    <Ionicons name="people-outline" size={14} color="#34d399" />
                    <Text style={s.referralBtnText}>Referral Analytics</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Wallet Balances */}
              <View style={[s.card, { flex: 2 }]}>
                <Text style={s.sectionHeader}>WALLET BALANCES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                  <View style={s.balanceCol}>
                    <Text style={s.balanceLabel}>Available</Text>
                    <Text style={s.balanceValue}>ETB {fmt(wallet?.available)}</Text>
                  </View>
                  <View style={s.balanceCol}>
                    <Text style={s.balanceLabel}>Withdrawable</Text>
                    <Text style={[s.balanceValue, { color: C.success }]}>ETB {fmt(wallet?.withdrawable)}</Text>
                  </View>
                  <View style={s.balanceCol}>
                    <Text style={s.balanceLabel}>Bonus</Text>
                    <Text style={[s.balanceValue, { color: C.gold }]}>ETB {fmt(wallet?.bonus)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Performance Stats & Volume */}
            <View style={[s.grid, isMobile && { flexDirection: 'column' }]}>
              {/* Stats Card */}
              <View style={s.card}>
                <Text style={s.sectionHeader}>GAMEPLAY STATS</Text>
                <View style={s.statsRow}>
                  <View style={s.statBox}>
                    <Text style={s.statBoxLabel}>Total Games</Text>
                    <Text style={s.statBoxValue}>{stats?.totalGames || 0}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statBoxLabel}>Wins</Text>
                    <Text style={[s.statBoxValue, { color: C.success }]}>{stats?.wins || 0}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statBoxLabel}>Losses</Text>
                    <Text style={[s.statBoxValue, { color: C.error }]}>{stats?.losses || 0}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statBoxLabel}>Win Rate</Text>
                    <Text style={[s.statBoxValue, { color: C.gold }]}>
                      {stats?.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Transactions volume totals */}
              <View style={s.card}>
                <Text style={s.sectionHeader}>VOLUME TOTALS</Text>
                <View style={s.statsRow}>
                  <View style={s.statBox}>
                    <Text style={s.statBoxLabel}>Deposited</Text>
                    <Text style={[s.statBoxValue, { color: C.success, fontSize: 16 }]}>ETB {fmt(totals?.totalDeposited)}</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statBoxLabel}>Withdrawn</Text>
                    <Text style={[s.statBoxValue, { color: C.error, fontSize: 16 }]}>ETB {fmt(totals?.totalWithdrawn)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Room 1 Win Caps */}
            {(() => {
              const CAP = 25;
              const winTiers = [
                { label: '10 ETB', wins: Number(targetUser?.r1_10_wins || 0), color: '#8b5cf6', hasCap: true },
                { label: '15 ETB', wins: Number(targetUser?.r1_15_wins || 0), color: '#a78bfa', hasCap: true },
                { label: '25 ETB', wins: Number(targetUser?.r1_25_wins || 0), color: '#6366f1', hasCap: false },
                { label: '50 ETB', wins: Number(targetUser?.r1_50_wins || 0), color: '#818cf8', hasCap: false },
              ];
              return (
                <View style={s.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="shield-checkmark" size={16} color={C.primary} />
                    <Text style={s.sectionHeader}>ROOM 1 WIN PROGRESS (CAP: {CAP})</Text>
                  </View>
                  <View style={[s.grid, isMobile && { flexDirection: 'column' }]}>
                    {winTiers.map(tierItem => {
                      const pct = tierItem.hasCap ? Math.min(tierItem.wins / CAP, 1) : 1;
                      const isLocked = tierItem.hasCap && tierItem.wins >= CAP;
                      return (
                        <View key={tierItem.label} style={s.tierBox}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={s.tierLabel}>{tierItem.label}</Text>
                            {isLocked && (
                              <View style={s.lockBadge}>
                                <Ionicons name="lock-closed" size={8} color="#f87171" />
                                <Text style={{ color: '#f87171', fontSize: 8, fontWeight: '800' }}>LOCKED</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[s.tierVal, { color: isLocked ? C.error : tierItem.color }]}>
                            {tierItem.wins}
                            {tierItem.hasCap && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>/{CAP}</Text>}
                          </Text>
                          {tierItem.hasCap && (
                            <View style={s.progressBarBg}>
                              <View style={[s.progressBar, { width: `${pct * 100}%`, backgroundColor: isLocked ? C.error : tierItem.color }]} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {/* Visit Frequency */}
            {entries && (
              <View style={s.card}>
                <Text style={s.sectionHeader}>APP VISIT FREQUENCY</Text>
                <View style={s.statsRow}>
                  <View style={s.visitBox}>
                    <Text style={s.visitLabel}>TODAY</Text>
                    <Text style={[s.visitVal, { color: C.success }]}>{entries.today || 0}</Text>
                  </View>
                  <View style={s.visitBox}>
                    <Text style={s.visitLabel}>THIS WEEK</Text>
                    <Text style={[s.visitVal, { color: C.primary }]}>{entries.thisWeek || 0}</Text>
                  </View>
                  <View style={s.visitBox}>
                    <Text style={s.visitLabel}>THIS MONTH</Text>
                    <Text style={[s.visitVal, { color: '#a78bfa' }]}>{entries.thisMonth || 0}</Text>
                  </View>
                  <View style={s.visitBox}>
                    <Text style={s.visitLabel}>TOTAL</Text>
                    <Text style={[s.visitVal, { color: C.gold }]}>{entries.total || 0}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: GAME HISTORY ================= */}
        {activeTab === 'games' && (
          <View style={s.tabContent}>
            <Text style={s.sectionHeader}>RECENT GAMES (ANTI-CHEAT AUDIT)</Text>
            {(!games || games.length === 0) ? (
              <View style={s.emptyState}>
                <Ionicons name="game-controller-outline" size={32} color="rgba(255,255,255,0.15)" />
                <Text style={s.emptyText}>No games recorded for this player.</Text>
              </View>
            ) : (
              <View style={s.listContainer}>
                {games.map((g: any, idx: number) => {
                  const isWon = g.winner === targetUser?.id;
                  const isDraw = g.status === 'completed' && !g.winner;
                  const opponentName = g.player_x === targetUser?.id ? (g.player_o_name || g.player_o_number || 'Opponent') : (g.player_x_name || g.player_x_number || 'Opponent');
                  const roleLabel = g.player_x === targetUser?.id ? 'X' : 'O';
                  return (
                    <View key={g.id || idx} style={s.listItem}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[s.statusDot, { backgroundColor: isDraw ? '#64748b' : isWon ? C.success : C.error }]} />
                          <Text style={s.itemTitle}>vs {opponentName}</Text>
                          <View style={s.smallPill}>
                            <Text style={s.smallPillText}>As {roleLabel}</Text>
                          </View>
                        </View>
                        <Text style={s.itemSubtitle}>{timeSince(g.created_at)} · Bet: {g.bet_amount} ETB</Text>
                      </View>
                      
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={[s.itemAmount, { color: isDraw ? '#94a3b8' : isWon ? C.success : C.error }]}>
                          {isDraw ? '' : isWon ? '+' : '-'} ETB {isDraw ? g.bet_amount : isWon ? (g.prize_amount || g.bet_amount * 1.8) : g.bet_amount}
                        </Text>
                        
                        {onReplayGame && (
                          <TouchableOpacity onPress={() => onReplayGame(g)} style={s.actionBtn}>
                            <Ionicons name="play-outline" size={10} color={C.primary} />
                            <Text style={s.actionBtnText}>Replay</Text>
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
          <View style={s.tabContent}>
            <Text style={s.sectionHeader}>RECENT BANKING TRANSACTIONS</Text>
            {(!transactions || transactions.length === 0) ? (
              <View style={s.emptyState}>
                <Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.15)" />
                <Text style={s.emptyText}>No transactions recorded for this player.</Text>
              </View>
            ) : (
              <View style={s.listContainer}>
                {transactions.map((tx: any, idx: number) => {
                  const txType = String(tx.type || tx.tx_type || '').toUpperCase();
                  const isDeposit = txType === 'DEPOSIT' || txType === 'ADMIN_CREDIT';
                  const isSucc = tx.status === 'COMPLETED' || tx.status === 'success' || tx.status === 'PAID';
                  const isPending = String(tx.status).toUpperCase().includes('PENDING');
                  const tLabel = txTypeLabel(txType);
                  
                  return (
                    <View key={tx.id || idx} style={s.listItem}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name={tLabel.icon} size={14} color={tLabel.color} />
                          <Text style={s.itemTitle}>{tLabel.label}</Text>
                          <View style={[s.smallPill, { borderColor: isSucc ? 'rgba(52,211,153,0.2)' : isPending ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)', backgroundColor: isSucc ? 'rgba(52,211,153,0.05)' : isPending ? 'rgba(251,191,36,0.05)' : 'rgba(239,68,68,0.05)' }]}>
                            <Text style={[s.smallPillText, { color: isSucc ? C.success : isPending ? C.gold : C.error }]}>
                              {isPending ? 'PENDING' : isSucc ? 'SUCCESS' : 'FAILED'}
                            </Text>
                          </View>
                        </View>
                        <Text style={s.itemSubtitle}>{timeSince(tx.created_at)} · Ref: {tx.id?.slice(0, 12)}</Text>
                      </View>
                      
                      <Text style={[s.itemAmount, { color: isDeposit ? C.success : C.error }]}>
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
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.outlineVariant,
    paddingBottom: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#0c0c1f',
  },
  tabContent: { gap: 20 },
  grid: { flexDirection: 'row', gap: 16 },
  card: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 218, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.2)',
  },
  avatarText: {
    color: C.primary,
    fontWeight: '900',
    fontSize: 18,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.background,
  },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profilePhone: { color: C.onSurfaceVariant, fontSize: 13, marginTop: 2 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 9, fontWeight: '800' },
  referralBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  referralBtnText: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  sectionHeader: {
    color: C.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  balanceCol: { flex: 1, minWidth: 100 },
  balanceLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' },
  balanceValue: { color: C.primary, fontSize: 18, fontWeight: '800', marginTop: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: {
    flex: 1,
    minWidth: 70,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 10,
  },
  statBoxLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '600' },
  statBoxValue: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  tierBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    minWidth: 100,
  },
  tierLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700' },
  tierVal: { fontSize: 20, fontWeight: '800', marginVertical: 6 },
  progressBarBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: 3, borderRadius: 2 },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(248,113,113,0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  visitBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  visitLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800' },
  visitVal: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  emptyText: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  listContainer: { gap: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    padding: 16,
    borderRadius: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  itemTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemSubtitle: { color: C.onSurfaceVariant, fontSize: 11 },
  itemAmount: { fontSize: 14, fontWeight: '800' },
  smallPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  smallPillText: { fontSize: 9, color: C.onSurfaceVariant, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,218,243,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnText: { color: C.primary, fontSize: 9, fontWeight: '800' },
});
