// components/game/SpinRoomBrowser.tsx
// ────────────────────────────────────────────────────────────────────────────
// Room selection grid for Spin game. Shows available spin rooms with bet amounts,
// player counts, and estimated prizes. Connects via socket to get live room data.
// ────────────────────────────────────────────────────────────────────────────
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export type SpinRoomConfig = {
  id: number;
  name: string;
  betAmount: number;
  maxPlayers: number;
  houseCutPercent: number;
  currentPlayers: number;
  activeRoundId: string | null;
  estimatedPrize: number;
};

type SpinRoomBrowserProps = {
  rooms: SpinRoomConfig[];
  loading: boolean;
  balance: number;
  onJoinRoom: (configId: number) => void;
  onRefresh: () => void;
};

export default function SpinRoomBrowser({
  rooms,
  loading,
  balance,
  onJoinRoom,
  onRefresh,
}: SpinRoomBrowserProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading spin rooms…</Text>
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="game-controller-outline" size={48} color="#4b5563" />
        <Text style={styles.emptyTitle}>No Spin Rooms Available</Text>
        <Text style={styles.emptySubtitle}>Check back soon!</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>REFRESH</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SPIN ROOMS</Text>
          <Text style={styles.subtitle}>Choose a room and spin to win!</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
          <Ionicons name="refresh" size={18} color="#8b93a7" />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {rooms.map((room, idx) => {
          const canAfford = balance >= room.betAmount;
          const isActive = room.currentPlayers > 0;
          const isFull = room.currentPlayers >= room.maxPlayers;
          const accentColor = idx === 0 ? "#8b5cf6" : idx === 1 ? "#22d3ee" : idx === 2 ? "#22c55e" : idx === 3 ? "#f97316" : "#ec4899";

          return (
            <View
              key={room.id}
              style={[
                styles.roomCard,
                isActive && { borderColor: accentColor, borderWidth: 1.5 },
              ]}
            >
              {/* Header */}
              <View style={styles.roomHeader}>
                <View style={[styles.roomBadge, { backgroundColor: accentColor + "20" }]}>
                  <Text style={[styles.roomBadgeText, { color: accentColor }]}>{room.name}</Text>
                </View>
                {isActive && (
                  <View style={styles.liveIndicator}>
                    <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
                    <Text style={styles.liveText}>live</Text>
                  </View>
                )}
              </View>

              {/* Player count */}
              <View style={styles.roomCenter}>
                <Text style={[styles.playerCount, { color: accentColor }]}>{room.currentPlayers}</Text>
                <Text style={styles.playerCountLabel}>/ {room.maxPlayers} PLAYERS</Text>
                <View style={[styles.playersIconCircle, { backgroundColor: accentColor + "15" }]}>
                  <Ionicons name="people" size={24} color={accentColor} />
                </View>
              </View>

              {/* Bet & Prize */}
              <View style={styles.roomInfo}>
                <View style={styles.roomInfoItem}>
                  <Text style={styles.roomInfoLabel}>ENTRY</Text>
                  <Text style={styles.roomInfoValue}>{room.betAmount} ETB</Text>
                </View>
                <View style={styles.roomInfoDivider} />
                <View style={styles.roomInfoItem}>
                  <Text style={styles.roomInfoLabel}>WIN UP TO</Text>
                  <Text style={[styles.roomInfoValue, { color: "#22c55e" }]}>
                    {room.estimatedPrize} ETB
                  </Text>
                </View>
              </View>

              {/* Join button */}
              <TouchableOpacity
                style={[
                  styles.joinBtn,
                  { backgroundColor: canAfford && !isFull ? accentColor : "#2a2f45" },
                ]}
                onPress={() => onJoinRoom(room.id)}
                disabled={!canAfford || isFull}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.joinBtnText,
                  (!canAfford || isFull) && { color: "#4b5563" },
                ]}>
                  {isFull ? "FULL" : !canAfford ? "LOW BALANCE" : "JOIN ROOM"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  subtitle: {
    color: "#8b93a7",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  refreshIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(139, 147, 167, 0.1)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  roomCard: {
    flex: 1,
    minWidth: 200,
    maxWidth: 280,
    backgroundColor: "#141829",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  roomCenter: {
    alignItems: "center",
    paddingVertical: 12,
  },
  playerCount: {
    fontSize: 36,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  playerCountLabel: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  playersIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  roomInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e2340",
    marginTop: 4,
  },
  roomInfoItem: {
    alignItems: "center",
    flex: 1,
  },
  roomInfoDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#1e2340",
  },
  roomInfoLabel: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    fontFamily: "Inter, sans-serif",
  },
  roomInfoValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  joinBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  joinBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    color: "#8b93a7",
    fontSize: 14,
    marginTop: 12,
    fontFamily: "Inter, sans-serif",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
    fontFamily: "Inter, sans-serif",
  },
  emptySubtitle: {
    color: "#8b93a7",
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Inter, sans-serif",
  },
  refreshBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8b5cf6",
  },
  refreshBtnText: {
    color: "#8b5cf6",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
});
