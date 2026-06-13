// components/game/PwaInstallModal.tsx
// PWA install instructions modal — device-aware with Telegram, iOS, and Android/Desktop instructions.
import React from "react";
import { View, Text, Modal, TouchableOpacity, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function InstructionStep({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>{step}</Text>
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>{children}</Text>
    </View>
  );
}

function CyanBold({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>{children}</Text>;
}

export default function PwaInstallModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const isTelegram = Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent);
  const isIOS = Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{
          backgroundColor: '#0c0c1f',
          borderWidth: 1,
          borderColor: 'rgba(0,218,243,0.2)',
          borderRadius: 24,
          padding: 24,
          width: '100%',
          maxWidth: 420,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Install XOET Web App</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Device specific instructions */}
          <View style={{ marginBottom: 24 }}>
            {isTelegram ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Telegram Browser Detected:</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 }}>
                  Telegram's in-app browser has sandbox restrictions that prevent installing web apps or downloading files directly.
                </Text>
                <InstructionStep step={1}>Tap the <CyanBold>three dots</CyanBold> at the top right of this screen.</InstructionStep>
                <InstructionStep step={2}>Select <CyanBold>"Open in Browser"</CyanBold> or <CyanBold>"Open in Chrome/Safari"</CyanBold>.</InstructionStep>
                <InstructionStep step={3}>Once opened in your system browser, click the download button again.</InstructionStep>
              </View>
            ) : isIOS ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Instructions for iOS Safari:</Text>
                <InstructionStep step={1}>Tap the <CyanBold>Share</CyanBold> button in Safari (box with an arrow pointing up at the bottom).</InstructionStep>
                <InstructionStep step={2}>Scroll down the share menu and select <CyanBold>"Add to Home Screen"</CyanBold>.</InstructionStep>
                <InstructionStep step={3}>Tap <CyanBold>"Add"</CyanBold> in the top right corner to complete installation.</InstructionStep>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>How to Install:</Text>
                <InstructionStep step={1}>Open your browser's menu (three dots icon in Chrome) and select <CyanBold>"Add to Home Screen"</CyanBold> or <CyanBold>"Install App"</CyanBold>.</InstructionStep>
                <InstructionStep step={2}>On desktop, look for the <CyanBold>Install icon</CyanBold> in the browser address bar next to the URL.</InstructionStep>
              </View>
            )}
          </View>

          {/* Fallback to Android APK */}
          <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
            {isTelegram ? (
              <>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Android Users (Via Telegram Channel)
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://t.me/xoethiopia1').catch(() => {})}
                  style={{ backgroundColor: '#0088cc', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Get APK from Channel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Android Users (Direct APK)
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://xoethiopia.com/xoet.apk').catch(() => {})}
                  style={{ backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Download Android APK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
