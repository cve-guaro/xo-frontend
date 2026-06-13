// app/(authed)/admin/promotion-links.tsx — Promotion Link Management
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, Modal, Switch, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL, APP_URL } from '../../../config';
import { AdminTheme as C } from './_layout';
import ActionConfirmModal from '../../../components/ActionConfirmModal';

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
  const { token, t, isSuperAdmin, showAlert, fixUrl } = useAuth();
  const [links, setLinks] = useState<PromotionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PromotionLink | null>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{type: 'delete' | 'toggle', link: PromotionLink} | null>(null);

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
        setLinks(Array.isArray(data) ? data : (data.links || []));
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

      const data = await res.json();
      if (res.ok) {
        setCreateModalVisible(false);
        setNewLink({ name: '', bonus_amount: '10', code: '', expires_at: '' });
        fetchLinks();
      } else {
        console.error('[admin/promotion/create] Server error:', data);
        showAlert('Error', 'Failed to create: ' + (data.error || 'Unknown error'));
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
        setClaims(Array.isArray(data) ? data : (data.claims || []));
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

  // Promotion Popup Tab State
  const [activeTab, setActiveTab] = useState<'links' | 'popup' | 'sms'>('links');
  const [popupHistory, setPopupHistory] = useState<any[]>([]);
  const [popupConfig, setPopupConfig] = useState({ image_url: '', display_duration: '5', expires_at: '', starts_at: '', is_active: false });
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);

  const fetchPopupConfig = useCallback(async () => {
    try {
      setPopupLoading(true);
      const res = await fetch(`${API_URL}/admin/promo-popup`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } });
      if (res.ok) { 
        const d = await res.json(); 
        setPopupHistory(d.popups || []);
      }
    } catch (e) { console.error('[promo-popup] fetch error', e); }
    finally { setPopupLoading(false); }
  }, [token]);

  useEffect(() => { if (activeTab === 'popup') fetchPopupConfig(); }, [activeTab, fetchPopupConfig]);

  const savePopupConfig = async () => {
    // If we're making this new one active, we should check if another one is active. (Backend handles this by turning others off)
    try {
      setPopupSaving(true);
      const res = await fetch(`${API_URL}/admin/promo-popup`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify({ image_url: popupConfig.image_url, display_duration: Number(popupConfig.display_duration), expires_at: popupConfig.expires_at || null, starts_at: popupConfig.starts_at || null, is_active: popupConfig.is_active })
      });
      if (res.ok) {
        showAlert('Success', 'New popup created!');
        setPopupConfig({ image_url: '', display_duration: '5', expires_at: '', starts_at: '', is_active: false });
        setShowAddPopup(false);
        fetchPopupConfig();
      } else { const d = await res.json(); showAlert('Error', 'Save failed: ' + (d.error || 'Unknown error')); }
    } catch (e) { console.error('[promo-popup] save error', e); }
    finally { setPopupSaving(false); }
  };

  const togglePopupStatus = async (id: number, currentStatus: boolean) => {
    try {
      setPopupLoading(true);
      const res = await fetch(`${API_URL}/admin/promo-popup/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        fetchPopupConfig();
      } else {
        showAlert('Error', 'Failed to update popup status');
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Network error');
    } finally {
      setPopupLoading(false);
    }
  };

  const [popupToDelete, setPopupToDelete] = useState<number | null>(null);

  const deletePopup = async (id: number) => {
    try {
      setPopupLoading(true);
      const res = await fetch(`${API_URL}/admin/promo-popup/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      if (res.ok) {
        showAlert('Success', 'Popup deleted successfully');
        fetchPopupConfig();
      } else {
        const d = await res.json();
        showAlert('Error', 'Failed to delete popup: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Network error');
    } finally {
      setPopupLoading(false);
      setPopupToDelete(null);
    }
  };

  const handleImageUpload = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      setPopupSaving(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/admin/upload-promo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPopupConfig({ ...popupConfig, image_url: data.url });
      } else {
        showAlert('Error', 'Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Upload failed');
    } finally {
      setPopupSaving(false);
    }
  };

  // Bulk SMS State
  const [smsForm, setSmsForm] = useState({
    message: '',
    targetMode: 'all', // 'all' or 'specific'
    role: 'all', // 'all', 'user', 'admin', 'maintenance_admin', 'superadmin'
    balanceRange: 'all', // 'all', '0-100', '100-1000', '1000-10000', '10000-100000'
    specificPhone: ''
  });
  const [smsSending, setSmsSending] = useState(false);
  const [smsHistory, setSmsHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmSms, setConfirmSms] = useState(false);

  // Live preview states
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Helper to calculate character and segment metrics
  const getSmsStats = (text: string, targetCount: number) => {
    if (!text) return { chars: 0, segments: 0, cost: 0, isUnicode: false };
    const chars = text.length;
    const isUnicode = /[^\u0000-\u007F]/.test(text); 
    let segments = 1;
    if (isUnicode) {
      segments = chars <= 70 ? 1 : Math.ceil(chars / 67);
    } else {
      segments = chars <= 160 ? 1 : Math.ceil(chars / 153);
    }
    // Estimated cost logic: 0.20 ETB per segment per message
    const cost = targetCount * segments * 0.20;
    return { chars, segments, cost, isUnicode };
  };

  const fetchPreviewCount = useCallback(async () => {
    try {
      setPreviewLoading(true);
      const payload: any = {};
      if (smsForm.targetMode === 'specific') {
        if (smsForm.specificPhone) {
          payload.specific_phone = smsForm.specificPhone;
        } else {
          if (smsForm.role !== 'all') payload.role = smsForm.role;
          if (smsForm.balanceRange !== 'all') {
            const [min, max] = smsForm.balanceRange.split('-');
            if (min) payload.min_balance = Number(min);
            if (max) payload.max_balance = Number(max);
          }
        }
      }

      const res = await fetch(`${API_URL}/admin/bulk-sms/preview`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-platform': 'web'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewCount(data.count || 0);
      }
    } catch (e) {
      console.error('[admin/sms-preview-count]', e);
    } finally {
      setPreviewLoading(false);
    }
  }, [token, smsForm.targetMode, smsForm.role, smsForm.balanceRange, smsForm.specificPhone]);

  useEffect(() => {
    if (activeTab === 'sms') {
      fetchPreviewCount();
    }
  }, [activeTab, fetchPreviewCount]);

  const fetchSmsHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_URL}/admin/bulk-sms/history`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      if (res.ok) {
        const data = await res.json();
        setSmsHistory(data.history || []);
      }
    } catch (e) {
      console.error('[admin/sms-history]', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'sms') fetchSmsHistory();
  }, [activeTab, fetchSmsHistory]);

  const sendBulkSms = async () => {
    if (!smsForm.message.trim()) {
      showAlert('Validation', 'Message cannot be empty');
      setConfirmSms(false);
      return;
    }
    
    try {
      setSmsSending(true);
      const payload: any = { message: smsForm.message };
      
      if (smsForm.targetMode === 'specific') {
        if (smsForm.specificPhone) {
          payload.specific_phone = smsForm.specificPhone;
        } else {
          if (smsForm.role !== 'all') payload.role = smsForm.role;
          if (smsForm.balanceRange !== 'all') {
            const [min, max] = smsForm.balanceRange.split('-');
            if (min) payload.min_balance = Number(min);
            if (max) payload.max_balance = Number(max);
          }
        }
      }

      const res = await fetch(`${API_URL}/admin/bulk-sms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-platform': 'web' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Success', `Successfully queued ${data.queuedCount || 0} messages.`);
        setSmsForm({ ...smsForm, message: '', specificPhone: '' });
        setConfirmSms(false);
        fetchSmsHistory();
      } else {
        showAlert('Error', 'Failed: ' + (data.error || 'Unknown error'));
        setConfirmSms(false);
      }
    } catch (e) {
      showAlert('Error', 'Network error');
      setConfirmSms(false);
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 8 }}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'links' && styles.tabBtnActive]} onPress={() => setActiveTab('links')}>
          <Ionicons name="link" size={16} color={activeTab === 'links' ? '#0c0c1f' : '#a78bfa'} />
          <Text style={[styles.tabBtnText, activeTab === 'links' && styles.tabBtnTextActive]}>Referral Links</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'popup' && styles.tabBtnActive]} onPress={() => setActiveTab('popup')}>
          <Ionicons name="image" size={16} color={activeTab === 'popup' ? '#0c0c1f' : '#a78bfa'} />
          <Text style={[styles.tabBtnText, activeTab === 'popup' && styles.tabBtnTextActive]}>Promotion Popup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'sms' && styles.tabBtnActive]} onPress={() => setActiveTab('sms')}>
          <Ionicons name="chatbubbles" size={16} color={activeTab === 'sms' ? '#0c0c1f' : '#a78bfa'} />
          <Text style={[styles.tabBtnText, activeTab === 'sms' && styles.tabBtnTextActive]}>Bulk SMS</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'popup' ? (
        /* ═══ Promotion Popup Config ═══ */
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.popupCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <View>
                <Text style={{ color: '#e5e3ff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Game Entry Popups</Text>
                <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 12 }}>Manage popups shown to users. Only one can be active at a time.</Text>
              </View>
              <TouchableOpacity 
                style={[styles.addBtn, (popupHistory.some(p => p.is_active) && !showAddPopup) && { opacity: 0.5 }]} 
                onPress={() => {
                  if (popupHistory.some(p => p.is_active)) {
                    showAlert('Cannot Add', 'Please turn off the active popup first.');
                  } else {
                    setShowAddPopup(true);
                  }
                }}
                disabled={popupHistory.some(p => p.is_active) || showAddPopup}
              >
                <Ionicons name="add" size={16} color="#0c0c1f" />
                <Text style={styles.addBtnText}>New Popup</Text>
              </TouchableOpacity>
            </View>

            {popupLoading && !popupHistory.length ? <ActivityIndicator color={C.primary} style={{ padding: 40 }} /> : null}

            {showAddPopup ? (
              <View style={[styles.popupCard, { marginBottom: 24, padding: 20, backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create New Popup</Text>
                  <TouchableOpacity onPress={() => setShowAddPopup(false)}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 20 }}>
                  <View>
                    <Text style={styles.formLabel}>Promotion Image</Text>
                    {popupConfig.image_url ? (
                      <View style={styles.imagePreview}>
                        <Image 
                          source={{ uri: fixUrl(popupConfig.image_url) || undefined }} 
                          style={{ width: '100%', height: 160, borderRadius: 12 }} 
                          resizeMode="contain"
                        />
                        <TouchableOpacity style={styles.replaceBtn} onPress={() => setPopupConfig({ ...popupConfig, image_url: '' })}>
                          <Ionicons name="swap-horizontal" size={14} color="#fff" /><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Replace Image</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.dropZone, { padding: 30 }]} onPress={() => Platform.OS === 'web' && document.getElementById('promo-image-upload')?.click()}>
                        <Ionicons name="cloud-upload-outline" size={32} color="rgba(167,139,250,0.3)" />
                        <Text style={{ color: '#a78bfa', fontSize: 12, marginTop: 8 }}>Click to upload image</Text>
                      </TouchableOpacity>
                    )}
                    {Platform.OS === 'web' && (
                      <input 
                        type="file" id="promo-image-upload" style={{ display: 'none' }} accept="image/*" 
                        onChange={handleImageUpload} 
                      />
                    )}
                    <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Or enter URL here..." placeholderTextColor="rgba(168,167,212,0.3)" value={popupConfig.image_url} onChangeText={t => setPopupConfig({ ...popupConfig, image_url: t })} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Duration (seconds)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={popupConfig.display_duration} onChangeText={t => setPopupConfig({ ...popupConfig, display_duration: t })} />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Start Date & Time (optional)</Text>
                      {Platform.OS === 'web' ? (
                        <input
                          type="datetime-local"
                          value={popupConfig.starts_at || ''}
                          onChange={(e: any) => setPopupConfig({ ...popupConfig, starts_at: e.target.value })}
                          style={{
                            height: 52,
                            backgroundColor: 'rgba(167,139,250,0.08)',
                            border: '1px solid rgba(167,139,250,0.3)',
                            borderRadius: 16,
                            paddingLeft: 16,
                            paddingRight: 16,
                            color: '#e5e3ff',
                            fontSize: 14,
                            fontWeight: '700',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box' as any,
                          }}
                        />
                      ) : (
                        <TextInput style={styles.input} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor="rgba(168,167,212,0.3)" value={popupConfig.starts_at} onChangeText={t => setPopupConfig({ ...popupConfig, starts_at: t })} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Expiry Date & Time (optional)</Text>
                      {Platform.OS === 'web' ? (
                        <input
                          type="datetime-local"
                          value={popupConfig.expires_at || ''}
                          onChange={(e: any) => setPopupConfig({ ...popupConfig, expires_at: e.target.value })}
                          style={{
                            height: 52,
                            backgroundColor: 'rgba(167,139,250,0.08)',
                            border: '1px solid rgba(167,139,250,0.3)',
                            borderRadius: 16,
                            paddingLeft: 16,
                            paddingRight: 16,
                            color: '#e5e3ff',
                            fontSize: 14,
                            fontWeight: '700',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box' as any,
                          }}
                        />
                      ) : (
                        <TextInput style={styles.input} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor="rgba(168,167,212,0.3)" value={popupConfig.expires_at} onChangeText={t => setPopupConfig({ ...popupConfig, expires_at: t })} />
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(167,139,250,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)' }}>
                    <View>
                      <Text style={{ color: '#e5e3ff', fontSize: 14, fontWeight: '700' }}>Activate Immediately</Text>
                      <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 11 }}>This will be shown to users upon entry</Text>
                    </View>
                    <Switch value={popupConfig.is_active} onValueChange={v => setPopupConfig({ ...popupConfig, is_active: v })} trackColor={{ false: '#333', true: 'rgba(0,227,253,0.3)' }} thumbColor={popupConfig.is_active ? '#00e3fd' : '#666'} />
                  </View>

                  <TouchableOpacity style={[styles.saveBtn, popupSaving && { opacity: 0.5 }]} onPress={savePopupConfig} disabled={popupSaving}>
                    {popupSaving ? <ActivityIndicator color="#004d57" /> : <Text style={styles.saveBtnText}>Save Popup</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              {popupHistory.length === 0 && !popupLoading && (
                <View style={[styles.emptyState, { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 16 }]}>
                  <Ionicons name="images-outline" size={40} color="rgba(168,167,212,0.2)" />
                  <Text style={styles.emptyText}>No Popups Yet</Text>
                  <Text style={styles.emptySubtext}>Create your first promotion popup.</Text>
                </View>
              )}
              {popupHistory.map((popup) => (
                <View key={popup.id} style={{ flexDirection: 'row', backgroundColor: 'rgba(24, 24, 27, 0.65)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: popup.is_active ? '#00e3fd' : 'rgba(167,139,250,0.1)', alignItems: 'center' }}>
                  <Image source={{ uri: fixUrl(popup.image_url) || "" }} style={{ width: 60, height: 60, borderRadius: 10, marginRight: 16, backgroundColor: '#000' }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>Popup #{popup.id}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}><Ionicons name="time-outline" size={10} /> {popup.display_duration}s</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}><Ionicons name="calendar-outline" size={10} /> {formatDate(popup.created_at)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Switch 
                        value={popup.is_active} 
                        onValueChange={() => togglePopupStatus(popup.id, popup.is_active)} 
                        trackColor={{ false: '#333', true: 'rgba(0,227,253,0.3)' }} 
                        thumbColor={popup.is_active ? '#00e3fd' : '#666'} 
                        disabled={!popup.is_active && popupHistory.some(p => p.is_active && p.id !== popup.id)}
                      />
                      <Text style={{ color: popup.is_active ? '#00e3fd' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', marginTop: 4 }}>
                        {popup.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setPopupToDelete(popup.id)}
                      style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(253,111,133,0.1)', borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)', alignItems: 'center', justifyContent: 'center' }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fd6f85" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : activeTab === 'sms' ? (
        /* ═══ Bulk SMS Tab ═══ */
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.popupCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={{ color: '#e5e3ff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Targeted Bulk SMS</Text>
                <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 12 }}>Send promotional messages directly to user phones using detailed filters.</Text>
              </View>
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: '#a78bfa', paddingHorizontal: 12, paddingVertical: 8, height: 'auto' }]} 
                onPress={async () => {
                  try {
                    let url = `${API_URL}/admin/bulk-sms/preview?targetMode=${smsForm.targetMode}`;
                    if (smsForm.targetMode === 'specific') {
                      if (smsForm.specificPhone) url += `&specific_phone=${encodeURIComponent(smsForm.specificPhone)}`;
                      else {
                        if (smsForm.role !== 'all') url += `&role=${smsForm.role}`;
                        if (smsForm.balanceRange !== 'all') {
                          const [min, max] = smsForm.balanceRange.split('-');
                          if (min) url += `&min_balance=${min}`;
                          if (max) url += `&max_balance=${max}`;
                        }
                      }
                    }
                    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } });
                    const json = await res.json();
                    if (res.ok && json.users) {
                      const csv = json.users.map((u: any) => `${u.username || ''}, ${u.name || ''}, ${u.phone || ''}`).join('\n');
                      if (Platform.OS === 'web' && navigator?.clipboard) {
                         navigator.clipboard.writeText(csv);
                         showAlert('Copied', `Copied ${json.users.length} users' aggregated data to clipboard`);
                      } else {
                         showAlert('Copied', `Found ${json.users.length} users. Copy is only supported on Web.`);
                      }
                    } else {
                      showAlert('Error', 'Failed to fetch audience list');
                    }
                  } catch (e) {
                    showAlert('Error', 'Network error');
                  }
                }}
              >
                <Ionicons name="copy-outline" size={16} color="#0c0c1f" style={{ marginRight: 2 }} />
                <Text style={[styles.addBtnText, { fontSize: 11 }]}>Copy / Export User Data</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 20 }}>
              <View>
                <Text style={styles.formLabel}>Message Body</Text>
                <TextInput 
                  style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 16 }]} 
                  multiline 
                  placeholder="Enter SMS message here..." 
                  placeholderTextColor="rgba(168,167,212,0.3)" 
                  value={smsForm.message} 
                  onChangeText={t => setSmsForm({ ...smsForm, message: t })} 
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(167,139,250,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)' }}>
                <View>
                  <Text style={{ color: '#e5e3ff', fontSize: 14, fontWeight: '700' }}>Target Audience</Text>
                  <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 11 }}>{smsForm.targetMode === 'all' ? 'Sending to ALL users' : 'Using specific filters'}</Text>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#09090b', borderRadius: 8, padding: 4 }}>
                  <TouchableOpacity 
                    style={[styles.modeBtn, smsForm.targetMode === 'all' && styles.modeBtnActive]} 
                    onPress={() => setSmsForm({ ...smsForm, targetMode: 'all' })}
                  >
                    <Text style={[styles.modeBtnText, smsForm.targetMode === 'all' && styles.modeBtnTextActive]}>All Users</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modeBtn, smsForm.targetMode === 'specific' && styles.modeBtnActive]} 
                    onPress={() => setSmsForm({ ...smsForm, targetMode: 'specific' })}
                  >
                    <Text style={[styles.modeBtnText, smsForm.targetMode === 'specific' && styles.modeBtnTextActive]}>Specific</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {smsForm.targetMode === 'specific' && (
                <View style={{ gap: 16, padding: 16, backgroundColor: 'rgba(24, 24, 27, 0.65)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' }}>
                  <Text style={[styles.formLabel, { color: C.secondary }]}>Targeting Filters</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 16, zIndex: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>User Role</Text>
                      {Platform.OS === 'web' ? (
                        <select 
                          style={styles.webSelect} 
                          value={smsForm.role} 
                          onChange={(e) => setSmsForm({ ...smsForm, role: e.target.value })}
                          disabled={!!smsForm.specificPhone}
                        >
                          <option value="all" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>Any Role</option>
                          <option value="user" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>User</option>
                          <option value="admin" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>Admin</option>
                          <option value="maintenance" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>Maintenance Admin</option>
                          <option value="superadmin" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>Superadmin</option>
                        </select>
                      ) : (
                        <TextInput style={[styles.input, !!smsForm.specificPhone && { opacity: 0.5 }]} placeholder="Role..." value={smsForm.role} editable={!smsForm.specificPhone} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Balance Range</Text>
                      {Platform.OS === 'web' ? (
                        <select 
                          style={styles.webSelect} 
                          value={smsForm.balanceRange} 
                          onChange={(e) => setSmsForm({ ...smsForm, balanceRange: e.target.value })}
                          disabled={!!smsForm.specificPhone}
                        >
                          <option value="all" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>Any Balance</option>
                          <option value="0-100" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>0 - 100 ETB</option>
                          <option value="100-1000" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>100 - 1,000 ETB</option>
                          <option value="1000-10000" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>1,000 - 10,000 ETB</option>
                          <option value="10000-100000" style={{ backgroundColor: '#09090b', color: '#e5e3ff' }}>10,000 - 100,000 ETB</option>
                        </select>
                      ) : (
                        <TextInput style={[styles.input, !!smsForm.specificPhone && { opacity: 0.5 }]} placeholder="Range..." value={smsForm.balanceRange} editable={!smsForm.specificPhone} />
                      )}
                    </View>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.formLabel}>Specific Phone Number (Overrides other filters)</Text>
                    <TextInput 
                      style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                      placeholder="+251..., 09..." 
                      placeholderTextColor="rgba(168,167,212,0.3)" 
                      value={smsForm.specificPhone} 
                      onChangeText={t => setSmsForm({ ...smsForm, specificPhone: t })} 
                      multiline={true}
                      numberOfLines={3}
                    />
                    {!!smsForm.specificPhone && (
                      <Text style={{ color: '#00e3fd', fontSize: 11, marginTop: 4 }}>Note: Role and Balance filters are ignored when a specific phone is provided.</Text>
                    )}
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1 }, !smsForm.message.trim() && { opacity: 0.5 }]} onPress={() => setConfirmSms(true)} disabled={!smsForm.message.trim() || smsSending}>
                  {smsSending ? <ActivityIndicator color="#004d57" /> : <Text style={styles.saveBtnText}>Send</Text>}
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#a78bfa', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                 {previewLoading ? 'Calculating audience...' : `Estimated Audience: ${previewCount ?? 0} users`}
              </Text>
              <ActionConfirmModal
                visible={confirmSms}
                title="Confirm Bulk SMS"
                message={`You are about to queue this SMS to ${smsForm.targetMode === 'all' ? 'ALL USERS' : (smsForm.specificPhone ? `user ${smsForm.specificPhone}` : 'users matching the selected filters')}.\n\nThis action cannot be undone and will incur SMS costs.`}
                confirmText="Yes, Send Now"
                confirmColor="red"
                iconName="warning-outline"
                isLoading={smsSending}
                onCancel={() => setConfirmSms(false)}
                onConfirm={sendBulkSms}
              />
            </View>
          </View>
          
          {/* SMS History Section */}
          <View style={[styles.popupCard, { marginTop: 20 }]}>
             <Text style={{ color: '#e5e3ff', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>Campaign History</Text>
             {historyLoading ? (
               <ActivityIndicator color={C.primary} style={{ padding: 20 }} />
             ) : smsHistory.length === 0 ? (
               <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 12, fontStyle: 'italic' }}>No SMS campaigns sent yet.</Text>
             ) : (
               <View style={{ gap: 12 }}>
                 {smsHistory.map((item, idx) => {
                    const filters = typeof item.filters === 'string' ? JSON.parse(item.filters) : (item.filters || {});
                    let targetDesc = "All Users";
                    if (filters.specific_phone) targetDesc = `Phone: ${filters.specific_phone}`;
                    else if (filters.role || filters.min_balance) targetDesc = `Role: ${filters.role || 'Any'}, Balance: ${filters.min_balance || 0}-${filters.max_balance || '∞'}`;
                    
                    return (
                     <View key={item.id || idx} style={{ padding: 12, backgroundColor: 'rgba(24, 24, 27, 0.65)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.2)' }}>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                         <Text style={{ color: '#e5e3ff', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{item.message}</Text>
                       </View>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                         <View>
                           <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 10 }}>Target: {targetDesc}</Text>
                           <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 10 }}>Sent by: {item.admin_name || 'Admin'} • {formatDate(item.created_at)}</Text>
                         </View>
                         <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '700' }}>{item.success_count} / {item.target_count}</Text>
                           <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 9 }}>Delivered</Text>
                         </View>
                       </View>
                     </View>
                    );
                 })}
               </View>
             )}
          </View>
        </ScrollView>
      ) : (
      /* ═══ Referral Links Tab (existing) ═══ */
      <View style={{ flex: 1 }}>
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
                      {`${APP_URL}/?promo=${link.code}`}
                    </Text>
                  </View>
                  <Switch 
                    value={link.is_active} 
                    onValueChange={() => setConfirmAction({ type: 'toggle', link })}
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
                    style={[styles.actionBtn, { borderColor: copiedId === link.id ? '#34d399' : '#00daf3' }]} 
                    onPress={() => {
                      const url = `${APP_URL}/?promo=${link.code}`;
                      if (Platform.OS === 'web' && navigator?.clipboard) {
                        navigator.clipboard.writeText(url);
                      }
                      setCopiedId(link.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                  >
                    <Ionicons name={copiedId === link.id ? "checkmark-circle" : "copy-outline"} size={16} color={copiedId === link.id ? '#34d399' : '#00daf3'} />
                    <Text style={[styles.actionBtnText, { color: copiedId === link.id ? '#34d399' : '#00daf3' }]}>{copiedId === link.id ? 'Copied!' : 'Copy Link'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: '#ff6f7c' }]} 
                    onPress={() => setConfirmAction({ type: 'delete', link })}
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
              <ScrollView style={{ maxHeight: 350, marginTop: 10 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={true}>
                {claims.map((c, i) => (
                  <View key={i} style={styles.claimItem}>
                    <View>
                      <Text style={styles.claimUser}>{c.username || 'Unknown User'}</Text>
                      <Text style={styles.claimPhone}>{c.number}</Text>
                    </View>
                    <Text style={styles.claimDate}>{formatDate(c.created_at || c.claimed_at)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    
      <ActionConfirmModal
        visible={!!confirmAction}
        title={confirmAction?.type === 'delete' ? 'Delete Promotion Link' : (confirmAction?.link.is_active ? 'Disable Link' : 'Enable Link')}
        message={
          confirmAction?.type === 'delete' 
            ? 'Are you sure you want to permanently delete this promotion link? All associated tracking data and claims will be removed. This cannot be undone.' 
            : `Are you sure you want to ${confirmAction?.link.is_active ? 'disable' : 'enable'} this promotion link? ${confirmAction?.link.is_active ? 'Users will no longer be able to claim it.' : 'Users will be able to claim it again.'}`
        }
        confirmText={confirmAction?.type === 'delete' ? 'Delete Link' : (confirmAction?.link.is_active ? 'Disable' : 'Enable')}
        confirmColor={confirmAction?.type === 'delete' ? 'red' : 'blue'}
        iconName={confirmAction?.type === 'delete' ? 'trash-outline' : 'power-outline'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'delete') {
            deleteLink(confirmAction.link.id);
          } else {
            toggleActive(confirmAction.link);
          }
          setConfirmAction(null);
        }}
      />
      </View>
      )}

      {/* Popup Delete Confirm — rendered outside tab conditional so it works on popup tab */}
      <ActionConfirmModal
        visible={popupToDelete !== null}
        title="Delete Promotion Popup"
        message="Are you sure you want to permanently delete this promotion popup? This cannot be undone."
        confirmText="Delete Popup"
        confirmColor="red"
        iconName="trash-outline"
        onCancel={() => setPopupToDelete(null)}
        onConfirm={() => {
          if (popupToDelete !== null) {
            deletePopup(popupToDelete);
          }
        }}
      />
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
    backgroundColor: 'rgba(24, 24, 27, 0.65)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.2)',
  },
  popupCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.65)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.2)',
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#34d399',
  },
  modeBtnText: {
    color: 'rgba(168,167,212,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#004d57',
  },
  webSelect: {
    height: 52,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#e5e3ff',
    fontSize: 14,
    fontWeight: '700',
    outline: 'none',
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
    backgroundColor: 'rgba(24, 24, 27, 0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.2)',
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
    backgroundColor: '#18181b',
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
  // Tab styles
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
  },
  tabBtnActive: {
    backgroundColor: '#00e3fd',
    borderColor: '#00e3fd',
  },
  tabBtnText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#0c0c1f',
  },
  // Popup config styles
  imagePreview: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 8,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.2)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#00e3fd',
  },
  addBtnText: {
    color: '#0c0c1f',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  }
});