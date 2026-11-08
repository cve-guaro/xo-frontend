import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SpinWheel from "../game/SpinWheel";

export interface FivePlayerDesktopRoomProps {
  round: any;
  user: any;
  screenW: number;
  screenState: string;
  isSpinning: boolean;
  winningSlice: number | null | undefined;
  pendingWinnerId: string | null | undefined;
  resultData: any;
  pendingResultDataRef: React.RefObject<any>;
  previewPlayers: any[];
  previewPot: number;
  spinDuration: number;
  onSpinComplete: () => void;
  speakingUserIds: string[];
  countdown: number;
  formatCountdown: (sec: number) => string;
  flashingUserIds: string[];
  reactions: any[];
  FloatingBetReactionBadge: React.ComponentType<{ reaction: any }>;
  onLeaveRoom: () => void;
  onJoinClick: () => void;
  joinLoading: boolean;
  onOpenInviteModal: () => void;
  allRemoteMuted: boolean;
  onToggleMuteAllRemote: () => void;
  mutedPlayers: Set<string>;
  remoteMicMuted: Record<string, boolean>;
  AnimatedUserMicButton: React.ComponentType<any>;
  micMuted: boolean;
  masterSpeakerMuted: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onHostMuteUser: (userId: string, isMuted: boolean) => void;
  onToggleMutePlayer: (userId: string) => void;
  language: string;
  ds: any;
}

