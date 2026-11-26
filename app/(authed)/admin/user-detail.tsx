// app/(authed)/admin/user-detail.tsx — Redesigned Admin User Details (dark theme)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ActionConfirmModal from '../../../components/ActionConfirmModal';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import User360View from '../../../components/User360View';
import { useAdminTheme } from './_layout';
import { alpha } from '../../../components/admin/ui';

const fmt = (n: number) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const timeFmt = (d: string) => {
  if (!d) return '-';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function UserDetail() {
  const { theme: C, isDark } = useAdminTheme();
  const { token, user: authUser, fixUrl } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.id as string;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [gameDetailModal, setGameDetailModal] = useState<any>(null);
  const [txDetailModal, setTxDetailModal] = useState<any>(null);
  const [boardStep, setBoardStep] = useState(0);
  const [confirmAction, setConfirmAction] = useState<'ban' | 'delete' | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/360`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errText = await res.text();
        console.error('[user-detail] API error:', res.status, errText);
      }
    } catch (e) { console.error('[user-detail] fetch error:', e); }
    finally { setLoading(false); }
  }, [userId, token]);

  const handleOpenGameReplay = async (g: any) => {
    setBoardStep(0);
    try {
      const res = await fetch(`${API_URL}/admin/games/${g.id}/moves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setGameDetailModal({ ...g, moves: json.moves || [] });
      } else {
        Alert.alert('Error', 'Failed to fetch moves');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch moves');
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!userId) {
    return (
      <View style={[s.empty, { backgroundColor: C.background }]}>
        <Ionicons name="person-outline" size={32} color={C.onSurfaceVariant} />
        <Text style={[s.emptyText, { color: C.onSurfaceVariant }]}>Select a user from the Player Matrix</Text>
      </View>
    );
  }

  if (loading) return (
    <View style={[s.empty, { backgroundColor: C.background }]}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );
  if (!data || !data.user) return (
    <View style={[s.empty, { backgroundColor: C.background }]}>
      <Text style={[s.emptyText, { color: C.onSurfaceVariant }]}>User not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
        <Text style={[s.backLinkText, { color: C.accentCyan }]}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  const { user: targetUser, wallet, stats, games, transactions, totals, entries } = data;
  const initials = (targetUser.username || targetUser.number || '??').slice(0, 2).toUpperCase();
  const isBanned = targetUser.banned;
  const tier = stats.totalGames > 50 ? 'PRO' : stats.totalGames > 10 ? 'REGULAR' : 'STANDARD';

  const avatarUrl = fixUrl ? fixUrl(targetUser?.avatar) : null;

  const statusColor = (st: string) => {
    const s = String(st).toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCEEDED') return C.success;
    if (s === 'FAILED') return C.error;
    return C.accentGold;
  };

  const txTypeLabel = (t: string) => {
    const map: Record<string, { label: string; icon: string; color: string }> = {
      'DEPOSIT': { label: 'DEPOSIT', icon: 'arrow-down', color: C.success },
      'WITHDRAW_REQUEST': { label: 'WITHDRAWAL', icon: 'arrow-up', color: C.error },
      'WITHDRAW_SETTLED': { label: 'WITHDRAWAL', icon: 'arrow-up', color: C.error },
      'PRIZE': { label: 'PRIZE', icon: 'trophy', color: C.accentGold },
      'BONUS': { label: 'BONUS', icon: 'gift', color: C.accentViolet },
      'GIFT': { label: 'GIFT', icon: 'gift', color: C.success },
      'GIVEAWAY': { label: 'GIVEAWAY', icon: 'gift', color: C.success },
      'WELCOME_BONUS': { label: 'WELCOME BONUS', icon: 'gift', color: C.success },
      'REFERRAL': { label: 'REFERRAL', icon: 'people', color: C.accentViolet },
      'REFERRAL_BONUS': { label: 'REFERRAL BONUS', icon: 'people', color: C.accentViolet },
      'PROMO': { label: 'PROMO', icon: 'pricetag', color: C.success },
      'STAKE': { label: 'STAKE', icon: 'game-controller', color: C.accentCyan },
      'ADMIN_CREDIT': { label: 'ADMIN CREDIT', icon: 'build', color: C.accentViolet },
      'ADMIN_DEBIT': { label: 'ADMIN DEBIT', icon: 'build', color: C.error },
    };
    return map[t] || { label: t, icon: 'ellipse', color: C.onSurfaceVariant };
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: isMobile ? 14 : 24,
        paddingBottom: 100,
        maxWidth: 1300,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      {/* Header Bar — Minimal Clean Header (Dark/Light Dynamic) */}
      <View style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 12,
        ...(Platform.OS === 'web' ? { boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.04)' } : {}),
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: C.surfaceContainerLow,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={16} color={C.onSurface} />
          </TouchableOpacity>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.onSurface }}>
                {targetUser.display_name || targetUser.username || 'User Profile'}
              </Text>
              <View style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: alpha(C.primary, 0.12),
              }}>
                <Text style={{ color: C.primary, fontSize: 10, fontWeight: '800' }}>
                  #{targetUser.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>
              @{targetUser.username || 'unknown'} · {targetUser.number || 'No phone'} · Joined {timeFmt(targetUser.created_at)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: C.primary,
            }}
            onPress={() => {
              setEditUsername(targetUser.username || '');
              setEditNumber(targetUser.number || '');
              setEditFullName(targetUser.display_name || '');
              setEditRole(targetUser.role || 'user');
              setShowRoleDropdown(false);
              setEditModal(true);
            }}
          >
            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isBanned ? alpha(C.success, 0.12) : alpha(C.error, 0.12),
              borderWidth: 1,
              borderColor: isBanned ? alpha(C.success, 0.3) : alpha(C.error, 0.3),
            }}
            disabled={actionLoading}
            onPress={() => setConfirmAction('ban')}
          >
            <Ionicons name={isBanned ? "checkmark-circle-outline" : "ban-outline"} size={14} color={isBanned ? C.success : C.error} />
            <Text style={{ color: isBanned ? C.success : C.error, fontSize: 11.5, fontWeight: '700' }}>
              {isBanned ? 'Restore Access' : 'Ban Player'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: C.surfaceContainerLow,
              borderWidth: 1,
              borderColor: C.border,
            }}
            disabled={actionLoading}
            onPress={() => setConfirmAction('delete')}
          >
            <Ionicons name="trash-outline" size={14} color={C.error} />
            <Text style={{ color: C.error, fontSize: 11.5, fontWeight: '700' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User 360 View */}
      <View>
        <User360View data={data} onReplayGame={handleOpenGameReplay} />
      </View>

      {/* Game Detail Modal — Board Replay */}
      {gameDetailModal && (() => {
        const g = gameDetailModal;
        const moves = Array.isArray(g.moves) ? g.moves : [];
        const isAnomaly = g.status === 'completed' && !g.winner;
        const won = g.winner === userId;
        const duration = g.finished_at && g.created_at
          ? Math.round((new Date(g.finished_at).getTime() - new Date(g.created_at).getTime()) / 1000)
          : 0;

        const board: (string | null)[] = Array(9).fill(null);
        const visibleMoves = moves.slice(0, boardStep);
        visibleMoves.forEach((m: any, idx: number) => {
          const cell = typeof m.cell === 'number' ? m.cell : (typeof m.index === 'number' ? m.index : idx);
          const symbol = m.symbol || m.player || (idx % 2 === 0 ? 'X' : 'O');
          if (cell >= 0 && cell < 9) board[cell] = symbol;
        });

        return (
          <Modal visible transparent animationType="fade">
            <ScrollView
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
              contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: '100%' }}
            >
              <View style={[s.modalContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={s.modalTitle}>Game Replay</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isAnomaly && (
                      <View style={[s.modalPill, { backgroundColor: C.errorContainer, borderColor: C.error }]}>
                        <Text style={{ color: C.error, fontSize: 9, fontWeight: '800' }}>⚠ ANOMALY</Text>
                      </View>
                    )}
                    <View style={[s.modalPill, { backgroundColor: won ? alpha(C.success, 0.08) : C.errorContainer, borderColor: won ? C.success : C.error }]}>
                      <Text style={{ color: won ? C.success : C.error, fontSize: 9, fontWeight: '800' }}>
                        {isAnomaly ? 'NO WINNER' : won ? 'WON' : 'LOST'}
                      </Text>
                    </View>
                  </View>
                </View>

                {isAnomaly && (
                  <View style={[s.modalAlert, { backgroundColor: C.errorContainer, borderColor: C.error }]}>
                    <Text style={{ color: C.error, fontSize: 10, fontWeight: '800', marginBottom: 4 }}>
                      ⚠ ANOMALY: Both Players Lost
                    </Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 9, lineHeight: 14 }}>
                      This game completed with no winner recorded. Both players were charged {fmt(Number(g.bet_amount || 0))} ETB.
                    </Text>
                  </View>
                )}

                <View style={s.modalInfoGrid}>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Game ID</Text>
                    <Text style={s.infoValue}>{g.id?.slice(0, 8)}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Bet</Text>
                    <Text style={[s.infoValue, { fontWeight: '800' }]}>ETB {fmt(Number(g.bet_amount || 0))}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={{ color: C.accentCyan, fontSize: 9, fontWeight: '700' }}>✕ {g.player_x_name || g.player_x?.slice(0, 6)}</Text>
                    <Text style={s.infoValueSmall}>{g.player_x_number || ''}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={{ color: '#F43F5E', fontSize: 9, fontWeight: '700' }}>○ {g.player_o_name || g.player_o?.slice(0, 6)}</Text>
                    <Text style={s.infoValueSmall}>{g.player_o_number || ''}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Duration</Text>
                    <Text style={s.infoValue}>{duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '—'}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Status</Text>
                    <Text style={{ color: C.accentGold, fontSize: 9, fontWeight: '800' }}>{g.status}</Text>
                  </View>
                </View>

                {moves.length > 0 && (
                  <View style={s.replaySection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={s.sectionKicker}>BOARD REPLAY</Text>
                      <Text style={s.sectionMeta}>Move {boardStep}/{moves.length}</Text>
                    </View>

                    <View style={[s.boardWrap, { backgroundColor: C.surfaceContainerLow, borderColor: C.border }]}>
                      {[0, 1, 2].map(row => (
                        <View key={row} style={{ flexDirection: 'row' }}>
                          {[0, 1, 2].map(col => {
                            const idx = row * 3 + col;
                            const sym = board[idx];
                            const isLatest = boardStep > 0 && (() => {
                              const lastMove = moves[boardStep - 1];
                              const lastCell = typeof lastMove?.cell === 'number' ? lastMove.cell : (typeof lastMove?.index === 'number' ? lastMove.index : boardStep - 1);
                              return lastCell === idx;
                            })();
                            return (
                              <View
                                key={col}
                                style={{
                                  width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                                  borderWidth: 1, borderColor: C.border,
                                  backgroundColor: isLatest ? 'rgba(0, 191, 255, 0.08)' : C.surfaceContainer,
                                  borderRadius: row === 0 && col === 0 ? 8 : row === 0 && col === 2 ? 8 : row === 2 && col === 0 ? 8 : row === 2 && col === 2 ? 8 : 0,
                                }}
                              >
                                <Text style={{ fontSize: 20, fontWeight: '800', color: sym === 'X' ? C.accentCyan : sym === 'O' ? '#F43F5E' : 'transparent' }}>
                                  {sym || '·'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>

                    <View style={s.boardControls}>
                      <TouchableOpacity onPress={() => setBoardStep(0)} style={s.navBtn} activeOpacity={0.6}>
                        <Ionicons name="play-skip-back" size={14} color={C.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBoardStep(p => Math.max(0, p - 1))} style={s.navBtn} activeOpacity={0.6}>
                        <Ionicons name="caret-back" size={18} color={C.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          let step = 0;
                          const iv = setInterval(() => {
                            step++;
                            setBoardStep(step);
                            if (step >= moves.length) clearInterval(iv);
                          }, 400);
                        }}
                        style={[s.navBtn, { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}
                        activeOpacity={0.6}
                      >
                        <Ionicons name="play" size={14} color={C.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBoardStep(p => Math.min(moves.length, p + 1))} style={s.navBtn} activeOpacity={0.6}>
                        <Ionicons name="caret-forward" size={18} color={C.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBoardStep(moves.length)} style={s.navBtn} activeOpacity={0.6}>
                        <Ionicons name="play-skip-forward" size={14} color={C.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {moves.length > 0 && (
                  <View style={s.timelineSection}>
                    <Text style={s.sectionKicker}>MOVE TIMELINE</Text>
                    <View style={s.timelineWrap}>
                      {moves.map((m: any, i: number) => {
                        const sym = m.symbol || m.player || (i % 2 === 0 ? 'X' : 'O');
                        const cell = typeof m.cell === 'number' ? m.cell : (typeof m.index === 'number' ? m.index : i);
                        const ts = m.ts || m.timestamp;
                        const isActive = i < boardStep;
                        return (
                          <TouchableOpacity
                            key={i}
                            onPress={() => setBoardStep(i + 1)}
                            style={[s.timelineRow, isActive && s.timelineRowActive]}
                            activeOpacity={0.6}
                          >
                            <Text style={{ color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', width: 20, textAlign: 'center' }}>{i + 1}</Text>
                            <Text style={{ color: sym === 'X' ? C.accentCyan : '#F43F5E', fontSize: 12, fontWeight: '800', width: 16 }}>{sym}</Text>
                            <Text style={{ color: C.onSurfaceVariant, fontSize: 9 }}>Cell {cell}</Text>
                            {ts && <Text style={{ color: C.onSurfaceVariant, fontSize: 8, marginLeft: 'auto' }}>{new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {!isAnomaly && g.winner !== userId && (
                  <View style={[s.lossReason, { backgroundColor: C.errorContainer, borderColor: C.error }]}>
                    <Text style={{ color: C.error, fontSize: 9, fontWeight: '800', marginBottom: 4 }}>⚠ LOSS REASON</Text>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 9, lineHeight: 14 }}>
                      {g.end_reason === 'forfeit' || g.forfeit ? 'This user left the game or forfeited the match.' :
                       g.end_reason === 'timeout' ? 'This user ran out of time.' :
                       g.end_reason === 'disconnect' ? 'This user disconnected (internet issue).' :
                       'Opponent outplayed this user in normal gameplay.'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => { setGameDetailModal(null); setBoardStep(0); }}
                  style={s.modalClose}
                >
                  <Text style={s.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Modal>
        );
      })()}

      {/* Edit Data Modal */}
      {editModal && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={[s.modalContainer, { backgroundColor: C.surface, borderColor: C.border, width: '100%', maxWidth: 440 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-circle" size={20} color={C.primary} />
                  </View>
                  <View>
                    <Text style={s.modalTitle}>Edit User</Text>
                    <Text style={s.modalSub}>Update profile information</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEditModal(false)} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={18} color={C.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <View style={s.formField}>
                <Text style={s.fieldLabel}>FULL NAME</Text>
                <View style={[s.fieldInput, { backgroundColor: C.surfaceContainerLowest, borderColor: C.border }]}>
                  <Ionicons name="person-outline" size={16} color={C.onSurfaceVariant} />
                  <TextInput
                    value={editFullName}
                    onChangeText={setEditFullName}
                    placeholder="Enter full name"
                    style={[s.textInput, { color: C.onSurface }]}
                    placeholderTextColor={C.onSurfaceVariant}
                  />
                </View>
              </View>

              <View style={s.formField}>
                <Text style={s.fieldLabel}>USERNAME</Text>
                <View style={[s.fieldInput, { backgroundColor: C.surfaceContainerLowest, borderColor: C.border }]}>
                  <Ionicons name="at" size={16} color={C.onSurfaceVariant} />
                  <TextInput
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="Enter username"
                    style={[s.textInput, { color: C.onSurface }]}
                    placeholderTextColor={C.onSurfaceVariant}
                  />
                </View>
              </View>

              <View style={s.formField}>
                <Text style={s.fieldLabel}>PHONE NUMBER</Text>
                <View style={[s.fieldInput, { backgroundColor: C.surfaceContainerLowest, borderColor: C.border }]}>
                  <Ionicons name="call-outline" size={16} color={C.onSurfaceVariant} />
                  <TextInput
                    value={editNumber}
                    onChangeText={setEditNumber}
                    placeholder="251..."
                    style={[s.textInput, { color: C.onSurface }]}
                    placeholderTextColor={C.onSurfaceVariant}
                    inputMode="tel"
                  />
                </View>
              </View>

              <View style={s.formField}>
                <Text style={s.fieldLabel}>ROLE</Text>
                <TouchableOpacity
                  onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  style={[s.fieldInput, { borderColor: showRoleDropdown ? C.primary : C.border, backgroundColor: showRoleDropdown ? C.primaryContainer : C.surfaceContainerLowest }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color={editRole === 'admin' ? C.accentGold : editRole === 'maintenance' ? C.accentViolet : C.success}
                    />
                    <Text style={{ color: C.onSurface, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' }}>{editRole}</Text>
                  </View>
                  <Ionicons name={showRoleDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={C.onSurfaceVariant} />
                </TouchableOpacity>

                {showRoleDropdown && (
                  <View style={[s.roleDropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
                    {[
                      { value: 'user', label: 'User', icon: 'person', color: C.success, desc: 'Standard player account' },
                      { value: 'admin', label: 'Admin', icon: 'shield', color: C.accentGold, desc: 'Can manage users & settings' },
                      { value: 'maintenance', label: 'Maintenance', icon: 'construct', color: C.accentViolet, desc: 'Full system access' },
                    ].map((role, i) => (
                      <TouchableOpacity
                        key={role.value}
                        onPress={() => { setEditRole(role.value); setShowRoleDropdown(false); }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          gap: 8,
                          backgroundColor: editRole === role.value ? C.primaryContainer : 'transparent',
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: C.border,
                        }}
                      >
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${role.color}15`, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={role.icon as any} size={14} color={role.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.onSurface, fontSize: 12, fontWeight: '700' }}>{role.label}</Text>
                          <Text style={{ color: C.onSurfaceVariant, fontSize: 9, fontWeight: '600' }}>{role.desc}</Text>
                        </View>
                        {editRole === role.value && <Ionicons name="checkmark-circle" size={16} color={C.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={s.modalActions}>
                <TouchableOpacity
                  onPress={() => setEditModal(false)}
                  style={[s.modalBtnCancel, { backgroundColor: C.surfaceContainerHighest, borderColor: C.border }]}
                >
                  <Text style={[s.modalBtnText, { color: C.onSurfaceVariant }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={actionLoading}
                  onPress={async () => {
                    setActionLoading(true);
                    try {
                      await fetch(`${API_URL}/admin/users/${userId}`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
                        body: JSON.stringify({ username: editUsername, number: editNumber, full_name: editFullName, role: editRole }),
                      });
                      setEditModal(false);
                      fetchData();
                    } catch (e) { console.error(e); }
                    setActionLoading(false);
                  }}
                  style={s.modalBtnSave}
                >
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  <Text style={s.modalBtnText}>{actionLoading ? 'Saving…' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Transaction Detail Modal */}
      {txDetailModal && (() => {
        const tx = txDetailModal;
        const st = String(tx.status).toUpperCase();
        const typeInfo = txTypeLabel(tx.type);
        const isPending = st === 'PENDING' || st === 'PENDING_MANUAL';
        const isFailed = st === 'FAILED';

        let exactReason = tx.exact_reason || null;
        if (!exactReason && tx.provider_payload) {
          try {
            const meta = typeof tx.provider_payload === 'string' ? JSON.parse(tx.provider_payload) : tx.provider_payload;
            if (meta) {
              exactReason = meta.message || meta.error || meta.data?.message || meta.data?.error || meta.failure_reason || meta.reason || null;
              if (!exactReason && meta.transfer_error) exactReason = meta.transfer_error;
              if (!exactReason && meta.status_message) exactReason = meta.status_message;
            }
          } catch (e) {}
        }

        const reason = tx.failure_reason || tx.pending_reason || tx.reason;
        const reasonText = exactReason ? exactReason : (
          reason ? reason : (
            isPending ? 'Transaction is being processed by the payment gateway. If stuck for >24hrs, it may need manual intervention or auto-refund.' :
            isFailed ? 'The payment provider rejected this transaction. No specific error was returned by Chapa.' :
            'Transaction completed successfully through the payment gateway.'
          )
        );
        return (
          <Modal visible transparent animationType="fade">
            <ScrollView
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
              contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: '100%' }}
            >
              <View style={[s.modalContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={s.modalTitle}>Transaction Detail</Text>
                  <View style={[s.modalPill, { borderColor: statusColor(tx.status) + '26' }]}>
                    <Text style={{ color: statusColor(tx.status), fontSize: 9, fontWeight: '800' }}>{st}</Text>
                  </View>
                </View>
                <View style={s.modalInfoGrid}>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>ID</Text>
                    <Text style={s.infoValue}>#TRX-{String(tx.id).slice(0, 6).toUpperCase()}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Type</Text>
                    <Text style={{ color: typeInfo.color, fontSize: 10, fontWeight: '800' }}>{typeInfo.label}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Amount</Text>
                    <Text style={s.infoValue}>ETB {fmt(tx.amount)}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Date</Text>
                    <Text style={s.infoValue}>{timeFmt(tx.createdAt || tx.created_at)}</Text>
                  </View>
                  {tx.provider && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Provider</Text>
                      <Text style={s.infoValue}>{tx.provider}</Text>
                    </View>
                  )}
                  {tx.reference && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Reference</Text>
                      <Text style={s.infoValue}>{tx.reference}</Text>
                    </View>
                  )}
                </View>

                <View style={[s.reasonBox, { backgroundColor: isPending ? alpha(C.accentGold, 0.08) : isFailed ? C.errorContainer : alpha(C.success, 0.08), borderColor: isPending ? C.accentGold : isFailed ? C.error : C.success }]}>
                  <Text style={{ color: isPending ? C.accentGold : isFailed ? C.error : C.success, fontSize: 9, fontWeight: '800', marginBottom: 4 }}>
                    {isPending ? '⏳ PENDING REASON' : isFailed ? '❌ FAILURE REASON' : '✅ COMPLETION'}
                  </Text>
                  <Text style={{ color: exactReason ? C.onSurface : C.onSurfaceVariant, fontSize: 9, lineHeight: 14, fontWeight: exactReason ? '700' : '400' }}>{reasonText}</Text>
                  {exactReason && (
                    <View style={{ marginTop: 6, backgroundColor: C.surfaceContainerHighest, padding: 5, borderRadius: 6 }}>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>SOURCE: CHAPA PROVIDER RESPONSE</Text>
                    </View>
                  )}
                </View>
                {isPending && (
                  <View style={[s.hintBox, { backgroundColor: 'rgba(0, 191, 255, 0.06)' }]}>
                    <Text style={{ color: C.accentCyan, fontSize: 9, fontWeight: '700' }}>
                      💡 If this has been pending for over 24 hours and is a withdrawal, consider issuing a manual refund to the user's available balance.
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => setTxDetailModal(null)} style={s.modalClose}>
                  <Text style={s.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Modal>
        );
      })()}

      <ActionConfirmModal
        visible={!!confirmAction}
        title={confirmAction === 'delete' ? 'Delete User Account' : isBanned ? 'Unban User' : 'Ban User'}
        message={
          confirmAction === 'delete'
            ? 'Are you sure you want to PERMANENTLY delete this user? This action will purge all their transactional data and is completely irreversible.'
            : `Are you sure you want to ${isBanned ? 'unban' : 'ban'} this user? ${isBanned ? 'This will restore their access.' : 'This will immediately lock them out of the application.'}`
        }
        confirmText={confirmAction === 'delete' ? 'Delete User' : isBanned ? 'Unban User' : 'Ban User'}
        confirmColor={confirmAction === 'delete' ? 'red' : isBanned ? 'blue' : 'yellow'}
        iconName={confirmAction === 'delete' ? 'trash-outline' : isBanned ? 'shield-checkmark-outline' : 'warning-outline'}
        isLoading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          setActionLoading(true);
          try {
            if (confirmAction === 'ban') {
              await fetch(`${API_URL}/admin/users/${userId}/ban`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
                body: JSON.stringify({ banned: !isBanned }),
              });
              await fetchData();
            } else if (confirmAction === 'delete') {
              await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
              });
              router.back();
            }
          } catch (e) { console.error(e); } finally {
            setActionLoading(false);
            setConfirmAction(null);
          }
        }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  empty: { flex: 1, backgroundColor: '#070a12', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  backLink: { marginTop: 16 },
  backLinkText: { fontWeight: '700', fontSize: 13 },

  // Header
  headerBar: {
    backgroundColor: '#0d1320',
    borderWidth: 1,
    borderColor: '#182234',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } : {}),
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#1a2638',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#182234',
  },
  headerTitle: { color: '#f7f9fc', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  headerSub: { color: '#bbc7d6', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 2, textTransform: 'uppercase' },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  headerBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Modals
  modalContainer: {
    backgroundColor: '#0d1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#182234',
    padding: 24,
    width: '100%',
    maxWidth: 500,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.4)' } : {}),
  },
  modalTitle: { color: '#f7f9fc', fontSize: 17, fontWeight: '800' },
  modalSub: { color: '#bbc7d6', fontSize: 10, fontWeight: '600', marginTop: 2 },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#1a2638',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#182234',
  },
  modalPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  modalAlert: {
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ff7888',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  modalInfoGrid: { gap: 8, marginBottom: 16 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2,
  },
  infoLabel: { color: '#9ba0a4', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  infoValue: { color: '#f7f9fc', fontSize: 11, fontWeight: '700' },
  infoValueSmall: { color: '#bbc7d6', fontSize: 9 },

  replaySection: { marginBottom: 14 },
  sectionKicker: { color: '#9ba0a4', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6, textTransform: 'uppercase' },
  sectionMeta: { color: '#bbc7d6', fontSize: 9, fontWeight: '700' },
  boardWrap: {
    borderRadius: 12, borderWidth: 1, padding: 4, alignSelf: 'center',
  },
  boardControls: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10,
  },
  navBtn: { padding: 6 },
  timelineSection: { marginBottom: 14 },
  timelineWrap: { maxHeight: 120 },
  timelineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4,
    borderRadius: 6,
  },
  timelineRowActive: { backgroundColor: 'rgba(255, 23, 68, 0.1)' },
  lossReason: {
    marginTop: 4, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  modalClose: { marginTop: 16, backgroundColor: '#ff1744', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modalCloseText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Edit form
  formField: { marginBottom: 14 },
  fieldLabel: { color: '#ff1744', fontSize: 8, fontWeight: '800', letterSpacing: 1.6, marginBottom: 5, textTransform: 'uppercase' },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1,
  },
  textInput: { flex: 1, paddingVertical: 11, fontSize: 13 },
  roleDropdown: { borderRadius: 10, borderWidth: 1, marginTop: 2, overflow: 'hidden' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalBtnCancel: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
  },
  modalBtnSave: {
    flex: 1.5, backgroundColor: '#ff1744', paddingVertical: 11, borderRadius: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  modalBtnText: { color: '#f7f9fc', fontWeight: '700', fontSize: 13 },
  reasonBox: {
    marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1,
  },
  hintBox: { marginTop: 10, padding: 10, borderRadius: 8 },
});
