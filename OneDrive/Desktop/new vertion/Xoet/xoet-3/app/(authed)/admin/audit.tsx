// app/(authed)/admin/audit.tsx — System Activity Trail
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, TextInput } from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const glass: any = (extra?: object) => ({
  backgroundColor: 'rgba(11,11,30,0.6)',
  ...extra,
});

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_number: string;
  action: string;
  target_id: string;
  target_name: string;
  details: any;
  created_at: string;
}

const timeSince = (iso?: string) => {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

const getActionColor = (action: string) => {
  if (action.includes('reject') || action.includes('ban')) return C.error;
  if (action.includes('approve') || action.includes('unban')) return C.secondary;
  if (action.includes('balance')) return C.primary;
  return C.onSurfaceVariant;
};

const formatDetails = (details: any) => {
  if (!details) return 'No context';
  try {
    const d = typeof details === 'string' ? JSON.parse(details) : details;
    return Object.entries(d)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
  } catch (e) { return 'Invalid details'; }
};

export default function AdminAudit() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { token, t } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/audit-logs?limit=500`, { 
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' } 
      });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch (e) { console.log('[admin/audit]', e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter(l => 
      l.admin_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.target_name?.toLowerCase().includes(q) ||
      l.id?.includes(q)
    );
  }, [logs, query]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={[styles.pageHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View>
            <Text style={styles.pageTitle}>System Audit Logs</Text>
            <Text style={styles.pageSub}>Record of administrative actions and security audit trails</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); fetchLogs(); }}>
            <Ionicons name="sync" size={18} color="#fff" />
            <Text style={styles.refreshTxt}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tableWrap, glass({ borderRadius: 24, overflow: 'hidden' })]}>
          <View style={[styles.tableTopBar, isMobile && { flexDirection: 'column', gap: 12 }]}>
            <Text style={styles.tableTitle}>{t('activity_logs')}</Text>
            <View style={[styles.searchBox, isMobile && { width: '100%' as any }]}>
              <Ionicons name="search" size={16} color="rgba(168,167,212,0.5)" />
              <TextInput 
                style={styles.searchInput} 
                placeholder={t('search_audit')} 
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
                renderItem={(l: AuditLog) => {
                  const actionColor = getActionColor(l.action);
                  return (
                    <View key={l.id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: C.outlineVariant, gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={styles.adminName}>{l.admin_name || 'System'}</Text>
                          <Text style={styles.adminNum}>{l.admin_number || 'Internal'}</Text>
                        </View>
                        <Text style={[styles.actionPill, { color: actionColor, borderColor: actionColor + '44', backgroundColor: actionColor + '11' }]}>
                          {(l.action || 'system').toUpperCase().replace('_', ' ')}
                        </Text>
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Target: {l.target_name || 'System'}</Text>
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 11 }}>{formatDetails(l.details)}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, alignSelf: 'flex-end' }}>{timeSince(l.created_at)}</Text>
                    </View>
                  );
                }}
                showGradients={false}
              />
              {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />}
              {!loading && paginatedLogs.length === 0 && <Text style={styles.emptyText}>{t('no_data')}</Text>}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flex: 1 }}>
                <View style={[styles.colRow, { backgroundColor: 'rgba(24, 24, 27, 0.5)' }]}>
                  <Text style={[styles.colHead, { flex: 1.2 }]}>Admin User</Text>
                  <Text style={[styles.colHead, { flex: 1 }]}>Action</Text>
                  <Text style={[styles.colHead, { flex: 1.2 }]}>Target Item</Text>
                  <Text style={[styles.colHead, { flex: 2 }]}>Audit Context</Text>
                  <Text style={[styles.colHead, { flex: 1, textAlign: 'right' }]}>{t('timestamp')}</Text>
                </View>

                <AnimatedList
                  items={loading ? [] : paginatedLogs}
                  renderItem={(l: AuditLog) => {
                    const actionColor = getActionColor(l.action);
                    return (
                      <View key={l.id} style={styles.tableRow}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.adminName}>{l.admin_name || 'System'}</Text>
                          <Text style={styles.adminNum}>{l.admin_number || 'Internal'}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionPill, { color: actionColor, borderColor: actionColor + '44', backgroundColor: actionColor + '11' }]}>
                            {(l.action || 'system').toUpperCase().replace('_', ' ')}
                          </Text>
                        </View>

                        <Text style={[styles.targetName, { flex: 1.2 }]} numberOfLines={1}>
                          {l.target_name || 'System'}
                        </Text>

                        <Text style={[styles.details, { flex: 2 }]} numberOfLines={2}>
                          {formatDetails(l.details)}
                        </Text>

                        <Text style={[styles.timeAgo, { flex: 1, textAlign: 'right' }]}>
                          {timeSince(l.created_at)}
                        </Text>
                      </View>
                    );
                  }}
                  showGradients={false}
                />

                {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 40 }} />}
                {!loading && paginatedLogs.length === 0 && <Text style={styles.emptyText}>{t('no_data')}</Text>}
              </View>
            </ScrollView>
          )}

          {/* Pagination */}
          <View style={styles.pagination}>
            <TouchableOpacity 
              disabled={currentPage === 1} 
              onPress={() => setCurrentPage(p => p - 1)}
              style={[styles.pageBtn, currentPage === 1 && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
            <TouchableOpacity 
              disabled={currentPage === totalPages} 
              onPress={() => setCurrentPage(p => p + 1)}
              style={[styles.pageBtn, currentPage === totalPages && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, paddingHorizontal: 24 },
  pageTitle: { color: '#e5e3ff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  pageSub: { color: '#a8a7d4', fontSize: 13, marginTop: 8, maxWidth: 500 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.primaryContainer, borderRadius: 14 },
  refreshTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tableWrap: { flex: 1, marginHorizontal: 24 },
  tableTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  tableTitle: { color: '#e5e3ff', fontSize: 18, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f0f11', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(39, 39, 42, 0.4)', width: 300 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13 },
  colRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(39, 39, 42, 0.4)' },
  colHead: { color: 'rgba(168,167,212,0.6)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(68,68,107,0.08)' },
  adminName: { color: '#e5e3ff', fontSize: 13, fontWeight: '700' },
  adminNum: { color: 'rgba(168,167,212,0.5)', fontSize: 10 },
  actionPill: { fontSize: 9, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, textAlign: 'center', alignSelf: 'flex-start' },
  targetName: { color: '#e5e3ff', fontSize: 12, fontWeight: '600' },
  details: { color: 'rgba(168,167,212,0.7)', fontSize: 11, fontStyle: 'italic' },
  timeAgo: { color: '#a8a7d4', fontSize: 11 },
  emptyText: { color: '#a8a7d4', textAlign: 'center', marginVertical: 60, fontSize: 14 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(39, 39, 42, 0.2)' },
  pageBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  pageInfo: { color: 'rgba(168,167,212,0.8)', fontSize: 13, fontWeight: '600' },
});
