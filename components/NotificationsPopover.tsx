// components/NotificationsPopover.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { SkeletonRow } from './SkeletonLoading';

type FilterTab = 'all' | 'read' | 'unread';

function formatNotificationTime(dateStr: string) {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getGroupCategory(dateStr: string): 'Today' | 'Yesterday' | 'Earlier' {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Today';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  return 'Earlier';
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
      console.error('[Notifications] Fetch error:', e);
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

  const groupedNotifications = useMemo(() => {
    const groups: { Today: any[]; Yesterday: any[]; Earlier: any[] } = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    filteredNotifications.forEach(n => {
      const cat = getGroupCategory(n.created_at);
      groups[cat].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable
          style={[s.popoverCard, isMobile ? s.mobileCard : s.desktopCard]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <View style={s.headerRow}>
            <View style={s.headerTitleWrap}>
              <TouchableOpacity onPress={onClose} style={s.closeCircle}>
                <Ionicons name="arrow-back" size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>{isEN ? "Notifications" : "ማሳወቂያዎች"}</Text>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={s.markAllBtn}>
                <Text style={s.markAllText}>{isEN ? "Mark all read" : "ሁሉንም አንብብ"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search & Tabs Row */}
          <View style={s.searchRow}>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isEN ? "Search..." : "ፈልግ..."}
                placeholderTextColor="#94A3B8"
                style={s.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={s.tabPillsRow}>
              <TouchableOpacity
                onPress={() => setActiveTab('all')}
                style={[s.tabPill, activeTab === 'all' && s.tabPillActive]}
              >
                <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>{isEN ? "All" : "ሁሉንም"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('unread')}
                style={[s.tabPill, activeTab === 'unread' && s.tabPillActive]}
              >
                <Text style={[s.tabText, activeTab === 'unread' && s.tabTextActive]}>
                  {isEN ? `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` : `ያልተነበቡ`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={{ padding: 12, gap: 8 }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#2563EB" />}
              showsVerticalScrollIndicator={false}
            >
              {(['Today', 'Yesterday', 'Earlier'] as const).map(groupKey => {
                const list = groupedNotifications[groupKey];
                if (!list || list.length === 0) return null;

                return (
                  <View key={groupKey} style={s.groupSection}>
                    <Text style={s.groupHeaderTitle}>{groupKey}</Text>
                    <View style={s.groupCardContainer}>
                      {list.map((item, idx) => (
                        <NotificationItem
                          key={item.id || idx}
                          n={item}
                          isLast={idx === list.length - 1}
                          markRead={markRead}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}

              {filteredNotifications.length === 0 && (
                <View style={s.emptyWrap}>
                  <View style={s.emptyCircle}>
                    <Ionicons name="notifications-outline" size={28} color="#94A3B8" />
                  </View>
                  <Text style={s.emptyTitle}>{isEN ? "No notifications yet" : "ምንም ማሳወቂያዎች የሉም"}</Text>
                  <Text style={s.emptySubtitle}>{isEN ? "We'll notify you when wins, game invites, or deposits arrive." : "ማሳወቂያዎች እዚህ ይታያሉ።"}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NotificationItem({ n, isLast, markRead }: { n: any; isLast: boolean; markRead: (id: string) => void }) {
  const isUnread = !n.read;

  const getIconInfo = (type: string, title = '') => {
    const t = (type || '').toLowerCase();
    const ttl = (title || '').toLowerCase();

    if (t.includes('spin') || ttl.includes('spin')) {
      return { icon: 'disc-outline', bg: '#EEF2FF', iconColor: '#6366F1', badgeIcon: 'arrow-up', badgeBg: '#10B981' };
    }
    if (t.includes('xo') || ttl.includes('xo') || t.includes('game')) {
      return { icon: 'game-controller-outline', bg: '#F0FDF4', iconColor: '#16A34A', badgeIcon: 'trophy', badgeBg: '#F59E0B' };
    }
    if (t.includes('deposit') || t.includes('wallet') || ttl.includes('balance') || ttl.includes('wallet')) {
      return { icon: 'wallet-outline', bg: '#F1F5F9', iconColor: '#475569', badgeIcon: 'add', badgeBg: '#2563EB' };
    }
    if (t.includes('referral') || t.includes('bonus')) {
      return { icon: 'gift-outline', bg: '#FEF3C7', iconColor: '#D97706', badgeIcon: 'star', badgeBg: '#D97706' };
    }
    return { icon: 'notifications-outline', bg: '#F8FAFC', iconColor: '#64748B', badgeIcon: 'paper-plane', badgeBg: '#3B82F6' };
  };

  const info = getIconInfo(n.type, n.title);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => { if (isUnread) markRead(n.id); }}
      style={[s.itemRow, !isLast && s.itemBorder]}
    >
      {/* Icon with status badge */}
      <View style={[s.avatarCircle, { backgroundColor: info.bg }]}>
        <Ionicons name={info.icon as any} size={20} color={info.iconColor} />
        <View style={[s.badgeCircle, { backgroundColor: info.badgeBg }]}>
          <Ionicons name={info.badgeIcon as any} size={8} color="#FFFFFF" />
        </View>
      </View>

      {/* Main Content */}
      <View style={s.itemContent}>
        <View style={s.titleTimeRow}>
          <Text style={[s.itemTitle, isUnread && s.itemTitleUnread]} numberOfLines={1}>
            {n.title || "Notification"}
          </Text>
          {isUnread && <View style={s.unreadDot} />}
        </View>
        <Text style={s.itemMessage} numberOfLines={2}>{n.message}</Text>
        <Text style={s.itemTime}>{formatNotificationTime(n.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popoverCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  mobileCard: {
    width: '92%',
    maxWidth: 420,
    height: '84%',
    maxHeight: 680,
    padding: 16,
  },
  desktopCard: {
    position: 'absolute',
    top: 60,
    right: 32,
    width: 440,
    height: 600,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
  },
  markAllText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '500',
  },
  tabPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 24,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeaderTitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    marginTop: 2,
  },
  badgeCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  itemContent: {
    flex: 1,
  },
  titleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 6,
  },
  itemMessage: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  itemTime: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
