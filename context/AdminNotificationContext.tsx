// context/AdminNotificationContext.tsx
// Global real-time notification store and animated toast dispatcher for the Admin Center.
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminNotification } from '../components/admin/NotificationList';
import { haptics } from '../lib/haptcs';
import { playTickSound } from '../lib/pinTickAudio';
import { DarkAdminTheme, LightAdminTheme } from '../constants/adminTheme';

interface AdminNotificationContextValue {
  notifications: AdminNotification[];
  notify: (item: Omit<AdminNotification, 'id' | 'time'> & { id?: string | number }) => void;
  dismiss: (id: string | number) => void;
  clearAll: () => void;
}

const AdminNotificationContext = createContext<AdminNotificationContextValue>({
  notifications: [],
  notify: () => {},
  dismiss: () => {},
  clearAll: () => {},
});

const DEFAULT_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif-1',
    title: 'High Stakes Payout Settled',
    subtitle: '5,000 ETB weekly leaderboard prize awarded to rank 1 winner',
    time: '2m ago',
    type: 'success',
  },
  {
    id: 'notif-2',
    title: 'New Withdrawal Request',
    subtitle: 'Player requested 1,200 ETB telebirr cashout awaiting verification',
    time: '5m ago',
    type: 'warning',
  },
  {
    id: 'notif-3',
    title: 'Large Deposit Credited',
    subtitle: 'User wallet credited +2,500 ETB via payment gateway verified',
    time: '12m ago',
    type: 'success',
  },
];

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>(DEFAULT_NOTIFICATIONS);
  const [activeToast, setActiveToast] = useState<AdminNotification | null>(null);

  const dismiss = useCallback((id: string | number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const notify = useCallback((item: Omit<AdminNotification, 'id' | 'time'> & { id?: string | number }) => {
    const newNotif: AdminNotification = {
      id: item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      subtitle: item.subtitle,
      time: 'just now',
      count: item.count,
      type: item.type || 'info',
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]); // keep latest 20
    setActiveToast(newNotif);

    try {
      playTickSound();
    } catch {}
    haptics.success();

    // Auto dismiss toast after 4 seconds
    setTimeout(() => {
      setActiveToast(current => (current?.id === newNotif.id ? null : current));
    }, 4000);
  }, []);

  return (
    <AdminNotificationContext.Provider value={{ notifications, notify, dismiss, clearAll }}>
      {children}

      {/* Floating Animated Toast Banner */}
      {activeToast && (
        <View style={s.toastContainer} pointerEvents="box-none">
          <View
            style={[
              s.toastCard,
              Platform.OS === 'web' && ({
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                animation: 'adminSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              } as any),
            ]}
          >
            <View style={s.toastContent}>
              <View
                style={[
                  s.toastIconBox,
                  {
                    backgroundColor:
                      activeToast.type === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : activeToast.type === 'error'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                  },
                ]}
              >
                <Ionicons
                  name={
                    activeToast.type === 'success'
                      ? 'checkmark-circle'
                      : activeToast.type === 'error'
                      ? 'alert-circle'
                      : 'notifications'
                  }
                  size={16}
                  color={
                    activeToast.type === 'success'
                      ? '#10B981'
                      : activeToast.type === 'error'
                      ? '#EF4444'
                      : '#6366F1'
                  }
                />
              </View>

              <View style={s.toastTextCol}>
                <Text style={s.toastTitle}>{activeToast.title}</Text>
                <Text style={s.toastSubtitle} numberOfLines={2}>
                  {activeToast.subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setActiveToast(null)}
              style={s.toastCloseBtn}
            >
              <Ionicons name="close" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  return useContext(AdminNotificationContext);
}

const s = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 54,
    right: 20,
    zIndex: 999999,
  },
  toastCard: {
    minWidth: 280,
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toastIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextCol: {
    flex: 1,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  toastSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  toastCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
