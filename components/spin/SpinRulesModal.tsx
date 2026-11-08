import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SpinRulesModalProps {
  visible: boolean;
  onClose: () => void;
  language: string;
}

export const SpinRulesModal: React.FC<SpinRulesModalProps> = ({
  visible,
  onClose,
  language,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalContent}>
          {/* Header: Title & Close Button */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.trophyIconContainer}>
                <Ionicons name="trophy" size={20} color="#facc15" />
              </View>
              <View>
                <Text style={styles.titleText}>
                  {language === "am" ? "የጨዋታ ህጎች" : "HOW TO PLAY"}
                </Text>
                <Text style={styles.subtitleText}>
                  {language === "am" ? "ፍትሃዊ እና ግልጽ ጨዋታ" : "FAIR PLAY & REWARDS"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Rules Cards List */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            {[
              {
                icon: "disc",
                color: "#FF1744",
                title: language === "am" ? "1. የእርስዎን ድርሻ ይያዙ" : "1. Claim Your Slice",
                desc: language === "am" ? "ውርርድ በማስገባት በስፒን ጎማው ላይ የራስዎ ቦታ ያግኙ።" : "Place your bet in ETB to secure your slice on the live wheel."
              },
              {
                icon: "pie-chart",
                color: "#a855f7",
                title: language === "am" ? "2. ተመጣጣኝ የማሸነፍ እድል" : "2. Proportional Winning Odds",
                desc: language === "am" ? "ውርርድዎ በጨመረ ቁጥር የጎማው ድርሻዎ እና የማሸነፍ እድልዎ ይሰፋል!" : "The bigger your bet, the larger your slice and higher your chance of winning!"
              },
              {
                icon: "time",
                color: "#f59e0b",
                title: language === "am" ? "3. የቀጥታ ስፒን እና ቆጣሪ" : "3. Live Countdown & Spin",
                desc: language === "am" ? "ቆጣሪው 0:00 ሲደርስ ጎማው በይፋ ይሽከረከራል፤ ቀዩ ጠቋሚ ባረፈበት አሸናፊው ይለያል።" : "When the timer reaches 0:00, the wheel spins and the top red pointer picks the winner."
              },
              {
                icon: "cash",
                color: "#10b981",
                title: language === "am" ? "4. ፈጣን ሽልማት ክፍያ" : "4. Instant Wallet Payout",
                desc: language === "am" ? "አሸናፊው 20% የአገልግሎት ክፍያ ተቀንሶ ጠቅላላ ገንዳውን ወዲያው ወደ ቦርሳው ይወስዳል!" : "Winner receives the entire prize pool (minus 20% house fee) credited instantly!"
              },
            ].map((item, idx) => (
              <View key={idx} style={styles.ruleCard}>
                <View
                  style={[
                    styles.ruleIconContainer,
                    { backgroundColor: `${item.color}20` },
                  ]}
                >
                  <Ionicons name={item.icon as any} size={16} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.ruleDesc}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.actionBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>
              {language === "am" ? "ተረድቻለሁ • እንጫወት!" : "GOT IT • LET'S PLAY!"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0b1126",
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(255, 23, 68, 0.45)",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    shadowColor: "#FF1744",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  trophyIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    borderWidth: 1.5,
    borderColor: "#facc15",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  subtitleText: {
    color: "#FF5A6E",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ruleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  ruleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  ruleTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  ruleDesc: {
    color: "#94a3b8",
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF1744",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Inter, sans-serif",
  },
});
