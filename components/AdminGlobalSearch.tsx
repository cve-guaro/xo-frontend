import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { API_URL } from '../config';

const C = {
  primary: '#00daf3',
  primaryContainer: '#00a3ff',
  secondary: '#00daf3',
  background: '#0c0c1f',
  surface: '#0B0B1E',
  surfaceContainerLow: '#111128',
  surfaceContainer: '#171732',
  onSurface: '#e5e3ff',
  onSurfaceVariant: '#a8a7d4',
  outlineVariant: 'rgba(68,68,107,0.3)',
  error: '#fd6f85',
  success: '#4CAF50',
};

export default function AdminGlobalSearch() {
  const { token, language } = useAuth();
  const isEN = language === 'en';
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [user360, setUser360] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const inputRef = useRef<TextInput>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (modalVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
      setResults([]);
      setSelectedUser(null);
      setUser360(null);
    }
  }, [modalVisible]);

  // Handle Hotkey (Ctrl+K or /)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setModalVisible(true);
      } else if (e.key === '/' && !modalVisible && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setModalVisible(true);
      } else if (e.key === 'Escape' && modalVisible) {
        if (selectedUser) {
          setSelectedUser(null);
          setUser360(null);
        } else {
          setModalVisible(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalVisible, selectedUser]);

  const performSearch = useCallback(async (q: string) => {
    if (!q || q.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users?search=${encodeURIComponent(q)}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setResults(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const delay = setTimeout(() => {
      performSearch(search);
    }, 400);
    return () => clearTimeout(delay);
  }, [search, performSearch]);

  const fetchUser360 = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}/360`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser360(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    fetchUser360(user.id);
  };

  return (
    <>
      <TouchableOpacity 
        style={s.searchWrap} 
        activeOpacity={0.7} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="search" size={16} color={C.onSurfaceVariant} />
        <Text style={s.searchText}>{isEN ? 'Search users...' : 'ተጠቃሚዎችን ፈልግ...'}</Text>
        <View style={s.searchCmd}><Text style={{ color: C.onSurfaceVariant, fontSize: 8 }}>/</Text></View>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalVisible(false)} />
          
          <View style={s.modalContent}>
            {selectedUser && user360 ? (
              // --- 360 User Details View ---
              <View style={s.detailsContainer}>
                <View style={s.detailsHeader}>
                  <TouchableOpacity onPress={() => { setSelectedUser(null); setUser360(null); }}>
                    <Ionicons name="arrow-back" size={24} color={C.onSurface} />
                  </TouchableOpacity>
                  <Text style={s.detailsTitle}>User Details</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView contentContainerStyle={s.detailsScroll}>
                  <View style={s.detailSection}>
                    <Text style={s.sectionTitle}>Profile</Text>
                    <Text style={s.detailText}>Name: <Text style={{color: '#fff'}}>{user360.user.username}</Text></Text>
                    <Text style={s.detailText}>Phone: <Text style={{color: '#fff'}}>{user360.user.number}</Text></Text>
                    <Text style={s.detailText}>Joined: <Text style={{color: '#fff'}}>{new Date(user360.user.created_at).toLocaleDateString()}</Text></Text>
                    <Text style={s.detailText}>Status: <Text style={{color: user360.user.banned ? C.error : C.success}}>{user360.user.banned ? 'Banned' : 'Active'}</Text></Text>
                  </View>
                  
                  <View style={s.detailSection}>
                    <Text style={s.sectionTitle}>Wallet</Text>
                    <Text style={s.detailText}>Available: <Text style={{color: C.secondary}}>ETB {user360.wallet.available}</Text></Text>
                    <Text style={s.detailText}>Withdrawable: <Text style={{color: C.success}}>ETB {user360.wallet.withdrawable}</Text></Text>
                    <Text style={s.detailText}>Bonus: <Text style={{color: C.primary}}>ETB {user360.wallet.bonus}</Text></Text>
                  </View>
                  
                  <View style={s.detailSection}>
                    <Text style={s.sectionTitle}>Game Stats</Text>
                    <Text style={s.detailText}>Total Games: <Text style={{color: '#fff'}}>{user360.stats.totalGames}</Text></Text>
                    <Text style={s.detailText}>Wins: <Text style={{color: C.success}}>{user360.stats.wins}</Text></Text>
                    <Text style={s.detailText}>Losses: <Text style={{color: C.error}}>{user360.stats.losses}</Text></Text>
                  </View>
                </ScrollView>
              </View>
            ) : selectedUser && detailsLoading ? (
               <View style={s.detailsContainer}>
                 <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 100 }} />
               </View>
            ) : (
              // --- Search Input View ---
              <View style={s.searchContainer}>
                <View style={s.inputRow}>
                  <Ionicons name="search" size={20} color={C.onSurfaceVariant} style={{marginRight: 12}} />
                  <TextInput
                    ref={inputRef}
                    style={s.input}
                    placeholder={isEN ? "Search by name or phone..." : "በስም ወይም በስልክ ቁጥር ፈልግ..."}
                    placeholderTextColor={C.onSurfaceVariant}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={20} color={C.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={s.resultsContainer}>
                  {loading ? (
                    <ActivityIndicator color={C.primary} style={{marginTop: 20}} />
                  ) : results.length > 0 ? (
                    <ScrollView keyboardShouldPersistTaps="handled">
                      {results.map((r, i) => (
                        <TouchableOpacity 
                          key={r.id} 
                          style={[s.resultItem, i < results.length - 1 && {borderBottomWidth: 1, borderBottomColor: C.outlineVariant}]}
                          onPress={() => handleSelectUser(r)}
                        >
                          <View style={s.resultAvatar}>
                            <Text style={s.resultAvatarText}>{r.username?.[0]?.toUpperCase() || 'U'}</Text>
                          </View>
                          <View style={{flex: 1}}>
                            <Text style={s.resultName}>{r.username}</Text>
                            <Text style={s.resultPhone}>{r.number}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={C.onSurfaceVariant} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : search.length > 2 ? (
                    <View style={s.noResults}>
                      <Text style={s.noResultsText}>No users found.</Text>
                    </View>
                  ) : (
                    <View style={s.noResults}>
                      <Text style={s.noResultsText}>Type at least 3 characters...</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(23,23,50,0.4)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(68,68,107,0.15)',
    width: 240,
  },
  searchText: { color: C.onSurfaceVariant, fontSize: 13, flex: 1 },
  searchCmd: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 80 : 100,
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '80%',
  },
  
  // Search state
  searchContainer: {},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.outlineVariant,
    backgroundColor: C.surfaceContainer,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    outlineStyle: 'none' as any,
  },
  resultsContainer: {
    minHeight: 100,
    maxHeight: 400,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  resultAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(0,218,243,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  resultAvatarText: { color: C.primary, fontWeight: 'bold', fontSize: 16 },
  resultName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultPhone: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  noResults: { padding: 32, alignItems: 'center' },
  noResultsText: { color: C.onSurfaceVariant, fontSize: 14 },
  
  // Details state
  detailsContainer: {
    height: 400,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.outlineVariant,
    backgroundColor: C.surfaceContainer,
  },
  detailsTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  detailsScroll: { padding: 16, gap: 16 },
  detailSection: {
    backgroundColor: 'rgba(23,23,50,0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  sectionTitle: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 },
  detailText: { color: C.onSurfaceVariant, fontSize: 14, marginBottom: 8 },
});
