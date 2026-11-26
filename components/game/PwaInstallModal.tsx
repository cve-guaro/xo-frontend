// components/game/PwaInstallModal.tsx
// PWA install instructions modal — device-aware with Telegram, iOS, and Android/Desktop instructions.
import React from "react";
import { View, Text, Modal, TouchableOpacity, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/tokens";

function InstructionStep({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.cardRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 11.5, fontWeight: '800' }}>{step}</Text>
      </View>
      <Text style={{ color: colors.textSoft, fontSize: 13, lineHeight: 19, flex: 1 }}>{children}</Text>
    </View>
  );
}

function HighlightText({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.text, fontWeight: '700' }}>{children}</Text>;
}

export default function PwaInstallModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const isTelegram = Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent);
  const isIOS = Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5, 7, 14, 0.82)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          borderRadius: 20,
          padding: 24,
          width: '100%',
          maxWidth: 420,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Install XOET app</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Device specific instructions */}
          <View style={{ marginBottom: 20 }}>
            {isTelegram ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>Telegram browser detected</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                  Open in your system browser to install the web app or download the APK.
                </Text>
                <InstructionStep step={1}>Tap the <HighlightText>three dots</HighlightText> at the top right.</InstructionStep>
                <InstructionStep step={2}>Select <HighlightText>Open in Browser</HighlightText> (Chrome or Safari).</InstructionStep>
                <InstructionStep step={3}>Click the download button again once opened.</InstructionStep>
              </View>
            ) : isIOS ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>Instructions for iOS Safari</Text>
                <InstructionStep step={1}>Tap the <HighlightText>Share</HighlightText> button in Safari.</InstructionStep>
                <InstructionStep step={2}>Scroll down and select <HighlightText>Add to Home Screen</HighlightText>.</InstructionStep>
                <InstructionStep step={3}>Tap <HighlightText>Add</HighlightText> to complete installation.</InstructionStep>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>How to install</Text>
                <InstructionStep step={1}>Open your browser menu and select <HighlightText>Install App</HighlightText> or <HighlightText>Add to Home Screen</HighlightText>.</InstructionStep>
                <InstructionStep step={2}>On desktop, click the <HighlightText>Install icon</HighlightText> in the address bar.</InstructionStep>
              </View>
            )}
          </View>

          {/* Fallback to Android APK */}
          <View style={{ borderTopWidth: 1, borderColor: colors.divider, paddingTop: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>
              {isTelegram ? 'Android APK via Telegram channel' : 'Android direct APK download'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(isTelegram ? 'https://t.me/xoethiopia1' : 'https://xoethiopia.com/xoet.apk').catch(() => {})
              }
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name={isTelegram ? "paper-plane-outline" : "cloud-download-outline"} size={17} color={colors.bgDeep} />
              <Text style={{ color: colors.bgDeep, fontSize: 13.5, fontWeight: '800' }}>
                {isTelegram ? 'Open Telegram channel' : 'Download Android APK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
