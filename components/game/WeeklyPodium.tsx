import React, { memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebPressable } from "../WebPressable";
import { InfoPill } from "./HeaderPill";

interface WeeklyPodiumProps {
  isEN: boolean;
  weeklyLeaderboard: any[];
  myWeeklyRank: any;
  isBanned: boolean;
  openRoomSheet: () => void;
  setFriendModalVisible: (visible: boolean) => void;
  setRulesVisible: (visible: boolean) => void;
  t: (key: string) => string;
}

export const WeeklyPodium = memo(function WeeklyPodium({
  isEN,
  weeklyLeaderboard,
  myWeeklyRank,
  isBanned,
  openRoomSheet,
  setFriendModalVisible,
  setRulesVisible,
  t,
}: WeeklyPodiumProps) {
  
  const renderPodiumSpot = (spot: {
    rank: number;
    prize: number;
    color: string;
    barH: number;
    label: string;
  }) => {
    const userAtRank = weeklyLeaderboard.find((u) => u.rank === spot.rank);
    const username = userAtRank ? userAtRank.username : "—";
    const isFirst = spot.rank === 1;
    const circleSize = isFirst ? 54 : 42;

    return (
      <View key={spot.rank} style={styles.podiumSpot}>
        {/* Prize */}
        <Text style={[styles.prizeText, { color: spot.color }]}>
          {spot.prize} Birr
        </Text>

        {/* Rank Circle */}
        <View
          style={[
            styles.rankCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderColor: spot.color,
            },
          ]}
        >
          <Text
            style={[
              styles.rankNumber,
              { fontSize: isFirst ? 18 : 14 },
            ]}
          >
            {spot.rank}
          </Text>

          {isFirst && (
            <View style={[styles.trophyBadge, { backgroundColor: spot.color }]}>
              <Ionicons name="trophy" size={9} color="#000" />
            </View>
          )}
        </View>

        {/* Column Bar */}
        <View
          style={[
            styles.columnBar,
            {
              maxWidth: isFirst ? 82 : 72,
              height: spot.barH,
              borderColor: spot.color,
            },
          ]}
        >
          <Text style={styles.usernameText} numberOfLines={1}>
            {username}
          </Text>
        </View>
      </View>
    );
  };

  const renderUserRankCard = () => {
    const rankVal =
      myWeeklyRank && myWeeklyRank.rank ? `#${myWeeklyRank.rank}` : "#1";
    const scoreVal =
      myWeeklyRank && myWeeklyRank.wins !== undefined
        ? `${myWeeklyRank.wins} ${isEN ? "Wins" : "ድሎች"}`
        : `2 ${isEN ? "Wins" : "ድሎች"}`;

    return (
      <View style={styles.userRankCard}>
        <View style={styles.userRankLeft}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>{rankVal}</Text>
          </View>
          <View>
            <Text style={styles.rankMeText}>
              {isEN ? "You" : "እርሶ"}
            </Text>
            <Text style={styles.rankSubText}>
              {isEN ? "All players" : "ሁሉም ተጫዋቾች"}
            </Text>
          </View>
        </View>
        <Text style={styles.userScoreText}>{scoreVal}</Text>
      </View>
    );
  };

  return (
    <View style={styles.mainCard}>
      <LinearGradient
        colors={["rgba(13, 15, 34, 0.95)", "rgba(18, 14, 42, 0.98)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIconWrap}>
            <Image
              source={require("../../assets/images/adaptive-icon.png")}
              style={styles.brandLogo}
              resizeMode="cover"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {isEN ? "GAMEPLAY HUB" : "የጨዋታ ማዕከል"}
            </Text>
            <Text style={styles.headerSub}>
              {isEN ? "OUTPACE. OUTSMART. WIN!" : "ይቅደሙ። ብልህ ይሁኑ። ያሸንፉ!"}
            </Text>
          </View>
        </View>

        {/* Weekly Pill */}
        <View style={styles.weeklyPill}>
          <Ionicons name="trophy-outline" size={10} color="rgba(255,255,255,0.8)" />
          <Text style={styles.weeklyPillText}>
            {isEN ? "Weekly" : "ሳምንታዊ"}
          </Text>
        </View>
      </View>

      {/* Podium spots */}
      <View style={styles.podiumContainer}>
        {renderPodiumSpot({
          rank: 2,
          prize: 300,
          color: "#22d3ee",
          barH: 54,
          label: "2nd",
        })}
        {renderPodiumSpot({
          rank: 1,
          prize: 500,
          color: "#f5b642",
          barH: 76,
          label: "1st",
        })}
        {renderPodiumSpot({
          rank: 3,
          prize: 200,
          color: "#f97316",
          barH: 44,
          label: "3rd",
        })}
      </View>

      {/* User Rank Card */}
      {renderUserRankCard()}

      {/* Play Now Button */}
      <WebPressable
        onPress={isBanned ? undefined : openRoomSheet}
        disabled={isBanned}
        style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
          styles.playBtn,
          {
            marginTop: 20,
            borderRadius: 22,
            overflow: "hidden",
            transform: [{ scale: hovered && !isBanned ? 1.02 : 1 }],
            shadowColor: "#00daf3",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: hovered && !isBanned ? 0.6 : 0.4,
            shadowRadius: 14,
            elevation: 8,
          },
        ]}
      >
        <LinearGradient
          colors={isBanned ? ["#3a2020", "#2a1515"] : ["#00daf3", "#00b4d8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.playInner}
        >
          <Ionicons
            name={isBanned ? "lock-closed" : "flash"}
            size={20}
            color={isBanned ? "#fff" : "#060d1a"}
          />
          <Text style={[styles.playText, { color: isBanned ? "#fff" : "#060d1a" }]}>
            {isBanned ? (isEN ? "SUSPENDED" : "ታግዷል") : t("play_now")}
          </Text>
        </LinearGradient>
      </WebPressable>

      {/* Play with Friend Button with cyan + badge */}
      <View style={{ position: "relative", width: "100%", marginTop: 12 }}>
        <WebPressable
          onPress={() => setFriendModalVisible(true)}
          style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
            styles.playBtn,
            {
              backgroundColor: "rgba(18, 14, 42, 0.9)",
              borderWidth: 1.5,
              borderColor: "rgba(0, 218, 243, 0.4)",
              borderRadius: 22,
              transform: [{ scale: hovered ? 1.02 : 1 }],
            },
          ]}
        >
          <View style={[styles.playInner, { paddingRight: 48 }]}>
            <Ionicons
              name="people-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.playText, { color: "#fff", letterSpacing: 0.8 }]}>
              {isEN ? "PLAY WITH FRIEND" : "ከጓደኛ ጋር ይጫወቱ"}
            </Text>
          </View>
        </WebPressable>
        <TouchableOpacity
          onPress={() => setFriendModalVisible(true)}
          style={{
            position: "absolute",
            right: 6,
            top: 5,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#00daf3",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#00daf3",
            shadowOpacity: 0.5,
            shadowRadius: 6,
            elevation: 4,
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#060d1a" />
        </TouchableOpacity>
      </View>

      {isBanned && (
        <Text style={styles.suspendedText}>
          {isEN
            ? "Your account is suspended · Contact support"
            : "መለያዎ ታግዷል · ድጋፍን ያነጋግሩ"}
        </Text>
      )}

      {/* Rules and info row */}
      <View style={styles.infoRow}>
        <InfoPill
          icon="shield-checkmark-outline"
          text={isEN ? "Anti-cheat" : "ጸረ-ማጭበርበር"}
        />
        <InfoPill icon="timer-outline" text={isEN ? "Fast rounds" : "ፈጣን ዙሮች"} />
        <InfoPill icon="cash-outline" text={isEN ? "Instant pay" : "ፈጣን ክፍያ"} />
        <TouchableOpacity
          onPress={() => setRulesVisible(true)}
          style={{ flex: 1 }}
        >
          <InfoPill icon="book-outline" text={isEN ? "Rules" : "ደንቦች"} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  mainCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.3)",
    backgroundColor: "#0d0f22",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  brandLogo: {
    width: "100%",
    height: "100%",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  headerSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "600",
  },
  weeklyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  weeklyPillText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
    width: "100%",
    paddingHorizontal: 10,
  },
  podiumSpot: {
    alignItems: "center",
    flex: 1,
  },
  prizeText: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rankCircle: {
    backgroundColor: "#0c0c1d",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -10,
    zIndex: 2,
    position: "relative",
  },
  rankNumber: {
    fontWeight: "900",
    color: "#fff",
  },
  trophyBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  columnBar: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  usernameText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  userRankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginTop: 16,
    width: "100%",
  },
  userRankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankBadgeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "900",
  },
  rankMeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  rankSubText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  userScoreText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  playBtn: {
    borderRadius: 18,
    overflow: "hidden",
  },
  playInner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  playText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  suspendedText: {
    color: "rgba(253,111,133,0.6)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  infoRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
  },
});
