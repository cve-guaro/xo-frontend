import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/authContext';
import { API_URL } from '../config';
import User360View from './User360View';

import { useAdminTheme } from '../app/(authed)/admin/_layout';

export default function AdminGlobalSearch() {
  const { theme: C, isDark } = useAdminTheme();
  const s = useMemo(() => getStyles(C, isDark), [C, isDark]);
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

  const router = useRouter();

  const handleSelectUser = (user: any) => {
    setModalVisible(false);
    router.push(`/admin/user-detail?id=${user.id}` as any);
  };

  return (
    <>
      <TouchableOpacity 
        style={s.searchWrap} 
        activeOpacity={0.7} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="search" size={16} color={C.onSurfaceVariant} />
        <Text style={s.searchText}>{isEN ? 'Search users, transactions, rooms...' : 'ተጠቃሚዎችን፣ ዝውውሮችን፣ ክፍሎችን ፈልግ...'}</Text>
        <View style={s.searchCmd}><Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700' }}>⌘K</Text></View>
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
                
                <View style={{ flex: 1, padding: 16 }}>
                  <User360View data={user360} hideActions={true} />
                </View>
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

const getStyles = (C: any, isDark: boolean) => StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: isDark ? 'rgba(12,20,36,0.7)' : '#F1F5F9',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, 
    borderColor: isDark ? '#19273E' : '#E2E8F0',
    width: 320,
  },
  searchText: { color: C.onSurfaceVariant, fontSize: 13, flex: 1 },
  searchCmd: { 
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', 
    paddingHorizontal: 6, paddingVertical: 2, 
    borderRadius: 4, borderWidth: 1, 
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1' 
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 80 : 100,
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border || C.outlineVariant,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.5 : 0.15,
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
    borderBottomColor: C.border || C.outlineVariant,
    backgroundColor: isDark ? C.surfaceContainerLowest || '#060A13' : '#F8FAFC',
  },
  input: {
    flex: 1,
    color: C.onSurface,
    fontSize: 15,
    outlineStyle: 'none' as any,
  },
  resultsContainer: {
    minHeight: 100,
    maxHeight: 400,
    backgroundColor: C.surface,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  resultAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: isDark ? 'rgba(255,45,85,0.12)' : '#FFE4E6',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  resultAvatarText: { color: C.primary, fontWeight: 'bold', fontSize: 16 },
  resultName: { color: C.onSurface, fontSize: 14, fontWeight: '700' },
  resultPhone: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  noResults: { padding: 32, alignItems: 'center' },
  noResultsText: { color: C.onSurfaceVariant, fontSize: 14 },
  
  // Details state
  detailsContainer: {
    flex: 1,
    minHeight: 520,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border || C.outlineVariant,
    backgroundColor: isDark ? C.surfaceContainerLowest || '#060A13' : '#F8FAFC',
  },
  detailsTitle: { color: C.onSurface, fontSize: 16, fontWeight: '800' },
  detailsScroll: { padding: 16, gap: 16 },
  detailSection: {
    backgroundColor: isDark ? '#0C1424' : '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border || C.outlineVariant,
  },
  sectionTitle: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 },
  detailText: { color: C.onSurfaceVariant, fontSize: 14, marginBottom: 8 },
});
