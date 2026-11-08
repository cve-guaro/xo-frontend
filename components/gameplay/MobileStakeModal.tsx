import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MobileStakeModalProps {
  visible: boolean;
  onClose: () => void;
  isEN: boolean;
  spinError: string | null;
  balance: number;
  mobileStakeInput: string;
  setMobileStakeInput: React.Dispatch<React.SetStateAction<string>>;
  onConfirm: (stake: number) => void;
}

export const MobileStakeModal: React.FC<MobileStakeModalProps> = ({
  visible,
  onClose,
  isEN,
  spinError,
  balance,
  mobileStakeInput,
  setMobileStakeInput,
  onConfirm,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(6, 9, 22, 0.75)"
      }}>
        <View style={{
          backgroundColor: "#0d0e1a",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: "#1e2340",
          padding: 24,
          paddingBottom: Platform.OS === "ios" ? 40 : 24,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>
              {isEN ? "CHOOSE YOUR WAGER" : "የእንጨት መጠን ይምረጡ"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#8b93a7" />
            </TouchableOpacity>
          </View>

          {spinError && (
            <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 12 }}>
              {spinError}
            </Text>
          )}

          {/* Current Balance */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ color: "#8b93a7", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" }}>
              {isEN ? "AVAILABLE BALANCE:" : "ያለዎት ቀሪ ሂሳብ:"}
            </Text>
            <Text style={{ color: "#22d3ee", fontSize: 13, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
              ETB {balance.toLocaleString()}
            </Text>
          </View>

          {/* Stepper +/- */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#141829",
            borderRadius: 12,
            padding: 4,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#1e2340"
          }}>
            <TouchableOpacity
              onPress={() => setMobileStakeInput(prev => String(Math.max(10, Number(prev) - 10)))}
              style={{ width: 44, height: 44, backgroundColor: "#1e2340", borderRadius: 10, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                {mobileStakeInput} ETB
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setMobileStakeInput(prev => String(Number(prev) + 10))}
              style={{ width: 44, height: 44, backgroundColor: "#1e2340", borderRadius: 10, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Presets */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {[10, 50, 100, 500].map(val => (
              <TouchableOpacity
                key={val}
                onPress={() => setMobileStakeInput(String(val))}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: "#141829",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: mobileStakeInput === String(val) ? "#22d3ee" : "#1e2340",
                  alignItems: "center"
                }}
              >
                <Text style={{ color: mobileStakeInput === String(val) ? "#22d3ee" : "#8b93a7", fontSize: 12, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            onPress={() => onConfirm(Number(mobileStakeInput))}
            style={{
              backgroundColor: "#22d3ee",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: "#0d0e1a", fontSize: 14, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>
              {isEN ? "CONFIRM & JOIN" : "አረጋግጥ እና ጀምር"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
