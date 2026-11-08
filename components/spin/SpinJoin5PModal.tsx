import React from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SpinJoin5PModalProps {
  visible: boolean;
  onClose: () => void;
  balance: number;
  loading: boolean;
  onConfirm: () => void;
  onDeposit: () => void;
  language: string;
}

export const SpinJoin5PModal: React.FC<SpinJoin5PModalProps> = ({
  visible,
  onClose,
  balance,
  loading,
  onConfirm,
  onDeposit,
  language,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(5, 8, 20, 0.82)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: "#0f172a",
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: "rgba(244, 63, 94, 0.35)",
            padding: 24,
            alignItems: "center",
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.7)",
          }}
        >
          {/* Header Icon */}
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              borderWidth: 2,
              borderColor: "#f43f5e",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="cash-outline" size={30} color="#f43f5e" />
          </View>

          <Text
            style={{
              color: "#ffffff",
              fontSize: 20,
              fontWeight: "900",
              textAlign: "center",
              marginBottom: 6,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {language === "am" ? "የ 5 ተጫዋች ስፒን ይቀላቀሉ" : "Join 5-Player Spin"}
          </Text>

          <Text
            style={{
              color: "#94a3b8",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 18,
              marginBottom: 18,
            }}
          >
            {language === "am"
              ? "ወደ ጨዋታው ለመግባት 100 ብር ያስፈልጋል። አሸናፊው 500 ብር ይወስዳል!"
              : "Entry fee is 100 ETB. The winner takes the 500 ETB pot!"}
          </Text>

          {/* Wallet Info Box */}
          <View
            style={{
              width: "100%",
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              padding: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700" }}>
              {language === "am" ? "ያለዎት ቀሪ ሂሳብ:" : "Available Balance:"}
            </Text>
            <Text
              style={{
                color: balance >= 100 ? "#10b981" : "#ef4444",
                fontSize: 16,
                fontWeight: "900",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              {balance.toLocaleString()} ETB
            </Text>
          </View>

          {balance < 100 ? (
            <View style={{ width: "100%", gap: 10 }}>
              <View
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  borderRadius: 12,
                  padding: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "700", textAlign: "center" }}>
                  {language === "am"
                    ? "በቂ ሂሳብ የለዎትም። እባክዎ መጀመሪያ ተቀማጭ ያድርጉ!"
                    : "Insufficient balance. Please deposit at least 100 ETB to play."}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onDeposit}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#00DAF3",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: "#080F17", fontSize: 15, fontWeight: "900" }}>
                  {language === "am" ? "አሁን ተቀማጭ ያድርጉ" : "Deposit Now"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "700" }}>
                  {language === "am" ? "ይቅር" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%", gap: 10 }}>
              <TouchableOpacity
                disabled={loading}
                onPress={onConfirm}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: "#f43f5e",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(244, 63, 94, 0.45)",
                }}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 }}>
                    {language === "am" ? "በ 100 ብር ይቀላቀሉ" : "Join with 100 Birr"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "700" }}>
                  {language === "am" ? "ይቅር" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default SpinJoin5PModal;
