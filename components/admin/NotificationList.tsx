// components/admin/NotificationList.tsx
// Production-grade expandable stacked notification list based on the user's community specification.
// Supports spring stacked cards, count indicators, quick dismiss, and auto-refresh integration.
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminTheme } from '../../constants/adminTheme';
import { haptics } from '../../lib/haptcs';
import { playTickSound } from '../../lib/pinTickAudio';

export interface AdminNotification {
  id: string | number;
  title: string;
  subtitle: string;
  time: string;
  count?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
}

interface NotificationListProps {
  notifications: AdminNotification[];
  onDismiss?: (id: string | number) => void;
  onClearAll?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onClose?: () => void;
}

export function NotificationList({
  notifications = [],
  onDismiss,
  onClearAll,
  onRefresh,
  refreshing = false,
  onClose,
}: NotificationListProps) {
  const { theme: C, isDark } = useAdminTheme();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isExpanded = expanded || hovered;

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: C.success };
      case 'warning':
        return { name: 'alert-circle' as const, color: C.accentGold };
      case 'error':
        return { name: 'close-circle' as const, color: C.error };
      case 'info':
      default:
        return { name: 'information-circle' as const, color: C.primary };
    }
  };

  return (
    <View
      style={[
        st.container,
        {
          backgroundColor: isDark ? '#0C111C' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
          shadowColor: '#000',
        },
        Platform.OS === 'web' && ({
          boxShadow: isDark
            ? '0 12px 36px rgba(0, 0, 0, 0.65)'
            : '0 10px 30px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        } as any),
      ]}
      // @ts-ignore
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Top Header Bar ── */}
      <View style={[st.headerBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
        <View style={st.headerTitleRow}>
          <Text style={[st.headerTitleText, { color: C.onSurface }]}>Platform Activity</Text>
          <View style={[st.livePill, { backgroundColor: isDark ? C.primaryContainer : '#FFF0F3' }]}>
            <View style={[st.liveDot, { backgroundColor: C.primary }]} />
            <Text style={[st.livePillText, { color: C.primary }]}>Live Stream</Text>
          </View>
        </View>

        <View style={st.headerActionsRow}>
          {onRefresh && (
            <TouchableOpacity
              onPress={() => {
                try { playTickSound(); } catch {}
                haptics.tap();
                onRefresh();
              }}
              style={[
                st.iconBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC' },
                refreshing && Platform.OS === 'web' && ({ animation: 'adminSpin 0.75s linear infinite' } as any),
              ]}
              accessibilityLabel="Refresh Notifications"
            >
              <Ionicons name="reload" size={13} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          )}

          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={[st.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC' }]}
              accessibilityLabel="Close Notifications"
            >
              <Ionicons name="close" size={14} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stacked Notification Cards ── */}
      <View style={st.cardsContainer}>
        {notifications.length === 0 ? (
          <View style={st.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={24} color={C.onSurfaceVariant} />
            <Text style={[st.emptyText, { color: C.onSurfaceVariant }]}>
              No new alerts. All systems running smooth.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight: 340 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={st.cardsList}>
              {notifications.map((item, i) => {
                const typeConfig = getTypeIcon(item.type);
                const isFirst = i === 0;

                return (
                  <View
                    key={item.id}
                    style={[
                      st.card,
                      {
                        backgroundColor: isDark ? '#141A29' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                        marginTop: isFirst ? 0 : 8,
                        width: '100%',
                      },
                      Platform.OS === 'web' && ({
                        boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0, 0, 0, 0.05)',
                      } as any),
                    ]}
                  >
                    <View style={st.cardHeaderRow}>
                      <View style={st.cardTitleRow}>
                        <Ionicons name={typeConfig.name} size={15} color={typeConfig.color} style={{ marginRight: 6 }} />
                        <Text style={[st.cardTitleText, { color: C.onSurface }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>

                      <View style={st.cardRightWrap}>
                        {item.count && (
                          <View style={[st.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
                            <Ionicons name="repeat" size={10} color={C.onSurfaceVariant} style={{ marginRight: 3 }} />
                            <Text style={[st.countBadgeText, { color: C.onSurfaceVariant }]}>{item.count}</Text>
                          </View>
                        )}
                        {onDismiss && (
                          <TouchableOpacity
                            onPress={() => onDismiss(item.id)}
                            style={st.dismissBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="close-circle-outline" size={13} color={C.onSurfaceVariant} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <Text style={[st.cardSubtitleText, { color: C.onSurfaceVariant }]} numberOfLines={2}>
                      {item.subtitle}
                    </Text>

                    <View style={st.cardFooterRow}>
                      <Text style={[st.cardTimeText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                        {item.time}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── Bottom Expand / Collapse Toggle Bar ── */}
      <View style={[st.bottomBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
        <View style={st.bottomCountRow}>
          <View style={[st.totalBadge, { backgroundColor: C.primary }]}>
            <Text style={st.totalBadgeText}>{notifications.length}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setExpanded(prev => !prev)}
            style={st.toggleTextWrap}
          >
            <Text style={[st.bottomToggleText, { color: C.onSurfaceVariant }]}>
              {isExpanded ? 'Collapse' : 'Notifications'}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={C.onSurfaceVariant}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>
        </View>

        {onClearAll && notifications.length > 0 && (
          <TouchableOpacity
            onPress={onClearAll}
            activeOpacity={0.7}
            style={st.clearAllBtn}
          >
            <Text style={[st.clearAllText, { color: C.primary }]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    width: 330,
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 12,
    zIndex: 99999,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsContainer: {
    minHeight: 120,
  },
  cardsList: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 220,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  cardTitleText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  cardRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dismissBtn: {
    opacity: 0.7,
  },
  cardSubtitleText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  cardTimeText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 8,
  },
  bottomCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  toggleTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
