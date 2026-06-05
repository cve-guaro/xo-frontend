import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type WelcomeTermsProps = {
  visible: boolean;
  onAgree: () => void;
  language?: string;
};


export default function WelcomeTermsPopup({ visible, onAgree, language }: WelcomeTermsProps) {
  const isEN = language === "en";

  const { width } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, isDesktop && { justifyContent: 'center' }]}>
        <View style={[styles.backdrop]} />
        <View style={[styles.sheet, isDesktop && styles.sheetDesktop]}>
          <LinearGradient colors={["#181B24", "#121420"]} style={styles.sheetInner}>
            <View style={styles.iconWrap}>
              <Ionicons name="game-controller" size={32} color="#00daf3" />
            </View>
            <Text style={styles.title}>{isEN ? "Welcome to XO Ethiopia!" : "እንኳን ወደ XO ኢትዮጵያ በደህና መጡ!"}</Text>
            <Text style={styles.subtitle}>{isEN ? "Play, compete, and win real prizes!" : "ተጫወቱ፣ ተወዳደሩ፣ እውነተኛ ሽልማት ያሸንፉ!"}</Text>


            <View style={styles.rulesContainer}>
              <View style={styles.rule}>
                <Ionicons name="checkmark-circle" size={16} color="#00daf3" />
                <Text style={styles.ruleText}>{isEN ? "Compete with real players in real-time." : "ከእውነተኛ ተጫዋቾች ጋር በቅጽበት ተወዳደሩ።"}</Text>
              </View>

              <View style={styles.rule}>
                <Ionicons name="ribbon" size={16} color="#34d399" />
                <Text style={styles.ruleText}>{isEN ? "Climb the weekly leaderboard for prizes." : "ሳምንታዊ ሽልማት ለማግኘት ደረጃዎን ያሻሽሉ።"}</Text>
              </View>

              <View style={styles.rule}>
                <Ionicons name="trophy" size={16} color="#34d399" />
                <Text style={styles.ruleText}>{isEN ? "Winnings are added to your balance and fully withdrawable." : "ያሸነፉት ገንዘብ ወዲያውኑ ወደ ሂሳብዎ ይገባል።"}</Text>
              </View>

            </View>

            <Text style={styles.agreementText}>
              {isEN 
                ? "By clicking 'I Agree', you acknowledge these rules and agree to fair play guidelines. Any exploitation of platform mechanics will result in a ban."
                : "'እስማማለሁ' የሚለውን ሲጫኑ በእነዚህ ህጎች እንደሚስማሙ እና ያረጋገጡ እና ትክክለኛ የጨዋታ መመሪያዎችን እንደሚከተሉ ይገልጻሉ። ማንኛውም ማጭበርበር ከጨዋታው ያሳግዳል::"
              }
            </Text>


            <TouchableOpacity activeOpacity={0.9} onPress={onAgree} style={styles.btn}>
              <LinearGradient colors={["#00ccff", "#0077ff"]} style={styles.btnInner}>
                <Text style={styles.btnText}>{isEN ? "I Agree, Let's Play" : "እስማማለሁ፣ ልጀምር"}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.85)" },
  sheet: { marginHorizontal: 12, marginBottom: 12, borderRadius: 18, overflow: "hidden" },
  sheetDesktop: { width: '100%', maxWidth: 460, alignSelf: 'center', marginBottom: 0, shadowColor: "#00daf3", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 30 },
  sheetInner: { padding: 24, borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,218,243,0.3)" },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,218,243,0.1)", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 4 },
  subtitle: { color: "#00daf3", fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  rulesContainer: { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 16, gap: 12, marginBottom: 20 },
  rule: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  ruleText: { color: "#e2e8f0", fontSize: 13, flex: 1, lineHeight: 18 },
  agreementText: { color: "#94a3b8", fontSize: 11, textAlign: "center", marginBottom: 24, paddingHorizontal: 10 },
  btn: { borderRadius: 14, overflow: "hidden" },
  btnInner: { paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
