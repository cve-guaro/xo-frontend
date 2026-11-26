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
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/authContext';
import { API_URL } from '../../config';
import DesktopPageShell from '../../components/game/DesktopPageShell';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, token, language, refreshProfile } = useAuth();
  const isEN = language === 'en';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

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

  const renderContent = () => (
    <View style={[styles.innerWrap, isDesktop && styles.innerWrapDesktop]}>
      {/* Top Header Row for mobile or page header for desktop */}
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
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Title */}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isEN ? 'Notifications' : 'ማስታወቂያዎች'}
          </Text>
          <Text style={styles.headerSub}>
            {isEN ? 'System alerts, transactions & game updates' : 'የስርዓት ማንቂያዎች እና የጨዋታ ዝማኔዎች'}
          </Text>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markReadBtn}>
            <Ionicons name="checkmark-done-outline" size={16} color="#00DAF3" />
            <Text style={styles.markReadText}>{isEN ? 'Mark all as read' : 'ሁሉንም አንብብ'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00DAF3" />
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#00DAF3"
            />
          }
        >
          <View style={styles.emptyContainer}>
            {/* Notification Graphic */}
            <View style={styles.mailboxGraphic}>
              <Ionicons name="notifications-outline" size={36} color="#00DAF3" />
            </View>

            <Text style={styles.emptyTitle}>
              {isEN ? 'No notifications yet' : 'ምንም ማስታወቂያ የለም'}
            </Text>

            <Text style={styles.emptySubtitle}>
              {isEN
                ? "Your notifications will appear here once you've received game, wallet, or reward alerts."
                : 'ማስታወቂያዎች ሲደርሱዎት እዚህ ይታያሉ።'}
            </Text>

            <TouchableOpacity onPress={() => fetchNotifications(true)} style={styles.refreshEmptyBtn}>
              <Ionicons name="refresh" size={15} color="#00DAF3" />
              <Text style={styles.refreshEmptyBtnText}>{isEN ? 'Refresh notifications' : 'እንደገና ጫን'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#00DAF3"
            />
          }
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionHeader}>
              {isEN ? 'RECENT UPDATES' : 'የቅርብ ጊዜ ዝማኔዎች'}
            </Text>
          </View>

          {notifications.map((item, idx) => {
            const isUnread = !item.isRead;
            const initial = (item.title || 'X')[0].toUpperCase();
            return (
              <View key={item.id || idx} style={[styles.notifCard, isUnread && styles.notifCardUnread]}>
                {/* Category Avatar */}
                <View style={[styles.notifAvatar, isUnread && { backgroundColor: 'rgba(0, 218, 243, 0.15)' }]}>
                  <Text style={[styles.avatarText, isUnread && { color: '#00DAF3' }]}>{initial}</Text>
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

                  <Text style={styles.notifBody} numberOfLines={3}>
                    {item.message || item.body || 'New notification update from XO Ethiopia.'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060613' }}>
        <DesktopPageShell
          currentScreen="home"
          user={user}
          balance={Number(user?.available_balance || 0)}
          language={language}
          refreshProfile={refreshProfile}
          router={router}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
            {renderContent()}
          </ScrollView>
        </DesktopPageShell>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060814" />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  innerWrap: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  innerWrapDesktop: {
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
  },
  headerSub: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 218, 243, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.25)',
  },
  markReadText: {
    color: '#00DAF3',
    fontSize: 11,
    fontWeight: '700',
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
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#0D1320',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 218, 243, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
    marginBottom: 24,
  },
  refreshEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 218, 243, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.3)',
  },
  refreshEmptyBtnText: {
    color: '#00DAF3',
    fontSize: 12,
    fontWeight: '800',
  },
  listScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#8893A7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#0D1320',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  notifCardUnread: {
    borderColor: 'rgba(0, 218, 243, 0.3)',
    backgroundColor: 'rgba(0, 218, 243, 0.03)',
  },
  notifAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: {
    color: '#8893A7',
    fontSize: 14,
    fontWeight: '900',
  },
  notifDetails: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    color: '#ffffff',
    fontSize: 13.5,
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
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '600',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00DAF3',
  },
  notifBody: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
});
