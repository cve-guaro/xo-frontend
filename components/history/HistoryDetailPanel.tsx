import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SpinWheel from "../game/SpinWheel";

export type Move = {
  index: number;
  symbol: "X" | "O";
};

export type HistoryGameItem = {
  id: string;
  created_at: string;
  finished_at: string | null;
  bet_amount: number;
  players: string[];
  moves: Move[];
  winner?: string;
  result?: "win" | "loss" | "abandoned";
  is_winner?: boolean;
  is_abandoned?: boolean;
  px_name?: string;
  po_name?: string;
  px_num?: string;
  po_num?: string;
  game_type?: string;
};

export interface HistoryDetailPanelProps {
  selectedRound: any;
  selectedGame: HistoryGameItem | null;
  myId?: string | null;
  user: any;
  onCloseSpin: () => void;
  onCloseGame: () => void;
  isSpinReplayPlaying: boolean;
  setIsSpinReplayPlaying: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentMoveStep: number;
  setCurrentMoveStep: (val: number | ((prev: number) => number)) => void;
  isPlayingReplay: boolean;
  setIsPlayingReplay: (val: boolean | ((prev: boolean) => boolean)) => void;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

function getDuration(start: string, end: string | null) {
  if (!end) return "00:30";
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const min = String(Math.floor(diffSec / 60)).padStart(2, "0");
  const sec = String(diffSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function getBoardForStep(moves: Move[], step: number) {
  const board = Array(9).fill(null);
  if (!moves || !Array.isArray(moves)) return board;
  const clampedStep = Math.min(step, moves.length);
  for (let i = 0; i < clampedStep; i++) {
    const move = moves[i];
    if (move && typeof move.index === "number" && move.index >= 0 && move.index < 9) {
      board[move.index] = move.symbol;
    }
  }
  return board;
}

export function HistoryDetailPanel({
  selectedRound,
  selectedGame,
  myId,
  user,
  onCloseSpin,
  onCloseGame,
  isSpinReplayPlaying,
  setIsSpinReplayPlaying,
  currentMoveStep,
  setCurrentMoveStep,
  isPlayingReplay,
  setIsPlayingReplay,
}: HistoryDetailPanelProps) {
  if (selectedRound) {
    const isWin =
      selectedRound.winner_id === myId ||
      selectedRound.winner_name === user?.username ||
      (selectedRound.is_winner !== undefined && selectedRound.is_winner);
    const statusColor = isWin ? "#22c55e" : "#ef4444";
    const statusText = isWin ? "VICTORY" : "DEFEAT";
    const modeLabel =
      selectedRound.mode_label || (selectedRound.config_id === 2 ? "Rail Spin" : "5-Player Spin");
    const pot = Number(selectedRound.pot_amount || 0);
    const prize = Number(selectedRound.prize_amount || 0);
    const entryFee = Number(selectedRound.bet_amount || 100);
    const roundPlayers = Array.isArray(selectedRound.players) ? selectedRound.players : [];

    const mappedPlayers = roundPlayers.map((p: any, idx: number) => ({
      userId: p.userId || p.id || String(idx),
      username: p.username || `Player ${idx + 1}`,
      seatIndex: p.seatIndex ?? idx,
      avatar: p.avatar,
    }));

    const winningSlice = mappedPlayers.findIndex(
      (p: any) => p.username === selectedRound.winner_name
    );

    return (
      <View style={s.card}>
        {/* Sidebar Header */}
        <View style={s.leaderboardHeader}>
          <Text style={s.leaderboardTitle}>ROUND DETAILS</Text>
          <TouchableOpacity onPress={onCloseSpin}>
            <Ionicons name="close" size={18} color="#8b93a7" />
          </TouchableOpacity>
        </View>

        {/* Outcome Badge Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={isWin ? "trophy" : "skull"} size={16} color={statusColor} />
            <Text style={[s.detailBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
          <View style={s.modeBadge}>
            <Text style={s.modeBadgeText}>{modeLabel.toUpperCase()}</Text>
          </View>
        </View>

        {/* Prize Amount Showcase Banner */}
        <View
          style={{
            backgroundColor: "rgba(34, 211, 238, 0.08)",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(34, 211, 238, 0.25)",
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#8b93a7", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
            TOTAL PRIZE
          </Text>
          <Text
            style={{
              color: "#22d3ee",
              fontSize: 28,
              fontWeight: "900",
              marginTop: 2,
              fontFamily: "Inter, sans-serif",
            }}
          >
            ETB {prize.toLocaleString()}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Ionicons name="trophy" size={13} color="#f5b642" />
            <Text style={{ color: "#f5b642", fontSize: 12, fontWeight: "700" }}>
              Winner: @{selectedRound.winner_name || "—"}
            </Text>
          </View>
        </View>

        {/* Stat Lines */}
        <View style={s.statLinesGroup}>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>POT AMOUNT</Text>
            <Text style={s.statLineVal}>ETB {pot.toLocaleString()}</Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>ENTRY FEE</Text>
            <Text style={s.statLineVal}>ETB {entryFee.toLocaleString()}</Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>ROUND ID</Text>
            <Text style={s.statLineVal}>
              #SPIN-
              {String(selectedRound.round_id || selectedRound.id || "")
                .slice(-6)
                .toUpperCase()}
            </Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>DATE & TIME</Text>
            <Text style={s.statLineVal}>{formatWhen(selectedRound.created_at)}</Text>
          </View>
        </View>

        {/* Participants / List of Users */}
        <Text style={[s.boardTitleHeader, { marginTop: 14, marginBottom: 8 }]}>
          PARTICIPANTS ({mappedPlayers.length})
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {mappedPlayers.map((p: any, idx: number) => {
            const isWinner = p.username === selectedRound.winner_name;
            return (
              <View
                key={p.userId || idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: isWinner ? "rgba(52, 211, 153, 0.12)" : "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: isWinner ? "rgba(52, 211, 153, 0.35)" : "rgba(255, 255, 255, 0.07)",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}
              >
                <Ionicons
                  name={isWinner ? "trophy" : "person"}
                  size={12}
                  color={isWinner ? "#34d399" : "#8b93a7"}
                />
                <Text
                  style={{
                    color: isWinner ? "#34d399" : "#e2e8f0",
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {p.username}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Spin Wheel Replay Section */}
        <Text style={[s.boardTitleHeader, { marginBottom: 6 }]}>SPIN REPLAY</Text>
        <View style={{ alignItems: "center", justifyContent: "center", marginVertical: 8 }}>
          <SpinWheel
            size={180}
            players={mappedPlayers}
            isSpinning={isSpinReplayPlaying}
            winningSlice={winningSlice >= 0 ? winningSlice : 0}
            status={isSpinReplayPlaying ? "spinning" : "resolved"}
            mode={selectedRound.config_id === 2 ? "RAIL" : "5_PLAYER"}
            onSpinComplete={() => setIsSpinReplayPlaying(false)}
          />
        </View>

        {/* Replay Controls (Play/Pause, Reset) */}
        <View style={s.replayControlsRow}>
          <TouchableOpacity
            onPress={() => setIsSpinReplayPlaying(false)}
            style={s.replayControlBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSpinReplayPlaying((prev) => !prev)}
            style={[s.replayControlBtn, s.replayPlayBtn]}
            activeOpacity={0.8}
          >
            <Ionicons name={isSpinReplayPlaying ? "pause" : "play"} size={18} color="#0a0e1a" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (selectedGame) {
    const isWin =
      selectedGame.is_winner === true ||
      (selectedGame.is_winner === undefined &&
        selectedGame.winner != null &&
        String(selectedGame.winner).toLowerCase() === String(myId || "").toLowerCase());
    const statusColor = isWin ? "#22c55e" : "#ef4444";
    const statusText = isWin ? "VICTORY" : "DEFEAT";
    const isPlayerX = selectedGame.players && selectedGame.players[0] === myId;
    const myMark = isPlayerX ? "X" : "O";
    const oppMark = myMark === "X" ? "O" : "X";
    const opponentName = isPlayerX
      ? selectedGame.po_name || "Opponent"
      : selectedGame.px_name || "Opponent";
    const duration = getDuration(selectedGame.created_at, selectedGame.finished_at);
    const roomId = `XO-${selectedGame.id.slice(-4).toUpperCase()}`;
    const boardState = getBoardForStep(selectedGame.moves, currentMoveStep);

    return (
      <View style={s.card}>
        {/* Sidebar Header */}
        <View style={s.leaderboardHeader}>
          <Text style={s.leaderboardTitle}>MATCH DETAILS</Text>
          <TouchableOpacity onPress={onCloseGame}>
            <Ionicons name="close" size={18} color="#8b93a7" />
          </TouchableOpacity>
        </View>

        {/* Outcome Badge Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={isWin ? "trophy" : "skull"} size={16} color={statusColor} />
            <Text style={[s.detailBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
          <View style={s.modeBadge}>
            <Text style={s.modeBadgeText}>
              {selectedGame.bet_amount >= 1000
                ? "LEGEND"
                : selectedGame.bet_amount >= 100
                ? "PRO"
                : "STARTER"}
            </Text>
          </View>
        </View>

        {/* Opponent VS card */}
        <View style={s.sideVsContainer}>
          <View style={{ alignItems: "center", width: 90 }}>
            <View style={s.sideAvatar}>
              <Text style={s.sideAvatarText}>
                {user?.username ? user.username.slice(0, 1).toUpperCase() : "M"}
              </Text>
            </View>
            <Text style={s.sidePlayerName} numberOfLines={1}>
              @{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}
            </Text>
            <Text style={s.sideMarkIndicator}>Mark: {myMark}</Text>
          </View>

          <Text style={s.sideVsText}>VS</Text>

          <View style={{ alignItems: "center", width: 90 }}>
            <View style={[s.sideAvatar, { backgroundColor: "#f5b642" }]}>
              <Text style={s.sideAvatarText}>{opponentName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={s.sidePlayerName} numberOfLines={1}>
              @{opponentName}
            </Text>
            <Text style={s.sideMarkIndicator}>Mark: {oppMark}</Text>
          </View>
        </View>

        {/* Stat Lines */}
        <View style={s.statLinesGroup}>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>BET AMOUNT</Text>
            <Text style={s.statLineVal}>ETB {selectedGame.bet_amount}</Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>MATCH ID</Text>
            <Text style={s.statLineVal}>#XO-{selectedGame.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>ROOM ID</Text>
            <Text style={s.statLineVal}>{roomId}</Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>DURATION</Text>
            <Text style={s.statLineVal}>{duration}</Text>
          </View>
          <View style={s.statLineRow}>
            <Text style={s.statLineLabel}>DATE & TIME</Text>
            <Text style={s.statLineVal}>{formatWhen(selectedGame.created_at)}</Text>
          </View>
        </View>

        {/* Game Board grid */}
        <Text style={s.boardTitleHeader}>GAME BOARD</Text>
        <View style={s.boardContainerCenter}>
          <View style={s.boardGrid}>
            {boardState.map((cell, idx) => {
              const isCellX = cell === "X";
              const isCellO = cell === "O";
              return (
                <View
                  key={idx}
                  style={[
                    s.boardCell,
                    isCellX && s.boardCellX,
                    isCellO && s.boardCellO,
                  ]}
                >
                  <Text
                    style={[
                      s.boardCellText,
                      isCellX && s.boardCellTextX,
                      isCellO && s.boardCellTextO,
                    ]}
                  >
                    {cell || ""}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Step Indicator */}
        <Text style={s.replayStepText}>
          Move {currentMoveStep} of {selectedGame.moves ? selectedGame.moves.length : 0}
        </Text>

        {/* Replay Controls (Backward, Play/Pause, Forward) */}
        <View style={s.replayControlsRow}>
          <TouchableOpacity
            onPress={() => {
              setIsPlayingReplay(false);
              setCurrentMoveStep((prev) => Math.max(0, prev - 1));
            }}
            style={s.replayControlBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="play-back" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentMoveStep >= selectedGame.moves.length) {
                setCurrentMoveStep(0);
                setIsPlayingReplay(true);
              } else {
                setIsPlayingReplay((prev) => !prev);
              }
            }}
            style={[s.replayControlBtn, s.replayPlayBtn]}
            activeOpacity={0.8}
          >
            <Ionicons name={isPlayingReplay ? "pause" : "play"} size={18} color="#0a0e1a" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsPlayingReplay(false);
              setCurrentMoveStep((prev) => Math.min(selectedGame.moves.length, prev + 1));
            }}
            style={s.replayControlBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="play-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.card, { alignItems: "center", justifyContent: "center", minHeight: 400 }]}>
      <Ionicons name="information-circle-outline" size={32} color="rgba(255,255,255,0.2)" />
      <Text
        style={{
          color: "rgba(255,255,255,0.3)",
          marginTop: 10,
          fontSize: 13,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Select a match to view details
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#0d1322",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a2238",
    padding: 20,
  },
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  leaderboardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  detailBadgeText: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  modeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modeBadgeText: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  statLinesGroup: {
    gap: 12,
    marginBottom: 20,
  },
  statLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLineLabel: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  statLineVal: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  boardTitleHeader: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    fontFamily: "Inter, sans-serif",
  },
  sideVsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#0d1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  sideAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sideAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  sidePlayerName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  sideMarkIndicator: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  sideVsText: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  boardContainerCenter: {
    alignItems: "center",
    marginBottom: 24,
  },
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 220,
    height: 220,
    gap: 8,
  },
  boardCell: {
    width: 68,
    height: 68,
    backgroundColor: "#0d1220",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  boardCellX: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  boardCellO: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  boardCellText: {
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  boardCellTextX: {
    color: "#ef4444",
  },
  boardCellTextO: {
    color: "#22c55e",
  },
  replayStepText: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
    fontFamily: "Inter, sans-serif",
  },
  replayControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  replayControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
  },
  replayPlayBtn: {
    backgroundColor: "#22d3ee",
    borderColor: "#22d3ee",
  },
});
