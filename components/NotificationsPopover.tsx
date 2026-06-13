// components/NotificationsPopover.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, RefreshControl, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { API_URL } from '../config';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';

const SkeletonNotif = () => {
  const anim = React.useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={s.notifCard}>
      <Animated.View style={[s.iconWrap, { backgroundColor: 'rgba(255,255,255,0.1)', opacity: anim }]} />
      <View style={s.contentWrap}>
        <Animated.View style={{ height: 16, width: '60%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 8, opacity: anim }} />
        <Animated.View style={{ height: 12, width: '90%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 4, opacity: anim }} />
        <Animated.View style={{ height: 12, width: '40%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12, opacity: anim }} />
        <Animated.View style={{ height: 24, width: 80, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, opacity: anim }} />
      </View>
    </View>
  );
};

const PulsingUnreadDot = () => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    const scaleAnim = Animated.sequence([
      Animated.timing(scale, { toValue: 1.6, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' })
    ]);
    const opacityAnim = Animated.sequence([
      Animated.timing(opacity, { toValue: 0.2, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0.8, duration: 1000, useNativeDriver: Platform.OS !== 'web' })
    ]);

    Animated.loop(
      Animated.parallel([scaleAnim, opacityAnim])
    ).start();
  }, [scale, opacity]);

  return (
    <View style={s.unreadDotContainer}>
      <Animated.View style={[s.unreadDotGlow, { transform: [{ scale }], opacity }]} />
      <View style={s.unreadDot} />
    </View>
  );
};

const timeFmt = (d: string) => {
  if (!d) return '—';
  const time = new Date(d).getTime();
  if (isNaN(time)) return '—';
  const ms = Date.now() - time;
  if (ms < 60000 && ms >= 0) return 'Just now';
  if (ms < 0) return 'Just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} minutes ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatWeekPeriod = (startStr?: string, endStr?: string) => {
  if (!startStr || !endStr) return '';
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  } catch (e) {
    return `${startStr} to ${endStr}`;
  }
};

const groupNotificationsByDate = (notifications: any[]) => {
  const groups: { [key: string]: any[] } = {};
  notifications.forEach(n => {
    const d = new Date(n.created_at);
    if (isNaN(d.getTime())) return;
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();

    const formattedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    let dateStr = formattedDate;
    if (isToday) dateStr = `Today, ${formattedDate}`;
    else if (isYesterday) dateStr = `Yesterday, ${formattedDate}`;

    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(n);
  });
  return groups;
};

const typeConfig: Record<string, { icon: string; bgColor: string; dotColor: string }> = {
  deposit_success: { icon: 'wallet-outline', bgColor: '#10b981', dotColor: '#10b981' }, // green wallet
  withdrawal_success: { icon: 'arrow-up-circle-outline', bgColor: '#8b5cf6', dotColor: '#8b5cf6' }, // violet arrow up
  refund: { icon: 'arrow-undo-outline', bgColor: '#0ea5e9', dotColor: '#0ea5e9' }, // sky blue refund
  game_win: { icon: 'trophy-outline', bgColor: '#eab308', dotColor: '#ffd700' }, // gold trophy
  leaderboard_award: { icon: 'ribbon-outline', bgColor: '#a855f7', dotColor: '#c084fc' }, // purple crown/ribbon for weekly award
  admin_message: { icon: 'chatbubble-ellipses-outline', bgColor: '#3b82f6', dotColor: '#3b82f6' }, // blue chat
  broadcast: { icon: 'megaphone-outline', bgColor: '#f97316', dotColor: '#f97316' }, // orange megaphone
  system: { icon: 'alert-circle-outline', bgColor: '#ef4444', dotColor: '#ef4444' }, // red alert
};

export default function NotificationsPopover({ visible, onClose, onUnreadCountChange }: { visible: boolean; onClose: () => void; onUnreadCountChange?: (count: number) => void }) {
  const { token, language } = useAuth();
  const isEN = language === 'en';
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, visible]);

  // Fetch initial count on mount or when token changes
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
      } catch (e) { console.error(e); }
    };
    fetchInitialCount();
    return () => { active = false; };
  }, [token]);

  // Sync count when popover is open and notifications list is loaded/modified
  useEffect(() => {
    if (visible && notifications.length >= 0) {
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications, visible]);

  // Trigger parent callback when unreadCount changes
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

  // Auto mark all read when seen (after 1.5 seconds)
  useEffect(() => {
    if (visible && notifications.length > 0) {
      const unread = notifications.some(n => !n.read);
      if (!unread) return;
      
      const timer = setTimeout(() => {
        markAllRead();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible, notifications, markAllRead]);

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={[
          s.popover, 
          isMobile ? s.mobilePopover : s.desktopPopover,
          { maxHeight: isMobile ? height * 0.9 : 600 }
        ]}>
          <LinearGradient colors={['#181424', '#0F0C16']} style={s.gradientBg}>
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={onClose} style={s.iconBtn}>
                <Ionicons name="close" size={24} color="#e5e3ff" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>{isEN ? "Notifications" : "ማሳወቂያዎች"}</Text>
              <View style={{ width: 44, height: 44 }}>
                 {unreadCount > 0 && (
                   <TouchableOpacity onPress={markAllRead} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                     <Ionicons name="checkmark-done" size={24} color="#00daf3" />
                   </TouchableOpacity>
                 )}
              </View>
            </View>

            {/* List */}
            {loading ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, paddingTop: 10 }}>
                <View style={{ marginTop: 24, marginBottom: 12, marginLeft: 20 }}>
                  <View style={{ height: 14, width: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                </View>
                <SkeletonNotif />
                <SkeletonNotif />
                <SkeletonNotif />
              </ScrollView>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24, paddingTop: 10 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#00daf3" />}
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(groupedNotifications).map(([date, notifs]) => (
                  <View key={date}>
                    <Text style={s.dateDivider}>{date}</Text>
                    {notifs.map((n) => {
                      let cfgKey = (n.type || '').toLowerCase();
                      if (n.title?.toLowerCase().includes('canceled')) cfgKey = 'system';
                      else if (n.title?.toLowerCase().includes('successful')) cfgKey = 'deposit_success';
                      else if (n.title?.toLowerCase().includes('feature')) cfgKey = 'broadcast';
                      
                      const cfg = typeConfig[cfgKey] || typeConfig.system;
                      const isAward = cfgKey === 'leaderboard_award';
                      
                      const meta = typeof n.meta === 'string' ? JSON.parse(n.meta) : (n.meta || {});
                      return (
                        <TouchableOpacity
                          key={n.id}
                          activeOpacity={0.8}
                          onPress={() => { if (!n.read) markRead(n.id); }}
                          style={[
                            s.notifCard, 
                            !n.read && { borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)' },
                            isAward && s.awardCard
                          ]}
                        >
                          <View style={[s.iconWrap, { backgroundColor: cfg.bgColor }, isAward && s.awardIconWrap]}>
                            <Ionicons name={isAward ? 'trophy' : (cfg.icon as any)} size={22} color="#fff" />
                          </View>
                          
                          <View style={s.contentWrap}>
                            <Text style={[s.notifTitle, isAward && { color: '#ffd700', fontSize: 16, fontWeight: '900' }]}>{n.title}</Text>
                            {isAward ? (
                              <View style={s.awardDetailsContainer}>
                                <Text style={s.awardCongratsText}>{n.message}</Text>
                                {meta.weekStart && meta.weekEnd && (
                                  <View style={s.awardDetailRow}>
                                    <Ionicons name="calendar-outline" size={14} color="#00daf3" />
                                    <Text style={s.awardDetailText}>
                                      {formatWeekPeriod(meta.weekStart, meta.weekEnd)}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                  {meta.wins !== undefined && (
                                    <View style={s.statBadge}>
                                      <Ionicons name="ribbon-outline" size={12} color="#00daf3" />
                                      <Text style={s.statBadgeText}>{meta.wins} {isEN ? "Wins" : "ድሎች"}</Text>
                                    </View>
                                  )}
                                  {meta.prize !== undefined && (
                                    <View style={[s.statBadge, { borderColor: '#ffd700', backgroundColor: 'rgba(212,175,55,0.15)' }]}>
                                      <Ionicons name="wallet-outline" size={12} color="#ffd700" />
                                      <Text style={[s.statBadgeText, { color: '#ffd700' }]}>+{meta.prize} ETB</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <Text style={s.notifMsg}>{n.message}</Text>
                            )}
                            <View style={[s.timePill, isAward && { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
                              <Text style={[s.notifTime, isAward && { color: '#c084fc' }]}>{timeFmt(n.created_at)}</Text>
                            </View>
                          </View>
                          {!n.read && <PulsingUnreadDot />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {notifications.length === 0 && (
                  <View style={{ padding: 60, alignItems: 'center' }}>
                    <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 16 }}>{isEN ? "No notifications yet" : "ምንም ማሳወቂያዎች የሉም"}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end', // For mobile, it acts as a bottom sheet
    alignItems: 'center',
  },
  popover: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0F0C16',
  },
  mobilePopover: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: 60,
  },
  desktopPopover: {
    width: 450,
    borderRadius: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    flex: undefined,
  },
  gradientBg: {
    flex: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  dateDivider: {
    color: '#e2e0f0', fontSize: 13, fontWeight: '600', 
    marginLeft: 20, marginTop: 24, marginBottom: 12, letterSpacing: 0.5,
  },
  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12, padding: 16, paddingVertical: 20,
    backgroundColor: '#1C1827', borderRadius: 20,
  },
  iconWrap: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  contentWrap: {
    flex: 1, marginLeft: 16,
  },
  notifTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  notifMsg: { color: '#8a8a9e', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  timePill: {
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  notifTime: { color: '#a8a7d4', fontSize: 11, fontWeight: '600' },
  unreadDotContainer: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  unreadDotGlow: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00daf3',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00daf3',
    borderWidth: 1.5,
    borderColor: '#1C1827',
  },
  awardCard: {
    backgroundColor: '#201635',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  awardIconWrap: {
    backgroundColor: '#d4af37',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  awardDetailsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  awardCongratsText: {
    color: '#e2e0f0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  awardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  awardDetailText: {
    color: '#a8a7d4',
    fontSize: 12,
    fontWeight: '500',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,218,243,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statBadgeText: {
    color: '#00daf3',
    fontSize: 11,
    fontWeight: '800',
  }
});
