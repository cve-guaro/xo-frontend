import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SpinVoiceControlsProps {
  micMuted: boolean;
  masterSpeakerMuted: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  hasActiveRound: boolean;
  baseButtonStyle?: any;
  baseTextStyle?: any;
}

export const SpinVoiceControls: React.FC<SpinVoiceControlsProps> = ({
  micMuted,
  masterSpeakerMuted,
  onToggleMic,
  onToggleSpeaker,
  hasActiveRound,
  baseButtonStyle,
  baseTextStyle,
}) => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {/* Microphone Toggle Button */}
      <TouchableOpacity
        onPress={onToggleMic}
        disabled={!hasActiveRound}
        style={[
          baseButtonStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: micMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 23, 68, 0.12)",
            borderWidth: 1,
            borderColor: micMuted ? "#ef4444" : "rgba(255, 23, 68, 0.35)",
            opacity: !hasActiveRound ? 0.4 : 1,
          },
        ]}
        activeOpacity={0.8}
      >
        <Ionicons name={micMuted ? "mic-off" : "mic"} size={16} color={micMuted ? "#ef4444" : "#FF1744"} />
        <Text style={[baseTextStyle, { color: micMuted ? "#ef4444" : "#ffffff", fontSize: 13, fontWeight: "700" }]}>
          {micMuted ? "Mic Off" : "Mic On"}
        </Text>
      </TouchableOpacity>

      {/* Speaker / Audio Toggle Button */}
      <TouchableOpacity
        onPress={onToggleSpeaker}
        disabled={!hasActiveRound}
        style={[
          baseButtonStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: masterSpeakerMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 218, 243, 0.12)",
            borderWidth: 1,
            borderColor: masterSpeakerMuted ? "#ef4444" : "rgba(0, 218, 243, 0.35)",
            opacity: !hasActiveRound ? 0.4 : 1,
          },
        ]}
        activeOpacity={0.8}
      >
        <Ionicons
          name={masterSpeakerMuted ? "volume-mute" : "volume-high"}
          size={16}
          color={masterSpeakerMuted ? "#ef4444" : "#00DAF3"}
        />
        <Text
          style={[
            baseTextStyle,
            { color: masterSpeakerMuted ? "#ef4444" : "#ffffff", fontSize: 13, fontWeight: "700" },
          ]}
        >
          {masterSpeakerMuted ? "Muted All" : "Hear Lobby"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SpinVoiceControls;
