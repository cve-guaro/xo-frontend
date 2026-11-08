import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MobilePlayersSheetModalProps {
  visible: boolean;
  onClose: () => void;
  sortedPlayers: any[];
  user: any;
  round: any;
  is5Player: boolean;
  language: string;
  speakingUserIds: any[];
  mutedPlayers: Set<string>;
  remoteMicMuted: Record<string, boolean>;
  masterSpeakerMuted: boolean;
  micMuted: boolean;
  onToggleSpeaker: () => void;
  onToggleMic: () => void;
  onHostMuteUser: (userId: string, isMuted: boolean) => void;
  toggleMutePlayer: (userId: string) => void;
  onOpenInvite: () => void;
  getPlayerPalette: (player: any, index: number, userId?: string) => any;
  AnimatedUserMicButton: React.ComponentType<any>;
  SpeakingWaveAnimation: React.ComponentType<any>;
}

export const MobilePlayersSheetModal: React.FC<MobilePlayersSheetModalProps> = ({
  visible,
  onClose,
  sortedPlayers,
  user,
  round,
  is5Player,
  language,
  speakingUserIds,
  mutedPlayers,
  remoteMicMuted,
  masterSpeakerMuted,
  micMuted,
  onToggleSpeaker,
  onToggleMic,
  onHostMuteUser,
  toggleMutePlayer,
  onOpenInvite,
  getPlayerPalette,
  AnimatedUserMicButton,
  SpeakingWaveAnimation,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.drawerContent}>
          {/* Top Grab Handle */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.grabHandleRow}
            activeOpacity={0.8}
          >
            <View style={styles.grabHandle} />
          </TouchableOpacity>

          {/* Players Header with chevron + General Mute */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              activeOpacity={0.8}
            >
              <Text style={styles.headerTitle}>
                PLAYERS ({sortedPlayers.length})
              </Text>
              <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* INVITE BUTTON */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenInvite();
                }}
                style={styles.inviteBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={15} color="#FF1744" />
                <Text style={styles.inviteBtnText}>
                  {language === "am" ? "ጋብዝ" : "INVITE"}
                </Text>
              </TouchableOpacity>

              {/* General Mute / Speaker button */}
              <TouchableOpacity
                onPress={onToggleSpeaker}
                style={[
                  styles.speakerBtn,
                  {
                    backgroundColor: masterSpeakerMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(15, 23, 42, 0.75)",
                    borderColor: masterSpeakerMuted ? "#ef4444" : "rgba(255, 255, 255, 0.15)",
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={masterSpeakerMuted ? "volume-mute" : "volume-high"}
                  size={18}
                  color={masterSpeakerMuted ? "#ef4444" : "#ffffff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sorted Players List (High stake to low stake) */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {sortedPlayers.map((p: any, idx: number) => {
              const isSelf = p.userId === user?.id;
              const isSelfHost = round?.players[0]?.userId === user?.id;
              const isSpeaking = Array.isArray(speakingUserIds) && speakingUserIds.some(id => String(id) === String(p.userId));

              // Palette strictly matching wheel slice color (1:1 synchronization with board)
              const pal = getPlayerPalette(p, idx, user?.id);
              const avatarBg = pal.mid || pal.hex;
              const avatarBorder = pal.light || pal.accent;
              const rawName = p.username || "Player";
              const cleanName = isSelf ? "You" : (rawName.split(" ")[0].split("_")[0]);

              return (
                <View
                  key={p.userId || idx}
                  style={[
                    styles.playerCard,
                    { borderColor: isSelf ? pal.light : "rgba(255, 255, 255, 0.08)" },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    {/* Avatar Circle with matching board slice color */}
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: avatarBg,
                          borderColor: avatarBorder,
                        },
                      ]}
                    >
                      <Ionicons name="person" size={22} color="#ffffff" />
                    </View>

                    {/* Name & Stake Column */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>
                          {cleanName}
                        </Text>
                        {isSpeaking && <SpeakingWaveAnimation />}
                      </View>
                      <Text style={{ color: pal.light, fontSize: 13, fontWeight: "800", marginTop: 2 }}>
                        {p.stake || 10} ETB {(() => {
                          const totalStk = sortedPlayers.reduce((acc: number, item: any) => acc + Number(item.stake || 10), 0);
                          const pct = is5Player ? 20 : (totalStk > 0 ? Math.round(((p.stake || 10) / totalStk) * 100) : 0);
                          return pct > 0 ? `• ${pct}%` : "";
                        })()}
                      </Text>
                    </View>
                  </View>

                  {/* Microphone Icon Button on right */}
                  <AnimatedUserMicButton
                    isSelf={isSelf}
                    isBot={Boolean(p.isBot)}
                    isMutedLocally={isSelf ? micMuted : mutedPlayers.has(p.userId)}
                    isRemoteMuted={isSelf ? micMuted : (Boolean(p.isBot) || remoteMicMuted[p.userId] === true)}
                    isSpeaking={isSpeaking}
                    onPress={() => {
                      if (isSelf) {
                        onToggleMic();
                      } else if (isSelfHost) {
                        onHostMuteUser(p.userId, mutedPlayers.has(p.userId));
                      } else {
                        toggleMutePlayer(p.userId);
                      }
                    }}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.75)",
    justifyContent: "flex-end",
  },
  drawerContent: {
    backgroundColor: "#0c1022",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    width: "100%",
    maxHeight: "75%",
  },
  grabHandleRow: {
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 12,
  },
  grabHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 23, 68, 0.15)",
    borderWidth: 1.5,
    borderColor: "#FF1744",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  inviteBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playerCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
