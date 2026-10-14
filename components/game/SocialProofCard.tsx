// components/game/SocialProofCard.tsx
// Social proof statistics card (Today's Winners, Total Winnings, Your Win Rate)
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface SocialProofCardProps {
  winnersCount?: number;
  totalWinningsFormatted?: string;
  winRate?: number;
  isEN?: boolean;
}

export const SocialProofCard: React.FC<SocialProofCardProps> = ({
  winnersCount = 24,
  totalWinningsFormatted = "ETB 156,780",
  winRate = 68,
  isEN = true,
}) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(18, 15, 38, 0.9)", "rgba(11, 9, 25, 0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Column 1: Today's Winners */}
        <View style={styles.statCol}>
          <View style={styles.iconCircleGold}>
            <Ionicons name="trophy" size={14} color="#f5b642" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>
              {isEN ? "TODAY'S WINNERS" : "የዛሬ አሸናፊዎች"}
            </Text>
            <Text style={styles.value}>{winnersCount}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Column 2: Total Winnings */}
        <View style={styles.statCol}>
          <View style={styles.iconCircleGold}>
            <Ionicons name="cash" size={14} color="#f5b642" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>
              {isEN ? "TOTAL WINNINGS" : "ጠቅላላ ሽልማቶች"}
            </Text>
            <Text style={styles.value}>{totalWinningsFormatted}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Column 3: Your Win Rate */}
        <View style={styles.statCol}>
          <View style={styles.iconCircleCyan}>
            <Ionicons name="rocket" size={14} color="#00daf3" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>
              {isEN ? "YOUR WIN RATE" : "የአሸናፊነት መጠን"}
            </Text>
            <Text style={styles.value}>{winRate}%</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 16,
    borderWidth: 1.2,
    borderColor: "rgba(139, 92, 246, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleGold: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 182, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleCyan: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 218, 243, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  label: {
    color: "#8b93a7",
    fontSize: 8.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 4,
  },
});
