import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert, TextInput, ActivityIndicator, Image, useWindowDimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';
import ReferralDetailsModal from '../../../components/ReferralDetailsModal';

import { LinearGradient } from 'expo-linear-gradient';

const timeSince = (iso?: string) => {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

const glass: any = {
  backgroundColor: 'rgba(24, 24, 27, 0.65)',
};

export default function AdminSettings() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { t, token, user, language, switchLanguage, isSuperAdmin, showAlert } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Security Protocols');
  
  const [maintenance, setMaintenance] = useState(false);
  const [bonusActive, setBonusActive] = useState(false); // ← FIXED: was missing, causing crash
  const [bonusAmount, setBonusAmount] = useState('10'); // displayed in ETB (DB stores cents)
  const [emergencyLock, setEmergencyLock] = useState(false);
  const [mobileAppLock, setMobileAppLock] = useState(false);
  const [roomsLocked, setRoomsLocked] = useState(false);
  const [showOnlineCount, setShowOnlineCount] = useState(true);
  
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [minDeposit, setMinDeposit] = useState('50');

  // Master Security Switch AML config
  const [manualApproval, setManualApproval] = useState(false);
  const [autoPayoutThreshold, setAutoPayoutThreshold] = useState('2000');
  const [maxWithdrawAmount, setMaxWithdrawAmount] = useState('25000');
  const [maxWithdrawCount, setMaxWithdrawCount] = useState('3');

  // Referral system config
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [referralBonusAmount, setReferralBonusAmount] = useState('2');

  const [bonusLogs, setBonusLogs] = useState<any[]>([]);
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [showCreateGiveaway, setShowCreateGiveaway] = useState(false);
  const [newGiveaway, setNewGiveaway] = useState({
    title: '',
    description: '',
    amount: '10',
    type: 'NEW_USER',
    promo_code: '',
    starts_at: new Date().toISOString().split('T')[0],
    ends_at: ''
  });

  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; action: boolean }>({ visible: false, action: false });
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [showGiveawayClaims, setShowGiveawayClaims] = useState<string | null>(null);
  const [giveawayMeta, setGiveawayMeta] = useState<any>(null);
  const [claimsList, setClaimsList] = useState<any[]>([]);
  const [claimsSearch, setClaimsSearch] = useState('');
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimsPage, setClaimsPage] = useState(0);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const claimsLimit = 100;

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const [res, logRes, giveRes] = await Promise.all([
        fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } }),
        fetch(`${API_URL}/admin/bonus-logs`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } }),
        fetch(`${API_URL}/admin/giveaways`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } })
      ]);
      if (res.ok) {
        const data = await res.json();
        const config = data.config || data;
        if (config.welcome_bonus_amount) setBonusAmount(String(config.welcome_bonus_amount));
        if (config.min_withdraw_amount) setMinWithdrawal(String(config.min_withdraw_amount));
        if (config.min_deposit_amount) setMinDeposit(String(config.min_deposit_amount));
        
        if (config.welcome_bonus_active !== undefined) {
          setBonusActive(config.welcome_bonus_active === true || config.welcome_bonus_active === 'true');
        }
        setEmergencyLock(config.system_emergency_lockout === true || config.system_emergency_lockout === 'true');
        setMobileAppLock(config.mobile_app_lockout === true || config.mobile_app_lockout === 'true');
        setRoomsLocked(config.rooms_locked === true || config.rooms_locked === 'true');
        setShowOnlineCount(config.show_online_count !== false && config.show_online_count !== 'false');
        setManualApproval(config.is_manual_approval_enabled === true || config.is_manual_approval_enabled === 'true');
        if (config.max_daily_withdraw_amount) setMaxWithdrawAmount(String(config.max_daily_withdraw_amount));
        if (config.max_daily_withdraw_count) setMaxWithdrawCount(String(config.max_daily_withdraw_count));
        if (config.auto_payout_threshold) setAutoPayoutThreshold(String(config.auto_payout_threshold));
        // Referral settings
        if (config.referral_enabled !== undefined) {
          setReferralEnabled(config.referral_enabled === true || config.referral_enabled === 'true');
        }
        if (config.referral_bonus_amount) setReferralBonusAmount(String(config.referral_bonus_amount));
      }
      if (logRes.ok) {
        const d = await logRes.json();
        setBonusLogs(d.logs || []);
      }
      if (giveRes.ok) {
        const d = await giveRes.json();
        setGiveaways(d.giveaways || []);
      }
    } catch (e) { console.error('[admin/settings]', e); }
    finally { setLoading(false); }
  }, [token]);

  const handleCreateGiveaway = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/admin/giveaways`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify({
          ...newGiveaway,
          amount: Number(newGiveaway.amount)
        })
      });
      if (res.ok) {
        setShowCreateGiveaway(false);
        fetchConfig();
        showAlert('Success', 'Giveaway campaign created successfully.');
      }
    } catch (e) { showAlert('Error', 'Failed to create giveaway.'); }
    finally { setSaving(false); }
  };

  const handleDeleteGiveaway = async (id: number) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/admin/giveaways/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      if (res.ok) fetchConfig();
    } catch (e) {}
    finally { setSaving(false); }
  };

  const fetchClaims = useCallback(async (id: string, page: number) => {
    setLoadingClaims(true);
    try {
      const offset = page * claimsLimit;
      const res = await fetch(`${API_URL}/admin/giveaways/${id}/claims?limit=${claimsLimit}&offset=${offset}`, { headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } });
      if (res.ok) {
        const d = await res.json();
        setClaimsList(d.claims || []);
        setGiveawayMeta(d.giveaway);
        setClaimsTotal(d.total || 0);
      }
    } catch { }
    finally { setLoadingClaims(false); }
  }, [token]);

  const openClaims = (g: any) => {
    setShowGiveawayClaims(g.id);
    setClaimsPage(0);
    fetchClaims(g.id, 0);
  };

  useEffect(() => {
    if (showGiveawayClaims) {
      fetchClaims(showGiveawayClaims, claimsPage);
    }
  }, [claimsPage, fetchClaims, showGiveawayClaims]);

  const handleToggleBonus = (val: boolean) => {
    setConfirmModal({ visible: true, action: val });
  };

  const confirmBonusToggle = async () => {
    const val = confirmModal.action;
    setConfirmModal({ visible: false, action: val });
    setBonusActive(val);
    
    // Auto-save the config immediately so the audit gets tracked right now
    try {
      setSaving(true);
      const updates = { 
        welcome_bonus_active: val, 
        welcome_bonus_amount: String(bonusAmount) 
      };
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchConfig(); // Reload to populate the audit table immediately
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    // Client-side validations
    if (bonusActive) {
      const parsed = parseFloat(bonusAmount);
      if (isNaN(parsed) || parsed < 0) {
        showAlert('Validation Error', 'Welcome Bonus Amount must be a positive number or 0.');
        return;
      }
    }
    if (referralEnabled) {
      const parsed = parseFloat(referralBonusAmount);
      if (isNaN(parsed) || parsed < 0) {
        showAlert('Validation Error', 'Referral Bonus Amount must be a positive number or 0.');
        return;
      }
    }
    const parsedMinWithdraw = parseFloat(minWithdrawal);
    if (isNaN(parsedMinWithdraw) || parsedMinWithdraw <= 0) {
      showAlert('Validation Error', 'Minimum Withdrawal must be a positive number.');
      return;
    }
    const parsedMinDeposit = parseFloat(minDeposit);
    if (isNaN(parsedMinDeposit) || parsedMinDeposit <= 0) {
      showAlert('Validation Error', 'Minimum Deposit must be a positive number.');
      return;
    }
    if (manualApproval) {
      const parsedThreshold = parseFloat(autoPayoutThreshold);
      if (isNaN(parsedThreshold) || parsedThreshold <= 0) {
        showAlert('Validation Error', 'Auto-Payout Threshold must be a positive number.');
        return;
      }
      const parsedMaxWithdrawAmount = parseFloat(maxWithdrawAmount);
      if (isNaN(parsedMaxWithdrawAmount) || parsedMaxWithdrawAmount <= 0) {
        showAlert('Validation Error', 'Maximum Withdrawal Hard Limit must be a positive number.');
        return;
      }
      const parsedMaxWithdrawCount = parseInt(maxWithdrawCount, 10);
      if (isNaN(parsedMaxWithdrawCount) || parsedMaxWithdrawCount <= 0) {
        showAlert('Validation Error', 'Daily Transaction Count Limit must be a positive integer.');
        return;
      }
    }

    try {
      setSaving(true);
      const updates = { 
        welcome_bonus_active: bonusActive, 
        welcome_bonus_amount: String(bonusAmount),
        system_emergency_lockout: emergencyLock,
        mobile_app_lockout: mobileAppLock,
        rooms_locked: roomsLocked,
        min_withdraw_amount: String(minWithdrawal),
        min_deposit_amount: String(minDeposit),
        show_online_count: showOnlineCount,
        is_manual_approval_enabled: manualApproval,
        auto_payout_threshold: String(autoPayoutThreshold),
        max_daily_withdraw_amount: String(maxWithdrawAmount),
        max_daily_withdraw_count: String(maxWithdrawCount),
        referral_enabled: referralEnabled,
        referral_bonus_amount: String(referralBonusAmount)
      };
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchConfig(); // Reload to populate audit table
        showAlert('Configuration Saved', 'The system settings have been successfully updated across all nodes.');
      } else {
        const d = await res.json();
        showAlert('Error', d.error || 'Failed to update configuration.');
      }
    } catch (e) {
      showAlert('Error', 'Network request failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color={C.primary}/></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={[styles.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View>
          <Text style={[styles.pageTitle, isMobile && { fontSize: 24 }]}>{(t as any)('System Configuration')}</Text>
          <Text style={styles.pageSub}>{(t as any)('Manage security thresholds, financial limits, and administrator account settings.')}</Text>
        </View>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }, isMobile && { width: '100%' as any, justifyContent: 'center' }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={16} color="#fff" />}
          <Text style={styles.saveTxt}>{(t as any)('Save Settings')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 32 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
           {['Security Protocols', 'Financial Operations', 'Admin Profile'].map(tab => (
              <TouchableOpacity 
                 key={tab} 
                 onPress={() => setActiveTab(tab)}
                 style={{ 
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, 
                    backgroundColor: activeTab === tab ? C.primary : 'rgba(255,255,255,0.03)', 
                    borderWidth: 1, borderColor: activeTab === tab ? C.primaryContainer : C.outlineVariant 
                 }}
              >
                 <Text style={{ color: activeTab === tab ? '#0c0c1f' : '#e5e3ff', fontSize: 13, fontWeight: '800' }}>{t(tab as any) || tab}</Text>
              </TouchableOpacity>
           ))}
        </ScrollView>
      </View>

      <View style={styles.settingsGrid}>
        
        {/* Promotional Campaigns Tab */}
        {activeTab === 'Promotional Campaigns' && (
          <>
            {/* New Giveaway Manager */}
        <View style={[styles.card, glass, { borderColor: 'rgba(0, 218, 243, 0.3)', borderTopWidth: 4, borderTopColor: C.primary }]}>
          <View style={[styles.cardHeader, { borderBottomColor: 'rgba(166,140,255,0.2)' }]}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="rocket" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: C.primary }]}>{(t as any)('Promotional Giveaways')}</Text>
              <Text style={styles.cardSubTitle}>Advanced Acquisition & Retention Engine</Text>
            </View>
            <TouchableOpacity style={styles.addGiveawayBtn} onPress={() => setShowCreateGiveaway(true)}>
              <Ionicons name="add" size={18} color="#000" />
              <Text style={styles.addGiveawayTxt}>New Promotion</Text>
            </TouchableOpacity>
          </View>

          {giveaways.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="gift-outline" size={48} color="rgba(168,167,212,0.2)" />
              <Text style={{ color: 'rgba(168,167,212,0.4)', marginTop: 12 }}>No active promotions found.</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {giveaways.map((g, i) => (
                <View key={i} style={styles.giveawayItem}>
                   <View style={styles.giveawayInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.giveawayTitle}>{g.title}</Text>
                        <View style={[styles.giveawayBadge, { backgroundColor: g.status === 'ACTIVE' ? 'rgba(0,218,243,0.1)' : 'rgba(253,111,133,0.1)' }]}>
                           <Text style={[styles.giveawayBadgeTxt, { color: g.status === 'ACTIVE' ? C.secondary : C.error }]}>{g.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.giveawayMeta}>{g.type} • {g.amount} ETB • {g.claim_count} claims</Text>
                   </View>
                   <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={styles.giveawayActionBtn} onPress={() => openClaims(g)}>
                         <Ionicons name="stats-chart" size={14} color={C.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.giveawayActionBtn, { borderColor: 'rgba(253,111,133,0.2)' }]} 
                        onPress={() => handleDeleteGiveaway(g.id)}
                      >
                         <Ionicons name="trash-outline" size={14} color={C.error} />
                      </TouchableOpacity>
                   </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Acquisition Campaigns (Migrated UI) */}
        <View style={[styles.card, glass, { borderColor: 'rgba(0,218,243,0.3)', borderTopWidth: 4, borderTopColor: C.secondary }]}>
          <View style={[styles.cardHeader, { borderBottomColor: 'rgba(0,218,243,0.2)' }]}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="gift" size={20} color={C.secondary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.secondary }]}>{(t as any)('Global Legacy Toggles')}</Text>
              <Text style={styles.cardSubTitle}>Quick master switches for simple incentives</Text>
            </View>
          </View>

          <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
              <Text style={styles.settingName}>{(t as any)('Legacy Welcome Bonus')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('Traditional 1-click toggle for platform-wide registration bonus.')}</Text>
            </View>
            <View style={isMobile && { alignSelf: 'flex-end' }}>
              <Switch
                value={bonusActive}
                onValueChange={handleToggleBonus}
                thumbColor={bonusActive ? C.secondary : '#f4f3f4'}
                trackColor={{ false: 'rgba(39, 39, 42, 0.4)', true: 'rgba(0,218,243,0.3)' }}
              />
            </View>
          </View>

          {bonusActive && (
            <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.1)', paddingTop: 20 }]}>
              <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
                <Text style={styles.settingName}>Welcome Bonus Amount</Text>
                <Text style={styles.settingDesc}>Welcome bonus amount in ETB credited to new users upon registration.</Text>
              </View>
              <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
                <Text style={styles.currencyPrefix}>ETB</Text>
                <TextInput
                  style={styles.inputField}
                  value={bonusAmount}
                  onChangeText={setBonusAmount}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View>
          )}
        </View>

        {/* Referral System Card */}
        <View style={[styles.card, glass, { borderColor: 'rgba(16,185,129,0.3)', borderTopWidth: 4, borderTopColor: '#10b981' }]}>
          <View style={[styles.cardHeader, { borderBottomColor: 'rgba(16,185,129,0.2)' }]}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="share-social" size={20} color="#10b981" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: '#10b981' }]}>Referral System</Text>
              <Text style={styles.cardSubTitle}>Share & Earn — User Acquisition Engine</Text>
            </View>
          </View>

          <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
              <Text style={styles.settingName}>Enable Referral System</Text>
              <Text style={styles.settingDesc}>When enabled, users can share a referral link. New users who register via the link earn the referrer a non-withdrawable bonus.</Text>
            </View>
            <View style={[{flexDirection: 'row', alignItems: 'center', gap: 12}, isMobile && { alignSelf: 'flex-end', width: '100%', justifyContent: 'space-between' }]}>
              <TouchableOpacity onPress={() => setReferralModalVisible(true)} style={[styles.btnSecondary, { paddingHorizontal: 12, paddingVertical: 8 }]}>
                <Ionicons name="stats-chart" size={14} color="#10b981" />
                <Text style={[styles.btnSecondaryText, { color: '#10b981' }]}>Detailed Metrics</Text>
              </TouchableOpacity>

              <Switch
                value={referralEnabled}
                onValueChange={setReferralEnabled}
                thumbColor={referralEnabled ? '#10b981' : '#f4f3f4'}
                trackColor={{ false: 'rgba(39, 39, 42, 0.4)', true: 'rgba(16,185,129,0.3)' }}
              />
            </View>
          </View>

          {referralEnabled && (
            <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.1)', paddingTop: 20 }]}>
              <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
                <Text style={styles.settingName}>Referral Bonus Amount</Text>
                <Text style={styles.settingDesc}>Non-withdrawable bonus credited to the referrer per new user sign-up.</Text>
              </View>
              <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
                <Text style={styles.currencyPrefix}>ETB</Text>
                <TextInput
                  style={styles.inputField}
                  value={referralBonusAmount}
                  onChangeText={setReferralBonusAmount}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View>
          )}
        </View>

          </>
        )}

        {/* Security Protocols Tab */}
        {activeTab === 'Security Protocols' && (
          <>
            {/* Security Protocols */}
        <View style={[styles.card, glass, { 
          borderColor: 'rgba(253,111,133,0.3)', borderTopWidth: 4, borderTopColor: C.error,
          opacity: isSuperAdmin ? 1 : 0.4 
        }]}>
          <View style={[styles.cardHeader, { borderBottomColor: 'rgba(253,111,133,0.2)' }]}>
            <View style={[styles.cardHeaderIcon, { borderColor: 'rgba(253,111,133,0.2)' }]}>
              <Ionicons name="shield-half" size={20} color={C.error} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.error }]}>{(t as any)('Security Protocols')}</Text>
              <Text style={styles.cardSubTitle}>Immediate system response controls</Text>
            </View>
            {!isSuperAdmin && (
              <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(253,111,133,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                 <Text style={{ color: C.error, fontSize: 10, fontWeight: '900' }}>SUPER ADMIN ONLY</Text>
              </View>
            )}
          </View>

          <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
              <Text style={styles.settingName}>{(t as any)('System Emergency Lockout')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('Instantly suspend all games, deposits, and withdrawals. Only admin functions will remain accessible.')}</Text>
            </View>
            <View style={isMobile && { alignSelf: 'flex-end' }}>
              <Switch
                value={emergencyLock}
                onValueChange={isSuperAdmin ? setEmergencyLock : () => {}}
                disabled={!isSuperAdmin}
                thumbColor={emergencyLock ? C.error : '#f4f3f4'}
                trackColor={{ false: 'rgba(39, 39, 42, 0.4)', true: 'rgba(253,111,133,0.3)' }}
              />
            </View>
          </View>

          <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
              <Text style={styles.settingName}>{(t as any)('Mobile App Access')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('If enabled, mobile app traffic will be blocked globally. Users will be instructed to use the website version.')}</Text>
            </View>
            <View style={isMobile && { alignSelf: 'flex-end' }}>
              <Switch
                value={mobileAppLock}
                onValueChange={isSuperAdmin ? setMobileAppLock : () => {}}
                disabled={!isSuperAdmin}
                thumbColor={mobileAppLock ? C.error : '#f4f3f4'}
                trackColor={{ false: 'rgba(39, 39, 42, 0.4)', true: 'rgba(253,111,133,0.3)' }}
              />
            </View>
          </View>
        </View>

          {/* Game Rooms Lock Card */}
          <View style={[styles.card, glass, {
            borderColor: 'rgba(253,111,133,0.3)', borderTopWidth: 4, borderTopColor: C.error,
            opacity: isSuperAdmin ? 1 : 0.4
          }]}>
            <View style={[styles.cardHeader, { borderBottomColor: 'rgba(253,111,133,0.2)' }]}>
              <View style={[styles.cardHeaderIcon, { borderColor: 'rgba(253,111,133,0.2)' }]}>
                <Ionicons name="lock-closed" size={20} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: C.error }]}>{'Game Rooms Lock'}</Text>
                <Text style={styles.cardSubTitle}>Globally disable all game rooms (R1, R2, R3)</Text>
              </View>
              {!isSuperAdmin && (
                <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(253,111,133,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: C.error, fontSize: 10, fontWeight: '900' }}>SUPER ADMIN ONLY</Text>
                </View>
              )}
            </View>

            <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
              <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
                <Text style={styles.settingName}>{'Game Rooms Lock'}</Text>
                <Text style={styles.settingDesc}>{'When ON, all game rooms (R1, R2, R3) are globally disabled. No new games can be started or joined by any user. Existing ongoing games are not affected.'}</Text>
              </View>
              <View style={isMobile && { alignSelf: 'flex-end' }}>
                <Switch
                  value={roomsLocked}
                  onValueChange={isSuperAdmin ? setRoomsLocked : () => {}}
                  disabled={!isSuperAdmin}
                  thumbColor={roomsLocked ? C.error : '#f4f3f4'}
                  trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(253,111,133,0.3)' }}
                />
              </View>
            </View>

            {roomsLocked && (
              <View style={{ marginTop: 12, backgroundColor: 'rgba(253,111,133,0.07)', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="warning" color={C.error} size={14} />
                  <Text style={{ color: C.error, fontWeight: '700', fontSize: 13 }}>Rooms are currently LOCKED</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 18 }}>
                  All users will see a lock message when trying to enter any game room. Toggle OFF and save to restore access.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(68,68,107,0.05)', paddingTop: 20 }]}>
            <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
              <Text style={styles.settingName}>{(t as any)('Organic Growth Metrics')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('If enabled, users will see the actual number of players currently active on the platform. If disabled, a simulated "fake" high-activity count is shown.')}</Text>
            </View>
            <View style={isMobile && { alignSelf: 'flex-end' }}>
              <Switch
                value={showOnlineCount}
                onValueChange={setShowOnlineCount}
                thumbColor={showOnlineCount ? C.primary : '#f4f3f4'}
                trackColor={{ false: 'rgba(68,68,107,0.4)', true: 'rgba(166,140,255,0.3)' }}
              />
            </View>
          </View>

          </>
        )}

        {/* Financial Operations Tab */}
        {activeTab === 'Financial Operations' && (
          <>
            {/* Financial Operations */}
        <View style={[styles.card, glass, { borderColor: 'rgba(0, 218, 243, 0.3)', borderTopWidth: 4, borderTopColor: C.primary }]}>
          <View style={[styles.cardHeader, { borderBottomColor: 'rgba(166,140,255,0.2)' }]}>
            <View style={[styles.cardHeaderIcon, { borderColor: 'rgba(39, 39, 42, 0.6)' }]}>
              <Ionicons name="cash-outline" size={20} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.primary }]}>{(t as any)('Financial Operations')}</Text>
              <Text style={styles.cardSubTitle}>Manage processing limits and house cuts</Text>
            </View>
          </View>

          <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
              <Text style={styles.settingName}>{(t as any)('Minimum Withdrawal')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('The lowest amount users can transfer to their bank.')}</Text>
            </View>
            <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
              <Text style={styles.currencyPrefix}>ETB</Text>
              <TextInput
                style={styles.inputField}
                value={minWithdrawal}
                onChangeText={setMinWithdrawal}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>

          <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.1)', paddingTop: 20 }]}>
            <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
              <Text style={styles.settingName}>{(t as any)('Minimum Deposit')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('The lowest top-up amount available via Chapa.')}</Text>
            </View>
            <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
              <Text style={styles.currencyPrefix}>ETB</Text>
              <TextInput
                style={styles.inputField}
                value={minDeposit}
                onChangeText={setMinDeposit}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Master Security Switch */}
        <View style={[styles.card, glass, { 
          borderColor: 'rgba(255,87,87,0.3)', borderTopWidth: 4, borderTopColor: C.error,
          opacity: isSuperAdmin ? 1 : 0.6 
        }]}>
          <View style={[styles.cardHeader, { borderBottomColor: 'rgba(255,87,87,0.1)' }]}>
            <View style={[styles.cardHeaderIcon, { borderColor: 'rgba(255,87,87,0.2)' }]}>
              <Ionicons name="shield-checkmark" size={16} color={C.error} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.error }]}>{(t as any)('Master Security Switch')}</Text>
              <Text style={styles.cardSubTitle}>Anti-Money Laundering (AML) Rules</Text>
            </View>
            {!isSuperAdmin && (
              <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(253,111,133,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                 <Text style={{ color: C.error, fontSize: 10, fontWeight: '900' }}>SUPER ADMIN ONLY</Text>
              </View>
            )}
          </View>

          <View style={[styles.settingRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }}>
              <Text style={styles.settingName}>{(t as any)('Manual Approval Mode')}</Text>
              <Text style={styles.settingDesc}>{(t as any)('If ON, high-risk withdrawals will bypass auto-payout and drop into the PENDING tab requiring your manual approval.')}</Text>
            </View>
            <View style={isMobile && { alignSelf: 'flex-end' }}>
              <Switch
                value={manualApproval}
                onValueChange={isSuperAdmin ? setManualApproval : () => {}}
                disabled={!isSuperAdmin}
                thumbColor={manualApproval ? C.error : '#f4f3f4'}
                trackColor={{ false: 'rgba(39, 39, 42, 0.4)', true: 'rgba(255,87,87,0.3)' }}
              />
            </View>
          </View>
          
          {manualApproval && (
            <>
              <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.1)', paddingTop: 20 }]}>
                <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
                  <Text style={styles.settingName}>{(t as any)('Auto-Payout Threshold (Master Approval)')}</Text>
                  <Text style={styles.settingDesc}>{(t as any)('Withdrawals above this amount instantly drop into PENDING for manual review.')}</Text>
                </View>
                <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
                  <Text style={styles.currencyPrefix}>ETB</Text>
                  <TextInput
                    style={styles.inputField}
                    value={autoPayoutThreshold}
                    onChangeText={isSuperAdmin ? setAutoPayoutThreshold : undefined}
                    keyboardType="numeric"
                    returnKeyType="done"
                    editable={isSuperAdmin}
                  />
                </View>
              </View>

              <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.1)', paddingTop: 20 }]}>
                <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
                  <Text style={styles.settingName}>{(t as any)('Maximum Withdrawal Hard Limit')}</Text>
                  <Text style={styles.settingDesc}>{(t as any)('The absolute maximum cap a user can hit per 24 hours.')}</Text>
                </View>
                <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
                  <Text style={styles.currencyPrefix}>ETB</Text>
                  <TextInput
                    style={styles.inputField}
                    value={maxWithdrawAmount}
                    onChangeText={isSuperAdmin ? setMaxWithdrawAmount : undefined}
                    keyboardType="numeric"
                    returnKeyType="done"
                    editable={isSuperAdmin}
                  />
                </View>
              </View>

              <View style={[styles.actionRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }, { borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.1)', paddingTop: 20 }]}>
                <View style={[{ flex: isMobile ? 0 : 1, paddingRight: isMobile ? 0 : 20 }, isMobile && { paddingBottom: 8 }]}>
                  <Text style={styles.settingName}>{(t as any)('Daily Transaction Count Limit')}</Text>
                  <Text style={styles.settingDesc}>{(t as any)('Max automated withdrawals per user per day.')}</Text>
                </View>
                <View style={[styles.inputWrap, isMobile && { width: '100%' as any }]}>
                  <Text style={styles.currencyPrefix}>Tx</Text>
                  <TextInput
                    style={styles.inputField}
                    value={maxWithdrawCount}
                    onChangeText={isSuperAdmin ? setMaxWithdrawCount : undefined}
                    keyboardType="numeric"
                    returnKeyType="done"
                    editable={isSuperAdmin}
                  />
                </View>
              </View>

              <View style={{ marginTop: 16, backgroundColor: 'rgba(255,87,87,0.05)', padding: 16, borderRadius: 12 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                   <Ionicons name="information-circle" color={C.error} size={16} />
                   <Text style={{ color: C.error, fontWeight: '600' }}>Active Static Rules</Text>
                 </View>
                 <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 }}>
                   • 100% Wagering Requirement enforced.{'\n'}
                   • Withdrawal numbers MUST match registered account phone number.{'\n'}
                   • 1-Hour cooldown between withdrawal capabilities.
                 </Text>
              </View>
            </>
          )}
        </View>

          </>
        )}

        {/* Admin Profile Tab */}
        {activeTab === 'Admin Profile' && (
          <>
            {/* Admin Passport Profile */}
        <View style={[styles.card, glass, { padding: 0, overflow: 'hidden', borderColor: 'rgba(0, 218, 243, 0.3)', maxWidth: isMobile ? '100%' : 420 }]}>
           <LinearGradient colors={['#1c1c3c', '#0b0b1e']} style={styles.passportHeader}>
              <View style={styles.passportPattern} />
              <View style={styles.passportTop}>
                 <Text style={styles.passportBrand}>XOET ADMINISTRATIVE AUTHORITY</Text>
                 <View style={styles.passportChip} />
              </View>
              
              <View style={styles.passportBody}>
                 <View style={styles.passportAvatarWrap}>
                    <Image source={require('../../../assets/images/icon.jpg')} style={styles.passportAvatar} />
                    <View style={styles.passportLiveBadge}><Text style={styles.passportLiveText}>RE-AUTH REQUIRED</Text></View>
                 </View>
                 
                 <View style={styles.passportInfo}>
                    <View style={styles.passportField}>
                       <Text style={styles.passportLabel}>HOLDER NAME</Text>
                       <Text style={styles.passportValue}>{user?.username || 'SYSTEM_ROOT'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 24 }}>
                       <View style={styles.passportField}>
                          <Text style={styles.passportLabel}>PHONE SEC</Text>
                          <Text style={styles.passportValue}>{user?.number?.slice(-4) || 'XXXX'}</Text>
                       </View>
                       <View style={styles.passportField}>
                          <Text style={styles.passportLabel}>SECURITY LEVEL</Text>
                          <Text style={[styles.passportValue, { color: C.secondary }]}>LEVEL 5</Text>
                       </View>
                    </View>
                    <View style={styles.passportField}>
                       <Text style={styles.passportLabel}>SYSTEM ROLE</Text>
                       <Text style={[styles.passportValue, { color: C.primary }]}>ROOT_ADMINISTRATOR</Text>
                    </View>
                 </View>
              </View>
              
              <View style={styles.passportFooter}>
                 <Text style={styles.passportSerial}>P# {token?.slice(-12).toUpperCase() || 'OFFLINE'}</Text>
                 <Ionicons name="finger-print" size={24} color="rgba(255,255,255,0.1)" />
              </View>
           </LinearGradient>

           <View style={{ padding: 24, gap: 16 }}>
              <TouchableOpacity style={styles.profileActionBtn} onPress={() => setShowSecurityInfo(true)}>
                 <Ionicons name="shield-checkmark" size={18} color={C.primary} />
                 <Text style={styles.profileActionTxt}>Review Security Protocols</Text>
                 <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileActionBtn} onPress={() => switchLanguage()}>
                 <Ionicons name="globe" size={18} color={C.secondary} />
                 <Text style={styles.profileActionTxt}>Language: {language === 'am' ? 'Amharic' : 'English'}</Text>
                 <Ionicons name="swap-horizontal" size={16} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
           </View>
        </View>

          </>
        )}

      </View>
      <View style={{ height: 40 }} />

      {/* Create Giveaway Modal */}
      <Modal visible={showCreateGiveaway} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Campaign</Text>
              <TouchableOpacity onPress={() => setShowCreateGiveaway(false)}>
                <Ionicons name="close" size={24} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 24 }}>
               <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Campaign Title</Text>
                  <TextInput 
                    style={styles.formInput} 
                    placeholder="e.g. Easter Giveaway" 
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={newGiveaway.title}
                    onChangeText={t => setNewGiveaway(p => ({...p, title: t}))}
                  />
               </View>
               <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Amount (ETB)</Text>
                  <TextInput 
                    style={styles.formInput} 
                    keyboardType="numeric"
                    value={newGiveaway.amount}
                    onChangeText={t => setNewGiveaway(p => ({...p, amount: t}))}
                  />
               </View>
               <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Target Type</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                     {['NEW_USER', 'PROMOCODE', 'DIRECT'].map(type => (
                       <TouchableOpacity 
                         key={type} 
                         style={[styles.typeBtn, newGiveaway.type === type && styles.typeBtnActive]}
                         onPress={() => setNewGiveaway(p => ({...p, type}))}
                       >
                          <Text style={[styles.typeBtnTxt, newGiveaway.type === type && { color: '#000' }]}>{type}</Text>
                       </TouchableOpacity>
                     ))}
                  </View>
               </View>
               {newGiveaway.type === 'PROMOCODE' && (
                 <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Promo Code</Text>
                    <TextInput 
                      style={styles.formInput} 
                      placeholder="e.g. WELCOME100" 
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={newGiveaway.promo_code}
                      onChangeText={t => setNewGiveaway(p => ({...p, promo_code: t.toUpperCase()}))}
                    />
                 </View>
               )}
               <View style={{ flexDirection: 'row', gap: 16 }}>
                 <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Start Date</Text>
                    <TextInput style={styles.formInput} value={newGiveaway.starts_at} onChangeText={t => setNewGiveaway(p => ({...p, starts_at: t}))} />
                 </View>
                 <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>End Date (Optional)</Text>
                    <TextInput style={styles.formInput} value={newGiveaway.ends_at} onChangeText={t => setNewGiveaway(p => ({...p, ends_at: t}))} />
                 </View>
               </View>
               <TouchableOpacity style={styles.submitBtn} onPress={handleCreateGiveaway}>
                  <Text style={styles.submitBtnTxt}>Initialize Campaign</Text>
               </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Giveaway Claims Modal */}
      {/* Giveaway Claims Modal — Refactored for massive traffic */}
      <Modal visible={!!showGiveawayClaims} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 900, height: '85%' }]}>
            <View style={[styles.modalHeader, { backgroundColor: 'rgba(17,17,40,0.98)' }]}>
              <View>
                <Text style={styles.modalTitle}>Giveaway Analytics</Text>
                {giveawayMeta && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <Text style={{ color: C.secondary, fontSize: 12, fontWeight: '800' }}>#{giveawayMeta.promo_code}</Text>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(168,167,212,0.4)' }} />
                    <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 12 }}>{giveawayMeta.title}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowGiveawayClaims(null)}>
                <Ionicons name="close" size={24} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, backgroundColor: '#18181b' }}>
              {/* Meta Stats Row */}
              {giveawayMeta && (
                <View style={{ flexDirection: 'row', padding: 24, gap: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.2)' }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' }}>
                    <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Total Claims</Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{claimsTotal}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,218,243,0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,218,243,0.2)' }}>
                    <Text style={{ color: C.secondary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Total Disbursed</Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 }}>ETB {(claimsTotal * (giveawayMeta.amount || 0)).toLocaleString()}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' }}>
                    <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Started At</Text>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 8 }}>{giveawayMeta.starts_at ? new Date(giveawayMeta.starts_at).toLocaleDateString() : 'N/A'}</Text>
                  </View>
                </View>
              )}

              <View style={{ flex: 1, padding: 24 }}>
                <View style={[styles.searchBox, { marginBottom: 20, width: '100%', borderColor: 'rgba(39, 39, 42, 0.6)' }]}>
                  <Ionicons name="search" size={16} color="rgba(168,167,212,0.4)" />
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Filter current view..." 
                    placeholderTextColor="rgba(168,167,212,0.4)"
                    value={claimsSearch}
                    onChangeText={setClaimsSearch}
                  />
                </View>

                {loadingClaims ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={C.primary} size="large" />
                    <Text style={{ color: 'rgba(168,167,212,0.6)', marginTop: 12, fontWeight: '700' }}>Synchronizing Claim Matrix...</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ minWidth: 700 }}>
                        {/* Table Header */}
                        <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.6)', paddingHorizontal: 8 }}>
                          <Text style={{ flex: 2, color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>User Identity</Text>
                          <Text style={{ flex: 1.5, color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Phone Number</Text>
                          <Text style={{ flex: 1, color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Amount</Text>
                          <Text style={{ flex: 1.5, color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Claimed At</Text>
                          <Text style={{ flex: 1, color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', textAlign: 'right' }}>Status</Text>
                        </View>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                          {claimsList
                            .filter(c => (c.username||'').toLowerCase().includes(claimsSearch.toLowerCase()) || (c.number||'').includes(claimsSearch))
                            .map((c, i) => (
                              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.2)', paddingHorizontal: 8 }}>
                                <Text style={{ flex: 2, color: '#fff', fontSize: 13, fontWeight: '700' }}>{c.username || 'Unknown'}</Text>
                                <Text style={{ flex: 1.5, color: 'rgba(168,167,212,0.8)', fontSize: 13 }}>{c.number}</Text>
                                <Text style={{ flex: 1, color: C.secondary, fontSize: 13, fontWeight: '800' }}>{giveawayMeta?.amount || '0'} ETB</Text>
                                <Text style={{ flex: 1.5, color: 'rgba(168,167,212,0.5)', fontSize: 12 }}>{new Date(c.claimed_at).toLocaleString()}</Text>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                   <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' }}>
                                      <Text style={{ color: '#34d399', fontSize: 9, fontWeight: '900' }}>SUCCESS</Text>
                                   </View>
                                </View>
                              </View>
                            ))}
                          {claimsList.length === 0 && (
                            <Text style={{ color: 'rgba(168,167,212,0.4)', textAlign: 'center', marginTop: 40, fontSize: 14 }}>No claim records manifests in this sector.</Text>
                          )}
                        </ScrollView>
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Pagination Controls */}
              <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.4)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(24, 24, 27, 0.5)' }}>
                <Text style={{ color: 'rgba(168,167,212,0.6)', fontSize: 12 }}>Showing {claimsList.length} of {claimsTotal} claims</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                   <TouchableOpacity 
                     disabled={claimsPage === 0} 
                     onPress={() => setClaimsPage(p => p - 1)}
                     style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', opacity: claimsPage === 0 ? 0.3 : 1 }}
                   >
                     <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Previous</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     disabled={(claimsPage + 1) * claimsLimit >= claimsTotal} 
                     onPress={() => setClaimsPage(p => p + 1)}
                     style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary, opacity: (claimsPage + 1) * claimsLimit >= claimsTotal ? 0.3 : 1 }}
                   >
                     <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>Next</Text>
                   </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Confirmation Modal */}
      <Modal transparent visible={confirmModal.visible} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 340, backgroundColor: '#0f0f11', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)', shadowColor: '#00ccff', shadowOpacity: 0.1, shadowRadius: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="warning-outline" size={40} color={confirmModal.action ? '#00daf3' : '#fd6f85'} />
            </View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
              {confirmModal.action ? 'Enable Giveaway?' : 'Disable Giveaway?'}
            </Text>
            <Text style={{ color: '#a8a7d4', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Are you sure you want to turn {confirmModal.action ? 'ON' : 'OFF'} the Welcome Bonus engine? This will immediately take effect.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, alignItems: 'center' }} onPress={() => setConfirmModal({ visible: false, action: false })}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, backgroundColor: confirmModal.action ? '#00ccff' : '#fd6f85', borderRadius: 8, alignItems: 'center' }} onPress={confirmBonusToggle}>
                <Text style={{ color: '#000', fontWeight: 'bold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Security Protocols Documentation Modal */}
      <Modal transparent visible={showSecurityInfo} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 500, backgroundColor: '#0f0f11', borderRadius: 16, padding: 32, borderWidth: 1, borderColor: 'rgba(253,111,133,0.3)', shadowColor: 'rgba(253,111,133,0.5)', shadowOpacity: 0.2, shadowRadius: 30 }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Ionicons name="shield-checkmark" size={48} color={'#fd6f85'} />
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 12 }}>Security Protocols</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              <Text style={{ color: '#a8a7d4', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>1. System Emergency Lockout:</Text>{'\n'}
                When enabled, the entire platform goes into maintenance mode. All ongoing game sessions, user logins, and financial transactions (deposits/withdrawals) are immediately suspended. Only Super Administrators can bypass this screen. Use this during critical incidents or scheduled deep maintenance.
              </Text>
              <Text style={{ color: '#a8a7d4', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>2. Mobile App Traffic Control:</Text>{'\n'}
                Rejects all incoming API requests carrying the "x-platform: mobile" header. Users will see a prompt redirecting them to the Web App. This is used if the mobile bundle gets compromised or requires a forced update while the Web app remains functional.
              </Text>
              <Text style={{ color: '#a8a7d4', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>3. Data Cascading Rules:</Text>{'\n'}
                Users deleted from the Administration Matrix automatically trigger a database cascade. This permanently drops their Game Logs, Bonus Logs, Wallet ledgers, and Active Sessions. Actions are logged in the System Audit tracker but user recovery becomes impossible.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={{ marginTop: 24, paddingVertical: 14, backgroundColor: C.primary, borderRadius: 8, alignItems: 'center' }} 
              onPress={() => setShowSecurityInfo(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ReferralDetailsModal 
        visible={referralModalVisible} 
        onClose={() => setReferralModalVisible(false)} 
        token={token || ""} 
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, marginTop: 24 },
  pageTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  pageSub: { color: 'rgba(168,167,212,0.6)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  saveTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, maxWidth: 1200 },
  card: { flex: 1, minWidth: 320, borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.4)' },
  cardHeaderIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(24, 24, 27, 0.65)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTitle: { color: '#e5e3ff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  cardSubTitle: { color: 'rgba(168,167,212,0.5)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.1)' },
  settingName: { color: '#e5e3ff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  settingDesc: { color: '#a8a7d4', fontSize: 13, maxWidth: 450, lineHeight: 22 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,17,40,0.9)', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(68,68,107,0.6)' },
  currencyPrefix: { color: '#a8a7d4', fontSize: 14, fontWeight: '800', marginRight: 8 },
  inputField: { width: 90, height: 48, color: '#e5e3ff', fontSize: 20, fontWeight: '900', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  logContainer: { marginTop: 24, padding: 20, backgroundColor: 'rgba(0,0,30,0.4)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  logHeaderTitle: { color: 'rgba(168,167,212,0.8)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  logEmpty: { color: 'rgba(168,167,212,0.5)', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  logIndicator: { width: 4, height: 16, borderRadius: 2 },
  logAction: { color: '#e5e3ff', fontSize: 13, fontWeight: '700' },
  logDetails: { color: 'rgba(168,167,212,0.6)', fontSize: 11, marginTop: 2 },
  logTime: { color: 'rgba(168,167,212,0.4)', fontSize: 11, fontWeight: '600' },

  passportHeader: { padding: 32, position: 'relative' },
  passportPattern: { ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: 'rgba(255,255,255,0.1)' }, // Subtle texture hint
  passportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  passportBrand: { color: 'rgba(168,167,212,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  passportChip: { width: 32, height: 24, borderRadius: 4, backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  passportBody: { flexDirection: 'row', gap: 32, alignItems: 'center' },
  passportAvatarWrap: { position: 'relative' },
  passportAvatar: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#000', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  passportLiveBadge: { position: 'absolute', bottom: -8, left: 0, right: 0, backgroundColor: C.error, paddingVertical: 2, borderRadius: 4, alignItems: 'center' },
  passportLiveText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  passportInfo: { flex: 1, gap: 16 },
  passportField: { gap: 2 },
  passportLabel: { color: 'rgba(168,167,212,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  passportValue: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  passportFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  passportSerial: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  profileActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  profileActionTxt: { color: '#e5e3ff', fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f0f11', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)' },
  searchInput: { flex: 1, color: '#e5e3ff', fontSize: 13, height: 20 },
  
  // New Styles
  addGiveawayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addGiveawayTxt: { color: '#000', fontSize: 12, fontWeight: '900' },
  
  giveawayItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  giveawayInfo: { flex: 1 },
  giveawayTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  giveawayMeta: { color: 'rgba(168,167,212,0.6)', fontSize: 12, marginTop: 4 },
  giveawayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  giveawayBadgeTxt: { fontSize: 10, fontWeight: '900' },
  giveawayActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.4)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  
  formGroup: { marginBottom: 20 },
  formLabel: { color: 'rgba(168,167,212,0.8)', fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  formInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(68,68,107,0.4)', borderRadius: 12, height: 50, paddingHorizontal: 16, color: '#fff', fontSize: 15 },
  
  typeBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.6)' },
  typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeBtnTxt: { color: '#a8a7d4', fontSize: 11, fontWeight: '900' },
  
  submitBtn: { backgroundColor: C.secondary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: C.secondary, shadowOpacity: 0.2, shadowRadius: 15 },
  submitBtnTxt: { color: '#000', fontSize: 16, fontWeight: '900' },

  claimRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.2)' },
  claimUser: { color: '#fff', fontSize: 14, fontWeight: '700' },
  claimPhone: { color: 'rgba(168,167,212,0.6)', fontSize: 12 },
  claimTime: { color: 'rgba(168,167,212,0.4)', fontSize: 11 },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(168,167,212,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  btnSecondaryText: {
    color: '#e5e3ff',
    fontSize: 12,
    fontWeight: '700',
  },
});
