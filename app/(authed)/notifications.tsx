import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/authContext';
import { API_URL } from '../../config';

export default function NotificationsScreen() {
  const router = useRouter();
  const { token, language } = useAuth();
  const isEN = language === 'en';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(true);

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/notifications/user?limit=50`, {
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'mobile' },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/user/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'mobile' },
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060814" />

      {/* Top Header Row */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(authed)/home/gameplay');
            }
          }}
          style={styles.iconBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.headerTitle}>
          {isEN ? 'Notifications' : 'ማስታወቂያዎች'}
        </Text>

        {/* Right Spacer for Center Alignment */}
        <View style={{ width: 40 }} />
      </View>

      {/* Main Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : notifications.length === 0 ? (
        /* EMPTY STATE (Matching Image 3 left mockup) */
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#8b5cf6"
            />
          }
        >
          <View style={styles.emptyContainer}>
            {/* Mailbox 3D Graphic */}
            <View style={styles.mailboxGraphic}>
              <View style={styles.mailboxFlag} />
              <View style={styles.mailboxBody}>
                <Ionicons name="checkmark-circle" size={32} color="#ffffff" />
              </View>
              <View style={styles.mailboxPost} />
            </View>

            <Text style={styles.emptyTitle}>
              {isEN ? 'No notifications yet' : 'ምንም ማስታወቂያ የለም'}
            </Text>

            <Text style={styles.emptySubtitle}>
              {isEN
                ? "Your notification will appear here once you've received them."
                : 'ማስታወቂያዎች ሲደርሱዎት እዚህ ይታያሉ።'}
            </Text>

            <View style={styles.missingWrap}>
              <Text style={styles.missingLabel}>Missing notifications?</Text>
              <TouchableOpacity onPress={() => fetchNotifications(true)}>
                <Text style={styles.missingLink}>Go to historical notifications.</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* POPULATED LIST STATE (Matching Image 3 right mockup) */
        <ScrollView
          contentContainerStyle={styles.listScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#8b5cf6"
            />
          }
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionHeader}>
              {isEN ? 'Previously' : 'ቀደም ሲል'}
            </Text>

            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markReadText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>

          {notifications.map((item, idx) => {
            const isUnread = !item.isRead;
            const initial = (item.title || 'V')[0].toUpperCase();
            return (
              <View key={item.id || idx} style={styles.notifCard}>
                {/* Category Avatar */}
                <View style={styles.notifAvatar}>
                  <Text style={styles.avatarText}>{initial}.</Text>
                </View>

                {/* Content Details */}
                <View style={styles.notifDetails}>
                  <View style={styles.notifHeaderRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>
                      {item.title || 'XO Ethiopia'}
                    </Text>

                    <View style={styles.notifMetaRow}>
                      <Text style={styles.notifDate}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today'}
                      </Text>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                  </View>

                  <Text style={styles.notifBody} numberOfLines={2}>
                    {item.message || item.body || 'New notification update from XO Ethiopia.'}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={[styles.missingWrap, { marginTop: 24 }]}>
            <Text style={styles.missingLabel}>Missing notifications?</Text>
            <TouchableOpacity onPress={() => fetchNotifications(true)}>
              <Text style={styles.missingLink}>Go to historical notifications.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060814',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
  },
  settingsWrap: {
    position: 'relative',
  },
  tooltipBubble: {
    position: 'absolute',
    top: 48,
    right: 0,
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 99,
    elevation: 10,
    width: 170,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 14,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  mailboxGraphic: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  mailboxFlag: {
    position: 'absolute',
    top: -8,
    right: 16,
    width: 12,
    height: 18,
    backgroundColor: '#ef4444',
    borderRadius: 3,
  },
  mailboxBody: {
    width: 50,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailboxPost: {
    position: 'absolute',
    bottom: -12,
    width: 10,
    height: 12,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 28,
  },
  missingWrap: {
    alignItems: 'center',
    gap: 4,
  },
  missingLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  missingLink: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  listScroll: {
    padding: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeader: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '800',
  },
  markReadText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '700',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  notifAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f472b6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  notifDetails: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  notifMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  notifBody: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    lineHeight: 15,
  },
});
