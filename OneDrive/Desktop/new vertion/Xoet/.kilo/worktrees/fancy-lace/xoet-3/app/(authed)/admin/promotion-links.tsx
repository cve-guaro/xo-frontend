// app/(authed)/admin/promotion-links.tsx — Promotion Link Management
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

interface PromotionLink {
  id: string;
  code: string;
  name: string;
  bonus_amount: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  total_claims: number;
  total_registrations: number;
}

export default function PromotionLinks() {
  const { token, t, isSuperAdmin } = useAuth();
  const [links, setLinks] = useState<PromotionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PromotionLink | null>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  // Create form state
  const [newLink, setNewLink] = useState({
    name: '',
    bonus_amount: '10',
    code: '',
    expires_at: ''
  });

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/promotion-links`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (e) {
      console.error('[admin/promotion]', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const createLink = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/promotion-links`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-platform': 'web' 
        },
        body: JSON.stringify({
          name: newLink.name,
          bonus_amount: Number(newLink.bonus_amount),
          code: newLink.code.trim().toUpperCase() || undefined,
          expires_at: newLink.expires_at || null
        })
      });

      if (res.ok) {
        setCreateModalVisible(false);
        setNewLink({ name: '', bonus_amount: '10', code: '', expires_at: '' });
        fetchLinks();
      }
    } catch (e) {
      console.error('[admin/promotion/create]', e);
    }
  };

  const toggleActive = async (link: PromotionLink) => {
    try {
      await fetch(`${API_URL}/admin/promotion-links/${link.id}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-platform': 'web' 
        },
        body: JSON.stringify({ is_active: !link.is_active })
      });
      fetchLinks();
    } catch (e) {
      console.error('[admin/promotion/toggle]', e);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      await fetch(`${API_URL}/admin/promotion-links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      setSelectedLink(null);
      fetchLinks();
    } catch (e) {
      console.error('[admin/promotion/delete]', e);
    }
  };

  const loadClaims = async (link: PromotionLink) => {
    try {
      setClaimsLoading(true);
      const res = await fetch(`${API_URL}/admin/promotion-links/${link.id}/claims`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (e) {
      console.error('[admin/promotion/claims]', e);
    } finally {
      setClaimsLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString() + ' ' + new Date(iso).toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Promotion Links</Text>
          <Text style={styles.subtitle}>Track and manage referral promotion campaigns</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Ionicons name="add-circle" size={18} color="#0c0c1f" />
          <Text style={styles.createBtnText}>New Link</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Links</Text>
          <Text style={styles.statValue}>{links.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Registrations</Text>
          <Text style={styles.statValue}>{links.reduce((sum, l) => sum + l.total_registrations, 0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active</Text>
          <Text style={styles.statValue}>{links.filter(l => l.is_active).length}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list}>
          {links.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="link-outline" size={48} color="rgba(167,139,250,0.2)" />
              <Text style={styles.emptyText}>No promotion links yet</Text>
              <Text style={styles.emptySubtext}>Create your first promotion campaign above</Text>
            </View>
          ) : (
            links.map(link => (
              <View key={link.id} style={styles.linkCard}>
                <View style={styles.linkHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkName}>{link.name}</Text>
                    <Text style={styles.linkCode}>
                      {`${API_URL.replace('/api', '')}?promo=${link.code}`}
                    </Text>
                  </View>
                  <Switch 
                    value={link.is_active} 
                    onValueChange={() => toggleActive(link)}
                    trackColor={{ false: '#333', true: 'rgba(0,227,253,0.3)' }}
                    thumbColor={link.is_active ? '#00e3fd' : '#666'}
                  />
                </View>

                <View style={styles.linkStats}>
                  <View style={styles.linkStat}>
                    <Text style={styles.linkStatLabel}>Bonus</Text>
                    <Text style={styles.linkStatValue}>ETB {link.bonus_amount}</Text>
                  </View>
                  <View style={styles.linkStat}>
                    <Text style={styles.linkStatLabel}>Registrations</Text>
                    <Text style={styles.linkStatValue}>{link.total_registrations}</Text>
                  </View>
                  <View style={styles.linkStat}>
                    <Text style={styles.linkStatLabel}>Claimed</Text>
                    <Text style={styles.linkStatValue}>{link.total_claims}</Text>
                  </View>
                  <View style={styles.linkStat}>
                    <Text style={styles.linkStatLabel}>Created</Text>
                    <Text style={styles.linkStatValue}>{formatDate(link.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.linkActions}>
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => { setSelectedLink(link); loadClaims(link); }}
                  >
                    <Ionicons name="eye-outline" size={16} color="#a78bfa" />
                    <Text style={styles.actionBtnText}>View Claims</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: '#ff6f7c' }]} 
                    onPress={() => deleteLink(link.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ff6f7c" />
                    <Text style={[styles.actionBtnText, { color: '#ff6f7c' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Promotion Link</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View>
                <Text style={styles.formLabel}>Campaign Name</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. Social Media Launch"
                  value={newLink.name}
                  onChangeText={t => setNewLink({ ...newLink, name: t })}
                />
              </View>

              <View>
                <Text style={styles.formLabel}>Bonus Amount (ETB)</Text>
                <TextInput 
                  style={styles.input}
                  keyboardType="numeric"
                  value={newLink.bonus_amount}
                  onChangeText={t => setNewLink({ ...newLink, bonus_amount: t })}
                />
              </View>

              <View>
                <Text style={styles.formLabel}>Custom Code (optional)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Leave empty for auto-generated"
                  autoCapitalize="characters"
                  value={newLink.code}
                  onChangeText={t => setNewLink({ ...newLink, code: t })}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={createLink} disabled={!newLink.name}>
                <Text style={styles.saveBtnText}>Create Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Claims Detail Modal */}
      <Modal visible={!!selectedLink} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedLink?.name}</Text>
                <Text style={styles.modalSubtitle}>Code: {selectedLink?.code}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedLink(null); setClaims([]); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {claimsLoading ? (
              <ActivityIndicator color={C.primary} style={{ padding: 40 }} />
            ) : claims.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No claims yet for this promotion</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {claims.map((c, i) => (
                  <View key={i} style={styles.claimItem}>
                    <View>
                      <Text style={styles.claimUser}>{c.username || 'Unknown User'}</Text>
                      <Text style={styles.claimPhone}>{c.number}</Text>
                    </View>
                    <Text style={styles.claimDate}>{formatDate(c.claimed_at)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#060614',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#e5e3ff',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(168,167,212,0.55)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  createBtn: {
    backgroundColor: C.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createBtnText: {
    color: '#0c0c1f',
    fontWeight: '800',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(23,23,50,0.4)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(68,68,107,0.1)',
  },
  statLabel: {
    color: 'rgba(168,167,212,0.6)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: '#e5e3ff',
    fontSize: 18,
    fontWeight: '800',
  },
  list: {
    flex: 1,
  },
  linkCard: {
    backgroundColor: 'rgba(23,23,50,0.4)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(68,68,107,0.1)',
    padding: 20,
    marginBottom: 12,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  linkName: {
    color: '#e5e3ff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  linkCode: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
  },
  linkStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  linkStat: {
    minWidth: 80,
  },
  linkStatLabel: {
    color: 'rgba(168,167,212,0.5)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  linkStatValue: {
    color: '#e5e3ff',
    fontSize: 14,
    fontWeight: '700',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  actionBtnText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#171732',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#e5e3ff',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: 'rgba(168,167,212,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  form: {
    gap: 16,
  },
  formLabel: {
    color: 'rgba(168,167,212,0.6)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#e5e3ff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#00e3fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#004d57',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    color: '#e5e3ff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtext: {
    color: 'rgba(168,167,212,0.5)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  claimItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  claimUser: {
    color: '#e5e3ff',
    fontSize: 14,
    fontWeight: '700',
  },
  claimPhone: {
    color: 'rgba(168,167,212,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  claimDate: {
    color: 'rgba(168,167,212,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
});