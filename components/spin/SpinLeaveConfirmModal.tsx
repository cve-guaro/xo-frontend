import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SpinLeaveConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  language?: string;
}

export const SpinLeaveConfirmModal: React.FC<SpinLeaveConfirmModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  language = "en",
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            backgroundColor: "#141830",
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "#1f2744",
            padding: 28,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderWidth: 1.5,
              borderColor: "#ef4444",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="exit-outline" size={28} color="#ef4444" />
          </View>

          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
            {language === "am" ? "ከክፍሉ መውጣት ይፈልጋሉ?" : "Leave Room?"}
          </Text>

          <Text
            style={{
              color: "#8b93a7",
              fontSize: 13,
              fontWeight: "600",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {language === "am"
              ? "ውርርድዎን አጥተው ከስፒን ክፍሉ ይወጣሉ። እርግጠኛ ነዎት?"
              : "You will forfeit your stake and leave the current spin room. Are you sure?"}
          </Text>

          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#1f2744",
                backgroundColor: "rgba(255,255,255,0.04)",
                alignItems: "center",
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#8b93a7", fontSize: 13, fontWeight: "800" }}>
                {language === "am" ? "ይቅር" : "STAY"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: "#ef4444",
                alignItems: "center",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.45)",
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "900" }}>
                {language === "am" ? "ውጣ" : "LEAVE ROOM"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SpinLeaveConfirmModal;
