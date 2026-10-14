// components/game/WeeklyPodium.tsx
// ────────────────────────────────────────────────────────────────────────────
// XO tab: "Gameplay Hub" — weekly podium, personal rank, CTAs.
// Production pass: real podium blocks with ranked fills + trophy for #1,
// calm rank strip, single cyan primary CTA, ghost secondary, chip row.
// ────────────────────────────────────────────────────────────────────────────
import React, { memo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebPressable } from "../WebPressable";
import { colors, type, radius, space, metrics, elevation } from "../../theme/tokens";
import { Chip } from "../../theme/ui";

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

const RANK_STYLE = {
  1: { fill: "rgba(245,182,66,0.16)", cap: colors.gold, text: colors.gold },
  2: { fill: "rgba(0,218,243,0.12)", cap: colors.primary, text: colors.primary },
  3: { fill: "rgba(251,146,60,0.12)", cap: colors.warning, text: colors.warning },
} as const;

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
    rank: 1 | 2 | 3;
    prize: number;
    barH: number;
  }) => {
    const s = RANK_STYLE[spot.rank];
    const userAtRank = weeklyLeaderboard.find((u) => u.rank === spot.rank);
    const username = userAtRank ? userAtRank.username : "—";
    const isFirst = spot.rank === 1;
    const circleSize = isFirst ? 50 : 40;

    return (
      <View key={spot.rank} style={styles.podiumSpot}>
        <Text style={[styles.prizeText, { color: s.text }]}>
          {spot.prize} Birr
        </Text>

        {/* Rank circle */}
        <View
          style={[
            styles.rankCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderColor: s.cap,
            },
          ]}
        >
          <Text style={[styles.rankNumber, { fontSize: isFirst ? 17 : 13, color: s.text }]}>
            {spot.rank}
          </Text>
          {isFirst && (
            <View style={styles.trophyBadge}>
              <Ionicons name="trophy" size={8} color="#231603" />
            </View>
          )}
        </View>

        {/* Podium block */}
        <View
          style={[
            styles.podiumBlock,
            { height: spot.barH, backgroundColor: s.fill },
          ]}
        >
          <View style={[styles.podiumCap, { backgroundColor: s.cap }]} />
          <Text style={styles.usernameText} numberOfLines={1}>
            {username}
          </Text>
        </View>
      </View>
    );
  };

  const rankVal =
    myWeeklyRank && myWeeklyRank.rank ? `#${myWeeklyRank.rank}` : "#—";
  const scoreVal =
    myWeeklyRank && myWeeklyRank.wins !== undefined
      ? `${myWeeklyRank.wins} ${isEN ? "Wins" : "ድሎች"}`
      : `0 ${isEN ? "Wins" : "ድሎች"}`;

  return (
    <View style={styles.mainCard}>
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
              {isEN ? "Outpace · Outsmart · Win" : "ይቅደሙ · ብልህ ይሁኑ · ያሸንፉ"}
            </Text>
          </View>
        </View>

        <View style={styles.weeklyPill}>
          <Ionicons name="trophy-outline" size={10} color={colors.gold} />
          <Text style={styles.weeklyPillText}>
            {isEN ? "Weekly" : "ሳምንታዊ"}
          </Text>
        </View>
      </View>

      {/* Podium */}
      <View style={styles.podiumContainer}>
        {renderPodiumSpot({ rank: 2, prize: 300, barH: 58 })}
        {renderPodiumSpot({ rank: 1, prize: 500, barH: 80 })}
        {renderPodiumSpot({ rank: 3, prize: 200, barH: 46 })}
      </View>

      {/* My rank strip */}
      <View style={styles.userRankCard}>
        <View style={styles.userRankLeft}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>{rankVal}</Text>
          </View>
          <View>
            <Text style={styles.rankMeText}>{isEN ? "You" : "እርሶ"}</Text>
            <Text style={styles.rankSubText}>
              {isEN ? "All players" : "ሁሉም ተጫዋቾች"}
            </Text>
          </View>
        </View>
        <Text style={styles.userScoreText}>{scoreVal}</Text>
      </View>

      {/* Primary CTA */}
      <WebPressable
        onPress={isBanned ? undefined : openRoomSheet}
        disabled={isBanned}
        style={({ hovered }) => [
          styles.ctaWrap,
          !isBanned && elevation.glowPrimary,
          hovered && !isBanned && { transform: [{ scale: 1.015 }] },
        ]}
      >
        <LinearGradient
          colors={isBanned ? ["#3a2020", "#2a1515"] : colors.gradCta}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.ctaInner}
        >
          <Ionicons
            name={isBanned ? "lock-closed" : "flash"}
            size={19}
            color={isBanned ? "#fff" : "#04222B"}
          />
          <Text style={[styles.ctaText, { color: isBanned ? "#fff" : "#04222B" }]}>
            {isBanned ? (isEN ? "SUSPENDED" : "ታግዷል") : t("play_now")}
          </Text>
        </LinearGradient>
      </WebPressable>

      {/* Secondary CTA */}
      <WebPressable
        onPress={() => setFriendModalVisible(true)}
        style={({ hovered }) => [
          styles.ctaGhost,
          hovered && { borderColor: "rgba(0,218,243,0.5)", backgroundColor: colors.cardRaised },
        ]}
      >
        <Ionicons name="people" size={18} color={colors.primary} />
        <Text style={styles.ctaGhostText}>
          {isEN ? "Play with Friend" : "ከጓደኛ ጋር ይጫወቱ"}
        </Text>
      </WebPressable>

      {isBanned && (
        <Text style={styles.suspendedText}>
          {isEN
            ? "Your account is suspended · Contact support"
            : "መለያዎ ታግዷል · ድጋፍን ያነጋግሩ"}
        </Text>
      )}

      {/* Trust chips */}
      <View style={styles.infoRow}>
        <Chip
          icon="shield-checkmark-outline"
          text={isEN ? "Anti-cheat" : "ጸረ-ማጭበርበር"}
        />
        <Chip icon="timer-outline" text={isEN ? "Fast rounds" : "ፈጣን ዙሮች"} />
        <Chip icon="cash-outline" text={isEN ? "Instant pay" : "ፈጣን ክፍያ"} />
        <Chip
          icon="book-outline"
          text={isEN ? "Rules" : "ደንቦች"}
          onPress={() => setRulesVisible(true)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  mainCard: {
    marginTop: space.lg,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  brandLogo: { width: "100%", height: "100%" },
  headerTitle: {
    color: colors.text,
    ...type.titleSm,
    letterSpacing: 0.3,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 1,
  },
  weeklyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.tintGold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(245,182,66,0.3)",
  },
  weeklyPillText: {
    color: colors.gold,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  /* Podium */
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.sm,
  },
  podiumSpot: {
    alignItems: "center",
    flex: 1,
  },
  prizeText: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: space.sm,
  },
  rankCircle: {
    backgroundColor: colors.bgDeep,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -8,
    zIndex: 2,
  },
  rankNumber: { fontWeight: "800" },
  trophyBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.bgDeep,
  },
  podiumBlock: {
    width: "100%",
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
    overflow: "hidden",
  },
  podiumCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  usernameText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.textSoft,
    textAlign: "center",
    paddingHorizontal: 4,
  },

  /* Rank strip */
  userRankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: space.xl,
  },
  userRankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  rankBadgeText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
  },
  rankMeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  rankSubText: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  userScoreText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },

  /* CTAs */
  ctaWrap: {
    marginTop: space.xl,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  ctaInner: {
    height: metrics.ctaHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  ctaGhost: {
    marginTop: space.md,
    height: metrics.ctaHeight,
    borderRadius: radius.md,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  ctaGhostText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  suspendedText: {
    color: "rgba(253,111,133,0.7)",
    fontSize: 11,
    textAlign: "center",
    marginTop: space.sm,
    fontWeight: "700",
  },
  infoRow: {
    marginTop: space.lg,
    flexDirection: "row",
    gap: 6,
  },
});
