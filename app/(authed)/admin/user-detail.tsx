// app/(authed)/admin/user-detail.tsx — Full User Profile (matches design)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ActionConfirmModal from '../../../components/ActionConfirmModal';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import User360View from '../../../components/User360View';

const fmt = (n: number) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const timeFmt = (d: string) => {
  if (!d) return '-';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const dateFmt = (d: string) => {
  if (!d) return '-';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
};

export default function UserDetail() {
  const { token, user: authUser } = useAuth();
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
  const [txPage, setTxPage] = useState(0);
  const [gamePage, setGamePage] = useState(0);
  const [txFilter, setTxFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txAmountRange, setTxAmountRange] = useState('all');
  const [gameDetailModal, setGameDetailModal] = useState<any>(null);
  const [txDetailModal, setTxDetailModal] = useState<any>(null);
  const [boardStep, setBoardStep] = useState(0);
  const [gameFilter, setGameFilter] = useState<'all'|'wins'|'losses'>('all');
  const [fetchingMovesFor, setFetchingMovesFor] = useState<string | null>(null);
  const PAGE_SIZE = 20;
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
    setFetchingMovesFor(g.id);
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
    } finally {
      setFetchingMovesFor(null);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // Guard: no userId provided (auto-mounted by expo-router)
  if (!userId) {
    return (
      <View style={s.center}>
        <Text style={{ color: '#475569', fontSize: 14 }}>Select a user from the Player Matrix</Text>
      </View>
    );
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#00A3FF" /></View>;
  if (!data || !data.user) return (
    <View style={s.center}>
      <Text style={{ color: '#475569', fontSize: 14 }}>User not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={{ color: '#00e5ff', fontWeight: '700' }}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  const { user: targetUser, wallet, stats, games, transactions, totals, entries } = data;
  const initials = (targetUser.username || targetUser.number || '??').slice(0, 2).toUpperCase();
  const isBanned = targetUser.banned;
  const tier = stats.totalGames > 50 ? 'PRO' : stats.totalGames > 10 ? 'REGULAR' : 'STANDARD';

  const statusColor = (st: string) => {
    const s = String(st).toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCEEDED') return '#34d399';
    if (s === 'FAILED') return '#f87171';
    return '#f59e0b';
  };

  const txTypeLabel = (t: string) => {
    const map: Record<string, { label: string; icon: string; color: string }> = {
      'DEPOSIT': { label: 'DEPOSIT', icon: 'arrow-down', color: '#34d399' },
      'WITHDRAW_REQUEST': { label: 'WITHDRAWAL', icon: 'arrow-up', color: '#f87171' },
      'WITHDRAW_SETTLED': { label: 'WITHDRAWAL', icon: 'arrow-up', color: '#f87171' },
      'PRIZE': { label: 'PRIZE', icon: 'trophy', color: '#fbbf24' },
      'BONUS': { label: 'BONUS', icon: 'gift', color: '#a78bfa' },
      'STAKE': { label: 'STAKE', icon: 'game-controller', color: '#00daf3' },
      'ADMIN_CREDIT': { label: 'ADMIN CREDIT', icon: 'build', color: '#a78bfa' },
      'ADMIN_DEBIT': { label: 'ADMIN DEBIT', icon: 'build', color: '#f87171' },
    };
    return map[t] || { label: t, icon: 'ellipse', color: '#64748b' };
  };

  return (
    <ScrollView style={[s.container, isMobile && { padding: 12, paddingTop: 12 }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header Bar */}
      <View style={[s.headerBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.backCircle}>
            <Ionicons name="arrow-back" size={18} color="#00e5ff" />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>User Profile: <Text style={{ color: '#00e5ff' }}>#{targetUser.id.slice(0, 6).toUpperCase()}</Text></Text>
            <Text style={s.headerSub}>USER MANAGEMENT / DETAIL VIEW</Text>
          </View>
        </View>
        <View style={[{ flexDirection: 'row', gap: 8 }, isMobile && { flexWrap: 'wrap', marginTop: 8 }]}>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: '#00e5ff' }]} onPress={() => { setEditUsername(targetUser.username || ''); setEditNumber(targetUser.number || ''); setEditFullName(targetUser.display_name || ''); setEditRole(targetUser.role || 'user'); setShowRoleDropdown(false); setEditModal(true); }}>
            <Ionicons name="create" size={14} color="#0a0f1c" />
            <Text style={[s.headerBtnText, { color: '#0a0f1c' }]}>Edit Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: '#ef4444' }]} disabled={actionLoading} onPress={() => setConfirmAction('ban')}>
            <Ionicons name="ban" size={14} color="#fff" />
            <Text style={s.headerBtnText}>{isBanned ? 'Unban User' : 'Ban User'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]} disabled={actionLoading} onPress={() => setConfirmAction('delete')}>
            <Ionicons name="trash" size={14} color="#ef4444" />
            <Text style={[s.headerBtnText, { color: '#ef4444' }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* User 360 Audit View */}
      <View style={{ flex: 1, marginTop: 24 }}>
        <User360View data={data} onReplayGame={handleOpenGameReplay} />
      </View>

      {/* Game Detail Modal — Board Replay */}
      {gameDetailModal && (() => {
        const g = gameDetailModal;
        const moves = Array.isArray(g.moves) ? g.moves : [];
        const isAnomaly = g.status === 'completed' && !g.winner;
        const won = g.winner === userId;
        const duration = g.finished_at && g.created_at ? Math.round((new Date(g.finished_at).getTime() - new Date(g.created_at).getTime()) / 1000) : 0;

        // Build board state at current step
        const board: (string | null)[] = Array(9).fill(null);
        const visibleMoves = moves.slice(0, boardStep);
        visibleMoves.forEach((m: any, idx: number) => {
          const cell = typeof m.cell === 'number' ? m.cell : (typeof m.index === 'number' ? m.index : idx);
          const symbol = m.symbol || m.player || (idx % 2 === 0 ? 'X' : 'O');
          if (cell >= 0 && cell < 9) board[cell] = symbol;
        });

        return (
        <Modal visible transparent animationType="fade">
          <ScrollView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: '100%' }}>
            <View style={{ backgroundColor: '#0f1423', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, borderWidth: 1, borderColor: isAnomaly ? 'rgba(248,113,113,0.3)' : 'rgba(0,229,255,0.15)' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Game Replay</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isAnomaly && (
                    <View style={{ backgroundColor: 'rgba(248,113,113,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' }}>
                      <Text style={{ color: '#f87171', fontSize: 9, fontWeight: '900' }}>⚠ ANOMALY</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: won ? 'rgba(52,211,153,0.15)' : isAnomaly ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: won ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' }}>
                    <Text style={{ color: won ? '#34d399' : '#f87171', fontSize: 9, fontWeight: '900' }}>{isAnomaly ? 'NO WINNER' : won ? 'WON' : 'LOST'}</Text>
                  </View>
                </View>
              </View>

              {/* Anomaly Banner */}
              {isAnomaly && (
                <View style={{ backgroundColor: 'rgba(248,113,113,0.08)', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)' }}>
                  <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '900', marginBottom: 4 }}>⚠ ANOMALY: Both Players Lost</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, lineHeight: 16 }}>This game completed with no winner recorded. Both players were charged {fmt(Number(g.bet_amount || 0))} ETB. A refund should be issued to both players.</Text>
                </View>
              )}

              {/* Info Grid */}
              <View style={{ gap: 8, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 11 }}>Game ID</Text><Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '700' }}>{g.id?.slice(0, 8)}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 11 }}>Bet</Text><Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '900' }}>ETB {fmt(Number(g.bet_amount || 0))}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#00daf3', fontSize: 11 }}>✕ {g.player_x_name || g.player_x?.slice(0, 6)}</Text><Text style={{ color: '#475569', fontSize: 10 }}>{g.player_x_number || ''}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#fd6f85', fontSize: 11 }}>○ {g.player_o_name || g.player_o?.slice(0, 6)}</Text><Text style={{ color: '#475569', fontSize: 10 }}>{g.player_o_number || ''}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 11 }}>Duration</Text><Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '700' }}>{duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '—'}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 11 }}>Status</Text><Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '700' }}>{g.status}</Text></View>
              </View>

              {/* Board Replay */}
              {moves.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>BOARD REPLAY</Text>
                    <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '700' }}>Move {boardStep}/{moves.length}</Text>
                  </View>

                  {/* 3x3 Grid */}
                  <View style={{ alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
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
                            <View key={col} style={{
                              width: 52, height: 52, alignItems: 'center', justifyContent: 'center',
                              borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                              backgroundColor: isLatest ? 'rgba(0,229,255,0.08)' : 'transparent',
                              borderRadius: row === 0 && col === 0 ? 10 : row === 0 && col === 2 ? 10 : row === 2 && col === 0 ? 10 : row === 2 && col === 2 ? 10 : 0,
                            }}>
                              <Text style={{ fontSize: 24, fontWeight: '900', color: sym === 'X' ? '#00daf3' : sym === 'O' ? '#fd6f85' : 'transparent' }}>
                                {sym || '·'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  {/* Controls */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setBoardStep(0)} style={{ padding: 6, opacity: boardStep === 0 ? 0.3 : 1 }}>
                      <Ionicons name="play-skip-back" size={16} color="#00e5ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setBoardStep(p => Math.max(0, p - 1))} style={{ padding: 6, opacity: boardStep === 0 ? 0.3 : 1 }}>
                      <Ionicons name="caret-back" size={20} color="#00e5ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { let step = 0; const iv = setInterval(() => { step++; setBoardStep(step); if (step >= moves.length) clearInterval(iv); }, 400); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,229,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="play" size={16} color="#00e5ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setBoardStep(p => Math.min(moves.length, p + 1))} style={{ padding: 6, opacity: boardStep >= moves.length ? 0.3 : 1 }}>
                      <Ionicons name="caret-forward" size={20} color="#00e5ff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setBoardStep(moves.length)} style={{ padding: 6, opacity: boardStep >= moves.length ? 0.3 : 1 }}>
                      <Ionicons name="play-skip-forward" size={16} color="#00e5ff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Move Timeline */}
              {moves.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>MOVE TIMELINE</Text>
                  <View style={{ maxHeight: 120 }}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 120 }}>
                      {moves.map((m: any, i: number) => {
                        const sym = m.symbol || m.player || (i % 2 === 0 ? 'X' : 'O');
                        const cell = typeof m.cell === 'number' ? m.cell : (typeof m.index === 'number' ? m.index : i);
                        const ts = m.ts || m.timestamp;
                        const isActive = i < boardStep;
                        return (
                          <TouchableOpacity key={i} onPress={() => setBoardStep(i + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, opacity: isActive ? 1 : 0.4 }}>
                            <Text style={{ color: '#334155', fontSize: 10, width: 20, textAlign: 'center', fontWeight: '700' }}>{i + 1}</Text>
                            <Text style={{ color: sym === 'X' ? '#00daf3' : '#fd6f85', fontSize: 12, fontWeight: '900', width: 16 }}>{sym}</Text>
                            <Text style={{ color: '#64748b', fontSize: 10 }}>Cell {cell}</Text>
                            {ts && <Text style={{ color: '#334155', fontSize: 9, marginLeft: 'auto' }}>{new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* Loss Reason */}
              {!isAnomaly && g.winner !== userId && (
                <View style={{ marginTop: 4, backgroundColor: 'rgba(248,113,113,0.08)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)' }}>
                  <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '800', marginBottom: 4 }}>⚠️ LOSS REASON</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, lineHeight: 16 }}>
                    {g.end_reason === 'forfeit' || g.forfeit ? 'This user left the game or forfeited the match.' :
                     g.end_reason === 'timeout' ? 'This user ran out of time.' :
                     g.end_reason === 'disconnect' ? 'This user disconnected (internet issue).' :
                     'Opponent outplayed this user in normal gameplay.'}
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={() => { setGameDetailModal(null); setBoardStep(0); }} style={{ marginTop: 16, backgroundColor: '#00e5ff', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: '#0a0f1c', fontWeight: '900', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
        );
      })()}

      {/* Edit Data Modal — Modern Glassmorphism UI */}
      {editModal && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#0c1020', borderRadius: 24, padding: 28, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,229,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-circle" size={22} color="#00e5ff" />
                  </View>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Edit User</Text>
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600' }}>Update profile information</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEditModal(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Full Name */}
              <Text style={{ color: 'rgba(0,229,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>FULL NAME</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <Ionicons name="person-outline" size={16} color="#475569" />
                <TextInput value={editFullName} onChangeText={setEditFullName} placeholder="Enter full name" style={{ flex: 1, color: '#fff', padding: 12, fontSize: 14 }} placeholderTextColor="#334155" />
              </View>

              {/* Username */}
              <Text style={{ color: 'rgba(0,229,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>USERNAME</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <Ionicons name="at" size={16} color="#475569" />
                <TextInput value={editUsername} onChangeText={setEditUsername} placeholder="Enter username" style={{ flex: 1, color: '#fff', padding: 12, fontSize: 14 }} placeholderTextColor="#334155" />
              </View>

              {/* Phone Number */}
              <Text style={{ color: 'rgba(0,229,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>PHONE NUMBER</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <Ionicons name="call-outline" size={16} color="#475569" />
                <TextInput value={editNumber} onChangeText={setEditNumber} placeholder="251..." style={{ flex: 1, color: '#fff', padding: 12, fontSize: 14 }} placeholderTextColor="#334155" inputMode="tel" />
              </View>

              {/* Role Dropdown */}
              <Text style={{ color: 'rgba(0,229,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>ROLE</Text>
              <TouchableOpacity 
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: showRoleDropdown ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: showRoleDropdown ? 2 : 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="shield-checkmark" size={16} color={editRole === 'admin' ? '#f59e0b' : editRole === 'maintenance' ? '#a78bfa' : '#34d399'} />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }}>{editRole}</Text>
                </View>
                <Ionicons name={showRoleDropdown ? "chevron-up" : "chevron-down"} size={16} color="#475569" />
              </TouchableOpacity>

              {showRoleDropdown && (
                <View style={{ backgroundColor: 'rgba(12,16,32,0.98)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)', marginBottom: 20, overflow: 'hidden' }}>
                  {[
                    { value: 'user', label: 'User', icon: 'person', color: '#34d399', desc: 'Standard player account' },
                    { value: 'admin', label: 'Admin', icon: 'shield', color: '#f59e0b', desc: 'Can manage users & settings' },
                    { value: 'maintenance', label: 'Maintenance', icon: 'construct', color: '#a78bfa', desc: 'Full system access' },
                  ].map((role, i) => (
                    <TouchableOpacity 
                      key={role.value}
                      onPress={() => { setEditRole(role.value); setShowRoleDropdown(false); }}
                      style={{ 
                        flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
                        backgroundColor: editRole === role.value ? 'rgba(0,229,255,0.06)' : 'transparent',
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.04)'
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${role.color}15`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={role.icon as any} size={16} color={role.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '800' }}>{role.label}</Text>
                        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600' }}>{role.desc}</Text>
                      </View>
                      {editRole === role.value && <Ionicons name="checkmark-circle" size={18} color="#00e5ff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setEditModal(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <Text style={{ color: '#94a3b8', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={actionLoading} onPress={async () => {
                  setActionLoading(true);
                  try {
                    await fetch(`${API_URL}/admin/users/${userId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' }, body: JSON.stringify({ username: editUsername, number: editNumber, full_name: editFullName, role: editRole }) });
                    setEditModal(false);
                    fetchData();
                  } catch(e) { console.error(e); }
                  setActionLoading(false);
                }} style={{ flex: 1.5, backgroundColor: '#00e5ff', paddingVertical: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="checkmark" size={16} color="#0a0f1c" />
                  <Text style={{ color: '#0a0f1c', fontWeight: '900', fontSize: 13 }}>{actionLoading ? 'Saving...' : 'Save Changes'}</Text>
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
        
        // Try to extract exact reason from provider_payload stored locally
        let exactReason = tx.exact_reason || null;
        if (!exactReason && tx.provider_payload) {
          try {
            const meta = typeof tx.provider_payload === 'string' ? JSON.parse(tx.provider_payload) : tx.provider_payload;
            if (meta) {
              exactReason = meta.message || meta.error || meta.data?.message || meta.data?.error || meta.failure_reason || meta.reason || null;
              if (!exactReason && meta.transfer_error) exactReason = meta.transfer_error;
              if (!exactReason && meta.status_message) exactReason = meta.status_message;
            }
          } catch(e) {}
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
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#0f1423', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Transaction Detail</Text>
                <View style={[s.statusPill, { borderColor: statusColor(tx.status) + '60' }]}>
                  <Text style={{ color: statusColor(tx.status), fontSize: 10, fontWeight: '800' }}>{st}</Text>
                </View>
              </View>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 12 }}>ID</Text><Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>#TRX-{String(tx.id).slice(0, 6).toUpperCase()}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 12 }}>Type</Text><Text style={{ color: typeInfo.color, fontSize: 12, fontWeight: '700' }}>{typeInfo.label}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 12 }}>Amount</Text><Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '900' }}>ETB {fmt(tx.amount)}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 12 }}>Date</Text><Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>{timeFmt(tx.createdAt || tx.created_at)}</Text></View>
                {tx.provider && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 12 }}>Provider</Text><Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>{tx.provider}</Text></View>}
                {tx.reference && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#64748b', fontSize: 12 }}>Reference</Text><Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>{tx.reference}</Text></View>}
              </View>
              {/* Exact Reason Box */}
              <View style={{ marginTop: 14, backgroundColor: isPending ? 'rgba(245,158,11,0.08)' : isFailed ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: isPending ? 'rgba(245,158,11,0.2)' : isFailed ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)' }}>
                <Text style={{ color: isPending ? '#f59e0b' : isFailed ? '#f87171' : '#34d399', fontSize: 11, fontWeight: '800', marginBottom: 4 }}>
                  {isPending ? '⏳ PENDING REASON' : isFailed ? '❌ FAILURE REASON' : '✅ COMPLETION'}
                </Text>
                <Text style={{ color: exactReason ? '#e2e8f0' : '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: exactReason ? '700' : '400' }}>{reasonText}</Text>
                {exactReason && (
                  <View style={{ marginTop: 6, backgroundColor: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
                    <Text style={{ color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>SOURCE: CHAPA PROVIDER RESPONSE</Text>
                  </View>
                )}
              </View>
              {isPending && (
                <View style={{ marginTop: 10, backgroundColor: 'rgba(0,229,255,0.06)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '700' }}>💡 If this has been pending for over 24 hours and is a withdrawal, consider issuing a manual refund to the user's available balance.</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setTxDetailModal(null)} style={{ marginTop: 16, backgroundColor: '#00e5ff', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: '#0a0f1c', fontWeight: '900', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
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
                body: JSON.stringify({ banned: !isBanned })
              });
              await fetchData();
            } else if (confirmAction === 'delete') {
              await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
              });
              router.back();
            }
          } catch (e) {
            console.error(e);
          } finally {
            setActionLoading(false);
            setConfirmAction(null);
          }
        }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1c', padding: 24, paddingTop: 20 },
  center: { flex: 1, backgroundColor: '#0a0f1c', alignItems: 'center', justifyContent: 'center' },

  // Header
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Cards
  card: { backgroundColor: 'rgba(15,20,35,0.8)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  bottomGrid: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },

  // Avatar
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,163,255,0.15)', borderWidth: 2, borderColor: 'rgba(0,163,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#00A3FF', fontSize: 28, fontWeight: '900' },
  statusDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: '#0f1423' },
  activeBadge: { position: 'absolute', top: -4, right: -20, backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeBadgeText: { color: '#34d399', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4 },
  profilePhone: { color: '#475569', fontSize: 11, fontWeight: '600' },

  // Stat Cards
  statCard: { flex: 1, minWidth: 120, gap: 8 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900' },

  // Balance & Big Values
  cardLabel: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  balanceValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bigValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  cardIconBg: {},

  // Mini cards
  miniLabel: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  miniValue: { color: '#fff', fontSize: 14, fontWeight: '900' },

  // Table
  tableCard: { backgroundColor: 'rgba(15,20,35,0.8)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 8 },
  tableTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  filterBtn: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thead: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  th: { color: '#334155', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  trow: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  td: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', paddingVertical: 12 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
});
