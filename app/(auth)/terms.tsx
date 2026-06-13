// app/(auth)/terms.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.backgroundImage}>
      <LinearGradient colors={["#060614", "#0c0c1f"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>XOet Terms of Service</Text>

          <View style={styles.iconBtn} />
        </View>

        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introText}>
            Welcome to XOet! Before you start, please take a moment to review the key points:
          </Text>
        </View>

        {/* Card */}
        <LinearGradient
          colors={["rgba(19,21,28,0.82)", "rgba(15,17,23,0.82)"]}
          style={styles.card}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Section
              title="1. ACCEPTANCE OF TERMS"
              text="By accessing, registering for, or using the XOet mobile application ('XOet', 'the Platform', 'the App'), you confirm that you have read, understood, and agreed to be bound by these Terms of Service and all related policies. Use of the App constitutes a binding agreement between the user and XOet."
            />

            <Section
              title="2. PLATFORM ROLE AND NATURE"
              text={
                "XOet is a technology platform that enables peer-to-peer, skill-based competitive gameplay between users.\n\n" +
                "XOet:\n" +
                "• Does not participate in gameplay\n" +
                "• Does not place or match stakes\n" +
                "• Does not influence outcomes\n" +
                "• Does not guarantee profit or success\n\n" +
                "XOet generates revenue exclusively through platform service commissions charged for matchmaking, infrastructure, game hosting, and transaction facilitation."
              }
            />

            <Section
              title="3. USER ELIGIBILITY AND RESPONSIBILITY"
              text={
                "Use of XOet is intended only for individuals who:\n" +
                "• Are 21 years of age or older\n" +
                "• Are legally capable of entering binding agreements\n" +
                "• Are permitted to use digital payment services\n" +
                "• Use funds that belong to them\n" +
                "• Provide accurate and truthful information during registration\n" +
                "• Successfully complete phone number verification via OTP\n\n" +
                "By creating an account and using the App, the user represents and warrants that they meet all eligibility requirements. XOet relies on this representation when providing access to the platform."
              }
            />

            <Section
              title="4. SKILL-BASED GAME DECLARATION"
              text={
                "All games available on XOet are skill-based competitive games. Outcomes depend on:\n" +
                "• Strategic decision-making\n" +
                "• Reaction speed\n" +
                "• Time management\n" +
                "• Tactical execution\n\n" +
                "There is no guaranteed outcome. Participation involves financial risk, and users may lose the full amount they choose to stake.\n\n" +
                "XOet does not promote, promise, or imply income generation."
              }
            />

            <Section
              title="5. GAMEPLAY RULES"
              text={
                "5.1 Game Structure\n" +
                "• Games are played between two users\n" +
                "• Standard 3×3 tic-tac-toe format\n" +
                "• Players alternate turns sequentially\n" +
                "• The first player to move at the start of a match is selected randomly by the system\n\n" +
                "5.2 Timers\n" +
                "• Each turn is subject to a countdown timer based on the selected room\n" +
                "• The timer pauses when a move is completed and resumes for the opponent\n" +
                "• Failure to make a move within the allotted time results in loss of the game\n\n" +
                "5.3 Completion\n" +
                "• Repeated draws are resolved through timer enforcement\n" +
                "• All game outcomes are automatically recorded\n" +
                "• Completed games are final"
              }
            />

            <Section
              title="6. ROOMS, STAKES, AND COMMISSIONS"
              text={
                "XOet offers predefined gameplay rooms with fixed stake options.\n" +
                "• Both players stake equal amounts\n" +
                "• The combined stake forms the prize pool\n" +
                "• The winner receives the prize pool minus the applicable platform commission\n" +
                "• Commission rates vary by room and are disclosed prior to game confirmation\n\n" +
                "Platform commissions are charged solely for services rendered and are non-refundable."
              }
            />

            <Section
              title="7. WALLET AND PAYMENTS"
              text={
                "7.1 In-App Wallet\n" +
                "Wallet balances are maintained solely for use within the XOet platform and do not constitute bank deposits or traditional financial accounts. Balances exist exclusively to facilitate participation on the platform and do not accrue interest.\n\n" +
                "7.2 Deposits\n" +
                "Deposits are processed via Chapa, an independent third-party payment service provider. XOet does not store or process users' banking credentials.\n\n" +
                "7.3 Use of Deposited Funds\n" +
                "Funds deposited into the XOet platform are intended exclusively for participation in gameplay. Deposited funds are not eligible for withdrawal unless they have been actively used in at least one completed game on the platform. This requirement exists to ensure proper platform use, prevent misuse of services, and maintain operational and transactional integrity.\n\n" +
                "7.4 Withdrawals\n" +
                "Withdrawal processing times may vary. XOet may apply reasonable checks before completing withdrawals to ensure system integrity, compliance, and proper operation of the platform."
              }
            />

            <Section
              title="8. FAIR PLAY AND ACCEPTABLE USE"
              text={
                "Users agree to engage in fair and honest competition and must not:\n" +
                "• Collude with other users\n" +
                "• Use automation tools, scripts, or bots\n" +
                "• Exploit software errors or vulnerabilities\n" +
                "• Operate multiple accounts\n" +
                "• Engage in deceptive or abusive conduct\n\n" +
                "XOet may take appropriate measures to preserve fairness and platform stability."
              }
            />

            <Section
              title="9. RESPONSIBLE PARTICIPATION"
              text={
                "Users acknowledge that:\n" +
                "• Participation is voluntary\n" +
                "• Financial risk is inherent\n" +
                "• Outcomes depend on skill and decision-making\n" +
                "• XOet does not guarantee financial gain\n\n" +
                "Users remain fully responsible for their participation and financial decisions."
              }
            />

            <Section
              title="10. REFUNDS"
              text={
                "• Stakes placed in completed games are non-refundable\n" +
                "• Refunds may be considered only if a game fails to start due to a verified technical issue\n" +
                "• Platform service fees are non-refundable"
              }
            />

            <Section
              title="11. DISPUTES"
              text={
                "• Disputes must be submitted through official support channels\n" +
                "• System records are authoritative\n" +
                "• Completed games and settled transactions are final"
              }
            />

            <Section
              title="12. ACCOUNT ACCESS AND PLATFORM INTEGRITY"
              text="XOet reserves the right to manage access to the platform, conduct reviews, and take reasonable actions necessary to protect users, services, and system integrity."
            />

            <Section
              title="13. PRIVACY"
              text={
                "XOet collects and processes limited personal and technical data, including:\n" +
                "• Phone numbers\n" +
                "• Transaction records\n" +
                "• Gameplay data\n" +
                "• Usage and device information\n\n" +
                "Data is used solely for security, operations, fraud prevention, and service improvement. XOet does not sell personal data.\n\n" +
                "By registering for and using XOet, you expressly consent to receive OTP, security, verification, and essential service-related SMS messages from XOet to the phone number you provide."
              }
            />

            <Section
              title="14. LIMITATION OF LIABILITY"
              text={
                "XOet is not responsible for:\n" +
                "• Losses arising from user gameplay decisions\n" +
                "• Connectivity, device, or network failures\n" +
                "• Interruptions caused by third-party services\n\n" +
                "Use of the platform is at the user's own risk."
              }
            />

            <Section
              title="15. GOVERNING LAW"
              text="These Terms are governed by the laws of the Federal Democratic Republic of Ethiopia."
            />

            {/* Highlight Box */}
            <View style={styles.noticeBox}>
              <Ionicons name="alert-circle-outline" size={20} color="#FBBF24" />
              <Text style={styles.noticeText}>
                By continuing, you confirm that you:
                • Meet all stated eligibility requirements, including being 21+
                • Understand the nature of the platform
                • Accept financial risk
                • Agree to be bound by these Terms
              </Text>
            </View>
          </ScrollView>

          {/* Accept Button */}
          <View style={styles.cta}>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.ctaInner}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.ctaText}>I Agree & Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  safe: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  introContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  introText: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
  },

  card: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },

  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },

  section: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(11,11,15,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sectionTitle: {
    color: "#A78BFA",
    fontWeight: "900",
    marginBottom: 8,
    fontSize: 15,
  },
  sectionText: {
    color: "#CBD5E1",
    lineHeight: 20,
    fontSize: 13.5,
  },

  noticeBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    marginTop: 4,
    marginBottom: 12,
  },
  noticeText: {
    color: "#FDE68A",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: "700",
  },

  cta: {
    marginTop: 6,
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});