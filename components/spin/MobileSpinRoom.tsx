import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SpinWheel from "../game/SpinWheel";

export interface MobileSpinRoomProps {
  round: any;
  user: any;
  balance: number;
  mobileWheelSize: number;
  screenState: string;
  isSpinning: boolean;
  winningSlice: number | null;
  pendingWinnerId: string | null | undefined;
  resultData: any;
  pendingResultDataRef: React.MutableRefObject<any>;
  displayPlayers: any[];
  previewPlayers: any[];
  previewPot: number;
  spinDuration: number;
  onSpinComplete: () => void;
  speakingUserIds: any[];
  countdown: number;
  formatCountdown: (sec: number) => string;
  flashingUserIds: string[];
  reactions: any[];
  FloatingBetReactionBadge: React.ComponentType<any>;
  onLeaveRoom: () => void;
  onDeposit: () => void;
  onSwitchLanguage: () => void;
  micMuted: boolean;
  onToggleMic: () => void;
  is5Player: boolean;
  addAmount: number;
  setAddAmount: React.Dispatch<React.SetStateAction<number>>;
  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;
  addLoading: boolean;
  joinLoading: boolean;
  onAddStake: (amount: number) => void;
  onJoinRoom: (mode: "5_PLAYER" | "RAIL", amount: number) => void;
  playCoinSound: () => void;
  onOpenMobilePlayersSheet: () => void;
}

