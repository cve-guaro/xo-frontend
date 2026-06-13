// app/(authed)/admin/users.tsx — God Mode: Player Matrix + User 360 Panel
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, Modal, useWindowDimensions, Image } from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import ReferralDetailsModal from '../../../components/ReferralDetailsModal';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { useRouter } from 'expo-router';
import { AdminTheme as C } from './_layout';
import ActionConfirmModal from '../../../components/ActionConfirmModal';

const glass: any = {
  backgroundColor: 'rgba(24, 24, 27, 0.65)',
};

interface User {
  id: string; number: string; username: string;
  available_balance: number; bonus_balance: number;
  banned: boolean; created_at: string;
  room_1_wins?: Record<string, number>;
  role?: 'user' | 'admin' | 'superadmin';
  new_user?: boolean;
  display_name?: string;
}

export default function AdminUsers() {
  const { token, t, showAlert, isSuperAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;
  const router = useRouter();
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
  const [editData, setEditData] = useState({ display_name: '', username: '', number: '', role: 'user', available_balance: '0', bonus_balance: '0', admin_edit_balance: '0' });
  const [balanceEdit, setBalanceEdit] = useState({ available_balance: '0', withdrawable_balance: '0' });
  const [balanceSaving, setBalanceSaving] = useState(false);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createData, setCreateData] = useState({ display_name: '', username: '', number: '', role: 'user' });
  const [referralUserId, setReferralUserId] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'superadmin' | 'maintenance_admin'>('all');
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

  const [user360, setUser360] = useState<{ loading: boolean, txs: any[], recent_games: any[], games: { wins:number, losses:number, draws:number, total:number, totalGames?:number } }>({ loading: false, txs: [], recent_games: [], games: { wins:0, losses:0, draws:0, total:0, totalGames:0 } });

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
        setUser360({ loading: false, txs: d.transactions || [], recent_games: d.games || [], games: d.stats || {wins:0,losses:0,draws:0,total:0,totalGames:0} });
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
           admin_edit_balance: Number(fullUser.admin_edit_balance ?? 0),
           earned_bonus_balance: Number(fullUser.earned_bonus_balance ?? 0),
         } as any : prev);
       }
    } catch {
      setUser360(p => ({ ...p, loading: false }));
    }
  };

  const handleSelectUser = (u: User) => {
    router.push({ pathname: '/admin/user-detail', params: { id: u.id } } as any);
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
      display_name: selected.display_name || '',
      username: selected.username || '',
      number: selected.number || '',
      role: selected.role || 'user',
      available_balance: selected.available_balance ? String(selected.available_balance) : '0',
      bonus_balance: selected.bonus_balance ? String(selected.bonus_balance) : '0',
      admin_edit_balance: (selected as any).admin_edit_balance ? String((selected as any).admin_edit_balance) : '0',
    });
    setBalanceEdit({
      available_balance: selected.available_balance ? String(selected.available_balance) : '0',
      withdrawable_balance: (selected as any).withdrawable_balance ? String((selected as any).withdrawable_balance) : '0',
    });
    setEditModalVisible(true);
  };

  const handleBalanceSave = async () => {
    if (!selected || !isSuperAdmin) return;
    const availAmt = Number(balanceEdit.available_balance);
    const withAmt = Number(balanceEdit.withdrawable_balance);
    if (!Number.isFinite(availAmt) || availAmt < 0 || !Number.isFinite(withAmt) || withAmt < 0) {
      showAlert('Error', 'Invalid balance amount');
      return;
    }
    setBalanceSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_URL}/admin/users/${selected.id}/balance`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
          body: JSON.stringify({ field: 'available_balance', amount: availAmt }),
        }),
        fetch(`${API_URL}/admin/users/${selected.id}/balance`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
          body: JSON.stringify({ field: 'withdrawable_balance', amount: withAmt }),
        }),
      ]);
      if (r1.ok && r2.ok) {
        await fetchUsers();
        setSelected(prev => prev ? { ...prev, available_balance: availAmt, withdrawable_balance: withAmt } as any : prev);
        showAlert('Success', `Balances updated for ${selected.username}`);
      } else {
        const err = await r1.json().catch(() => ({}));
        showAlert('Error', err.error || 'Failed to update balance');
      }
    } catch { showAlert('Error', 'Network error'); }
    setBalanceSaving(false);
  };

  const handleEditSave = async () => {
    if (!selected) return;
    setActionLoad(true);
    try {
      // ⚠️ Only send profile fields — NEVER wallet balance fields here.
      // Balance changes must use the dedicated SAVE BALANCES button → PATCH /users/:id/balance
      const profilePayload = {
        display_name: editData.display_name,
        username: editData.username,
        number: editData.number,
        role: editData.role,
      };
      const res = await fetch(`${API_URL}/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify(profilePayload),
      });
      if (res.ok) {
        await fetchUsers();
        setSelected(prev => prev ? {
          ...prev,
          display_name: editData.display_name, username: editData.username, number: editData.number, role: editData.role as any,
          available_balance: Number(editData.available_balance), bonus_balance: Number(editData.bonus_balance),
          admin_edit_balance: Number(editData.admin_edit_balance),
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
        setCreateData({ display_name: '', username: '', number: '', role: 'user' });
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
    const parsed = new Date(iso).getTime();
    if (Number.isNaN(parsed)) return '—';
    const d = Date.now() - parsed;
    if (d < 0) return 'Just now'; // Handle future dates (e.g. slight clock skew)
    if (d < 60000) return 'Just now';
    if (d < 3600000) return `${Math.floor(d/60000)} mins ago`;
    if (d < 86400000) return `${Math.floor(d/3600000)} hours ago`;
    return `${Math.floor(d/86400000)} days ago`;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.tableWrap, isMobile && { minHeight: 400 }]}>
        <View style={[styles.tableCard]}>
          
          <View style={{ zIndex: 30 }}>
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
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any, paddingRight: 4 } as any}
                    >
                      <option value="all" style={{ background: '#111128' }}>All Roles</option>
                      <option value="user" style={{ background: '#111128' }}>User</option>
                      <option value="admin" style={{ background: '#111128' }}>Admin</option>
                      <option value="superadmin" style={{ background: '#111128' }}>Superadmin</option>
                      <option value="maintenance_admin" style={{ background: '#111128' }}>Maintenance</option>
                    </select>
                  ) : (
                    <TouchableOpacity onPress={() => {
                      const order = ['all','user','admin','superadmin','maintenance_admin'] as const;
                      setRoleFilter(order[(order.indexOf(roleFilter) + 1) % order.length]);
                    }}>
                      <Text style={{ color: '#e5e3ff', fontSize: 12, fontWeight: '700' }}>{roleFilter === 'maintenance_admin' ? 'MAINTENANCE' : roleFilter.toUpperCase()}</Text>
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
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any, paddingRight: 4 } as any}
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
                      style={{ background: 'transparent', border: 'none', color: 'rgba(229,227,255,0.8)', fontSize: 12, fontWeight: 700, outlineStyle: 'none', cursor: 'pointer' as any, paddingRight: 4 } as any}
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
                  <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor="rgba(168,167,212,0.4)" value={query} onChangeText={setQuery} {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})} />
                </View>
              </View>
            </View>

            {!isMobile && (
              <View style={[styles.thead]}>
                <Text style={[styles.th, { flex: 0.9 }]}>Entity ID</Text>
                <Text style={[styles.th, { flex: 2 }]}>User Identity</Text>
                <Text style={[styles.th, { flex: 1 }]}>Balance (ETB)</Text>
                <Text style={[styles.th, { flex: 0.9 }]}>Status</Text>
                <Text style={[styles.th, { flex: 1 }]}>Last Active</Text>
                <Text style={[styles.th, { flex: 0.4, textAlign: 'right' }]}>Act</Text>
              </View>
            )}
          </View>

          <AnimatedList
            items={loading ? [] : filtered}
            renderItem={(u: User, i: number, isSelected: boolean) => (
              <View style={[styles.row, isSelected && styles.rowSelected, isMobile && { flexDirection: 'column', alignItems: 'flex-start', padding: 16, gap: 12 }]}>
                {isMobile ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <View style={[styles.tdUser, { flex: undefined }]}>
                        <View style={[styles.avatar, { backgroundColor: u.banned ? 'rgba(138,22,50,0.2)' : 'rgba(34,34,70,0.8)', borderColor: u.banned ? 'rgba(253,111,133,0.3)' : 'rgba(166,140,255,0.3)' }]}>
                          <Text style={[styles.avatarText, { color: u.banned ? C.error : C.primary }]}>{initials(u)}</Text>
                        </View>
                        <View>
                          <Text style={styles.tdName} numberOfLines={1}>{u.username || 'Unknown'}</Text>
                          <Text style={styles.tdPhone} numberOfLines={1}>{u.number}</Text>
                        </View>
                      </View>
                      <View style={[styles.tdStatus, { flex: undefined }]}>
                        <Text style={[styles.statusPill, { color: u.banned ? C.error : C.secondary, backgroundColor: u.banned ? 'rgba(138,22,50,0.15)' : 'rgba(0,42,48,0.5)', borderColor: u.banned ? 'rgba(253,111,133,0.2)' : 'rgba(0,218,243,0.2)' }]}>
                          {u.banned ? 'Suspended' : 'Active'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 }}>
                      <View>
                        <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 9, fontWeight: '800', marginBottom: 2 }}>BALANCE</Text>
                        <Text style={styles.tdBal} numberOfLines={1}>ETB {balanceEtb(u.available_balance)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 9, fontWeight: '800', marginBottom: 2 }}>LAST ACTIVE</Text>
                        <Text style={styles.tdTime} numberOfLines={1}>{u.created_at ? timeSince(u.created_at) : '—'}</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
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
                      <TouchableOpacity style={styles.viewBtn} onPress={() => setSelected(u)}>
                        <Ionicons name="chevron-forward" size={16} color="#7c4dff" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
            <View style={{ zIndex: 10001, flex: 1, backgroundColor: '#10131a', borderRadius: isMobile ? 0 : 24, overflow: 'hidden', maxWidth: isDesktop ? 1200 : 1024, width: '100%', maxHeight: isMobile ? '100%' : '90%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignSelf: 'center', margin: isMobile ? 0 : 20 }}>
            {/* Header Profile */}
            <View style={{ padding: isMobile ? 16 : 32, backgroundColor: 'rgba(40,44,54,0.4)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'column', gap: isMobile ? 16 : 32 }}>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? 12 : 24 }}>
                 {/* Left Profile Box */}
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 12 : 24 }}>
                    <View style={{ position: 'relative' }}>
                       <View style={{ width: isMobile ? 56 : 80, height: isMobile ? 56 : 80, borderRadius: isMobile ? 28 : 40, borderWidth: 2, borderColor: '#00d4ec', backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: isMobile ? 18 : 24, fontWeight: '900', color: '#00e3fd' }}>{initials(selected as any)}</Text>
                       </View>
                       <View style={{ position: 'absolute', bottom: -4, right: -4, width: isMobile ? 20 : 24, height: isMobile ? 20 : 24, backgroundColor: '#81ecff', borderRadius: 12, borderWidth: 3, borderColor: '#10131a', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="shield-checkmark" size={10} color="#005762" />
                       </View>
                    </View>
                    <View>
                       <Text style={{ fontSize: isMobile ? 20 : 30, fontWeight: '800', color: '#ecedf6' }}>{selected?.username || 'Unknown'}</Text>
                       <Text style={{ fontSize: isMobile ? 10 : 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 2 }}>ID: #{selected?.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                 </View>
                 {/* Full 360° View Button */}
                 <TouchableOpacity
                   onPress={() => { setSelected(null); router.push({ pathname: '/admin/user-detail', params: { id: selected?.id } } as any); }}
                   style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,229,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)' }}
                 >
                   <Ionicons name="expand" size={14} color="#00e5ff" />
                   <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>FULL 360° VIEW</Text>
                 </TouchableOpacity>

                 {/* Right Stats Row (Total, Wins, Losses) */}
                 <View style={{ flexDirection: 'row', gap: isMobile ? 8 : 12, width: isMobile ? '100%' : 'auto', marginTop: isMobile ? 8 : 0 }}>
                    <View style={{ flex: 1, backgroundColor: '#161a21', padding: isMobile ? 10 : 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minWidth: isMobile ? 'auto' : 100 }}>
                       <Text style={{ fontSize: isMobile ? 9 : 10, color: '#a9abb3', textTransform: 'uppercase', marginBottom: 4 }}>Total</Text>
                       <Text style={{ fontSize: isMobile ? 16 : 20, fontWeight: '800', color: '#ecedf6' }}>{user360.games.totalGames || user360.games.total || (user360.games.wins + user360.games.losses)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(129,236,255,0.1)', padding: isMobile ? 10 : 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(129,236,255,0.2)', minWidth: isMobile ? 'auto' : 100 }}>
                       <Text style={{ fontSize: isMobile ? 9 : 10, color: '#81ecff', textTransform: 'uppercase', marginBottom: 4 }}>Wins</Text>
                       <Text style={{ fontSize: isMobile ? 16 : 20, fontWeight: '800', color: '#81ecff' }}>{user360.games.wins}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,111,124,0.1)', padding: isMobile ? 10 : 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,111,124,0.2)', minWidth: isMobile ? 'auto' : 100 }}>
                       <Text style={{ fontSize: isMobile ? 9 : 10, color: '#ff6f7c', textTransform: 'uppercase', marginBottom: 4 }}>Losses</Text>
                       <Text style={{ fontSize: isMobile ? 16 : 20, fontWeight: '800', color: '#ff6f7c' }}>{user360.games.losses}</Text>
                    </View>
                 </View>
              </View>

              {/* Balance Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isMobile ? 8 : 24, justifyContent: 'flex-start' }}>
                 <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                    <Text style={{ fontSize: 9, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Available Balance</Text>
                    <Text style={{ fontSize: isMobile ? 14 : 18, fontWeight: '800', color: '#81ecff' }}>ETB {balanceEtb(selected?.available_balance || 0)}</Text>
                 </View>
                 {!isMobile && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                 <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                    <Text style={{ fontSize: 9, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Withdrawable</Text>
                    <Text style={{ fontSize: isMobile ? 14 : 18, fontWeight: '500', color: '#ecedf6' }}>ETB {balanceEtb((selected as any)?.withdrawable_balance || 0)}</Text>
                 </View>
                 <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                    <Text style={{ fontSize: 9, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Bonus</Text>
                    <Text style={{ fontSize: isMobile ? 14 : 18, fontWeight: '500', color: '#ecedf6' }}>ETB {balanceEtb((selected as any)?.earned_bonus_balance || 0)}</Text>
                 </View>
                 {!isMobile && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                 <View style={{ minWidth: isMobile ? '45%' : 'auto' }}>
                    <Text style={{ fontSize: 9, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Admin Edits</Text>
                    <Text style={{ fontSize: isMobile ? 14 : 18, fontWeight: '500', color: '#a78bfa' }}>ETB {balanceEtb((selected as any)?.admin_edit_balance || 0)}</Text>
                 </View>
                 {!isMobile && <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                 <View style={{ minWidth: isMobile ? '100%' : 'auto' }}>
                    <Text style={{ fontSize: 9, color: '#a9abb3', textTransform: 'uppercase', fontWeight: '600' }}>Registered Phone</Text>
                    <Text style={{ fontSize: isMobile ? 13 : 16, fontWeight: '500', color: '#ecedf6' }}>{selected?.number}</Text>
                 </View>
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={{ flex: 1, backgroundColor: '#10131a', ...(Platform.OS === 'web' ? { overflow: 'auto' as any } : {}) }} contentContainerStyle={{ padding: isMobile ? 12 : 32, paddingBottom: 40, gap: 32 }}>
               
               {/* Room Prizes */}
               <View>
                  <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}><Ionicons name="trophy-outline" size={14} /> Room Prizes</Text>
                  <View style={{ flexDirection: 'row', gap: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                     {[10, 15, 25, 50].map(amt => (
                        <View key={amt} style={{ flex: 1, minWidth: isMobile ? '40%' : '20%', backgroundColor: amt === 50 ? '#22262f' : '#161a21', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: amt === 50 ? 'rgba(129,236,255,0.4)' : 'rgba(255,255,255,0.05)' }}>
                           {amt === 50 && <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#81ecff', paddingHorizontal: 6, paddingVertical: 2, borderBottomLeftRadius: 8 }}><Text style={{ color: '#005762', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>HOT</Text></View>}
                           <Text style={{ fontSize: 18, fontWeight: '800', color: '#81ecff', marginBottom: 4 }}>{amt} ETB</Text>
                           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 10, color: '#a9abb3' }}>{(selected as any)?.[`r1_${amt}_wins`] || 0} / 25</Text>
                              <Ionicons name={amt === 50 ? "flame" : "star"} size={14} color={amt === 50 ? "#81ecff" : "rgba(255,255,255,0.2)"} />
                           </View>
                        </View>
                     ))}
                  </View>
               </View>

               <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 32 }}>
                  {/* Left: Game History */}
                  <View style={{ flex: isMobile ? undefined : 2, width: isMobile ? '100%' : 'auto' }}>
                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' }}><Ionicons name="reader-outline" size={14} /> Game History</Text>
                        <TouchableOpacity onPress={() => setReferralUserId(selected?.id || null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                           <Ionicons name="people" size={12} color="#10b981" />
                           <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Referral Analytics</Text>
                        </TouchableOpacity>
                     </View>
                     <ScrollView id="custom-scroll-1" nestedScrollEnabled showsVerticalScrollIndicator={true} style={{ height: 350, ...(Platform.OS === 'web' ? { overflow: 'auto' as any } : {}) }} contentContainerStyle={{ gap: 8, paddingRight: isMobile ? 0 : 8 }}>
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

                  {/* Right Banking Timeline */}
                  <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : 'auto' }}>
                     <Text style={{ fontSize: 12, color: '#a9abb3', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginBottom: 16 }}><Ionicons name="wallet-outline" size={14} /> Banking Activity</Text>
                     <View id="custom-scroll-2" style={{ backgroundColor: '#161a21', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flex: 1, height: 400, overflow: Platform.OS === 'web' ? 'auto' as any : 'hidden' }}>
                        <ScrollView id="custom-scroll-3" nestedScrollEnabled showsVerticalScrollIndicator={true} style={{ flex: 1, ...(Platform.OS === 'web' ? { overflow: 'auto' as any } : {}) }} contentContainerStyle={{ padding: 24 }}>
                           {user360.txs.map((tx: any, i) => {
                           const txType = String(tx.tx_type || tx.type || '').toUpperCase();
                           const isAdmin = tx.bank === 'ADMIN' || txType === 'ADMIN_CREDIT' || txType === 'ADMIN_DEBIT' || txType === 'ADMIN_EDIT';
                           const isDeposit = txType === 'DEPOSIT';
                           const isGift = txType === 'GIFT' || txType === 'BONUS';
                           const isPrize = txType === 'PRIZE';
                           const isRefund = txType === 'REFUND';
                           const isWithdraw = txType.includes('WITHDRAW');
                           const isPositive = isDeposit || isGift || isPrize || isRefund || (isAdmin && txType === 'ADMIN_CREDIT');
                           const isSucc = tx.status === 'COMPLETED' || tx.status === 'success';
                           const isPending = String(tx.status).toUpperCase().includes('PENDING');

                           const label = isAdmin ? (txType === 'ADMIN_CREDIT' ? 'ADMIN CREDIT' : txType === 'ADMIN_DEBIT' ? 'ADMIN DEBIT' : 'ADMIN EDIT')
                             : isDeposit ? 'DEPOSIT'
                             : isGift ? 'BONUS / GIFT'
                             : isPrize ? 'PRIZE'
                             : isRefund ? 'REFUND'
                             : isWithdraw ? txType.replace(/_/g, ' ')
                             : txType;

                           const col = isAdmin ? '#a78bfa' : isGift ? '#00daf3' : isPrize ? '#fbbf24' : isPositive ? (isSucc ? '#34d399' : isPending ? '#fbbf24' : '#64748b') : (isSucc ? '#ff6f7c' : isPending ? '#fbbf24' : '#64748b');
                           const textColor = isAdmin ? '#a78bfa' : isGift ? '#00daf3' : isPrize ? '#fbbf24' : isPositive ? '#34d399' : '#ff6f7c';
                           const iconName = isAdmin ? "build-outline" : isGift ? "gift-outline" : isPrize ? "trophy-outline" : isRefund ? "refresh-outline" : isPositive ? "arrow-down-outline" : "arrow-up-outline";
                           const statusBadge = isPending ? ' (PENDING)' : !isSucc ? ` (${tx.status})` : '';

                           return (
                              <View key={i} style={{ position: 'relative', paddingLeft: 24, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: `${col}4d`, marginBottom: 16 }}>
                                 <View style={{ position: 'absolute', left: -9, top: 4, width: 16, height: 16, backgroundColor: col, borderRadius: 8, borderWidth: 4, borderColor: '#10131a' }} />
                                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: isAdmin ? '#a78bfa' : '#ecedf6' }}>
                                      {label}{statusBadge}
                                    </Text>
                                    <Ionicons name={iconName} size={14} color={col} />
                                 </View>
                                 <Text style={{ fontSize: 10, color: '#a9abb3', marginBottom: 4 }}>{tx.bank ? tx.bank : ''}{tx.tx_ref ? ' · ' + String(tx.tx_ref).slice(0,12) : ''}</Text>
                                 <Text style={{ fontSize: 10, color: '#a9abb3', marginBottom: 8 }}>{timeSince(tx.created_at)}</Text>
                                 <View style={{ flexDirection: 'row' }}>
                                    <Text style={{ fontSize: 20, fontWeight: '900', color: textColor, textShadowColor: `${textColor}33`, textShadowOffset: {width:0, height:2}, textShadowRadius: 8, letterSpacing: 0.5 }}>{isPositive ? '+' : '-'} ETB {balanceEtb(Number(tx.amount))}</Text>
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
            </ScrollView>

            {/* Footer Controls */}
            <View style={{ 
               padding: isMobile ? 12 : 24, 
               borderTopWidth: 1, 
               borderTopColor: 'rgba(255,255,255,0.1)', 
               backgroundColor: '#161a21', 
               gap: isMobile ? 8 : 16 
            }}>
               <View style={{ 
                  flexDirection: 'row', 
                  gap: isMobile ? 8 : 16, 
                  width: '100%' 
               }}>
                  <TouchableOpacity 
                    onPress={() => { if(selected) handleBan(selected.id, !selected.banned) }} 
                    style={{ 
                      flex: 1, 
                      paddingVertical: isMobile ? 10 : 14,
                      backgroundColor: '#be0036', 
                      borderRadius: 12, 
                      flexDirection: 'row', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: 6 
                    }}
                  >
                     <Ionicons name="ban" size={isMobile ? 14 : 16} color="#fff6f5" />
                     <Text style={{ color: '#fff6f5', fontSize: isMobile ? 10 : 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>{selected?.banned ? 'Unban' : 'Ban'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleDeleteUser} 
                    style={{ 
                      flex: 1, 
                      paddingVertical: isMobile ? 10 : 14,
                      backgroundColor: '#22262f', 
                      borderWidth: 1, 
                      borderColor: 'rgba(255,111,124,0.2)', 
                      borderRadius: 12, 
                      flexDirection: 'row', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: 6 
                    }}
                  >
                     <Ionicons name="trash" size={isMobile ? 14 : 16} color="#ff6f7c" />
                     <Text style={{ color: '#ff6f7c', fontSize: isMobile ? 10 : 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={openEditModal} 
                    style={{ 
                      flex: 1.5, 
                      paddingVertical: isMobile ? 10 : 14,
                      backgroundColor: '#00e3fd', 
                      borderRadius: 12, 
                      flexDirection: 'row', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: 6 
                    }}
                  >
                     <Ionicons name="create" size={isMobile ? 14 : 16} color="#004d57" />
                     <Text style={{ color: '#004d57', fontSize: isMobile ? 10 : 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Edit Profile</Text>
                  </TouchableOpacity>
               </View>
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
              <TextInput style={styles.inputField} placeholder="Full Name (Display Name)" placeholderTextColor="#666" value={createData.display_name} onChangeText={t => setCreateData({...createData, display_name: t})} />
              <TextInput style={styles.inputField} placeholder="Username" placeholderTextColor="#666" value={createData.username} onChangeText={t => setCreateData({...createData, username: t})} />
              <TextInput style={styles.inputField} placeholder="Phone Number" placeholderTextColor="#666" value={createData.number} onChangeText={t => setCreateData({...createData, number: t})} />
              
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
                <Text style={styles.formLabel}>{t('Full Name')}</Text>
                <TextInput style={styles.inputField} value={editData.display_name} onChangeText={t => setEditData({...editData, display_name: t})} placeholder="Full Name" />
              </View>
              <View>
                <Text style={styles.formLabel}>{t('Username')}</Text>
                <TextInput style={styles.inputField} value={editData.username} onChangeText={t => setEditData({...editData, username: t})} placeholder="Username" />
              </View>
              <View>
                <Text style={styles.formLabel}>{t('Phone Number')}</Text>
                <TextInput style={styles.inputField} value={editData.number} onChangeText={t => setEditData({...editData, number: t})} placeholder="Number" />
              </View>
              
              {/* ─── Balance Editor (SuperAdmin + Maintenance Admin) ─── */}
              {isSuperAdmin && (
                <View style={{ backgroundColor: 'rgba(0,218,243,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(0,218,243,0.15)', gap: 12 }}>
                  <Text style={[styles.formLabel, { color: '#00daf3' }]}>⚡ Edit Balances (Direct Override)</Text>
                  <View>
                    <Text style={styles.formLabel}>Available Balance (ETB)</Text>
                    <TextInput
                      style={styles.inputField}
                      value={balanceEdit.available_balance}
                      onChangeText={v => setBalanceEdit(p => ({ ...p, available_balance: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View>
                    <Text style={styles.formLabel}>Withdrawable Balance (ETB)</Text>
                    <TextInput
                      style={styles.inputField}
                      value={balanceEdit.withdrawable_balance}
                      onChangeText={v => setBalanceEdit(p => ({ ...p, withdrawable_balance: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#00daf3', padding: 12, borderRadius: 10, alignItems: 'center' }}
                    onPress={handleBalanceSave}
                    disabled={balanceSaving}
                  >
                    {balanceSaving
                      ? <ActivityIndicator color="#004d57" />
                      : <Text style={{ color: '#004d57', fontWeight: '900', fontSize: 12 }}>SAVE BALANCES</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ opacity: 0.5 }}>
                <Text style={styles.formLabel}>Admin Edit History Balance</Text>
                <TextInput
                  style={styles.inputField}
                  editable={false}
                  value={editData.admin_edit_balance}
                  placeholder="Calculated from admin transactions"
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
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#0f0f11', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: genericModal.isDestructive ? 'rgba(253,111,133,0.3)' : 'rgba(166,140,255,0.3)', shadowColor: genericModal.isDestructive ? '#fd6f85' : '#7c4dff', shadowOpacity: 0.2, shadowRadius: 30 }}>
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
  tableCard: { flex: 1, backgroundColor: 'transparent' },
  tableHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(24, 24, 27, 0.65)', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(39, 39, 42, 0.6)' },
  tableHeadUnder: { padding: 16, backgroundColor: 'rgba(24, 24, 27, 0.65)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(39, 39, 42, 0.6)', marginBottom: 16 },
  tableTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  tableSub: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 4, fontWeight: '500' },
  tableActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  selectWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)', width: 180 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  thead: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'transparent' },
  th: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' },
  rowSelected: { backgroundColor: 'rgba(166,140,255,0.1)', borderColor: 'rgba(166,140,255,0.4)' },
  tdId: { flex: 0.8, color: 'rgba(166,140,255,0.8)', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  tdUser: { flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 12, fontWeight: '900' },
  tdName: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  tdPhone: { color: '#a8a7d4', fontSize: 9 },
  tdBal: { flex: 0.9, color: '#00daf3', fontSize: 11, fontWeight: '800' },
  tdStatus: { flex: 0.8 },
  statusPill: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, textAlign: 'center' },
  tdTime: { flex: 0.9, color: '#a8a7d4', fontSize: 10 },
  tdActions: { flex: 0.4, alignItems: 'flex-end' },
  viewBtn: { padding: 4 },
  emptyText: { color: '#a8a7d4', textAlign: 'center', padding: 30 },
  panel: { width: '100%', maxWidth: 380 },
  profileCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.2)' },
  profileHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  profileAvatarWrap: { position: 'relative' },
  profileAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(39, 39, 42, 0.6)' },
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
  actionCard: { padding: 14, borderRadius: 16, gap: 10, borderWidth:1, borderColor: 'rgba(39, 39, 42, 0.2)' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(166,140,255,0.1)', borderRadius: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  banBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(253,111,133,0.3)' },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(253,111,133,0.3)' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  emptyPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyPanelText: { color: '#666', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    backgroundColor: '#18181b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  userModalBox: { width: '100%', maxWidth: 480, padding: 28, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  inputField: { backgroundColor: '#09090b', color: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', fontSize: 13 },
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
    padding: 20, 
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1, 
    borderColor: 'rgba(39, 39, 42, 0.6)',
    backgroundColor: 'rgba(24, 24, 27, 0.65)'
  },
  paginationInfo: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700' },
  pageBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(166,140,255,0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.6)'
  },
  pageBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
