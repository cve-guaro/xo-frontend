// app/(authed)/home/notifications.tsx — User Notification Center
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, useWindowDimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import { LinearGradient } from 'expo-linear-gradient';

const timeFmt = (d: string) => {
  if (!d) return '—';
  const now = Date.now();
  const ms = now - new Date(d).getTime();
  if (ms < 60000) return 'Just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} minutes ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const groupNotificationsByDate = (notifications: any[]) => {
  const groups: { [key: string]: any[] } = {};
  notifications.forEach(n => {
    const d = new Date(n.created_at);
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

const typeConfig: Record<string, { icon: string; gradient: readonly [string, string, ...string[]]; dotColor: string }> = {
  deposit_success: { icon: 'checkmark', gradient: ['#4e4376', '#2b5876'], dotColor: '#3b82f6' },
  withdrawal_success: { icon: 'checkmark', gradient: ['#4e4376', '#2b5876'], dotColor: '#3b82f6' },
  refund: { icon: 'refresh', gradient: ['#f5af19', '#f12711'], dotColor: '#f5af19' },
  game_win: { icon: 'trophy', gradient: ['#f5af19', '#f12711'], dotColor: '#f5af19' },
  admin_message: { icon: 'chatbubble', gradient: ['#8A2387', '#E94057'], dotColor: '#E94057' },
  broadcast: { icon: 'notifications', gradient: ['#f5af19', '#f12711'], dotColor: '#f5af19' },
  system: { icon: 'close', gradient: ['#ed213a', '#93291e'], dotColor: '#ed213a' },
};

export default function UserNotifications() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = useCallback(async (showRefresh = false) => {
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
  }, [token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

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

  const unreadCount = notifications.filter(n => !n.read).length;
  const groupedNotifications = groupNotificationsByDate(notifications);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#a68cff" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1F1135', '#0A0A0F']} style={s.container}>
      {/* Header */}
      <View style={[s.header, isMobile && { paddingHorizontal: 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#e5e3ff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notification</Text>
        <View style={{ width: 44, height: 44 }} /> {/* Empty view to balance flex space */}
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#a68cff" />}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedNotifications).map(([date, notifs]) => (
          <View key={date}>
            <Text style={s.dateDivider}>{date}</Text>
            {notifs.map((n) => {
              // Map types specifically for this UI demo based on titles
              let cfgKey = n.type;
              if (n.title?.toLowerCase().includes('canceled')) cfgKey = 'system'; // map canceled to red X
              else if (n.title?.toLowerCase().includes('successful')) cfgKey = 'deposit_success'; // map success to blue/purple check
              else if (n.title?.toLowerCase().includes('feature')) cfgKey = 'broadcast'; // map features to yellow bell
              
              const cfg = typeConfig[cfgKey] || typeConfig.system;
              
              return (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={0.8}
                  onPress={() => { if (!n.read) markRead(n.id); }}
                  style={s.notifCard}
                >
                  <LinearGradient
                    colors={cfg.gradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.iconWrap}
                  >
                    <Ionicons name={cfg.icon as any} size={24} color="#fff" />
                  </LinearGradient>
                  
                  <View style={s.contentWrap}>
                    <Text style={s.notifTitle}>{n.title}</Text>
                    <Text style={s.notifMsg}>{n.message}</Text>
                    <View style={s.timePill}>
                      <Text style={s.notifTime}>{timeFmt(n.created_at)}</Text>
                    </View>
                  </View>

                  <View style={[s.statusDot, { backgroundColor: cfg.dotColor, opacity: n.read ? 0.3 : 1 }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {notifications.length === 0 && (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 16 }}>No notifications yet</Text>
          </View>
        )}
      </ScrollView>

    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerUnreadDot: {
    position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E94057',
  },
  dateDivider: {
    color: '#a8a7d4', fontSize: 15, fontWeight: '500', 
    marginLeft: 20, marginTop: 24, marginBottom: 12,
  },
  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  contentWrap: {
    flex: 1, marginLeft: 16,
  },
  notifTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  notifMsg: { color: '#8a8a9e', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  timePill: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  notifTime: { color: '#a8a7d4', fontSize: 12, fontWeight: '500' },
});