export const MobileSpinRoom: React.FC<MobileSpinRoomProps> = ({
  round,
  user,
  balance,
  mobileWheelSize,
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
  onDeposit,
  onSwitchLanguage,
  micMuted,
  onToggleMic,
  is5Player,
  addAmount,
  setAddAmount,
  betAmount,
  setBetAmount,
  addLoading,
  joinLoading,
  onAddStake,
  onJoinRoom,
  playCoinSound,
  onOpenMobilePlayersSheet,
}) => {
  const playersForWheel = displayPlayers.length > 0 ? displayPlayers : previewPlayers;
  const activePlayers = round?.players || previewPlayers;
  const myPlayer = activePlayers.find(
    (p: any) => String(p.userId) === String(user?.id) || p.username === user?.username || p.username === "guest_3"
  );
  const myStake = myPlayer ? Number(myPlayer.stake || 0) : (round ? 0 : betAmount);
  const totalPotStake = activePlayers.reduce((s: number, p: any) => s + (Number(p.stake) || 0), 0) || 80;
  const myWinPercent = totalPotStake > 0 && myStake > 0
    ? Math.round((myStake / totalPotStake) * 100)
    : 0;

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "transparent",
        ...(Platform.OS === "web" ? { height: "100vh", maxHeight: "100vh" } as any : {}),
      }}
      contentContainerStyle={{
        flexGrow: 1,
        minHeight: "100%",
        ...(Platform.OS === "web" ? { minHeight: "100vh" } as any : {}),
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        justifyContent: "space-between",
      }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Top Header Row (Back < on Left, Balance + Language in Center, Voice Mic on Right) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 }}>
        {/* Left: Back < Button */}
        <TouchableOpacity
          onPress={onLeaveRoom}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#0c142e",
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Center: Side-by-Side Balance Capsule + Language Switcher */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* Wallet Balance Capsule */}
          <TouchableOpacity
            onPress={onDeposit}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#0c142e",
              borderRadius: 19,
              paddingHorizontal: 12,
              height: 38,
              borderWidth: 1.5,
              borderColor: "rgba(239, 68, 68, 0.35)",
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="wallet-outline" size={15} color="#ef4444" />
            <View style={{ alignItems: "flex-start" }}>
              <Text style={{ color: "#ef4444", fontSize: 7.5, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                BALANCE
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                {balance.toLocaleString()} ETB
              </Text>
            </View>
          </TouchableOpacity>

          {/* Language Switcher Circular Button */}
          <TouchableOpacity
            onPress={onSwitchLanguage}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#0c142e",
              borderWidth: 1.5,
              borderColor: "rgba(239, 68, 68, 0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="globe-outline" size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Right: Voice Chat Mic Button */}
        <TouchableOpacity
          onPress={onToggleMic}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#0c142e",
            borderWidth: 1.5,
            borderColor: micMuted ? "rgba(244, 63, 94, 0.4)" : "rgba(34, 197, 94, 0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.75}
        >
          <Ionicons name={micMuted ? "mic-off" : "mic"} size={18} color={micMuted ? "#f43f5e" : "#22c55e"} />
        </TouchableOpacity>
      </View>

      {/* Round Subtitle & Current Pot Board */}
      <View style={{ alignItems: "center", marginVertical: 1 }}>
        <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "600" }}>
          Round {round?.roundId ? round.roundId.slice(-4) : "c665"} / Bets open
        </Text>
        <Text style={{ color: "#94a3b8", fontSize: 9.5, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", marginTop: 1 }}>
          CURRENT POT
        </Text>
        <Text style={{ color: "#ef4444", fontSize: 26, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 1 }}>
          {previewPot} ETB
        </Text>
      </View>

      {/* Center Spin Wheel Container with Dynamic Centering */}
      <View style={{ alignItems: "center", justifyContent: "center", marginVertical: 2, minHeight: mobileWheelSize + 4, position: "relative" }}>
        <SpinWheel
          size={mobileWheelSize}
          players={playersForWheel}
          isSpinning={isSpinning}
          winningSlice={winningSlice}
          winnerId={pendingWinnerId || resultData?.winnerId}
          winnerName={resultData?.winnerName || pendingResultDataRef.current?.winnerName}
          prizeAmount={resultData?.prizeAmount || pendingResultDataRef.current?.prizeAmount || previewPot}
          spinDuration={spinDuration}
          onSpinComplete={onSpinComplete}
          status={screenState === "result" ? "resolved" : (round ? round.status : "waiting")}
          mode={is5Player ? "5_PLAYER" : "RAIL"}
          speakingUserIds={speakingUserIds}
          countdown={countdown}
          countdownText={countdown > 0 ? formatCountdown(countdown) : (round?.status === "locked" || round?.status === "spinning" ? "00:00" : "01:54")}
          currentUserId={user?.id}
          flashingUserIds={flashingUserIds}
        />

        {/* Floating Bet Reaction Badges */}
        {reactions.map((r) => (
          <FloatingBetReactionBadge key={r.id} reaction={r} />
        ))}
      </View>

      {/* Bottom Controls Area */}
      <View style={{ width: "100%", alignItems: "center" }}>
        <View style={{ width: "100%", gap: 6 }}>
          {/* Row with 2 Stat Cards: YOUR STAKE & WIN CHANCE */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              borderRadius: 13,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              paddingVertical: 7,
              paddingHorizontal: 10,
            }}>
              <Text style={{ color: "#64748b", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                YOUR STAKE
              </Text>
              <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 2 }}>
                {myStake} ETB
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              borderRadius: 13,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              paddingVertical: 7,
              paddingHorizontal: 10,
            }}>
              <Text style={{ color: "#64748b", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                WIN CHANCE
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 2 }}>
                {myWinPercent}%
              </Text>
            </View>
          </View>

          {/* Quick Chips: +10, +50, +100, +500 */}
          <View style={{ flexDirection: "row", gap: 6 }}>
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
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    borderWidth: 1,
                    borderColor: isSelected ? "#ef4444" : "rgba(255, 255, 255, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isLocking ? 0.35 : 1,
                  }}
                >
                  <Text style={{ color: isSelected ? "#ef4444" : "#cbd5e1", fontSize: 12, fontWeight: "900" }}>
                    +{val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stepper & ADD TO STAKE Action Button */}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              borderRadius: 13,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              height: 44,
              paddingHorizontal: 6,
            }}>
              <TouchableOpacity
                onPress={() => {
                  playCoinSound();
                  if (round) setAddAmount(prev => Math.max(10, prev - 10));
                  else setBetAmount(prev => Math.max(10, prev - 10));
                }}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="remove" size={17} color="#ffffff" />
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                  {round ? `${addAmount} ETB` : `${betAmount} ETB`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  playCoinSound();
                  if (round) setAddAmount(prev => Math.min(10000, prev + 10));
                  else setBetAmount(prev => Math.min(10000, prev + 10));
                }}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="add" size={17} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              disabled={Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5)))}
              onPress={() => {
                playCoinSound();
                if (round) onAddStake(addAmount);
                else onJoinRoom(is5Player ? "5_PLAYER" : "RAIL", betAmount);
              }}
              style={{
                flex: 1.15,
                backgroundColor: "#ef4444",
                borderRadius: 13,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#ef4444",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
                elevation: 4,
                opacity: Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5))) ? 0.6 : 1,
              }}
              activeOpacity={0.85}
            >
              {addLoading || joinLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "900", letterSpacing: 0.5 }}>
                  {round
                    ? (round.status !== "waiting" || countdown <= 5 ? "LOCKED" : "ADD TO STAKE")
                    : "ADD TO STAKE"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Available Balance Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
            <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600" }}>Available</Text>
            <Text style={{ color: "#22c55e", fontSize: 13, fontWeight: "800" }}>{balance.toLocaleString()} ETB</Text>
          </View>

          {/* View Players Bottom Sheet Button */}
          <TouchableOpacity
            onPress={onOpenMobilePlayersSheet}
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              height: 40,
              borderRadius: 13,
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              marginTop: 0,
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Ionicons name="people-outline" size={16} color="#ef4444" />
              <Text style={{ color: "#e2e8f0", fontSize: 12.5, fontWeight: "800" }}>
                PLAYERS ({playersForWheel.length})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
