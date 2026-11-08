import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SpinWheel, { getPlayerPalette } from "../game/SpinWheel";

export interface RailSpinDesktopRoomProps {
  round: any;
  user: any;
  balance: number;
  screenW: number;
  screenState: string;
  isSpinning: boolean;
  winningSlice: number | null | undefined;
  pendingWinnerId: string | null | undefined;
  resultData: any;
  pendingResultDataRef: React.RefObject<any>;
  displayPlayers: any[];
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
  onOpenInviteModal: () => void;
  mutedPlayers: Set<string>;
  onToggleMic: () => void;
  onToggleMutePlayer: (userId: string) => void;
  micMuted: boolean;
  masterSpeakerMuted: boolean;
  onToggleSpeaker: () => void;
  recentWinners: any[];
  addAmount: number;
  setAddAmount: React.Dispatch<React.SetStateAction<number>>;
  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;
  addLoading: boolean;
  joinLoading: boolean;
  onAddStake: (amount: number) => void;
  onJoinRoom: (mode: string, stake: number) => void;
  playCoinSound: () => void;
}

export const RailSpinDesktopRoom: React.FC<RailSpinDesktopRoomProps> = ({
  round,
  user,
  balance,
  screenW,
  screenState,
  isSpinning,
  winningSlice,
  pendingWinnerId,
  resultData,
  pendingResultDataRef,
  displayPlayers,
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
  onOpenInviteModal,
  mutedPlayers,
  onToggleMic,
  onToggleMutePlayer,
  micMuted,
  masterSpeakerMuted,
  onToggleSpeaker,
  recentWinners,
  addAmount,
  setAddAmount,
  betAmount,
  setBetAmount,
  addLoading,
  joinLoading,
  onAddStake,
  onJoinRoom,
  playCoinSound,
}) => {
  const playersList = displayPlayers.length > 0 ? displayPlayers : previewPlayers;
  const myPlayer = (round?.players || previewPlayers).find(
    (p: any) =>
      String(p.userId) === String(user?.id) ||
      p.username === user?.username ||
      p.username === "guest_3"
  );
  const myStake = myPlayer ? Number(myPlayer.stake || 0) : round ? 0 : betAmount;
  const totalPotStake =
    (round?.players || previewPlayers).reduce((s: number, p: any) => s + (Number(p.stake) || 0), 0) || 80;
  const myWinPercent = totalPotStake > 0 && myStake > 0 ? Math.round((myStake / totalPotStake) * 100) : 0;

  return (
    <View style={{ width: "100%", gap: 16 }}>
      {/* Subheader Row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        {/* Left: Back button + Red aperture icon + Title + PUBLIC pill + Subtitle */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={onLeaveRoom}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
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

          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "#ef4444",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#ef4444",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
            }}
          >
            <Ionicons name="aperture" size={24} color="#ffffff" />
          </View>

          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                Endless Spin
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(16, 185, 129, 0.4)",
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#10b981", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 }}>PUBLIC</Text>
              </View>
            </View>
            <Text style={{ color: "#64748b", fontSize: 11.5, fontWeight: "500", marginTop: 2 }}>
              Public room · Virtual ETB
            </Text>
          </View>
        </View>

        {/* Right: WALLET balance */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#64748b", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }}>
            WALLET
          </Text>
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 1 }}>
            {balance.toLocaleString()} ETB
          </Text>
        </View>
      </View>

      {/* Three Columns: Column 1 (Players & Winners), Column 2 (Pot & Wheel), Column 3 (Stake Controls) */}
      <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-end", justifyContent: "center", width: "100%" }}>
        {/* COLUMN 1: PLAYERS & RECENT WINNERS (Left) */}
        <View style={{ flex: 1, minWidth: 270, maxWidth: 320 }}>
          <View
            style={{
              backgroundColor: "rgba(10, 16, 36, 0.8)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.2,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <View>
              {/* Header Row: PLAYERS (count) + Invite */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="people-outline" size={17} color="#ef4444" />
                  <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "900", letterSpacing: 0.5 }}>
                    PLAYERS ({playersList.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onOpenInviteModal}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={13} color="#ef4444" />
                  <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "800" }}>Invite</Text>
                </TouchableOpacity>
              </View>

              {/* Player Cards */}
              <ScrollView
                style={{ maxHeight: 220 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ gap: 8 }}
              >
                {playersList.map((p, idx) => {
                  const isSelf =
                    p.userId === user?.id ||
                    (user?.username && p.username === user.username) ||
                    p.username === "guest_3";
                  const isSelfMuted = isSelf ? micMuted : mutedPlayers.has(p.userId);
                  const pal = getPlayerPalette(p, idx);
                  const avColor = { bg: pal.mid || pal.hex, border: pal.light || pal.accent, text: "#ffffff" };
                  const totalStakeSum = playersList.reduce((s, pl) => s + (Number(pl.stake) || 0), 0) || 80;
                  const pWinChance =
                    totalStakeSum > 0 && Number(p.stake || 0) > 0
                      ? Math.round((Number(p.stake || 0) / totalStakeSum) * 100)
                      : 0;

                  return (
                    <View
                      key={p.userId || idx}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "rgba(15, 23, 42, 0.7)",
                        borderWidth: 1,
                        borderColor: isSelf ? avColor.border : "rgba(255, 255, 255, 0.07)",
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: avColor.bg,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: avColor.text, fontSize: 16, fontWeight: "900" }}>
                            {(p.username || "P").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{p.username}</Text>
                            {isSelf && (
                              <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "700" }}>(you)</Text>
                            )}
                          </View>
                          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                            {Number(p.stake || 0)} ETB
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900" }}>{pWinChance}%</Text>
                        <TouchableOpacity
                          onPress={() => {
                            if (isSelf) onToggleMic();
                            else onToggleMutePlayer(p.userId);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSelfMuted ? "mic-off-outline" : "mic-outline"}
                            size={16}
                            color={isSelfMuted ? "#ef4444" : "#22c55e"}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* RECENT WINNERS */}
            <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.08)" }}>
              <Text
                style={{
                  color: "#64748b",
                  fontSize: 10.5,
                  fontWeight: "800",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                RECENT WINNERS
              </Text>
              {recentWinners.map((w) => (
                <View
                  key={w.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 7,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="trophy-outline" size={14} color="#f59e0b" />
                    <Text style={{ color: "#cbd5e1", fontSize: 13, fontWeight: "600" }}>{w.name}</Text>
                  </View>
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{w.amount} ETB</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* COLUMN 2: CENTER WHEEL & CURRENT POT */}
        <View style={{ flex: 1.3, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600", marginBottom: 3 }}>
            Round {round?.roundId ? round.roundId.slice(-4) : "4"} / Bets open
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }}>
            CURRENT POT
          </Text>
          <Text
            style={{
              color: "#ef4444",
              fontSize: 42,
              fontWeight: "900",
              fontFamily: "Space Grotesk, Inter, sans-serif",
              marginVertical: 3,
            }}
          >
            {previewPot} ETB
          </Text>

          <View style={{ position: "relative", alignItems: "center", justifyContent: "center", marginTop: 6 }}>
            <SpinWheel
              size={Math.min(screenW * 0.36, 460)}
              players={playersList}
              isSpinning={Boolean(screenState === "spinning" || round?.status === "spinning" || isSpinning)}
              winningSlice={winningSlice}
              winnerId={pendingWinnerId || resultData?.winnerId}
              winnerName={resultData?.winnerName || pendingResultDataRef.current?.winnerName}
              prizeAmount={resultData?.prizeAmount || pendingResultDataRef.current?.prizeAmount || previewPot}
              spinDuration={spinDuration}
              onSpinComplete={onSpinComplete}
              status={screenState === "result" ? "resolved" : round ? round.status : "waiting"}
              mode="RAIL"
              speakingUserIds={speakingUserIds}
              countdown={countdown}
              countdownText={
                countdown > 0
                  ? formatCountdown(countdown)
                  : round?.status === "locked" || round?.status === "spinning"
                  ? "00:00"
                  : "01:54"
              }
              currentUserId={user?.id}
              flashingUserIds={flashingUserIds}
            />

            {/* Floating Bet Reaction Badges */}
            {reactions.map((r) => (
              <FloatingBetReactionBadge key={r.id} reaction={r} />
            ))}
          </View>
        </View>

        {/* COLUMN 3: STAKES & BET CONTROLS (Right - Expanded) */}
        <View style={{ flex: 1, minWidth: 270, maxWidth: 320 }}>
          <View
            style={{
              backgroundColor: "rgba(10, 16, 36, 0.8)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.2,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <View>
              {/* Row with 2 Stat Cards: YOUR STAKE & WIN CHANCE */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                {/* YOUR STAKE Card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    padding: 14,
                  }}
                >
                  <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>
                    YOUR STAKE
                  </Text>
                  <Text style={{ color: "#ef4444", fontSize: 24, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 4 }}>
                    {myStake} ETB
                  </Text>
                </View>

                {/* WIN CHANCE Card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    padding: 14,
                  }}
                >
                  <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>
                    WIN CHANCE
                  </Text>
                  <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 4 }}>
                    {myWinPercent}%
                  </Text>
                </View>
              </View>

              {/* Helper Text */}
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "500", marginBottom: 14 }}>
                Your place is reserved. Bets are open.
              </Text>

              {/* Quick chips: +10, +50, +100, +500 */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {[10, 50, 100, 500].map((val) => {
                  const isLocking = round && (round.status !== "waiting" || countdown <= 5);
                  const isSelected = (round ? addAmount : betAmount) === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      disabled={Boolean(isLocking)}
                      onPress={() => {
                        playCoinSound();
                        if (round) setAddAmount(val);
                        else setBetAmount(val);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: "rgba(15, 23, 42, 0.7)",
                        borderWidth: 1,
                        borderColor: isSelected ? "#ef4444" : "rgba(255, 255, 255, 0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isLocking ? 0.35 : 1,
                      }}
                    >
                      <Text style={{ color: isSelected ? "#ef4444" : "#94a3b8", fontSize: 13, fontWeight: "800" }}>
                        +{val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Stepper row: [ - ] 50 ETB [ + ] */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  height: 48,
                  paddingHorizontal: 8,
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    playCoinSound();
                    if (round) setAddAmount((prev) => Math.max(10, prev - 10));
                    else setBetAmount((prev) => Math.max(10, prev - 10));
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="remove" size={18} color="#ffffff" />
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                    {round ? `${addAmount} ETB` : `${betAmount} ETB`}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    playCoinSound();
                    if (round) setAddAmount((prev) => Math.min(10000, prev + 10));
                    else setBetAmount((prev) => Math.min(10000, prev + 10));
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Primary Button: ADD TO STAKE */}
              <TouchableOpacity
                disabled={Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5)))}
                onPress={() => {
                  playCoinSound();
                  if (round) onAddStake(addAmount);
                  else onJoinRoom("RAIL", betAmount);
                }}
                style={{
                  backgroundColor: "#ef4444",
                  borderRadius: 14,
                  height: 50,
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#ef4444",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                  elevation: 6,
                  opacity: Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5)))
                    ? 0.6
                    : 1,
                }}
                activeOpacity={0.85}
              >
                {addLoading || joinLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "900", letterSpacing: 0.8 }}>
                    {round ? (round.status !== "waiting" || countdown <= 5 ? "LOCKED" : "ADD TO STAKE") : "ADD TO STAKE"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Available balance subtext */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "500" }}>Available</Text>
              <Text style={{ color: "#22c55e", fontSize: 14, fontWeight: "800" }}>{balance.toLocaleString()} ETB</Text>
            </View>
          </View>
        </View>
      </View>

      {/* BOTTOM BAR: Centered Voice & Leave */}
      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Button 1: Mic off / Mic on */}
          <TouchableOpacity
            onPress={onToggleMic}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name={micMuted ? "mic-off-outline" : "mic-outline"} size={16} color={micMuted ? "#94a3b8" : "#22c55e"} />
            <Text style={{ color: micMuted ? "#94a3b8" : "#22c55e", fontSize: 12, fontWeight: "700" }}>
              {micMuted ? "Mic off" : "Mic on"}
            </Text>
          </TouchableOpacity>

          {/* Button 2: Sound on */}
          <TouchableOpacity
            onPress={onToggleSpeaker}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderWidth: 1.5,
              borderColor: "#10b981",
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={masterSpeakerMuted ? "volume-mute-outline" : "volume-high-outline"}
              size={16}
              color="#10b981"
            />
            <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "800" }}>
              {masterSpeakerMuted ? "Sound off" : "Sound on"}
            </Text>
          </TouchableOpacity>

          {/* Button 3: Leave room */}
          <TouchableOpacity
            onPress={onLeaveRoom}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="exit-outline" size={16} color="#94a3b8" />
            <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700" }}>Leave room</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "500", marginTop: 8 }}>Voice room</Text>
      </View>
    </View>
  );
};

export default RailSpinDesktopRoom;
