// app/(authed)/admin/logs.tsx — God Mode: Match Archive (Game Logs)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, TextInput } from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const glass: any = (extra?: object) => ({
  backgroundColor: 'rgba(11,11,30,0.6)',
  ...extra,
});

interface GameLog {
  id: string; room_id?: string;
  player_x_id?: string; player_o_id?: string;
  player_x_name?: string; player_o_name?: string;
  winner_id?: string; bet_amount?: number; status?: string;
  board?: string[]; moves?: any[];
  duration?: number; created_at?: string;
}

const initials2 = (n?: string) => (n || '??').slice(0, 2).toUpperCase();
const etb = (v?: number) => (v ?? 0).toFixed(2);
const timeSince = (iso?: string) => {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)} mins ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} hours ago`;
  return `${Math.floor(d / 86400000)} days ago`;
};

export default function AdminLogs() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token, t } = useAuth();
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GameLog | null>(null);
  const [stats, setStats] = useState({ activeGames: 0, totalStake: 0, avgTime: 0 });
  
  // Filtering & Pagination State
  const [resultFilter, setResultFilter] = useState<'All'|'X'|'O'|'Draw'>('All');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [amountRange, setAmountRange] = useState<'all' | '0-100' | '100-10000' | '10000-100000'>('all');
  const [total, setTotal] = useState(0);
  const itemsPerPage = 25;

  useEffect(() => { setCurrentPage(1); }, [resultFilter, query, amountRange]);

  const filteredLogs = useMemo(() => {
    let list = logs.filter(g => {
      if (resultFilter === 'All') return true;
      if (resultFilter === 'Draw') return g.status === 'draw' || (g.winner_id == null && g.status !== 'pending' && g.status !== 'active');
      if (resultFilter === 'X') return g.winner_id === g.player_x_id && g.winner_id != null;
      if (resultFilter === 'O') return g.winner_id === g.player_o_id && g.winner_id != null;
      return true;
    });

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(g => {
        const matchId = g.id?.toLowerCase() || '';
        const px = g.player_x_name?.toLowerCase() || '';
        const po = g.player_o_name?.toLowerCase() || '';
        const stake = etb(g.bet_amount);
        const time = timeSince(g.created_at).toLowerCase();

        return (
          matchId.includes(q) || 
          px.includes(q) || 
          po.includes(q) ||
          stake.includes(q) ||
          time.includes(q)
        );
      });
    }
    return list;
  }, [logs, resultFilter, query]);

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const paginatedLogs = filteredLogs; // Apply client-side search to the fetched page data

  // Replay Engine State
  const [replayStep, setReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/game-logs?limit=${itemsPerPage}&offset=${offset}${amountRange !== 'all' ? `&amountRange=${amountRange}` : ''}`, { 
          headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } 
        }),
        fetch(`${API_URL}/admin/stats`, { 
          headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } 
        }),
      ]);
      if (logsRes.ok) {
        const d = await logsRes.json();
        const list = Array.isArray(d) ? d : (d.games ?? []);
        const normalized = list.map((g: any) => ({
          ...g,
          player_x_name: g.player_x_name ?? g.player_x_number ?? 'Player X',
          player_o_name: g.player_o_name ?? g.player_o_number ?? 'Player O',
        }));
        setLogs(normalized);
        setTotal(d.total ?? list.length);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats({
          activeGames: s.activeGames ?? 0,
          totalStake: s.pendingWithdrawalAmount ?? 0,
          avgTime: 142,
        });
      }
    } catch (e) { console.log('[admin/logs]', e); }
    finally { setLoading(false); }
  }, [token, currentPage, amountRange]);

  useEffect(() => { fetchLogs(); }, [fetchLogs, currentPage, amountRange]);

  useEffect(() => {
    let intId: any;
    const movesLen = selected?.moves?.length || 0;
    if (isPlaying && movesLen > 0) {
      if (replayStep >= movesLen) {
        setIsPlaying(false);
      } else {
        intId = setInterval(() => {
          setReplayStep(s => {
            if (s + 1 >= movesLen) {
              setIsPlaying(false);
              return s + 1;
            }
            return s + 1;
          });
        }, 800);
      }
    }
    return () => clearInterval(intId);
  }, [isPlaying, replayStep, selected]);

  const handleCloseModal = () => {
    setSelected(null);
    setIsPlaying(false);
    setReplayStep(0);
  };

  const getWinner = (g: GameLog) => {
    if (!g.winner_id) return t('DRAW');
    if (g.winner_id === g.player_x_id) return `X ${t('WON')}`;
    return `O ${t('WON')}`;
  };
  const getWinnerColor = (g: GameLog) => {
    if (!g.winner_id) return C.onSurfaceVariant;
    return g.winner_id === g.player_x_id ? C.secondary : '#ffabf3';
  };
  
  const getReplayBoard = (): string[] => {
    const board = Array(9).fill('');
    if (!selected) return board;
    const mvs = selected.moves || [];
    
    // Determine current round (0-indexed)
    const currentRound = Math.floor(Math.max(0, replayStep - 1) / 9);
    const startIdx = currentRound * 9;

    for (let i = startIdx; i < replayStep; i++) {
        if (mvs[i]) board[mvs[i].index] = mvs[i].symbol;
    }
    
    if (mvs.length === 0 && selected.board?.length) {
      return (selected.board as any).slice(0, 9);
    }
    return board;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={[styles.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View>
            <Text style={[styles.pageTitle, isMobile && { fontSize: 24 }]}>XO Game Logs</Text>
            {!isMobile && <Text style={styles.pageSub}>Detailed log and move replay viewer for XO game matches.</Text>}
          </View>
          <View style={[styles.headerBtns, isMobile && { width: '100%' as any }]}>
            <TouchableOpacity 
              style={[styles.filterBtn, resultFilter !== 'All' && { backgroundColor: C.primary }]} 
              onPress={() => {
                const map: any = { 'All':'X', 'X':'O', 'O':'Draw', 'Draw':'All' };
                setResultFilter(map[resultFilter] || 'All');
              }}
            >
              <Ionicons name="filter" size={18} color={resultFilter !== 'All' ? '#fff' : C.secondary} />
              <Text style={[styles.filterTxt, resultFilter !== 'All' && { color: '#fff' }]}>{t('filter')}: {t(resultFilter as any)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => {
              if (Platform.OS !== 'web' || !paginatedLogs.length) return;
              const header = 'Match ID,Player X,Player O,Stake (ETB),Result,Date\n';
              const rows = paginatedLogs.map((g: GameLog) => {
                const winner = !g.winner_id ? 'Draw' : g.winner_id === g.player_x_id ? 'X Won' : 'O Won';
                return `${g.id},${g.player_x_name},${g.player_o_name},${etb(g.bet_amount)},${winner},${g.created_at || ''}`;
              }).join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `xoet_game_logs_${new Date().toISOString().slice(0,10)}.csv`;
              a.click(); URL.revokeObjectURL(url);
            }}>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.exportTxt}>{t('export_csv')}</Text>
            </TouchableOpacity>

            <View style={[styles.searchBox, { width: isMobile ? '100%': 160, height: 40, paddingVertical: 0 }]}>
               <Ionicons name="cash-outline" size={14} color="rgba(168,167,212,0.6)" />
               {Platform.OS === 'web' ? (
                  <select
                    value={amountRange}
                    onChange={(e: any) => setAmountRange(e.target.value as any)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any, flex: 1 } as any}
                  >
                    <option value="all" style={{ background: '#111128' }}>All Stakes</option>
                    <option value="0-100" style={{ background: '#111128' }}>0-100 ETB</option>
                    <option value="100-10000" style={{ background: '#111128' }}>100-10k ETB</option>
                    <option value="10000-100000" style={{ background: '#111128' }}>10k-100k ETB</option>
                  </select>
               ) : (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                     const order = ['all', '0-100', '100-10000', '10000-100000'] as const;
                     setAmountRange(order[(order.indexOf(amountRange) + 1) % order.length]);
                  }}>
                     <Text style={{ color: '#e5e3ff', fontSize: 11, fontWeight: '700' }}>{amountRange.toUpperCase()}</Text>
                  </TouchableOpacity>
               )}
            </View>
          </View>
        </View>

        <View style={[styles.statsRow, isMobile && { flexWrap: 'wrap' }]}>
          <View style={[styles.statCard, isMobile && { minWidth: '47%' as any }, glass({ backgroundColor: '#0f0f11', borderRadius: 20, padding: 24 })]}>
            <Text style={styles.statLabel}>{t('active_matches')}</Text>
            <Text style={[styles.statVal, { color: C.secondary }]}>{stats.activeGames.toLocaleString()}</Text>
            <Text style={styles.statSub}>+12% from last hour</Text>
          </View>
          <View style={[styles.statCard, isMobile && { minWidth: '47%' as any }, glass({ backgroundColor: '#0f0f11', borderRadius: 20, padding: 24 })]}>
            <Text style={styles.statLabel}>{t('total_stake_24h')}</Text>
            <Text style={[styles.statVal, { color: C.primary }]}>ETB {Number((stats.totalStake || 0).toFixed(0)).toLocaleString()}</Text>
            <Text style={styles.statSub}>Global pool volume</Text>
          </View>
          <View style={[styles.statCard, isMobile && { minWidth: '47%' as any }, glass({ backgroundColor: '#0f0f11', borderRadius: 20, padding: 24 })]}>
            <Text style={styles.statLabel}>{t('avg_game_time')}</Text>
            <Text style={[styles.statVal, { color: '#ffabf3' }]}>{stats.avgTime}s</Text>
            <Text style={styles.statSub}>Efficiency metrics</Text>
          </View>
          <View style={[styles.statCard, isMobile && { minWidth: '47%' as any }, glass({ backgroundColor: '#0f0f11', borderRadius: 20, padding: 24, borderLeftWidth: 4, borderLeftColor: 'rgba(0,218,243,0.3)' })]}>
            <Text style={styles.statLabel}>{t('system_health')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <View style={[styles.healthDot, { backgroundColor: C.secondary }]} />
              <Text style={[styles.statVal, { fontSize: 18 }]}>{t('NOMINAL')}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tableWrap, glass({ borderRadius: 24, overflow: 'hidden' })]}>
          <View style={[styles.tableTopBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: 16 }]}>
            <View>
              <Text style={styles.tableTitle}>{t('match_history')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={[styles.liveIndicator]} />
                <Text style={styles.liveTxt}>{t('real_time_updates')}</Text>
              </View>
            </View>

            <View style={[styles.searchBox, isMobile && { width: '100%' as any }]}>
              <Ionicons name="search" size={16} color="rgba(168,167,212,0.5)" />
              <TextInput 
                style={styles.searchInput} 
                placeholder={t("search_match...")}
                placeholderTextColor="rgba(168,167,212,0.4)" 
                value={query} 
                onChangeText={setQuery}
                {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
              />
            </View>
          </View>

          {isMobile ? (
            <View style={{ padding: 12 }}>
              <AnimatedList
                items={loading ? [] : paginatedLogs}
                renderItem={(g: GameLog) => {
                  const winner = getWinner(g);
                  const winColor = getWinnerColor(g);
                  const xInit = initials2(g.player_x_name);
                  const oInit = initials2(g.player_o_name);
                  return (
                    <TouchableOpacity 
                      key={g.id} 
                      onPress={() => { setSelected(g); setReplayStep(g.moves?.length || 0); }}
                      style={{ backgroundColor: C.surface, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: C.outlineVariant, gap: 10 }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.matchId, { fontSize: 11 }]}>#{g.id.slice(0, 10).toUpperCase()}</Text>
                        <Text style={[styles.resultPill, { color: winColor, borderColor: winColor + '33', backgroundColor: winColor + '1a' }]}>{winner}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.avatarStack}>
                            <View style={[styles.stackAvatar, { backgroundColor: 'rgba(0,42,48,0.5)', borderColor: 'rgba(0,218,243,0.3)', zIndex: 2 }]}><Text style={[styles.stackAvatarTxt, { color: C.secondary }]}>{xInit}</Text></View>
                            <View style={[styles.stackAvatar, { backgroundColor: 'rgba(34,34,70,0.5)', borderColor: 'rgba(255,171,243,0.3)', marginLeft: -12, zIndex: 1 }]}><Text style={[styles.stackAvatarTxt, { color: '#ffabf3' }]}>{oInit}</Text></View>
                          </View>
                          <View>
                            <Text style={styles.playerName} numberOfLines={1}>{g.player_x_name} (X)</Text>
                            <Text style={styles.playerName} numberOfLines={1}>{g.player_o_name} (O)</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 9, fontWeight: '800' }}>STAKE</Text>
                          <Text style={[styles.stakeVal, { fontSize: 14 }]}>ETB {etb(g.bet_amount)}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.timeAgo}>{timeSince(g.created_at)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700' }}>Replay Moves</Text>
                          <Ionicons name="eye" size={14} color={C.primary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                showGradients={false}
                enableArrowNavigation={true}
              />

              {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />}
              {!loading && paginatedLogs.length === 0 && <Text style={styles.emptyText}>{t('no_logs_found')}</Text>}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 800, flex: 1 }}>
                <View style={[styles.colRow, { backgroundColor: 'rgba(24, 24, 27, 0.5)' }]}>
                  <Text style={[styles.colHead, { flex: 1.5 }]}>{t('match_id')}</Text>
                  <Text style={[styles.colHead, { flex: 1.5 }]}>{t('participants')}</Text>
                  <Text style={[styles.colHead, { flex: 1 }]}>{t('stake')}</Text>
                  <Text style={[styles.colHead, { flex: 1 }]}>{t('result')}</Text>
                  <Text style={[styles.colHead, { flex: 1.2 }]}>{t('timestamp')}</Text>
                  <Text style={[styles.colHead, { flex: 0.8, textAlign: 'right' }]}>{t('action')}</Text>
                </View>

                <AnimatedList
                  items={loading ? [] : paginatedLogs}
                  renderItem={(g: GameLog) => {
                    const winner = getWinner(g);
                    const winColor = getWinnerColor(g);
                    const xInit = initials2(g.player_x_name);
                    const oInit = initials2(g.player_o_name);
                    return (
                      <View key={g.id} style={[styles.tableRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
                        <Text style={[styles.matchId, { flex: 1.5 }]}>#{g.id.slice(0, 12).toUpperCase()}</Text>
                        
                        <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.avatarStack}>
                            <View style={[styles.stackAvatar, { backgroundColor: 'rgba(0,42,48,0.5)', borderColor: 'rgba(0,218,243,0.3)', zIndex: 2 }]}><Text style={[styles.stackAvatarTxt, { color: C.secondary }]}>{xInit}</Text></View>
                            <View style={[styles.stackAvatar, { backgroundColor: 'rgba(34,34,70,0.5)', borderColor: 'rgba(255,171,243,0.3)', marginLeft: -12, zIndex: 1 }]}><Text style={[styles.stackAvatarTxt, { color: '#ffabf3' }]}>{oInit}</Text></View>
                          </View>
                          <View>
                            <Text style={styles.playerName} numberOfLines={1}>{g.player_x_name}</Text>
                            <Text style={styles.playerName} numberOfLines={1}>{g.player_o_name}</Text>
                          </View>
                        </View>

                        <Text style={[styles.stakeVal, { flex: 1 }]}>ETB {etb(g.bet_amount)}</Text>
                        
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resultPill, { color: winColor, borderColor: winColor + '33', backgroundColor: winColor + '1a' }]}>{winner}</Text>
                        </View>

                        <Text style={[styles.timeAgo, { flex: 1.2 }]}>{timeSince(g.created_at)}</Text>

                        <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                          <View style={styles.viewBtn}><Ionicons name="eye" size={18} color={C.primary} /></View>
                        </View>
                      </View>
                    );
                  }}
                  onItemSelect={(g: GameLog) => { setSelected(g); setReplayStep(g.moves?.length || 0); }}
                  showGradients={false}
                  enableArrowNavigation={true}
                />

                {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />}
                {!loading && paginatedLogs.length === 0 && <Text style={styles.emptyText}>{t('no_logs_found')}</Text>}
              </View>
            </ScrollView>
          )}

          {/* Pagination Controls */}
          <View style={styles.pagination}>
            <Text style={styles.paginationText}>{t('showing')} {logs.length} {t('of')} {total} {t('logs')}</Text>
            <View style={styles.pageNav}>
              <TouchableOpacity style={[styles.pageNavBtn, currentPage === 1 && { opacity: 0.4 }]} disabled={currentPage === 1} onPress={() => setCurrentPage(p => p - 1)}>
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageIndicatorText}>{currentPage} / {totalPages}</Text>
              <TouchableOpacity style={[styles.pageNavBtn, currentPage === totalPages && { opacity: 0.4 }]} disabled={currentPage === totalPages} onPress={() => setCurrentPage(p => p + 1)}>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Match Visualizer Modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, glass()]}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}><Ionicons name="close" size={18} color="#e5e3ff" /></TouchableOpacity>
            <View style={styles.modalLeft}>
              <View style={styles.modalLeftGlow1} />
              <View style={styles.modalLeftGlow2} />
              <View style={{ zIndex: 10, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.modalVizTitle}>{t('replay_engine')}</Text>
                <Text style={styles.modalVizId}>{t('id')}: {selected?.id?.slice(0,14).toUpperCase()}</Text>
                
                <View style={styles.engineControls}>
                  <TouchableOpacity style={styles.engineBtn} onPress={() => { setIsPlaying(false); setReplayStep(Math.max(0, replayStep - 1)) }}><Ionicons name="play-back" size={20} color="#fff" /></TouchableOpacity>
                  <TouchableOpacity style={[styles.engineBtn, { backgroundColor: C.primary, width: 44, height: 44, borderRadius: 22 }]} onPress={() => { if (replayStep >= (selected?.moves?.length || 0)) setReplayStep(0); setIsPlaying(!isPlaying); }}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.engineBtn} onPress={() => { setIsPlaying(false); setReplayStep(Math.min((selected?.moves?.length || 0), replayStep + 1)) }}><Ionicons name="play-forward" size={20} color="#fff" /></TouchableOpacity>
                </View>

                <View style={styles.board}>
                  {getReplayBoard().map((cell, i) => (
                    <View key={i} style={styles.boardCell}>
                      {cell ? <Text style={[styles.boardMark, { color: cell === 'O' ? C.secondary : '#ffabf3' }]}>{cell}</Text> : null}
                    </View>
                  ))}
                </View>

                <View style={styles.modalStats}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.modalStatLabel}>{t('playback')}</Text>
                    <Text style={styles.modalStatVal}>
                      {t('round')} {Math.floor(Math.max(0, replayStep - 1) / 9) + 1} : {t('step')} {(replayStep % 9) || (replayStep > 0 ? 9 : 0)}/9
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.modalStatLabel}>{t('moves')}</Text>
                    <Text style={[styles.modalStatVal, { color: C.primary }]}>{replayStep} / {selected?.moves?.length || 0}</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.modalStatLabel}>{t('stake')}</Text>
                    <Text style={[styles.modalStatVal, { color: C.secondary }]}>ETB {etb(selected?.bet_amount)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, paddingHorizontal: 24 },
  pageTitle: { color: '#e5e3ff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  pageSub: { color: '#a8a7d4', fontSize: 13, marginTop: 8, maxWidth: 400 },
  headerBtns: { flexDirection: 'row', gap: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1c1c3c', borderRadius: 12 },
  filterTxt: { color: '#e5e3ff', fontSize: 13, fontWeight: '700' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 12 },
  exportTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 32, paddingHorizontal: 24 },
  statCard: { flex: 1 },
  statLabel: { color: '#a8a7d4', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  statVal: { color: '#e5e3ff', fontSize: 24, fontWeight: '900', marginTop: 12 },
  statSub: { color: 'rgba(0,218,243,0.5)', fontSize: 10, marginTop: 4 },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  tableWrap: { flex: 1, marginHorizontal: 24, backgroundColor: 'transparent' },
  tableTopBar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: 'rgba(24, 24, 27, 0.65)', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(39, 39, 42, 0.6)'
  },
  tableTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.secondary },
  liveTxt: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLowest, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, width: 260 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  colRow: { 
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'transparent'
  },
  colHead: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' },
  matchId: { color: C.primary, fontSize: 11, fontWeight: '700' },
  playerName: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  avatarStack: { flexDirection: 'row' },
  stackAvatar: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stackAvatarTxt: { fontSize: 12, fontWeight: '900' },
  stakeVal: { color: '#00daf3', fontSize: 15, fontWeight: '900' },
  resultPill: { fontSize: 10, fontWeight: '900', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  timeAgo: { color: '#fff', fontSize: 12, fontWeight: '700' },
  viewBtn: { padding: 8, backgroundColor: 'rgba(166,140,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)' },
  emptyText: { color: '#a8a7d4', textAlign: 'center', marginVertical: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', backgroundColor: 'rgba(24, 24, 27, 0.65)' },
  paginationText: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700' },
  pageNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageNavBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(166,140,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)' },
  pageIndicatorText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(12,12,31,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { width: '100%', maxWidth: 600, height: 600, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 50, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  modalLeft: { flex: 1, padding: 32 },
  modalLeftGlow1: { position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(0,218,243,0.05)' },
  modalLeftGlow2: { position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(166,140,255,0.05)' },
  modalVizTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  modalVizId: { color: 'rgba(168,167,212,0.6)', fontSize: 11, marginBottom: 24, letterSpacing: 2 },
  engineControls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 },
  engineBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', width: 282, height: 282, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 20, gap: 10, alignSelf: 'center' },
  boardCell: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  boardMark: { fontSize: 36, fontWeight: '900' },
  modalStats: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 32 },
  modalStatLabel: { color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  modalStatVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
});
