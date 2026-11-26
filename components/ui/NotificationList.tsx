// components/ui/NotificationList.tsx
// Interactive stacked notification list with collapsible cards and real event items.
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";

export interface NotificationItem {
  id: string | number;
  title: string;
  subtitle: string;
  time: string;
  type?: "win" | "deposit" | "bonus" | "system";
  count?: number;
}

export interface NotificationListProps {
  notifications?: NotificationItem[];
  onViewAll?: () => void;
  style?: any;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Prize Credited",
    subtitle: "+1,200 ETB won in Tic-Tac-Toe",
    time: "just now",
    type: "win",
  },
  {
    id: "notif-2",
    title: "Welcome Bonus Active",
    subtitle: "Claim 10 ETB free gift balance",
    time: "2m ago",
    type: "bonus",
  },
  {
    id: "notif-3",
    title: "Deposit Succeeded",
    subtitle: "Telebirr transfer confirmed",
    time: "15m ago",
    type: "deposit",
  },
];

export function NotificationList({
  notifications = DEFAULT_NOTIFICATIONS,
  onViewAll,
  style,
}: NotificationListProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    setExpanded(!expanded);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "win":
        return { name: "trophy" as const, color: "#F59E0B" };
      case "deposit":
        return { name: "wallet" as const, color: "#10B981" };
      case "bonus":
        return { name: "gift" as const, color: "#00DAF3" };
      default:
        return { name: "notifications" as const, color: "#00DAF3" };
    }
  };

  const visibleList = expanded ? notifications : notifications.slice(0, 3);

  return (
    <View style={[styles.container, style]}>
      {/* ── Stacked Notification Cards ── */}
      <View style={styles.stackWrapper}>
        {visibleList.map((notif, index) => {
          const icon = getIcon(notif.type);
          const offsetStyle = !expanded && index > 0
            ? { marginTop: -24, transform: [{ scale: 1 - index * 0.04 }] }
            : { marginTop: index === 0 ? 0 : 8 };

          return (
            <TouchableOpacity
              key={notif.id}
              activeOpacity={0.88}
              onPress={toggleExpand}
              style={[
                styles.card,
                offsetStyle,
                { zIndex: notifications.length - index },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                  <View style={[styles.iconBox, { backgroundColor: `${icon.color}20` }]}>
                    <Ionicons name={icon.name} size={14} color={icon.color} />
                  </View>
                  <Text numberOfLines={1} style={styles.cardTitle}>{notif.title}</Text>
                </View>
                <Text style={styles.timeText}>{notif.time}</Text>
              </View>
              <Text numberOfLines={1} style={styles.cardSubtitle}>{notif.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Bottom Controls Row ── */}
      <View style={styles.footerRow}>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{notifications.length}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (onViewAll) onViewAll();
            else toggleExpand();
          }}
          style={styles.actionBtn}
          activeOpacity={0.75}
        >
          <Text style={styles.actionText}>
            {expanded ? "Collapse" : "Notifications"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-forward"}
            size={14}
            color="#8893A7"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(11, 17, 26, 0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    width: "100%",
    maxWidth: 340,
  },
  stackWrapper: {
    position: "relative",
  },
  card: {
    backgroundColor: "#16202E",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  timeText: {
    color: "#8893A7",
    fontSize: 10.5,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "500",
    paddingLeft: 32,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#00DAF3",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "#060613",
    fontSize: 11,
    fontWeight: "900",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    color: "#8893A7",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default NotificationList;
