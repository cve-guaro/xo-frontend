// components/NotificationsPopover.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { API_URL } from '../config';

type FilterTab = 'all' | 'read' | 'unread';

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return '1m ago';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function isToday(dateStr: string) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function NotificationsPopover({
  visible,
  onClose,
  onUnreadCountChange,
}: {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const { token, language } = useAuth();
  const isEN = language === 'en';
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (!visible) return;
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/notifications/user?limit=50`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, visible]);

  // Initial unread count fetch
  useEffect(() => {
    let active = true;
    const fetchInitialCount = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/notifications/user/unread-count`, {
          headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
        });
        if (res.ok && active) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInitialCount();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (visible && notifications.length >= 0) {
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications, visible]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchNotifications();
    }
  }, [visible, fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/user/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {}
  }, [token]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${API_URL}/notifications/user/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {}
  }, [token]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'unread' && n.read) return false;
      if (activeTab === 'read' && !n.read) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const msgMatch = (n.message || '').toLowerCase().includes(q);
        if (!titleMatch && !msgMatch) return false;
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const todayNotifs = useMemo(() => {
    return filteredNotifications.filter(n => isToday(n.created_at));
  }, [filteredNotifications]);

  const earlierNotifs = useMemo(() => {
    return filteredNotifications.filter(n => !isToday(n.created_at));
  }, [filteredNotifications]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[s.popoverCard, isMobile ? s.mobileCard : s.desktopCard]}>
          {/* Header row: < Notifications */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.backTitleBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
              <Text style={s.headerTitle}>{isEN ? "Notifications" : "ማሳወቂያዎች"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
              <Text style={s.markAllText}>{isEN ? "Mark read" : "ሁሉንም አንብብ"}</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={s.searchFilterRow}>
            <View style={[s.searchWrap, { flex: 1 }]}>
              <Ionicons name="search" size={16} color="#8b93a7" style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isEN ? "Search notifications..." : "ማሳወቂያዎችን ፈልግ..."}
                placeholderTextColor="#64748b"
                style={s.searchInput}
              />
            </View>
          </View>

          {/* Filter Pills: All | Read | Unread 20+ */}
          <View style={s.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('all')}
              style={[s.tabPill, activeTab === 'all' && s.tabPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>
                {isEN ? "All" : "ሁሉንም"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('read')}
              style={[s.tabPill, activeTab === 'read' && s.tabPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, activeTab === 'read' && s.tabTextActive]}>
                {isEN ? "Read" : "የተነበቡ"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('unread')}
              style={[s.tabPill, activeTab === 'unread' && s.tabPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, activeTab === 'unread' && s.tabTextActive]}>
                {isEN ? `Unread ${unreadCount > 0 ? unreadCount : ''}` : `ያልተነበቡ ${unreadCount > 0 ? unreadCount : ''}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#2563eb" />}
              showsVerticalScrollIndicator={false}
            >
              {/* TODAY SECTION */}
              {todayNotifs.length > 0 && (
                <View>
                  <Text style={s.sectionHeaderTitle}>Today</Text>
                  {todayNotifs.map((n) => (
                    <NotificationItem key={n.id} n={n} markRead={markRead} />
                  ))}
                </View>
              )}

              {/* EARLIER / YESTERDAY SECTION */}
              {earlierNotifs.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={s.sectionHeaderTitle}>Yesterday & Earlier</Text>
                  {earlierNotifs.map((n) => (
                    <NotificationItem key={n.id} n={n} markRead={markRead} />
                  ))}
                </View>
              )}

              {filteredNotifications.length === 0 && (
                <View style={s.emptyWrap}>
                  <Ionicons name="notifications-off-outline" size={32} color="#64748b" />
                  <Text style={s.emptyText}>{isEN ? "No notifications" : "ምንም ማሳወቂያዎች የሉም"}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function NotificationItem({ n, markRead }: { n: any; markRead: (id: string) => void }) {
  const isUnread = !n.read;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { if (isUnread) markRead(n.id); }}
      style={[s.notifItem, isUnread && s.notifItemUnread]}
    >
      {/* Icon Circle */}
      <View style={s.avatarCircle}>
        <Ionicons
          name={n.type === 'deposit_success' ? 'wallet-outline' : n.type === 'game_win' ? 'trophy-outline' : 'notifications-outline'}
          size={18}
          color="#3b82f6"
        />
      </View>

      {/* Content */}
      <View style={s.notifContent}>
        {/* Timestamp */}
        <Text style={s.notifTime}>{formatTimeAgo(n.created_at)}</Text>

        {/* Title line with unread blue dot */}
        <View style={s.titleRow}>
          {isUnread && <View style={s.blueDot} />}
          <Text style={s.notifTitleBold} numberOfLines={1}>{n.title || "Notification"}</Text>
        </View>

        {/* Message body snippet */}
        <Text style={s.notifMessage} numberOfLines={2}>
          {n.message}
        </Text>
      </View>

      {/* Right chevron */}
      <Ionicons name="chevron-forward" size={16} color="#64748b" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.65)',
  },
  popoverCard: {
    backgroundColor: '#0d1124',
    borderWidth: 1,
    borderColor: '#1e2646',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 14,
  },
  mobileCard: {
    width: '94%',
    maxWidth: 420,
    borderRadius: 24,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    height: '82%',
    padding: 16,
  },
  desktopCard: {
    position: 'absolute',
    top: 64,
    right: 28,
    width: 440,
    borderRadius: 24,
    maxHeight: 560,
    height: 560,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
  },
  markAllText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161c36',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: '#242c4c',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 42,
  },
  filterBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#161c36',
    borderWidth: 1,
    borderColor: '#242c4c',
  },
  tabPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  listContainer: {
    paddingBottom: 20,
  },
  sectionHeaderTitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  notifItemUnread: {
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161c36',
    borderWidth: 1,
    borderColor: '#242c4c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  notifTitleBold: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  notifMessage: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  notifTime: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