export const FivePlayerDesktopRoom: React.FC<FivePlayerDesktopRoomProps> = ({
  round,
  user,
  screenW,
  screenState,
  isSpinning,
  winningSlice,
  pendingWinnerId,
  resultData,
  pendingResultDataRef,
  previewPlayers,
  previewPot,
  spinDuration,
  onSpinComplete,
  speakingUserIds,
  countdown,
  formatCountdown,
  flashingUserIds,
  reactions,
  FloatingBetReactionBadge,
  onLeaveRoom,
  onJoinClick,
  joinLoading,
  onOpenInviteModal,
  allRemoteMuted,
  onToggleMuteAllRemote,
  mutedPlayers,
  remoteMicMuted,
  AnimatedUserMicButton,
  micMuted,
  masterSpeakerMuted,
  onToggleMic,
  onToggleSpeaker,
  onHostMuteUser,
  onToggleMutePlayer,
  language,
  ds,
}) => {
  return (
    <View style={{ width: "100%", gap: 24 }}>
      {/* Top Subheader Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity
            onPress={onLeaveRoom}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
              5-Player Spin
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "500", marginTop: 2 }}>
              {round ? `Waiting for players… ${round.players.length}/5` : "Join the room to enter the game"}
            </Text>
          </View>
        </View>

        {/* Voice mic & speaker controls */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={onToggleMic}
            disabled={!round}
            style={[
              ds.voiceControlBtn,
              { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
              micMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" },
              !round && { opacity: 0.4 },
            ]}
          >
            <Ionicons name={micMuted ? "mic-off" : "mic"} size={16} color={micMuted ? "#ef4444" : "#FF1744"} />
            <Text style={[ds.voiceControlBtnText, { color: micMuted ? "#ef4444" : "#ffffff" }]}>
              {micMuted ? "Mic Off" : "Mic On"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggleSpeaker}
            disabled={!round}
            style={[
              ds.voiceControlBtn,
              { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
              masterSpeakerMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" },
              !round && { opacity: 0.4 },
            ]}
          >
            <Ionicons
              name={masterSpeakerMuted ? "volume-mute" : "volume-high"}
              size={16}
              color={masterSpeakerMuted ? "#ef4444" : "#ffffff"}
            />
            <Text style={[ds.voiceControlBtnText, { color: masterSpeakerMuted ? "#ef4444" : "#ffffff" }]}>
              {masterSpeakerMuted ? "Muted All" : "Hear Lobby"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Area: Wheel on Left, Room Players on Right */}
      <View style={{ flexDirection: "row", gap: 32, alignItems: "center" }}>
        {/* Left: Wheel + Action Buttons */}
        <View style={{ flex: 1.6, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
            <SpinWheel
              size={Math.min(screenW * 0.32, 420)}
              players={round ? round.players : previewPlayers}
              isSpinning={Boolean(screenState === "spinning" || round?.status === "spinning" || isSpinning)}
              winningSlice={winningSlice}
              winnerId={pendingWinnerId || resultData?.winnerId}
              winnerName={resultData?.winnerName || pendingResultDataRef.current?.winnerName}
              prizeAmount={resultData?.prizeAmount || pendingResultDataRef.current?.prizeAmount || previewPot}
              spinDuration={spinDuration}
              onSpinComplete={onSpinComplete}
              status={screenState === "result" ? "resolved" : round ? round.status : "waiting"}
              mode="5_PLAYER"
              speakingUserIds={speakingUserIds}
              countdown={countdown}
              countdownText={
                countdown > 0
                  ? formatCountdown(countdown)
                  : round?.status === "locked" || round?.status === "spinning"
                  ? "0:00"
                  : "02:00"
              }
              currentUserId={user?.id}
              flashingUserIds={flashingUserIds}
            />

            {/* Floating Bet Reaction Badges (PC Desktop Support) */}
            {reactions.map((r) => (
              <FloatingBetReactionBadge key={r.id} reaction={r} />
            ))}
          </View>

          {/* Below Wheel Action Buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 24 }}>
            {round && round.players.some((p: any) => String(p.userId) === String(user?.id)) ? (
              <TouchableOpacity
                onPress={onLeaveRoom}
                style={[
                  ds.leaveBtn,
                  { borderRadius: 24, paddingHorizontal: 32, paddingVertical: 12, marginTop: 0 },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons name="exit-outline" size={16} color="#ef4444" />
                <Text style={ds.leaveBtnText}>{language === "am" ? "ከክፍሉ ውጣ" : "LEAVE ROOM"}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled={Boolean(joinLoading || isSpinning || (round && round.players.length >= 5))}
                onPress={onJoinClick}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#f43f5e",
                  borderRadius: 24,
                  paddingHorizontal: 28,
                  paddingVertical: 12,
                  opacity: Boolean(joinLoading || isSpinning || (round && round.players.length >= 5)) ? 0.6 : 1,
                }}
                activeOpacity={0.85}
              >
                {joinLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="people" size={18} color="#ffffff" />
                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                      {round && round.players.length >= 5 ? "ROOM FULL" : "JOIN GAME (100 ETB)"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Right: Room Players List */}
        <View style={{ flex: 1.1, minWidth: 320 }}>
          <View
            style={{
              backgroundColor: "rgba(10, 16, 36, 0.85)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: "rgba(59, 130, 246, 0.2)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="people" size={18} color="#94a3b8" />
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                  ROOM PLAYERS ({round?.players?.length || 0}/5)
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={onOpenInviteModal}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "rgba(255, 23, 68, 0.18)",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#FF1744",
                    cursor: "pointer",
                  }}
                >
                  <Ionicons name="person-add" size={12} color="#FF1744" />
                  <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}>
                    {language === "am" ? "+ ጋብዝ" : "+ Invite"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onToggleMuteAllRemote}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Ionicons name={allRemoteMuted ? "volume-mute" : "volume-high"} size={13} color="#94a3b8" />
                  <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>
                    {allRemoteMuted ? "Muted All" : "Mute All"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5 Vertical Seat Rows */}
            <View style={{ gap: 10 }}>
              {Array.from({ length: 5 }, (_, idx) => {
                const player = round?.players && round.players[idx] ? round.players[idx] : null;
                const isSelf = player?.userId === user?.id;
                const isSelfHost = round?.players[0]?.userId === user?.id;

                return (
                  <View
                    key={player?.userId || idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: player ? "rgba(30, 41, 59, 0.6)" : "rgba(15, 23, 42, 0.5)",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: isSelf
                        ? "#FF1744"
                        : player
                        ? "rgba(255, 23, 68, 0.3)"
                        : "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: isSelf ? "#FF1744" : player ? "#991B1B" : "rgba(255, 255, 255, 0.08)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>{idx + 1}</Text>
                      </View>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="person" size={16} color={player ? "#ffffff" : "#64748b"} />
                      </View>
                      <View>
                        <Text style={{ color: player ? "#ffffff" : "#64748b", fontSize: 13, fontWeight: "700" }}>
                          {player ? (isSelf ? "You" : player.username) : "Waiting for player..."}
                        </Text>
                        <Text style={{ color: player ? "#FF5A6E" : "#475569", fontSize: 11, fontWeight: "600", marginTop: 1 }}>
                          {player ? `${player.stake || 100} ETB` : "Empty Seat"}
                        </Text>
                      </View>
                    </View>

                    {player && (
                      <AnimatedUserMicButton
                        isSelf={isSelf}
                        isBot={Boolean(player.isBot)}
                        isMutedLocally={isSelf ? micMuted : mutedPlayers.has(player.userId)}
                        isRemoteMuted={
                          isSelf
                            ? micMuted
                            : Boolean(player.isBot) || remoteMicMuted[player.userId] === true
                        }
                        isSpeaking={speakingUserIds.includes(String(player.userId))}
                        onPress={() => {
                          if (isSelf) {
                            onToggleMic();
                          } else if (isSelfHost) {
                            onHostMuteUser(player.userId, mutedPlayers.has(player.userId));
                          } else {
                            onToggleMutePlayer(player.userId);
                          }
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default FivePlayerDesktopRoom;
