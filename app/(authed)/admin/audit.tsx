// app/(authed)/admin/audit.tsx — System Activity Trail
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, TextInput } from 'react-native';
import AnimatedList from '../../../components/AnimatedList';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { AdminTheme as C } from './_layout';

const glass: any = (extra?: object) => ({
  backgroundColor: C.surface,
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

        <View style={[styles.tableWrap, { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }]}>
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
                    <View key={l.id} style={{ backgroundColor: C.surfaceContainerLowest, padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border, gap: 8 }}>
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
                      <Text style={{ color: C.onSurfaceVariant, fontSize: 10, alignSelf: 'flex-end' }}>{timeSince(l.created_at)}</Text>
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
                <View style={[styles.colRow, { backgroundColor: '#313D4A' }]}>
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
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 8 },
  refreshTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tableWrap: { flex: 1, marginHorizontal: 24 },
  tableTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  tableTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLowest, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, width: 280 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13 },
  colRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  colHead: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  adminName: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  adminNum: { color: C.onSurfaceVariant, fontSize: 10 },
  actionPill: { fontSize: 9, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, textAlign: 'center', alignSelf: 'flex-start' },
  targetName: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  details: { color: C.onSurfaceVariant, fontSize: 11 },
  timeAgo: { color: C.onSurfaceVariant, fontSize: 11 },
  emptyText: { color: C.onSurfaceVariant, textAlign: 'center', marginVertical: 40, fontSize: 13 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 18, borderTopWidth: 1, borderTopColor: C.border },
  pageBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  pageInfo: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' },
});
