// app/(auth)/privacy.tsx
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

export default function PrivacyScreen() {
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

          <Text style={styles.headerTitle}>XOet Privacy Policy</Text>

          <View style={styles.iconBtn} />
        </View>

        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introText}>
            Welcome to the privacy policy of xoethiopia.com. This policy will help you understand what data we collect, why we collect it, and what your rights are.
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
            <View style={styles.updateBadge}>
              <Text style={styles.updateText}>Latest update: May 21, 2026</Text>
            </View>

            <Section
              title="1. TYPE OF DATA WE COLLECT"
              text="The Owner does not provide a list of Personal Data types collected. Complete details on each type of Personal Data collected are provided in the dedicated sections of this privacy policy or by specific explanation texts displayed prior to the Data collection.\n\nPersonal Data may be freely provided by the User, or, in case of Usage Data, collected automatically when using this Application.\n\nUnless specified otherwise, all Data requested by this Application is mandatory and failure to provide this Data may make it impossible for this Application to provide its services. In cases where this Application specifically states that some Data is not mandatory, Users are free not to communicate this Data without consequences to the availability or the functioning of the Service.\n\nUsers who are uncertain about which Personal Data is mandatory are welcome to contact the Owner.\n\nAny use of Cookies – or of other tracking tools – by this Application or by the owners of third-party services used by this Application serves the purpose of providing the Service required by the User, in addition to any other purposes described in the present document and in the Cookie Policy.\n\nUsers are responsible for any third-party Personal Data obtained, published or shared through this Application."
            />

            <Section
              title="2. METHODS OF PROCESSING"
              text="The Owner takes appropriate security measures to prevent unauthorized access, disclosure, modification, or unauthorized destruction of the Data.\n\nThe Data processing is carried out using computers and/or IT enabled tools, following organizational procedures and modes strictly related to the purposes indicated. In addition to the Owner, in some cases, the Data may be accessible to certain types of persons in charge, involved with the operation of this Application (administration, sales, marketing, legal, system administration) or external parties (such as third-party technical service providers, mail carriers, hosting providers, IT companies, communications agencies) appointed, if necessary, as Data Processors by the Owner. The updated list of these parties may be requested from the Owner at any time."
            />

            <Section
              title="3. PLACE OF PROCESSING"
              text="The Data is processed at the Owner's operating offices and in any other places where the parties involved in the processing are located.\n\nDepending on the User's location, data transfers may involve transferring the User's Data to a country other than their own. To find out more about the place of processing of such transferred Data, Users can check the section containing details about the processing of Personal Data."
            />

            <Section
              title="4. RETENTION TIME"
              text="Unless specified otherwise in this document, Personal Data shall be processed and stored for as long as required by the purpose they have been collected for and may be retained for longer due to applicable legal obligation or based on the User’s consent."
            />

            <Section
              title="5. LEGAL ACTION"
              text="The User's Personal Data may be used for legal purposes by the Owner in Court or in the stages leading to possible legal action arising from improper use of this Application or the related Services.\n\nThe User declares to be aware that the Owner may be required to reveal personal data upon request of public authorities."
            />

            <Section
              title="6. ADDITIONAL SYSTEM INFORMATION"
              text="In addition to the information contained in this privacy policy, this Application may provide the User with additional and contextual information concerning particular Services or the collection and processing of Personal Data upon request."
            />

            <Section
              title="7. SYSTEM LOGS AND MAINTENANCE"
              text="For operation and maintenance purposes, this Application and any third-party services may collect files that record interaction with this Application (System logs) or use other Personal Data (such as the IP Address) for this purpose."
            />

            <Section
              title="8. INFORMATION NOT CONTAINED IN THIS POLICY"
              text="More details concerning the collection or processing of Personal Data may be requested from the Owner at any time. Please see the contact information at the end of this document."
            />

            <Section
              title="9. CHANGES TO THIS PRIVACY POLICY"
              text="The Owner reserves the right to make changes to this privacy policy at any time by notifying its Users on this page and possibly within this Application and/or - as far as technically and legally feasible - sending a notice to Users via any contact information available to the Owner. It is strongly recommended to check this page often, referring to the date of the last modification listed at the bottom.\n\nShould the changes affect processing activities performed on the basis of the User’s consent, the Owner shall collect new consent from the User, where required."
            />

            <Section
              title="10. DEFINITIONS AND LEGAL REFERENCES"
              text={
                "• Personal Data (or Data):\nAny information that directly, indirectly, or in connection with other information — including a personal identification number — allows for the identification or identifiability of a natural person.\n\n" +
                "• Usage Data:\nInformation collected automatically through this Application (or third-party services employed in this Application), which can include: the IP addresses or domain names of the computers utilized by the Users who use this Application, the URI addresses (Uniform Resource Identifier), the time of the request, the method utilized to submit the request to the server, the size of the file received in response, the numerical code indicating the status of the server's answer (successful outcome, error, etc.), the country of origin, the features of the browser and the operating system utilized by the User, the various time details per visit (e.g., the time spent on each page within the Application) and the details about the path followed within the Application with special reference to the sequence of pages visited, and other parameters about the device operating system and/or the User's IT environment.\n\n" +
                "• User:\nThe individual using this Application who, unless otherwise specified, coincides with the Data Subject.\n\n" +
                "• Data Subject:\nThe natural person to whom the Personal Data refers.\n\n" +
                "• Data Processor (or Processor):\nThe natural or legal person, public authority, agency or other body which processes Personal Data on behalf of the Controller, as described in this privacy policy.\n\n" +
                "• Data Controller (or Owner):\nThe natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of Personal Data, including the security measures concerning the operation and use of this Application. The Data Controller, unless otherwise specified, is the Owner of this Application.\n\n" +
                "• This Application:\nThe means by which the Personal Data of the User is collected and processed.\n\n" +
                "• Service:\nThe service provided by this Application as described in the relative terms (if available) and on this platform/application.\n\n" +
                "• European Union (or EU):\nUnless otherwise specified, all references made within this document to the European Union include all current member states to the European Union and the European Economic Area.\n\n" +
                "• Legal information:\nThis privacy statement has been prepared based on provisions of multiple legislations.\nThis privacy policy relates solely to this Application, if not stated otherwise within this document."
              }
            />

            <Section
              title="11. OWNER AND DATA CONTROLLER"
              text="Addis Ababa, Ethiopia\n\nOwner contact: https://t.me/xoetsupport"
            />

            {/* Highlight Box */}
            <View style={styles.noticeBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#a78bfa" />
              <Text style={styles.noticeText}>
                We value your privacy and are committed to protecting your personal data in accordance with our legal obligations.
              </Text>
            </View>
          </ScrollView>

          {/* Accept Button */}
          <View style={styles.cta}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#a78bfa", "#7c3aed"]}
                style={styles.ctaInner}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.ctaText}>I Understand</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  const formattedText = text.replace(/\\n/g, "\n");
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{formattedText}</Text>
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

  updateBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  updateText: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "700",
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
    backgroundColor: "rgba(167,139,250,0.08)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
    marginTop: 4,
    marginBottom: 12,
  },
  noticeText: {
    color: "#e5e3ff",
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
