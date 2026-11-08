// components/NotificationsPopover.tsx — Dark Brand Theme Notifications Popover & Mobile Bottom Sheet
// Styled with XOET Dark Gaming Theme (#00daf3 cyan, #10b981 emerald, #ff2a5f coral, #111625 surface).
// All emojis stripped for clean professional presentation.
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { API_URL } from '../config';
import { SkeletonRow } from './SkeletonLoading';
import { haptics } from '../lib/haptcs';
import { playNotificationChime, playTickSound } from '../lib/pinTickAudio';

type FilterTab = 'all' | 'read' | 'unread';

/**
 * Removes emojis and extra spaces from notification titles and bodies
 */
function cleanNoEmoji(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // Animate UI Spring Physics Entrance
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(isMobile ? 320 : -16)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 22,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(isMobile ? 320 : -16);
      scaleAnim.setValue(0.95);
    }
  }, [visible, isMobile]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: isMobile ? 320 : -16,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onClose();
    });
  }, [isMobile, onClose]);

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (!visible) return;
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/notifications/user?limit=50`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        let fetched = Array.isArray(data.notifications) ? data.notifications : [];
        if (fetched.length <= 1) {
          // Provide modern platform event variety so notification tray is rich and distinct
          const sampleEvents = [
            {
              id: 'sys-spin-event',
              type: 'spin_win',
              title: isEN ? 'Spin & Win Tournament' : 'የእሽክርክሪት ውድድር',
              message: isEN ? 'Join 5-Player Spin to compete for the 500 ETB total prize pot!' : 'ለ 500 ብር ጠቅላላ ሽልማት በ 5-ተጫዋች እሽክርክሪት ይሳተፉ!',
              read: false,
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 'sys-friend-event',
              type: 'friend_challenge',
              title: isEN ? 'Play With Friends' : 'ከጓደኞች ጋር ይጫወቱ',
              message: isEN ? 'Challenge mutual friends to 1v1 XO battle with real stakes!' : 'ከጓደኞችዎ ጋር በ 1v1 የ XO ውድድር ይወዳደሩ!',
              read: true,
              created_at: new Date(Date.now() - 14400000).toISOString(),
            },
            {
              id: 'sys-wallet-event',
              type: 'deposit_ready',
              title: isEN ? 'Instant Deposit & Payout' : 'ፈጣን ገቢ እና ወጪ',
              message: isEN ? 'Fast Telebirr and CBE bank deposits are available 24/7.' : 'የቴሌብር እና የንግድ ባንክ ፈጣን ክፍያዎች ሁልጊዜ ዝግጁ ናቸው።',
              read: true,
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ];
          fetched = [...fetched, ...sampleEvents];
        }
        setNotifications(fetched);
      }
    } catch (e) {
      console.error('[Notifications] Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, visible, isEN]);

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
      haptics.tap();
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
        const titleMatch = cleanNoEmoji(n.title || '').toLowerCase().includes(q);
        const msgMatch = cleanNoEmoji(n.message || '').toLowerCase().includes(q);
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
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable style={[s.overlay, isMobile && s.overlayMobile]} onPress={handleClose}>
        <Animated.View
          style={[
            s.popoverCard,
            isMobile ? s.mobileCard : s.desktopCard,
            {
              opacity: fadeAnim,
              transform: isMobile
                ? [{ translateY: slideAnim }]
                : [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Top Grab Handle (Mobile Sheet) */}
          {isMobile && <View style={s.bottomSheetHandle} />}

          {/* Top Header */}
          <View style={s.headerRow}>
            <View style={s.headerTitleWrap}>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  handleClose();
                }}
                style={s.closeCircle}
                activeOpacity={0.7}
              >
                <Ionicons name={isMobile ? "chevron-down" : "arrow-back"} size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>{isEN ? "Notifications" : "ማሳወቂያዎች"}</Text>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={s.markAllBtn}>
                <Ionicons name="checkmark-done" size={13} color="#00daf3" style={{ marginRight: 4 }} />
                <Text style={s.markAllText}>{isEN ? "Mark all read" : "ሁሉንም አንብብ"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search & Filter Tabs Row */}
          <View style={s.searchRow}>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isEN ? "Search updates..." : "ፈልግ..."}
                placeholderTextColor="#94a3b8"
                style={s.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={15} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={s.tabPillsRow}>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setActiveTab('all');
                }}
                style={[s.tabPill, activeTab === 'all' && s.tabPillActive]}
                activeOpacity={0.75}
              >
                <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>{isEN ? "All" : "ሁሉንም"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setActiveTab('unread');
                }}
                style={[s.tabPill, activeTab === 'unread' && s.tabPillActive]}
                activeOpacity={0.75}
              >
                <Text style={[s.tabText, activeTab === 'unread' && s.tabTextActive]}>
                  {isEN ? `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` : `ያልተነበቡ`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={{ padding: 12, gap: 10 }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#00daf3" />}
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
                    <Ionicons name="notifications-outline" size={26} color="#8b93a7" />
                  </View>
                  <Text style={s.emptyTitle}>{isEN ? "No notifications yet" : "ምንም ማሳወቂያዎች የሉም"}</Text>
                  <Text style={s.emptySubtitle}>{isEN ? "Match updates, wallet deposits, and system notices will appear here." : "ማሳወቂያዎች እዚህ ይታያሉ።"}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function NotificationItem({ n, isLast, markRead }: { n: any; isLast: boolean; markRead: (id: string) => void }) {
  const isUnread = !n.read;
  const rawTitle = cleanNoEmoji(n.title || 'Notification');
  const rawMessage = cleanNoEmoji(n.message || '');

  const getIconInfo = (type: string, title = '') => {
    const t = (type || '').toLowerCase();
    const ttl = title.toLowerCase();

    if (t.includes('spin') || ttl.includes('spin')) {
      return { icon: 'aperture', bg: 'rgba(245, 158, 11, 0.16)', iconColor: '#f59e0b', badgeIcon: 'trophy', badgeBg: '#f59e0b' };
    }
    if (t.includes('withdraw') || ttl.includes('withdraw') || ttl.includes('payout')) {
      return { icon: 'arrow-up-circle', bg: 'rgba(56, 189, 248, 0.16)', iconColor: '#38bdf8', badgeIcon: 'checkmark', badgeBg: '#38bdf8' };
    }
    if (t.includes('deposit') || t.includes('wallet') || ttl.includes('deposit') || ttl.includes('top-up')) {
      return { icon: 'wallet', bg: 'rgba(16, 185, 129, 0.16)', iconColor: '#10b981', badgeIcon: 'add', badgeBg: '#10b981' };
    }
    if (t.includes('friend') || ttl.includes('friend') || t.includes('invite') || ttl.includes('invite')) {
      return { icon: 'person-add', bg: 'rgba(168, 85, 247, 0.16)', iconColor: '#a855f7', badgeIcon: 'people', badgeBg: '#a855f7' };
    }
    if (t.includes('xo') || ttl.includes('xo') || t.includes('game') || ttl.includes('match') || ttl.includes('battle')) {
      return { icon: 'grid', bg: 'rgba(0, 218, 243, 0.16)', iconColor: '#00daf3', badgeIcon: 'game-controller', badgeBg: '#00daf3' };
    }
    if (t.includes('referral') || t.includes('bonus') || ttl.includes('bonus') || ttl.includes('reward') || ttl.includes('welcome')) {
      return { icon: 'gift', bg: 'rgba(236, 72, 153, 0.16)', iconColor: '#ec4899', badgeIcon: 'sparkles', badgeBg: '#ec4899' };
    }
    if (t.includes('leaderboard') || ttl.includes('rank') || ttl.includes('tournament')) {
      return { icon: 'flame', bg: 'rgba(239, 68, 68, 0.16)', iconColor: '#ef4444', badgeIcon: 'ribbon', badgeBg: '#ef4444' };
    }
    return { icon: 'shield-checkmark', bg: 'rgba(99, 102, 241, 0.16)', iconColor: '#6366f1', badgeIcon: 'information', badgeBg: '#6366f1' };
  };

  const info = getIconInfo(n.type, rawTitle);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        haptics.tap();
        if (isUnread) markRead(n.id);
      }}
      style={[s.itemRow, !isLast && s.itemBorder]}
    >
      {/* Icon with status badge */}
      <View style={[s.avatarCircle, { backgroundColor: info.bg }]}>
        <Ionicons name={info.icon as any} size={19} color={info.iconColor} />
        <View style={[s.badgeCircle, { backgroundColor: info.badgeBg }]}>
          <Ionicons name={info.badgeIcon as any} size={7} color="#07090e" />
        </View>
      </View>

      {/* Main Content */}
      <View style={s.itemContent}>
        <View style={s.titleTimeRow}>
          <Text style={[s.itemTitle, isUnread && s.itemTitleUnread]} numberOfLines={1}>
            {rawTitle}
          </Text>
          {isUnread && <View style={s.unreadDot} />}
        </View>
        <Text style={s.itemMessage} numberOfLines={2}>{rawMessage}</Text>
        <Text style={s.itemTime}>{formatNotificationTime(n.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayMobile: {
    justifyContent: 'flex-end',
  },
  popoverCard: {
    backgroundColor: '#080F17',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 36,
    elevation: 24,
  },
  mobileCard: {
    width: '100%',
    maxHeight: '88%',
    height: '84%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    padding: 20,
  },
  desktopCard: {
    position: 'absolute',
    top: 68,
    right: 28,
    width: 440,
    height: 610,
    borderRadius: 24,
    padding: 20,
  },
  bottomSheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 14,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: 'Inter, sans-serif',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 218, 243, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.35)',
  },
  markAllText: {
    color: '#00daf3',
    fontSize: 11.5,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '500',
  },
  tabPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabPillActive: {
    backgroundColor: '#00daf3',
    borderColor: '#00daf3',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#080F17',
    fontWeight: '900',
  },
  listContainer: {
    paddingBottom: 24,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeaderTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    marginTop: 2,
  },
  badgeCircle: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
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
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unreadDot: {
    width: 7.5,
    height: 7.5,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 6,
    boxShadow: '0 0 6px rgba(239, 68, 68, 0.7)',
  } as any,
  itemMessage: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  itemTime: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
