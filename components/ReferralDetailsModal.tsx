import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { API_URL } from '../config';

interface ReferralDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  token: string;
  userId?: string; // If provided, fetches specific user's referrals. If null, fetches global network.
}

export default function ReferralDetailsModal({ visible, onClose, token, userId }: ReferralDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (!visible || !token) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const route = userId 
          ? `/admin/users/${userId}/referrals-detailed`
          : `/admin/referrals/detailed`;

        const res = await fetch(`${API_URL}${route}`, {
          headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
        });
        const data = await res.json();
        if (data.ok) {
          setReferrals(data.referrals || []);
          if (userId) {
            setMetrics({ total_earned: data.total_earned });
          } else {
            setMetrics(data.metrics);
          }
        }
      } catch (e) {
        console.error("Referral fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [visible, token, userId]);

  return (
    <Modal visible={visible} animated transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
        )}

        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="people-outline" size={24} color="#10b981" />
              <Text style={styles.headerTitle}>
                {userId ? "User Referral Network" : "Global Referral Records"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#a8a7d4" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#10b981" size="large" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              
              {/* Metrics Header */}
              {metrics && (
                <View style={styles.metricsRow}>
                  {!userId && (
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Total Referrers</Text>
                      <Text style={styles.metricValue}>{metrics.total_referrers || 0}</Text>
                    </View>
                  )}
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{userId ? "Users Referred" : "Total Referred"}</Text>
                    <Text style={styles.metricValue}>{userId ? referrals.length : (metrics.total_referred || 0)}</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{userId ? "Total Bonus Earned" : "Total Bonuses Paid"}</Text>
                    <Text style={[styles.metricValue, { color: '#00daf3' }]}>
                      ETB {metrics.total_earned !== undefined ? metrics.total_earned : (metrics.total_bonuses_paid || 0)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Data Table */}
              <View style={styles.tableWrapper}>
                {referrals.length === 0 ? (
                  <Text style={styles.emptyText}>No referral data available.</Text>
                ) : (
                  <>
                    <View style={styles.trHeading}>
                      {!userId && <Text style={[styles.th, { flex: 1.5 }]}>Referrer</Text>}
                      <Text style={[styles.th, { flex: 1.5 }]}>Referred User</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Games Played</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Bonus Paid</Text>
                    </View>

                    {referrals.map((r, i) => (
                      <View key={i} style={styles.tr}>
                        {!userId && (
                          <Text style={[styles.td, { flex: 1.5, fontWeight: '700', color: '#e5e3ff' }]}>
                            {r.referrer_name || r.referrer_id.substring(0,8)}
                          </Text>
                        )}
                        <Text style={[styles.td, { flex: 1.5 }]}>
                          {r.referred_name || r.referred_id.substring(0,8)}
                          {"\n"}
                          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            {r.joined_at && !isNaN(new Date(r.joined_at).getTime()) ? new Date(r.joined_at).toLocaleDateString() : '—'}
                          </Text>
                        </Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'center', color: r.games_played > 0 ? '#10b981' : '#a8a7d4' }]}>
                          {r.games_played}
                        </Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#00daf3' }]}>
                          ETB {Number(r.bonus_amount)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: '#111128', // Same as admin modal
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  closeBtn: { padding: 4 },
  centerBox: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'rgba(16,185,129,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    padding: 16,
    borderRadius: 12,
  },
  metricLabel: { color: 'rgba(168,167,212,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { color: '#fff', fontSize: 24, fontWeight: '900' },

  tableWrapper: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  emptyText: { padding: 30, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  trHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  th: { color: 'rgba(168,167,212,0.6)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  td: { color: 'rgba(168,167,212,0.9)', fontSize: 13, fontWeight: '600' }
});
