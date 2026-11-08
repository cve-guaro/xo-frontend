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
  const myStake = is5Player
    ? (myPlayer ? 100 : (round ? 0 : 100))
    : (myPlayer ? Number(myPlayer.stake || 0) : (round ? 0 : betAmount));
  const totalPotStake = activePlayers.reduce((s: number, p: any) => s + (Number(p.stake) || 0), 0) || 80;
  const myWinPercent = is5Player
    ? (activePlayers.length > 0 ? Math.round(100 / activePlayers.length) : 20)
    : (totalPotStake > 0 && myStake > 0 ? Math.round((myStake / totalPotStake) * 100) : 0);

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
            borderRadius: 12,
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1E293B",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
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
              backgroundColor: "#111827",
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 38,
              borderWidth: 1,
              borderColor: "#1E293B",
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="wallet-outline" size={16} color="#00BFFF" />
            <View style={{ alignItems: "flex-start" }}>
              <Text style={{ color: "#64748b", fontSize: 7.5, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
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
              borderRadius: 12,
              backgroundColor: "#111827",
              borderWidth: 1,
              borderColor: "#1E293B",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="globe-outline" size={17} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Right: Voice Chat Mic Button */}
        <TouchableOpacity
          onPress={onToggleMic}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: micMuted ? "rgba(239, 68, 68, 0.4)" : "#1E293B",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.75}
        >
          <Ionicons name={micMuted ? "mic-off" : "mic"} size={18} color={micMuted ? "#ef4444" : "#cbd5e1"} />
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
          countdownText={isSpinning || round?.status === "spinning" ? "SPIN!" : (round?.status === "locked" ? "00:00" : (countdown > 0 ? formatCountdown(countdown) : "WAITING"))}
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
        <View style={{ width: "100%", gap: 8 }}>
          {/* Row with 2 Stat Cards: YOUR STAKE & WIN CHANCE (Exact Match Image 2) */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{
              flex: 1,
              backgroundColor: "#111827",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#1E293B",
              paddingVertical: 9,
              paddingHorizontal: 12,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Your stake
                </Text>
                <View style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: "#ef4444", fontSize: 9, fontWeight: "900" }}>YOU</Text>
                </View>
              </View>
              <Text style={{ color: "#ef4444", fontSize: 20, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 3 }}>
                {myStake} ETB
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: "#111827",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#1E293B",
              paddingVertical: 9,
              paddingHorizontal: 12,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Win chance
                </Text>
                <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "800" }}>
                  → {myWinPercent}%
                </Text>
              </View>
              <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 3 }}>
                {myWinPercent}%
              </Text>
            </View>
          </View>

          {/* Controller Area */}
          {is5Player ? (
            /* 5-Player Mode: Clean Single View Players Button (No Add to Stake or Stepper) */
            <View style={{ width: "100%", gap: 10, marginTop: 4 }}>
              {!myPlayer ? (
                /* Not Joined: Single Big Join Button */
                <TouchableOpacity
                  disabled={Boolean(joinLoading || isSpinning || (round && round.players.length >= 5))}
                  onPress={() => onJoinRoom("5_PLAYER", 100)}
                  style={{
                    width: "100%",
                    backgroundColor: "#ef4444",
                    borderRadius: 14,
                    height: 50,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#ef4444",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 5,
                    opacity: Boolean(joinLoading || isSpinning || (round && round.players.length >= 5)) ? 0.6 : 1,
                  }}
                  activeOpacity={0.85}
                >
                  {joinLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 }}>
                      JOIN 5-PLAYER ROOM · 100 ETB
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                /* Once Joined: EXACTLY ONE BUTTON for Players & Odds */
                <TouchableOpacity
                  onPress={onOpenMobilePlayersSheet}
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "#111827",
                    borderWidth: 1,
                    borderColor: "#1E293B",
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                    <Ionicons name="people-outline" size={18} color="#ef4444" />
                    <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800" }}>
                      Players in Room ({playersForWheel.length}/5)
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>View odds</Text>
                    <Ionicons name="chevron-forward" size={15} color="#64748b" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* RAIL Mode: Multi-stake controller box */
            <View style={{
              backgroundColor: "#0d1322",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#1E293B",
              padding: 12,
              gap: 10,
            }}>
              {/* Header: Stake amount & Available Balance */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "700" }}>Stake amount</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600" }}>Available:</Text>
                  <Text style={{ color: "#22c55e", fontSize: 12.5, fontWeight: "800" }}>{Math.floor(balance).toLocaleString()} ETB</Text>
                </View>
              </View>

              {/* Stepper + Quick Chips Row */}
              <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                {/* Stepper [- 100 ETB +] */}
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#111827",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#1E293B",
                  height: 40, paddingHorizontal: 6,
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      playCoinSound();
                      if (round) setAddAmount(prev => Math.max(10, prev - 10));
                      else setBetAmount(prev => Math.max(10, prev - 10));
                    }}
                    style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255, 255, 255, 0.06)", alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="remove" size={14} color="#cbd5e1" />
                  </TouchableOpacity>

                  <View style={{ paddingHorizontal: 6, alignItems: "center" }}>
                    <Text style={{ color: "#ffffff", fontSize: 12.5, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                      {round ? addAmount : betAmount} <Text style={{ color: "#f59e0b", fontSize: 9.5 }}>ETB</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      playCoinSound();
                      if (round) setAddAmount(prev => Math.min(10000, prev + 10));
                      else setBetAmount(prev => Math.min(10000, prev + 10));
                    }}
                    style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255, 255, 255, 0.06)", alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="add" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>

                {/* Quick Increment Chips: +10, +50, +100, +500 */}
                {[10, 50, 100, 500].map((val) => {
                  const isLocking = round && (round.status !== "waiting" || countdown <= 5);
                  return (
                    <TouchableOpacity
                      key={val}
                      disabled={Boolean(isLocking)}
                      onPress={() => {
                        playCoinSound();
                        if (round) {
                          setAddAmount(prev => Math.min(Math.max(balance, 10000), (prev || 0) + val));
                        } else {
                          setBetAmount(prev => Math.min(Math.max(balance, 10000), (prev || 0) + val));
                        }
                      }}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: "#111827",
                        borderWidth: 1,
                        borderColor: "#1E293B",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isLocking ? 0.35 : 1,
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "800", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                        +{val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Full-Width "Add to stake" Action */}
              <TouchableOpacity
                disabled={Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5)))}
                onPress={() => {
                  playCoinSound();
                  if (round) onAddStake(addAmount);
                  else onJoinRoom("RAIL", betAmount);
                }}
                style={{
                  width: "100%",
                  backgroundColor: "#ef4444",
                  borderRadius: 12,
                  height: 46,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#ef4444",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 4,
                  opacity: Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5))) ? 0.6 : 1,
                }}
                activeOpacity={0.85}
              >
                {addLoading || joinLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                    {round
                      ? (round.status !== "waiting" || countdown <= 5 ? "LOCKED" : `Add to stake  +${addAmount} ETB`)
                      : `Add to stake  +${betAmount} ETB`}
                  </Text>
                )}
              </TouchableOpacity>

              {/* View Players Row */}
              <TouchableOpacity
                onPress={onOpenMobilePlayersSheet}
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 12,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: "#111827",
                  borderWidth: 1,
                  borderColor: "#1E293B",
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <Ionicons name="people-outline" size={15} color="#ef4444" />
                  <Text style={{ color: "#e2e8f0", fontSize: 12, fontWeight: "800" }}>
                    Players ({playersForWheel.length})
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600" }}>View mics & odds</Text>
                  <Ionicons name="chevron-forward" size={14} color="#64748b" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
