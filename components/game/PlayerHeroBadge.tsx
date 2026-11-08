import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";

export interface SymbolPillProps {
  symbol: "X" | "O";
  active?: boolean;
}

export const SymbolPill: React.FC<SymbolPillProps> = ({ symbol, active }) => {
  const isX = symbol === "X";
  const accent = isX ? "#ef4444" : "#00DAF3";
  const bg = isX ? "rgba(239, 68, 68, 0.14)" : "rgba(0, 218, 243, 0.14)";
  const border = isX ? "rgba(239, 68, 68, 0.35)" : "rgba(0, 218, 243, 0.35)";

  return (
    <View style={[styles.symbolPill, { backgroundColor: bg, borderColor: border, opacity: active ? 1 : 0.75 }]}>
      <Ionicons name={isX ? "close" : "radio-button-off"} size={14} color={accent} />
      <Text style={[styles.symbolText, { color: accent }]}>{symbol}</Text>
    </View>
  );
};

export interface PlayerHeroBadgeProps {
  name: string;
  isMe?: boolean;
  sub?: string;
  symbol: "X" | "O";
  time: number;
  active?: boolean;
  timerColor: string;
  avatar?: string | null;
}

export const PlayerHeroBadge: React.FC<PlayerHeroBadgeProps> = ({
  name,
  sub,
  symbol,
  time,
  active,
  timerColor,
  avatar,
  isMe,
}) => {
  const { fixUrl, language } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isX = symbol === "X";
  const accent = isX ? "#ef4444" : "#00DAF3";
  const accentSoft = isX ? "rgba(239, 68, 68, 0.12)" : "rgba(0, 218, 243, 0.12)";
  const ring = isX ? "rgba(239, 68, 68, 0.45)" : "rgba(0, 218, 243, 0.45)";
  const ring2 = "rgba(255, 255, 255, 0.12)";

  return (
    <View style={[styles.playerCard, active && [styles.playerCardActive, { borderColor: ring }]]}>
      {/* Soft accent wash */}
      <View style={[styles.playerAccentWash, { backgroundColor: accentSoft }]} />

      {/* Row 1: Avatar + Name */}
      <View style={styles.playerRow}>
        {/* Avatar with Neon Ring */}
        <View style={[styles.avatarRing, { borderColor: ring }]}>
          <View style={[styles.avatarRingInner, { borderColor: ring2 }]}>
            <View style={styles.avatarCore}>
              {avatar ? (
                <Image source={{ uri: fixUrl(avatar) || undefined }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={16} color="rgba(255,255,255,0.90)" />
              )}
            </View>

            {/* Status dot */}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: active ? accent : "rgba(255,255,255,0.28)" },
              ]}
            />
          </View>
        </View>

        {/* Text */}
        <View style={styles.playerTextCol}>
          <Text
            style={[styles.playerName, isMe && { color: accent, fontWeight: "900" }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {isMe ? `${language === "en" ? "YOU" : "እርስዎ"} (${name})` : name}
          </Text>

          <View style={styles.playerMetaRow}>
            {active ? (
              <>
                <View style={[styles.turnDot, { backgroundColor: accent, shadowColor: accent }]} />
                <Text style={[styles.playerSub, { color: accent, fontWeight: "900" }]} numberOfLines={1}>
                  {name === "You" || name === "እርስዎ" ? "Your turn" : "Opponent turn"}
                </Text>
              </>
            ) : !!sub ? (
              <>
                <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.55)" />
                <Text style={styles.playerSub} numberOfLines={1}>
                  {sub}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={12} color="rgba(255,255,255,0.40)" />
                <Text style={[styles.playerSub, { color: "rgba(255,255,255,0.45)" }]} numberOfLines={1}>
                  {symbol === "X" ? "Red side" : "Cyan side"}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Row 2: Timer + Symbol */}
      <View style={styles.bottomRow}>
        <View
          style={[
            styles.timerPill,
            { borderColor: ring, backgroundColor: accentSoft },
          ]}
        >
          <Ionicons name="time-outline" size={14} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>
            {Math.max(0, Number.isFinite(time) ? time : 0)}s
          </Text>
          {active && (
            <View style={[styles.turnDot, { backgroundColor: accent }]} />
          )}
        </View>
        <SymbolPill symbol={symbol} active={active} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    flex: 1,
    borderRadius: 16,
    padding: 8,
    overflow: "hidden",
    backgroundColor: "rgba(12, 20, 46, 0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  playerCardActive: {
    backgroundColor: "rgba(15, 25, 58, 0.95)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  playerAccentWash: {
    position: "absolute",
    top: -18,
    left: -18,
    width: 120,
    height: 120,
    borderRadius: 999,
    opacity: 0.9,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRingInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  statusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#0c142e",
  },
  playerTextCol: {
    flex: 1,
  },
  playerName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  playerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  playerSub: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  symbolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  symbolText: {
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
});

export default PlayerHeroBadge;
