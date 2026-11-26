// components/game/LatestWinningsCard.tsx
// High fidelity "Latest Winnings" card matching Image 1 wireframe.
// Supports tabs: "Show all", "Top bets", "Top Wins", "Payout".
// Pulls live multi-game winner feed (Tic-Tac-Toe, Rock Paper Scissors, Wheel of Fortune).
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../config";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import Avatar from "../ui/Avatar";

export type WinningsFilter = "all" | "top_bets" | "top_wins" | "payout";

export interface WinnerItem {
  userId?: string;
  username: string;
  avatar?: string;
  createdAt?: string;
  amount: number;
  betAmount?: number;
  gameType?: "xo" | "rps" | "spin";
  gameTitle?: string;
  finishedAt?: string;
  type?: "real" | "fake";
}

interface LatestWinningsCardProps {
  style?: any;
  isEN?: boolean;
}

export default function LatestWinningsCard({ style, isEN = true }: LatestWinningsCardProps) {
  const [filter, setFilter] = useState<WinningsFilter>("all");
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWinner, setSelectedWinner] = useState<WinnerItem | null>(null);

  const fetchWinners = useCallback(async (activeFilter: WinningsFilter) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/leaderboard/ticker?filter=${activeFilter}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ticker)) {
          setWinners(data.ticker);
        }
      }
    } catch (err) {
      console.warn("[LatestWinningsCard] fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWinners(filter);
    const interval = setInterval(() => {
      fetchWinners(filter);
    }, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [filter, fetchWinners]);

  const handleTabChange = (newFilter: WinningsFilter) => {
    try { playTickSound(); } catch {}
    haptics.tap();
    setFilter(newFilter);
  };

  const getGameIcon = (type?: string) => {
    switch (type) {
      case "spin":
        return { name: "aperture" as const, color: "#FF3B57", bg: "rgba(255, 59, 87, 0.15)" };
      case "rps":
        return { name: "flash" as const, color: "#FFD200", bg: "rgba(255, 210, 0, 0.15)" };
      case "xo":
      default:
        return { name: "grid" as const, color: "#00DAF3", bg: "rgba(0, 218, 243, 0.15)" };
    }
  };

  return (
    <View style={[s.cardContainer, style]}>
      {/* ── Header Row (Title Only, Filters Removed per User Instructions) ── */}
      <View style={s.headerRow}>
        <View style={s.titleRow}>
          <View style={s.ribbonBadge}>
            <Ionicons name="ribbon-outline" size={17} color="#00DAF3" />
          </View>
          <Text style={s.cardTitle}>
            {isEN ? "Latest winnings" : "የቅርብ ጊዜ አሸናፊዎች"}
          </Text>
        </View>
      </View>

      {/* ── Table Subheader ── */}
      <View style={s.subHeaderRow}>
        <Text style={s.subHeaderLabel}>{isEN ? "Game" : "ጨዋታ"}</Text>
        <View style={s.coinHeaderWrap}>
          <Ionicons name="cash-outline" size={13} color="#F5B642" />
          <Text style={s.subHeaderLabel}>{isEN ? "Amount" : "መጠን"}</Text>
        </View>
      </View>

      {/* ── Winners List (STRICTLY TOP 3 ONLY) ── */}
      {loading && winners.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color="#00DAF3" />
        </View>
      ) : winners.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="game-controller-outline" size={26} color="#64748b" />
          <Text style={s.emptyText}>
            {isEN ? "No live winning games recorded yet." : "እስካሁን ምንም የተመዘገቡ አሸናፊዎች የሉም።"}
          </Text>
        </View>
      ) : (
        <View style={s.listContainer}>
          {winners.slice(0, 3).map((item, index) => {
            const iconConfig = getGameIcon(item.gameType);
            const displayTitle = item.gameTitle || (item.gameType === "spin" ? "Spin & Win" : item.gameType === "rps" ? "Rock Paper Scissors" : "Tic-Tac-Toe 1v1");
            return (
              <TouchableOpacity
                key={`${item.username}-${index}-${item.amount}-${item.finishedAt || ""}`}
                style={s.winnerRow}
                activeOpacity={0.7}
                onPress={() => {
                  try { playTickSound(); } catch {}
                  haptics.tap();
                  setSelectedWinner(item);
                }}
              >
                {/* Left: User Profile Avatar with small game icon badge overlay */}
                <View style={s.gameInfoGroup}>
                  <View style={s.avatarWrapper}>
                    <Avatar uri={item.avatar} name={item.username} size={36} />
                    <View style={[s.smallGameBadge, { backgroundColor: iconConfig.color }]}>
                      <Ionicons name={iconConfig.name} size={9} color="#0D1117" />
                    </View>
                  </View>

                  <View style={s.textMetaCol}>
                    <Text numberOfLines={1} style={s.gameTitleText}>
                      {displayTitle}
                    </Text>
                    <Text numberOfLines={1} style={s.playerUsernameText}>
                      @{item.username}
                    </Text>
                  </View>
                </View>

                {/* Right: Gold Prize Amount */}
                <View style={s.prizeGroup}>
                  <Text style={s.prizeAmountText}>
                    +{Number(item.amount || 0).toLocaleString()} <Text style={s.currencyText}>ETB</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── USER PROFILE MODAL ── */}
      {selectedWinner && (
        <Modal
          visible={!!selectedWinner}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedWinner(null)}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setSelectedWinner(null)}>
            <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <TouchableOpacity
                style={s.modalCloseBtn}
                onPress={() => setSelectedWinner(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Profile Avatar & Header */}
              <View style={s.modalAvatarWrap}>
                <Avatar
                  uri={selectedWinner.avatar}
                  name={selectedWinner.username}
                  size={64}
                />
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark-sharp" size={12} color="#060613" />
                </View>
              </View>

              <Text style={s.modalUsername}>@{selectedWinner.username}</Text>
              
              <View style={s.verifiedTag}>
                <Text style={s.verifiedTagText}>
                  {selectedWinner.type === "fake" ? "TOP PLAYER" : "ACTIVE PLAYER"}
                </Text>
              </View>

              {/* Match Highlight Card */}
              <View style={s.matchHighlightCard}>
                <View style={s.matchStatCol}>
                  <Text style={s.matchStatLabel}>{isEN ? "RECENT GAME" : "የቅርብ ጨዋታ"}</Text>
                  <Text style={s.matchStatValue} numberOfLines={1}>
                    {selectedWinner.gameTitle || (selectedWinner.gameType === "spin" ? "Wheel of Fortune" : selectedWinner.gameType === "rps" ? "Rock Paper Scissors" : "Tic-Tac-Toe")}
                  </Text>
                </View>
                <View style={s.matchStatDivider} />
                <View style={s.matchStatCol}>
                  <Text style={s.matchStatLabel}>{isEN ? "PRIZE WON" : "ያሸነፈው"}</Text>
                  <Text style={s.matchPrizeValue}>
                    {Number(selectedWinner.amount || 0).toLocaleString()} ETB
                  </Text>
                </View>
              </View>

              {/* Player Stats Grid */}
              <View style={s.statsGrid}>
                <View style={s.statBox}>
                  <Text style={s.statBoxLabel}>{isEN ? "STAKE" : "ውርርድ"}</Text>
                  <Text style={s.statBoxValue}>{selectedWinner.betAmount || 10} ETB</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={s.statBoxLabel}>{isEN ? "MULTIPLIER" : "እጥፍ"}</Text>
                  <Text style={[s.statBoxValue, { color: "#F5B642" }]}>
                    {selectedWinner.betAmount ? `${(selectedWinner.amount / selectedWinner.betAmount).toFixed(1)}x` : "1.8x"}
                  </Text>
                </View>
                <View style={s.statBox}>
                  <Text style={s.statBoxLabel}>{isEN ? "STATUS" : "ሁኔታ"}</Text>
                  <Text style={[s.statBoxValue, { color: "#10B981" }]}>
                    {isEN ? "WINNER" : "አሸናፊ"}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={s.modalActionRow}>
                <TouchableOpacity
                  style={s.modalPrimaryBtn}
                  onPress={() => setSelectedWinner(null)}
                  activeOpacity={0.8}
                >
                  <Text style={s.modalPrimaryBtnText}>{isEN ? "Back" : "ተመለስ"}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cardContainer: {
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 4,
    paddingHorizontal: 0,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
    flexWrap: "nowrap",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  ribbonBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  tabsScrollView: {
    flexGrow: 0,
    maxWidth: "60%",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  tabPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabPillActive: {
    backgroundColor: "#00DAF3",
    borderColor: "#00DAF3",
  },
  tabText: {
    color: "#8B93A7",
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#050811",
    fontWeight: "900",
  },
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 8,
  },
  subHeaderLabel: {
    color: "#64748B",
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coinHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  coinIcon: {
    fontSize: 12,
  },
  listContainer: {
    gap: 8,
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  gameInfoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatarWrapper: {
    position: "relative",
    width: 36,
    height: 36,
  },
  smallGameBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#111827",
  },
  textMetaCol: {
    flex: 1,
  },
  gameTitleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  playerUsernameText: {
    color: "#8B93A7",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  prizeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  goldCoin: {
    fontSize: 14,
  },
  prizeAmountText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  currencyText: {
    color: "#00DAF3",
    fontSize: 11,
    fontWeight: "800",
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 11.5,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 99999,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0D1322",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.3)",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    position: "relative",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarWrap: {
    position: "relative",
    marginTop: 6,
    marginBottom: 10,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00DAF3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0D1322",
  },
  modalUsername: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  verifiedTag: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.3)",
    marginTop: 6,
    marginBottom: 16,
  },
  verifiedTagText: {
    color: "#00DAF3",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  matchHighlightCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 14,
  },
  matchStatCol: {
    flex: 1,
  },
  matchStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 12,
  },
  matchStatLabel: {
    color: "#64748B",
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  matchStatValue: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  matchPrizeValue: {
    color: "#F5B642",
    fontSize: 13.5,
    fontWeight: "900",
  },
  statsGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  statBoxLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statBoxValue: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  modalActionRow: {
    width: "100%",
  },
  modalPrimaryBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
