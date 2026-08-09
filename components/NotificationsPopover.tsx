// components/NotificationsPopover.tsx — Dark Brand Theme Notifications Popover & Mobile Bottom Sheet
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
      animationType={isMobile ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <Pressable style={[s.overlay, isMobile && s.overlayMobile]} onPress={onClose}>
        <Pressable
          style={[s.popoverCard, isMobile ? s.mobileCard : s.desktopCard]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Grab Handle (Mobile Sheet) */}
          {isMobile && <View style={s.bottomSheetHandle} />}

          {/* Top Header */}
          <View style={s.headerRow}>
            <View style={s.headerTitleWrap}>
              <TouchableOpacity onPress={onClose} style={s.closeCircle}>
                <Ionicons name={isMobile ? "chevron-down" : "arrow-back"} size={18} color="#FFFFFF" />
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
              <Ionicons name="search-outline" size={16} color="#8B93A7" style={{ marginRight: 6 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isEN ? "Search..." : "ፈልግ..."}
                placeholderTextColor="#64748B"
                style={s.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#8B93A7" />
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
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#7C3AED" />}
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
                    <Ionicons name="notifications-outline" size={28} color="#8B93A7" />
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
      return { icon: 'disc-outline', bg: 'rgba(99, 102, 241, 0.15)', iconColor: '#818CF8', badgeIcon: 'arrow-up', badgeBg: '#10B981' };
    }
    if (t.includes('xo') || ttl.includes('xo') || t.includes('game')) {
      return { icon: 'game-controller-outline', bg: 'rgba(34, 197, 94, 0.15)', iconColor: '#4ADE80', badgeIcon: 'trophy', badgeBg: '#F59E0B' };
    }
    if (t.includes('deposit') || t.includes('wallet') || ttl.includes('balance') || ttl.includes('wallet')) {
      return { icon: 'wallet-outline', bg: 'rgba(56, 189, 248, 0.15)', iconColor: '#38BDF8', badgeIcon: 'add', badgeBg: '#2563EB' };
    }
    if (t.includes('referral') || t.includes('bonus')) {
      return { icon: 'gift-outline', bg: 'rgba(245, 158, 11, 0.15)', iconColor: '#FBBF24', badgeIcon: 'star', badgeBg: '#D97706' };
    }
    return { icon: 'notifications-outline', bg: 'rgba(255, 255, 255, 0.06)', iconColor: '#A78BFA', badgeIcon: 'paper-plane', badgeBg: '#7C3AED' };
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
    backgroundColor: 'rgba(10, 14, 26, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayMobile: {
    justifyContent: 'flex-end',
  },
  popoverCard: {
    backgroundColor: '#0D1021',
    borderWidth: 1,
    borderColor: '#1E2442',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },
  mobileCard: {
    width: '100%',
    maxHeight: '88%',
    height: '84%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 18,
  },
  desktopCard: {
    position: 'absolute',
    top: 64,
    right: 32,
    width: 440,
    height: 620,
    borderRadius: 28,
    padding: 20,
  },
  bottomSheetHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  markAllText: {
    color: '#A78BFA',
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  tabText: {
    color: '#94A3B8',
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
    color: '#8B93A7',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCardContainer: {
    backgroundColor: '#161A36',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1E2442',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
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
    borderColor: '#161A36',
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
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E5FF',
    marginLeft: 6,
  },
  itemMessage: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  itemTime: {
    color: '#64748B',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#8B93A7',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
