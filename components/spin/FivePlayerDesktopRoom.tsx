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
  const isJoined = Boolean(round && round.players && round.players.some((p: any) => String(p.userId) === String(user?.id)));
  const myPlayer = round?.players?.find((p: any) => String(p.userId) === String(user?.id));
  const myStake = myPlayer ? Number(myPlayer.stake || 100) : 0;
  const activePlayers = round?.players && Array.isArray(round.players) ? round.players : previewPlayers || [];
  const totalPot = round ? Number(round.pot || previewPot || 500) : previewPot;
  const myWinChance = totalPot > 0 && myStake > 0
    ? Math.round((myStake / totalPot) * 100)
    : (activePlayers.length ? Math.round(100 / Math.max(1, activePlayers.length)) : 20);

  // Responsive desktop scale for spacious arena
  const isWide = screenW >= 1440;
  const roomMaxWidth = isWide ? 1060 : 880;
  const wheelBoxW = isWide ? 480 : 440;
  const wheelSize = isWide ? 440 : 420;
  const rightBoxW = isWide ? 420 : 380;
  const roomGap = isWide ? 44 : 32;

  return (
    <View style={{ width: "100%", maxWidth: roomMaxWidth, alignSelf: "center", gap: 20 }}>
      {/* Top Subheader Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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

      {/* Main Area: Wheel on Left, Room Players + Bet Bar on Right (Unified Compact Arena) */}
      <View style={{ flexDirection: "row", gap: roomGap, alignItems: "center", justifyContent: "center" }}>
        {/* Left: Wheel + Action Buttons */}
        <View style={{ width: wheelBoxW, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
            <SpinWheel
              size={wheelSize}
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
                isSpinning || round?.status === "spinning" ? "SPIN!" : (round?.status === "locked" ? "00:00" : (countdown > 0 ? formatCountdown(countdown) : "WAITING"))
              }
              currentUserId={user?.id}
              flashingUserIds={flashingUserIds}
            />

            {/* Floating Bet Reaction Badges (PC Desktop Support) */}
            {reactions.map((r) => (
              <FloatingBetReactionBadge key={r.id} reaction={r} />
            ))}
          </View>

          {/* Below Wheel Action Buttons (2 buttons before join, 1 button once joined per user spec) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 }}>
            {isJoined ? (
              /* Once Joined: EXACTLY ONE BUTTON */
              <TouchableOpacity
                onPress={onLeaveRoom}
                style={[
                  ds.leaveBtn,
                  { borderRadius: 24, paddingHorizontal: 36, paddingVertical: 12, marginTop: 0 },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons name="exit-outline" size={16} color="#ef4444" />
                <Text style={ds.leaveBtnText}>{language === "am" ? "ከክፍሉ ውጣ" : "LEAVE ROOM"}</Text>
              </TouchableOpacity>
            ) : (
              /* Before Joining: EXACTLY TWO BUTTONS */
              <>
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

                <TouchableOpacity
                  onPress={onLeaveRoom}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    borderRadius: 24,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.12)",
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={15} color="#94a3b8" />
                  <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "800" }}>BACK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Right: Bet Bar + Room Players List (Exact Width Match & Edge Alignment) */}
        <View style={{ width: rightBoxW, justifyContent: "center", gap: 12 }}>
          {/* Compact Bet Information Bar (Exactly Matches Room Players Width Below) */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#111827",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#1E293B",
            paddingVertical: 12,
            paddingHorizontal: 16,
            width: "100%",
          }}>
            <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600" }}>
              Your Bet · <Text style={{ color: "#ffffff", fontWeight: "900" }}>{myStake > 0 ? `${myStake} ETB` : "100 ETB"}</Text>
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600" }}>
              Pot · <Text style={{ color: "#facc15", fontWeight: "900" }}>500 ETB</Text>
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600" }}>
              Prize · <Text style={{ color: "#22c55e", fontWeight: "900" }}>400 ETB</Text>
            </Text>
          </View>

          {/* Room Players Panel */}
          <View
            style={{
              backgroundColor: "rgba(10, 16, 36, 0.85)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: "rgba(59, 130, 246, 0.2)",
              justifyContent: "flex-start",
              gap: 16,
              width: "100%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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

            {/* 5 Player Slots (Always Top-Down: Slot 1 on top, never pinned to bottom) */}
            <View style={{ gap: 10, width: "100%" }}>
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const player = activePlayers[slotIdx];
                if (player) {
                  const isSelf = String(player?.userId) === String(user?.id);
                  const isSelfHost = String(activePlayers[0]?.userId) === String(user?.id);

                  return (
                    <View
                      key={player?.userId || slotIdx}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: isSelf ? "rgba(255, 23, 68, 0.08)" : "rgba(30, 41, 59, 0.5)",
                        borderRadius: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderWidth: 1,
                        borderColor: isSelf
                          ? "rgba(255, 23, 68, 0.35)"
                          : "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: isSelf ? "#FF1744" : "#475569",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{slotIdx + 1}</Text>
                        </View>
                        <Ionicons name="person" size={15} color="#94a3b8" />
                        <View>
                          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>
                            {player.username || (isSelf ? (user?.username || "You") : `Player ${slotIdx + 1}`)} {isSelf ? "(You)" : ""}
                          </Text>
                          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "600", marginTop: 1 }}>
                            {player.stake || 100} ETB
                          </Text>
                        </View>
                      </View>

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
                    </View>
                  );
                }

                // Empty Waiting Slot (Slots 2-5)
                return (
                  <View
                    key={`empty_${slotIdx}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: "transparent",
                      borderRadius: 12,
                      paddingVertical: 9,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "800" }}>{slotIdx + 1}</Text>
                    </View>
                    <Ionicons name="person-outline" size={14} color="#64748b" />
                    <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>
                      {language === "am" ? "ተጫዋች በመጠበቅ ላይ..." : "Waiting for player..."}
                    </Text>
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
