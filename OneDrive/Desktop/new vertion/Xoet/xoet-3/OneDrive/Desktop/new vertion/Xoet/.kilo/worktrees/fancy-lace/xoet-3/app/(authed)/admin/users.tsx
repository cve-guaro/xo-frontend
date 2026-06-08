// app/(authed)/admin/users.tsx — God Mode: Player Matrix + User 360 Panel
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, Modal, useWindowDimensions, Image } from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import ReferralDetailsModal from '../../../components/ReferralDetailsModal';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const glass: any = {
  backgroundColor: 'rgba(23,23,50,0.4)',
};

interface User {
  id: string; number: string; username: string;
  available_balance: number; bonus_balance: number;
  banned: boolean; created_at: string;
  room_1_wins?: Record<string, number>;
  role?: 'user' | 'admin' | 'superadmin';
  new_user?: boolean;
}

export default function AdminUsers() {
  const { token, t, showAlert, isSuperAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [actionLoad, setActionLoad] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 100;
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({ username: '', number: '', role: 'user', available_balance: '0', bonus_balance: '0' });
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createData, setCreateData] = useState({ username: '', number: '', role: 'user', balance: '0' });
  const [referralUserId, setReferralUserId] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'superadmin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [amountRange, setAmountRange] = useState<'all' | '0-100' | '100-10000' | '10000-100000'>('all');

  // Centered Confirmation Modal State
  const [genericModal, setGenericModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  });

  const [user360, setUser360] = useState<{ loading: boolean, txs: any[], recent_games: any[], games: { wins:number, losses:number, draws:number, total:number } }>({ loading: false, txs: [], recent_games: [], games: { wins:0, losses:0, draws:0, total:0 } });

  const fetchUsers = useCallback(async (searchOverride?: string) => {
    try {
      setLoading(true);
      const q = searchOverride !== undefined ? searchOverride : query;
      const offset = page * limit;
      let url = `${API_URL}/admin/users?limit=${limit}&offset=${offset}`;
      if (q.trim()) url += `&search=${encodeURIComponent(q.trim())}`;
      if (roleFilter !== 'all') url += `&role=${roleFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (amountRange !== 'all') url += `&amountRange=${amountRange}`;

      const res = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } 
      });
      if (res.ok) {
        const d = await res.json();
        const list = d.users ?? [];
        setUsers(list);
        setTotal(d.total ?? 0);
      }
    } catch (e) { console.log('[admin/users]', e); }
    finally { setLoading(false); }
  }, [token, page, roleFilter, statusFilter, amountRange]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!query.trim()) { fetchUsers(); return; }
    const timer = setTimeout(() => {
      setPage(0);
      fetchUsers(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, fetchUsers]);

  useEffect(() => {
    setFiltered(users);
  }, [users]);

  // When role, status, or amount filter changes, reset to page 0
  useEffect(() => {
    setPage(0);
  }, [roleFilter, statusFilter, amountRange]);

  const handleNext = () => {
    if ((page + 1) * limit < total) setPage(p => p + 1);
  };
  const handleBack = () => {
    if (page > 0) setPage(p => p - 1);
  };

  const loadUser360 = async (id: string) => {
    setUser360(p => ({ ...p, loading: true }));
    try {
      // Fetch 360 data (games + transactions) AND full wallet detail in parallel
      const [res360, resDetail] = await Promise.all([
        fetch(`${API_URL}/admin/users/${id}/360`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } }),
        fetch(`${API_URL}/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } }),
      ]);
      if (res360.ok) {
        const d = await res360.json();
        setUser360({ loading: false, txs: d.txs || [], recent_games: d.recent_games || [], games: d.games || {wins:0,losses:0,draws:0,total:0} });
      } else {
        setUser360(p => ({ ...p, loading: false }));
      }
      // Merge fresh wallet data (with bonus_balance) into selected
      if (resDetail.ok) {
        const fullUser = await resDetail.json();
        setSelected(prev => prev ? {
          ...prev,
          available_balance: Number(fullUser.available_balance ?? prev.available_balance),
          bonus_balance: Number(fullUser.bonus_balance ?? 0),
          withdrawable_balance: Number(fullUser.withdrawable_balance ?? 0),
        } as any : prev);
      }
    } catch {
      setUser360(p => ({ ...p, loading: false }));
    }
  };

  const handleSelectUser = (u: User) => {
    setSelected(u);
    loadUser360(u.id);
  };

  const handleBan = async (userId: string, ban: boolean) => {
    const performBan = async () => {
      setActionLoad(true);
      try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
          body: JSON.stringify({ banned: ban }),
        });
        if (res.ok) {
          await fetchUsers();
          if (selected?.id === userId) setSelected(prev => prev ? { ...prev, banned: ban } : prev);
        } else {
          const err = await res.json().catch(() => ({}));
          showAlert(t('Error'), err.error || `Failed to ${ban ? 'ban' : 'unban'} user.`);
        }
      } catch {
        showAlert(t('Error'), t('Network Connection Error'));
      }
      setActionLoad(false);
      setGenericModal(p => ({ ...p, visible: false }));
    };

    setGenericModal({
      visible: true,
      title: ban ? t("Confirm Suspension") : t("Confirm Restoration"),
      message: ban 
        ? t("Are you sure you want to BAN this user? They will lose all access immediately.") 
        : t("Restore access for this user?"),
      confirmText: ban ? t("BAN USER") : t("UNBAN USER"),
      onConfirm: performBan,
      isDestructive: ban,
    });
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const performChange = async () => {
      setActionLoad(true);
      try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
          body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
          await fetchUsers();
          if (selected?.id === userId) setSelected(prev => prev ? { ...prev, role: newRole as any } : prev);
          showAlert(t('Success'), `${t('Role updated to')} ${newRole}`);
        } else {
          const err = await res.json().catch(() => ({}));
          showAlert(t('Error'), err.error || t('Failed to update role.'));
        }
      } catch { showAlert(t('Error'), t('Network Connection Error')); }
      setActionLoad(false);
      setGenericModal(p => ({ ...p, visible: false }));
    };

    setGenericModal({
      visible: true,
      title: t("Confirm Role Change"),
      message: `${t("Are you sure you want to change this user's role to")} ${newRole.toUpperCase()}?`,
      confirmText: t("CONFIRM"),
      onConfirm: performChange,
    });
  };

  const openEditModal = () => {
    if (!selected) return;
    setEditData({
      username: selected.username || '',
      number: selected.number || '',
      role: selected.role || 'user',
      available_balance: selected.available_balance ? String(selected.available_balance) : '0',
      bonus_balance: selected.bonus_balance ? String(selected.bonus_balance) : '0',
    });
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!selected) return;
    setActionLoad(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        await fetchUsers();
        setSelected(prev => prev ? { 
          ...prev, 
          username: editData.username, number: editData.number, role: editData.role as any, 
          available_balance: Number(editData.available_balance), bonus_balance: Number(editData.bonus_balance),
        } : prev);
        setEditModalVisible(false);
        showAlert('Success', 'User updated successfully.');
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert('Error', err.error || 'Failed to update user.');
      }
    } catch {
      showAlert('Error', 'Network error.');
    }
    setActionLoad(false);
  };

  const handleCreateSave = async () => {
    if (!createData.username || !createData.number) {
      showAlert('Validation', 'Username and Number are required.');
      return;
    }
    setActionLoad(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify(createData),
      });
      if (res.ok) {
        await fetchUsers();
        setCreateModalVisible(false);
        setCreateData({ username: '', number: '', role: 'user', balance: '0' });
        showAlert('Success', 'Entity manifested within the abyss.');
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert('Error', err.error || 'Failed to create user.');
      }
    } catch {
      showAlert('Error', 'Network error.');
    }
    setActionLoad(false);
  };

  const handleDeleteUser = async () => {
    if (!selected) return;
    const performDelete = async () => {
      setActionLoad(true);
      try {
        const res = await fetch(`${API_URL}/admin/users/${selected.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
        });
        if (res.ok) {
          showAlert(t('Purged'), t('User identity has been permanently erased.'));
          setSelected(null);
          await fetchUsers();
        } else {
          const err = await res.json().catch(() => ({}));
          showAlert(t('Error'), err.error || t('Failed to delete user.'));
        }
      } catch {
        showAlert(t('Error'), t('Network Connection Error'));
      }
      setActionLoad(false);
      setGenericModal(p => ({ ...p, visible: false }));
    };

    setGenericModal({
      visible: true,
      title: t("Permanent Deletion"),
      message: t("PERMANENT ACTION: Are you sure you want to erase this user from existence?"),
      confirmText: t("DELETE"),
      onConfirm: performDelete,
      isDestructive: true,
    });
  };

  const initials = (u: User) => (u.username || u.number || '??').slice(0, 2).toUpperCase();
  const balanceEtb = (v: number) => Number(v || 0).toFixed(2);
  const timeSince = (iso: string) => {
    if (!iso) return '—';
    const d = Date.now() - new Date(iso).getTime();
    if (d < 60000) return 'Just now';
    if (d < 3600000) return `${Math.floor(d/60000)} mins ago`;
    if (d < 86400000) return `${Math.floor(d/3600000)} hours ago`;
    return `${Math.floor(d/86400000)} days ago`;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.tableWrap, isMobile && { minHeight: 400 }]}>
        <View style={[styles.tableCard, glass, { borderWidth: 1, borderColor: 'rgba(68,68,107,0.1)' }]}>
          
          <View style={{ zIndex: 30, backgroundColor: 'rgba(11,11,30,0.95)' }}>
            <View style={[styles.tableHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: 16 }]}>
              <View>
                <Text style={[styles.tableTitle, isMobile && { fontSize: 16 }]}>Player Matrix</Text>
                {!isMobile && <Text style={styles.tableSub}>Live surveillance of active gaming entities</Text>}
              </View>
              <TouchableOpacity 
                style={{ backgroundColor: C.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => setCreateModalVisible(true)}
              >
                <Ionicons name="add-circle" size={18} color="#0c0c1f" />
                <Text style={{ color: '#0c0c1f', fontWeight: '800', fontSize: 12 }}>New Entity</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.tableHeadUnder, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: 16 }]}>
              <View style={[styles.tableActions, isMobile && { flexWrap: 'wrap' }]}>
                <View style={styles.selectWrap}>
                  <Ionicons name="people-outline" size={13} color="rgba(168,167,212,0.6)" />
                  {Platform.OS === 'web' ? (
                    <select
                      value={roleFilter}
                      onChange={(e: any) => setRoleFilter(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' as any, paddingRight: 4 } as any}
                    >
                      <option value="all" style={{ background: '#111128' }}>All Roles</option>
                      <option value="user" style={{ background: '#111128' }}>User</option>
                      <option value="admin" style={{ background: '#111128' }}>Admin</option>
                      <option value="superadmin" style={{ background: '#111128' }}>Superadmin</option>
                      <option value="maintenance" style={{ background: '#111128' }}>Maintenance</option>
                    </select>
                  ) : (
                    <TouchableOpacity onPress={() => {
                      const order = ['all','user','admin','superadmin','maintenance'] as const;
                      setRoleFilter(order[(order.indexOf(roleFilter) + 1) % order.length]);
                    }}>
                      <Text style={{ color: '#e5e3ff', fontSize: 12, fontWeight: '700' }}>{roleFilter.toUpperCase()}</Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={11} color="rgba(168,167,212,0.4)" />
                </View>

                <View style={[styles.selectWrap, isMobile && { flex: 1 }]}>
                  <Ionicons name="shield-checkmark-outline" size={13} color="rgba(168,167,212,0.6)" />
                  {Platform.OS === 'web' ? (
                    <select
                      value={statusFilter}
                      onChange={(e: any) => setStatusFilter(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' as any, paddingRight: 4 } as any}
                    >
                      <option value="all" style={{ background: '#111128' }}>All Status</option>
                      <option value="active" style={{ background: '#111128' }}>Active</option>
                      <option value="banned" style={{ background: '#111128' }}>Banned</option>
                    </select>
                  ) : (
                    <TouchableOpacity onPress={() => {
                      const order = ['all','active','banned'] as const;
                      setStatusFilter(order[(order.indexOf(statusFilter) + 1) % order.length]);
                    }}>
                      <Text style={{ color: '#e5e3ff', fontSize: 12, fontWeight: '700' }}>{statusFilter.toUpperCase()}</Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={11} color="rgba(168,167,212,0.4)" />
                </View>

                <View style={[styles.selectWrap, isMobile && { flex: 1 }]}>
                  <Ionicons name="cash-outline" size={13} color="rgba(168,167,212,0.6)" />
                  {Platform.OS === 'web' ? (
                    <select
                      value={amountRange}
                      onChange={(e: any) => setAmountRange(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' as any, paddingRight: 4 } as any}
                    >
                      <option value="all" style={{ background: '#111128' }}>All Amounts</option>
                      <option value="0-100" style={{ background: '#111128' }}>0 - 100 ETB</option>
                      <option value="100-10000" style={{ background: '#111128' }}>100 - 10,000 ETB</option>
                      <option value="10000-100000" style={{ background: '#111128' }}>10,000 - 100,000 ETB</option>
                    </select>
                  ) : (
                    <TouchableOpacity onPress={() => {
                      const order = ['all','0-100','100-10000','10000-100000'] as const;
                      setAmountRange(order[(order.indexOf(amountRange) + 1) % order.length]);
                    }}>
                      <Text style={{ color: '#e5e3ff', fontSize: 12, fontWeight: '700' }}>{amountRange === 'all' ? 'ALL AMTS' : amountRange}</Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={11} color="rgba(168,167,212,0.4)" />
                </View>

                <View style={[styles.searchBox, isMobile && { width: '100%' as any }]}>
                  <Ionicons name="search" size={16} color="rgba(168,167,212,0.5)" />
                  <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor="rgba(168,167,212,0.4)" value={query} onChangeText={setQuery} {...(Platform.OS === 'web' ? { outline: 'none' } as any : {})} />
                </View>
              </View>
            </View>

            <View style={[styles.thead, isMobile && { paddingHorizontal: 16 }]}>
              <Text style={[styles.th, { flex: 0.9 }]}>Entity ID</Text>
              <Text style={[styles.th, { flex: 2 }]}>User Identity</Text>
              <Text style={[styles.th, { flex: 1 }]}>Balance (ETB)</Text>
              <Text style={[styles.th, { flex: 0.9 }]}>Status</Text>
              <Text style={[styles.th, { flex: 1 }]}>Last Active</Text>
              <Text style={[styles.th, { flex: 0.4, textAlign: 'right' }]}>Act</Text>
            </View>
          </View>

          <AnimatedList
            items={loading ? [] : filtered}
            renderItem={(u: User, i: number, isSelected: boolean) => (
              <View style={[styles.row, { borderBottomWidth: 0, marginBottom: 0 }, isSelected && styles.rowSelected]}>
                <Text style={styles.tdId}>#{u.id.slice(0,8).toUpperCase()}</Text>
                <View style={styles.tdUser}>
                  <View style={[styles.avatar, { backgroundColor: u.banned ? 'rgba(138,22,50,0.2)' : 'rgba(34,34,70,0.8)', borderColor: u.banned ? 'rgba(253,111,133,0.3)' : 'rgba(166,140,255,0.3)' }]}>
                    <Text style={[styles.avatarText, { color: u.banned ? C.error : C.primary }]}>{initials(u)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.tdName} numberOfLines={1}>{u.username || 'Unknown'}</Text>
                    <Text style={styles.tdPhone} numberOfLines={1}>{u.number}</Text>
                  </View>
                </View>
                <Text style={styles.tdBal} numberOfLines={1}>ETB {balanceEtb(u.available_balance)}</Text>
                <View style={styles.tdStatus}>
                  <Text style={[styles.statusPill, { color: u.banned ? C.error : C.secondary, backgroundColor: u.banned ? 'rgba(138,22,50,0.15)' : 'rgba(0,42,48,0.5)', borderColor: u.banned ? 'rgba(253,111,133,0.2)' : 'rgba(0,218,243,0.2)' }]}>
                    {u.banned ? 'Suspended' : 'Active'}
                  </Text>
                </View>
                <Text style={styles.tdTime} numberOfLines={1}>{u.created_at ? timeSince(u.created_at) : '—'}</Text>
                <View style={styles.tdActions}>
                  <View style={styles.viewBtn}>
                    <Ionicons name="eye-outline" size={16} color={C.primary} />
                  </View>
                </View>
              </View>
            )}
            onItemSelect={(u: User) => handleSelectUser(u)}
            initialSelectedIndex={filtered.findIndex(u => u.id === selected?.id)}
            className="user-matrix-list"
          />

            {loading && <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />}
            {!loading && filtered.length === 0 && <Text style={styles.emptyText}>No users found.</Text>}

            <View style={styles.paginationRow}>
              <Text style={styles.paginationInfo}>
                Showing {Math.min(total, page * limit + 1)}-{Math.min(total, (page + 1) * limit)} of {total}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                   onPress={handleBack} 
                   disabled={page === 0}
                   style={[styles.pageBtn, page === 0 && { opacity: 0.3 }]}
                >
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                  <Text style={styles.pageBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={handleNext} 
                   disabled={(page + 1) * limit >= total}
                   style={[styles.pageBtn, (page + 1) * limit >= total && { opacity: 0.3 }]}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

      {/* User 360 Detail Modal */}
      <Modal visible={!!selected && !editModalVisible} transparent animationType="fade">
        <View style={[{ ...(Platform.OS === 'web' ? { position: 'fixed' } : { position: 'absolute' }), top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="box-none">
          <View style={[styles.modalOverlay, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected && (
            <View style={{ zIndex: 10001, flex: 1, backgroundColor: '#10131a', borderRadius: 24, overflow: 'hidden', maxWidth: 1024, width: '100%', maxHeight: '90%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignSelf: 'center', margin: 20 }}>
            {/* Header Profile */}
            <View style={{ padding: 32, backgroundColor: 'rgba(40,44,54,0.4)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                 {/* Profile Box */}
                 <View style={{ position: 'relative' }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#00d4ec', backgroundColor: '#171732', alignItems: 'center', justifyContent: 'center' }}>
                       <Text style={{ fontSize: 24, fontWeight: '900', color: '#00e3fd' }}>{initials(selected as any)}</Text>
                    </View>
                    <View style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, backgroundColor: '#81ecff', borderRadius: 12, borderWidth: 4, borderColor: '#10131a', alignItems: 'center', justifyContent: 'center' }}>
                       <Ionicons name="shield-checkmark" size={12} color="#005762" />
                    </View>
                 </View>
                 <View>
                    <Text style={{ fontSize: 30, fontWeight: '800', color: '#ecedf6' }}>{selected?.username || 'Unknown'}</Text>
                    <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>ID: #{selected?.id.slice(0, 8).toUpperCase()}</Text>
                    
                    {/* Responsive Balance Grid */}
                    <View style={{ 
                      flexDirection: 'row', 
                      flexWrap: 'wrap', 
                      gap: isMobile ? 12 : 24,
                      justifyContent: 'flex-start'
                    }}>
                       <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                          <Text style={{ fontSize: 10, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Available Balance</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#81ecff' }}>ETB {balanceEtb(selected?.available_balance || 0)}</Text>
                       </View>
                       {!isMobile && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                       <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                          <Text style={{ fontSize: 10, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Withdrawable</Text>
                          <Text style={{ fontSize: 18, fontWeight: '500', color: '#ecedf6' }}>ETB {balanceEtb((selected as any)?.withdrawable_balance || 0)}</Text>
                       </View>
                       {isMobile && <View style={{ width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />}
                       {!isMobile && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                       <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                          <Text style={{ fontSize: 10, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Bonus</Text>
                          <Text style={{ fontSize: 18, fontWeight: '500', color: '#ecedf6' }}>ETB {balanceEtb((selected as any)?.bonus_balance || 0)}</Text>
                       </View>
                       {!isMobile && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                       <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                          <Text style={{ fontSize: 10, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Registered Phone</Text>
                          <Text style={{ fontSize: 16, fontWeight: '500', color: '#ecedf6' }}>{selected?.number}</Text>
                       </View>
                    </View>
                  </View>
              </View>

              {/* Header Stats Row */}
              <View style={{ flexDirection: 'row', gap: 12, width: isMobile ? '100%' : 'auto' }}>
                 <View style={{ flex: 1, backgroundColor: '#161a21', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minWidth: 100 }}>
                    <Text style={{ fontSize: 10, color: '#a9abb3', textTransform: 'uppercase', marginBottom: 4 }}>Total</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#ecedf6' }}>{user360.games.total || (user360.games.wins + user360.games.losses)}</Text>
                 </View>
                 <View style={{ flex: 1, backgroundColor: 'rgba(129,236,255,0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(129,236,255,0.2)', minWidth: 100 }}>
                    <Text style={{ fontSize: 10, color: '#81ecff', textTransform: 'uppercase', marginBottom: 4 }}>Wins</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#81ecff' }}>{user360.games.wins}</Text>
                 </View>
                 <View style={{ flex: 1, backgroundColor: 'rgba(255,111,124,0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,111,124,0.2)', minWidth: 100 }}>
                    <Text style={{ fontSize: 10, color: '#ff6f7c', textTransform: 'uppercase', marginBottom: 4 }}>Losses</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#ff6f7c' }}>{user360.games.losses}</Text>
                 </View>
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={{ flex: 1, backgroundColor: '#10131a', padding: isMobile ? 16 : 32 }} showsVerticalScrollIndicator={true}>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 32 }}>
                 
                 {/* Left & Center */}
                 <View style={{ flex: isMobile ? undefined : 2, width: isMobile ? '100%' : 'auto', gap: 40 }}>
                    {/* Room Prizes */}
                    <View>
                       <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}><Ionicons name="trophy-outline" size={14} /> Room Prizes</Text>
                       <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                          {[10, 25, 50, 99].map(amt => (
                             <View key={amt} style={{ flex: 1, minWidth: '40%', backgroundColor: amt === 99 ? '#22262f' : '#161a21', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: amt === 99 ? 'rgba(129,236,255,0.4)' : 'rgba(255,255,255,0.05)' }}>
                                {amt === 99 && <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#81ecff', paddingHorizontal: 6, paddingVertical: 2, borderBottomLeftRadius: 8 }}><Text style={{ color: '#005762', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>HOT</Text></View>}
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#81ecff', marginBottom: 4 }}>{amt} ETB</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <Text style={{ fontSize: 10, color: '#a9abb3' }}>{(selected as any)?.[`r1_${amt}_wins`] || 0} / 25</Text>
                                   <Ionicons name={amt === 99 ? "flame" : "star"} size={14} color={amt === 99 ? "#81ecff" : "rgba(255,255,255,0.2)"} />
                                </View>
                             </View>
                          ))}
                       </View>
                    </View>

                    {/* Game History */}
                    <View>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }}><Ionicons name="reader-outline" size={14} /> Game History</Text>
                          <TouchableOpacity onPress={() => setReferralUserId(user360.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                             <Ionicons name="people" size={12} color="#10b981" />
                             <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Referral Analytics</Text>
                          </TouchableOpacity>
                       </View>
                       <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8, paddingRight: isMobile ? 0 : 8 }}>
                          {user360.recent_games.map((tx: any, i) => {
                             const isWin = !!tx.winner && String(tx.winner).toLowerCase() === String(selected?.id).toLowerCase();
                             return (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(22,26,33,0.5)', borderRadius: 12 }}>
                                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isWin ? 'rgba(129,236,255,0.1)' : 'rgba(255,111,124,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                         <Ionicons name={isWin ? "trophy" : "close"} size={16} color={isWin ? "#81ecff" : "#ff6f7c"} />
                                      </View>
                                      <View style={{ flexShrink: 1 }}>
                                         <Text style={{ fontSize: 14, fontWeight: '500', color: '#ecedf6' }}>{isWin ? 'Game Win' : 'Game Loss'}</Text>
                                         <Text style={{ fontSize: 10, color: '#a9abb3' }}>{timeSince(tx.created_at)}</Text>
                                      </View>
                                   </View>
                                   <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                      <Text style={{ fontSize: 16, fontWeight: '900', color: isWin ? '#81ecff' : '#ff6f7c', textShadowColor: isWin ? 'rgba(129,236,255,0.3)' : 'rgba(255,111,124,0.3)', textShadowOffset: {width:0, height:2}, textShadowRadius: 8, letterSpacing: 0.5 }}>{isWin ? '+' : '-'} ETB {balanceEtb(Number(isWin ? (tx.prize_amount ?? tx.bet_amount ?? 0) : (tx.bet_amount ?? 0)))}</Text>
                                   </View>
                                </View>
                             );
                          })}
                          {user360.recent_games.length === 0 && (
                            <Text style={{ color: 'rgba(255,255,255,0.3)', padding: 16, textAlign: 'center', fontSize: 12 }}>No recent games logged.</Text>
                          )}
                       </ScrollView>
                    </View>
                 </View>

                 {/* Right Banking Timeline */}
                 <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : 'auto' }}>
                    <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 24 }}><Ionicons name="wallet-outline" size={14} /> Banking Activity</Text>
                    <View style={{ backgroundColor: '#161a21', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flex: 1, minHeight: 300, overflow: 'hidden' }}>
                       <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: isMobile ? 320 : 500 }} contentContainerStyle={{ padding: 24 }}>
                          {user360.txs.map((tx: any, i) => {
                             const isDep = tx.tx_type === 'DEPOSIT' || String(tx.type).toLowerCase() === 'deposit';
                             const isSucc = tx.status === 'COMPLETED' || tx.status === 'success';
                             const isPending = String(tx.status).toUpperCase() === 'PENDING';
                             const col = isDep ? (isSucc ? '#34d399' : isPending ? '#fbbf24' : '#64748b') : (isSucc ? '#ff6f7c' : isPending ? '#fbbf24' : '#64748b');
                             const textColor = isDep ? '#34d399' : '#ff6f7c';

                             return (
                                <View key={i} style={{ position: 'relative', paddingLeft: 24, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: `${col}4d`, marginBottom: 16 }}>
                                   <View style={{ position: 'absolute', left: -9, top: 4, width: 16, height: 16, backgroundColor: col, borderRadius: 8, borderWidth: 4, borderColor: '#10131a' }} />
                                   <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '700', color: tx.bank === 'ADMIN' ? '#a78bfa' : '#ecedf6' }}>
                                        {tx.bank === 'ADMIN' ? 'UPDATED BY ADMIN' : String(tx.tx_type || tx.type).toUpperCase()}
                                      </Text>
                                      <Ionicons name={isDep ? "arrow-down-outline" : "arrow-up-outline"} size={14} color={col} />
                                   </View>
                                   <Text style={{ fontSize: 10, color: '#a9abb3', marginBottom: 8 }}>{timeSince(tx.created_at)}</Text>
                                   <View style={{ flexDirection: 'row' }}>
                                      <Text style={{ fontSize: 20, fontWeight: '900', color: textColor, textShadowColor: isDep ? 'rgba(52,211,153,0.2)' : 'rgba(255,111,124,0.2)', textShadowOffset: {width:0, height:2}, textShadowRadius: 8, letterSpacing: 0.5 }}>{isDep ? '+' : '-'} ETB {balanceEtb(Number(tx.amount))}</Text>
                                   </View>
                                </View>
                             );
                          })}
                          {user360.txs.length === 0 && (
                               <Text style={{ color: 'rgba(255,255,255,0.3)', padding: 16, textAlign: 'center', fontSize: 12 }}>No recent transactions.</Text>
                          )}
                       </ScrollView>
                    </View>
                 </View>

              </View>
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Footer Controls */}
            <View style={{ 
               padding: isMobile ? 16 : 24, 
               borderTopWidth: 1, 
               borderTopColor: 'rgba(255,255,255,0.1)', 
               backgroundColor: '#161a21', 
               flexDirection: isMobile ? 'column' : 'row', 
               justifyContent: 'space-between', 
               alignItems: 'center', 
               gap: isMobile ? 12 : 24 
            }}>
               <View style={{ 
                  flexDirection: 'row', 
                  gap: 16, 
                  width: isMobile ? '100%' : 'auto' 
               }}>
                  <TouchableOpacity 
                    onPress={() => { if(selected) handleBan(selected.id, !selected.banned) }} 
                    style={{ 
                      flex: isMobile ? 1 : 0, 
                      paddingVertical: 14,
                      paddingHorizontal: isMobile ? 0 : 32,
                      backgroundColor: '#be0036', 
                      borderRadius: 40, 
                      flexDirection: 'row', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: 8 
                    }}
                  >
                     <Ionicons name="ban" size={16} color="#fff6f5" />
                     <Text style={{ color: '#fff6f5', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>{selected?.banned ? 'Unban' : 'Ban'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleDeleteUser} 
                    style={{ 
                      flex: isMobile ? 1 : 0, 
                      paddingVertical: 14,
                      paddingHorizontal: isMobile ? 0 : 32,
                      backgroundColor: '#22262f', 
                      borderWidth: 1, 
                      borderColor: 'rgba(255,111,124,0.2)', 
                      borderRadius: 40, 
                      flexDirection: 'row', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: 8 
                    }}
                  >
                     <Ionicons name="trash" size={16} color="#ff6f7c" />
                     <Text style={{ color: '#ff6f7c', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>Delete</Text>
                  </TouchableOpacity>
               </View>
               <TouchableOpacity 
                 onPress={openEditModal} 
                 style={{ 
                   width: isMobile ? '100%' : 'auto', 
                   paddingVertical: 14, 
                   paddingHorizontal: isMobile ? 0 : 40,
                   backgroundColor: '#00e3fd', 
                   borderRadius: 40, 
                   flexDirection: 'row', 
                   justifyContent: 'center', 
                   alignItems: 'center', 
                   gap: 8 
                 }}
               >
                  <Ionicons name="create" size={16} color="#004d57" />
                  <Text style={{ color: '#004d57', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>Edit Profile</Text>
               </TouchableOpacity>
            </View>

            {/* Close Button top-right */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSelected(null)} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
               <Ionicons name="close" size={20} color="#ecedf6" />
            </TouchableOpacity>
          </View>
          )}
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, glass]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>New Entity</Text><TouchableOpacity onPress={() => setCreateModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ gap: 16, marginBottom: 24 }}>
              <TextInput style={styles.inputField} placeholder="Username" placeholderTextColor="#666" value={createData.username} onChangeText={t => setCreateData({...createData, username: t})} />
              <TextInput style={styles.inputField} placeholder="Phone Number" placeholderTextColor="#666" value={createData.number} onChangeText={t => setCreateData({...createData, number: t})} />
              <TextInput style={styles.inputField} placeholder="Initial Balance" placeholderTextColor="#666" value={createData.balance} onChangeText={t => setCreateData({...createData, balance: t})} keyboardType="numeric" />
              
              <View style={styles.rolePickerRow}>
                <Text style={styles.pickerLabel}>Role:</Text>
                <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                  <TouchableOpacity onPress={() => setCreateData({...createData, role: 'user'})} style={[styles.roleBtn, createData.role === 'user' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, createData.role === 'user' && {color:'#fff'}]}>User</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setCreateData({...createData, role: 'admin'})} style={[styles.roleBtn, createData.role === 'admin' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, createData.role === 'admin' && {color:'#fff'}]}>Admin</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setCreateData({...createData, role: 'maintenance'})} style={[styles.roleBtn, createData.role === 'maintenance' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, createData.role === 'maintenance' && {color:'#fff'}]}>Maintenance</Text></TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSave}><Text style={styles.saveBtnText}>Create User</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, glass]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit Entity</Text><TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ gap: 16, marginBottom: 24 }}>
              <View>
                <Text style={styles.formLabel}>{t('Username')}</Text>
                <TextInput style={styles.inputField} value={editData.username} onChangeText={t => setEditData({...editData, username: t})} placeholder="Username" />
              </View>
              <View>
                <Text style={styles.formLabel}>{t('Phone Number')}</Text>
                <TextInput style={styles.inputField} value={editData.number} onChangeText={t => setEditData({...editData, number: t})} placeholder="Number" />
              </View>
              
              <View style={{ opacity: isSuperAdmin ? 1 : 0.5 }}>
                <Text style={styles.formLabel}>{t('Available Balance')} {!isSuperAdmin && `(${t('Super Admin Only')})`}</Text>
                <TextInput 
                  style={styles.inputField} 
                  editable={isSuperAdmin}
                  value={editData.available_balance} 
                  onChangeText={t => setEditData({...editData, available_balance: t})} 
                  keyboardType="numeric" 
                  placeholder="Balance" 
                />
              </View>

              <View style={{ opacity: isSuperAdmin ? 1 : 0.5 }}>
                <Text style={styles.formLabel}>{t('Bonus Balance')} {!isSuperAdmin && `(${t('Super Admin Only')})`}</Text>
                <TextInput 
                  style={styles.inputField} 
                  editable={isSuperAdmin}
                  value={editData.bonus_balance} 
                  onChangeText={t => setEditData({...editData, bonus_balance: t})} 
                  keyboardType="numeric" 
                  placeholder="Bonus" 
                />
              </View>
              
              <View style={[styles.rolePickerRow, { opacity: isSuperAdmin ? 1 : 0.5 }]}>
                <Text style={styles.pickerLabel}>{t('Role')}: {!isSuperAdmin && `(${t('Super Admin Only')})`}</Text>
                {Platform.OS === 'web' ? (
                  <select 
                    value={editData.role} 
                    disabled={!isSuperAdmin}
                    onChange={(e: any) => setEditData({...editData, role: e.target.value})}
                    style={{ background: '#0c0c1f', color: '#fff', border: '1px solid rgba(68,68,107,0.3)', borderRadius: 8, padding: 8, flex: 1 } as any}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                    <TouchableOpacity disabled={!isSuperAdmin} onPress={() => setEditData({...editData, role: 'user'})} style={[styles.roleBtn, editData.role === 'user' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, editData.role === 'user' && {color:'#fff'}]}>User</Text></TouchableOpacity>
                    <TouchableOpacity disabled={!isSuperAdmin} onPress={() => setEditData({...editData, role: 'admin'})} style={[styles.roleBtn, editData.role === 'admin' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, editData.role === 'admin' && {color:'#fff'}]}>Admin</Text></TouchableOpacity>
                    <TouchableOpacity disabled={!isSuperAdmin} onPress={() => setEditData({...editData, role: 'superadmin'})} style={[styles.roleBtn, editData.role === 'superadmin' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, editData.role === 'superadmin' && {color:'#fff'}]}>Superadmin</Text></TouchableOpacity>
                    <TouchableOpacity disabled={!isSuperAdmin} onPress={() => setEditData({...editData, role: 'maintenance'})} style={[styles.roleBtn, editData.role === 'maintenance' && styles.roleBtnActive]}><Text style={[styles.roleBtnText, editData.role === 'maintenance' && {color:'#fff'}]}>Maintenance</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleEditSave}><Text style={styles.saveBtnText}>Save Changes</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Generic Centered Confirm Modal */}
      <Modal transparent visible={genericModal.visible} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#111128', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: genericModal.isDestructive ? 'rgba(253,111,133,0.3)' : 'rgba(166,140,255,0.3)', shadowColor: genericModal.isDestructive ? '#fd6f85' : '#7c4dff', shadowOpacity: 0.2, shadowRadius: 30 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
               <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: genericModal.isDestructive ? 'rgba(253,111,133,0.1)' : 'rgba(166,140,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: genericModal.isDestructive ? 'rgba(253,111,133,0.2)' : 'rgba(166,140,255,0.2)' }}>
                  <Ionicons name={genericModal.isDestructive ? "warning" : "information-circle"} size={32} color={genericModal.isDestructive ? C.error : C.primary} />
               </View>
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>{genericModal.title}</Text>
            <Text style={{ color: 'rgba(168,167,212,0.8)', fontSize: 13, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>{genericModal.message}</Text>
            
            <View style={{ gap: 12 }}>
               <TouchableOpacity 
                 style={{ backgroundColor: genericModal.isDestructive ? C.error : C.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: genericModal.isDestructive ? C.error : C.primary, shadowOpacity: 0.3, shadowRadius: 10 }} 
                 onPress={genericModal.onConfirm}
               >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{genericModal.confirmText}</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }} 
                 onPress={() => setGenericModal(p => ({...p, visible: false}))}
               >
                  <Text style={{ color: '#a8a7d4', fontWeight: '700', fontSize: 14 }}>{t('Cancel')}</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReferralDetailsModal 
        visible={!!referralUserId} 
        onClose={() => setReferralUserId(null)} 
        token={token || ""} 
        userId={referralUserId || undefined}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 16, padding: 12 },
  tableWrap: { flex: 1 },
  tableCard: { flex: 1, backgroundColor: 'rgba(11,11,30,0.6)', borderRadius: 16, overflow: 'hidden' },
  tableHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(11,11,30,0.98)', borderBottomWidth: 1, borderBottomColor: 'rgba(68,68,107,0.1)' },
  tableHeadUnder: { padding: 12, backgroundColor: 'rgba(11,11,30,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(68,68,107,0.05)' },
  tableTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  tableSub: { color: '#a8a7d4', fontSize: 11, marginTop: 2 },
  tableActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  selectWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111128', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(68,68,107,0.2)' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111128', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(68,68,107,0.2)', width: 160 },
  searchInput: { flex: 1, color: '#fff', fontSize: 12 },
  thead: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(12,12,31,0.95)' },
  th: { color: 'rgba(168,167,212,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(68,68,107,0.05)' },
  rowSelected: { backgroundColor: 'rgba(166,140,255,0.05)', borderLeftWidth: 3, borderLeftColor: '#7c4dff' },
  tdId: { flex: 0.8, color: 'rgba(166,140,255,0.7)', fontSize: 10, fontFamily: 'monospace' },
  tdUser: { flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '800' },
  tdName: { color: '#e5e3ff', fontSize: 11, fontWeight: '700' },
  tdPhone: { color: '#a8a7d4', fontSize: 9 },
  tdBal: { flex: 0.9, color: '#00daf3', fontSize: 11, fontWeight: '800' },
  tdStatus: { flex: 0.8 },
  statusPill: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, textAlign: 'center' },
  tdTime: { flex: 0.9, color: '#a8a7d4', fontSize: 10 },
  tdActions: { flex: 0.4, alignItems: 'flex-end' },
  viewBtn: { padding: 4 },
  emptyText: { color: '#a8a7d4', textAlign: 'center', padding: 30 },
  panel: { width: '100%', maxWidth: 380 },
  profileCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(68,68,107,0.1)' },
  profileHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  profileAvatarWrap: { position: 'relative' },
  profileAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#171732', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(166,140,255,0.2)' },
  profileAvatarText: { color: '#a68cff', fontSize: 16, fontWeight: '900' },
  onlineIndicator: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#0c0c1f' },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  profileId: { color: '#666', fontSize: 9, fontFamily: 'monospace' },
  profileBalRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  profileBalLabel: { color: '#a8a7d4', fontSize: 11 },
  profileBalVal: { fontSize: 12, fontWeight: '900' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  roleBadge: { fontSize: 8, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  miniStats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  miniStatItem: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 10 },
  miniStatLabel: { color: '#666', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  miniStatVal: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  actionCard: { padding: 14, borderRadius: 16, gap: 10, borderWidth:1, borderColor:'rgba(68,68,107,0.1)' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(166,140,255,0.1)', borderRadius: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  banBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(253,111,133,0.3)' },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(253,111,133,0.3)' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  emptyPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyPanelText: { color: '#666', fontSize: 13 },
  modalOverlay: { 
    position: 'absolute', 
    top: 0, bottom: 0, left: 0, right: 0, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBox: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(166,140,255,0.2)' },
  userModalBox: { width: '100%', maxWidth: 480, padding: 28, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(166,140,255,0.3)', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  inputField: { backgroundColor: '#0c0c1f', color: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(68,68,107,0.3)', fontSize: 13 },
  saveBtn: { backgroundColor: C.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  formLabel: { color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  sectionCard: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.1)' },
  sectionTitle: { color: 'rgba(168,167,212,0.6)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  prizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prizeItem: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  prizeAmt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  prizeCount: { color: C.secondary, fontSize: 12, fontWeight: '900', marginTop: 2 },
  txRowSmall: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  txType: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' },
  txDate: { color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 1 },
  txAmtSmall: { fontSize: 11, fontWeight: '800' },
  emptySubText: { color: 'rgba(168,167,212,0.4)', fontSize: 10, textAlign: 'center', paddingVertical: 8 },
  rolePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerLabel: { color: 'rgba(168,167,212,0.8)', fontSize: 12, fontWeight: '600' },
  roleBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(168,167,212,0.2)', alignItems: 'center' },
  roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleBtnText: { color: 'rgba(168,167,212,0.6)', fontSize: 11, fontWeight: '700' },
  paginationRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(68,68,107,0.1)',
    backgroundColor: 'rgba(11,11,30,0.5)'
  },
  paginationInfo: { color: 'rgba(168,167,212,0.6)', fontSize: 12, fontWeight: '600' },
  pageBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(166,140,255,0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(166,140,255,0.2)'
  },
  pageBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
