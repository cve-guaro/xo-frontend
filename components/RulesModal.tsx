// components/RulesModal.tsx — Platform rules in English & Amharic
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  language: 'en' | 'am';
}

const RULES = [
  {
    category: { en: '💰 Financial', am: '💰 ገንዘብ' },
    items: [
      { en: 'Minimum deposit: 10 ETB', am: 'ዝቅተኛ ተቀማጭ: 10 ብር' },
      { en: 'Maximum deposit: 50,000 ETB', am: 'ከፍተኛ ተቀማጭ: 50,000 ብር' },
      { en: 'Minimum withdrawal: 10 ETB', am: 'ዝቅተኛ ማውጣት: 10 ብር' },
      { en: 'Maximum withdrawal: 25,000 ETB', am: 'ከፍተኛ ማውጣት: 25,000 ብር' },
      { en: 'Deposits must be wagered (1x rollover) before withdrawing', am: 'ገንዘብ ከማውጣት በፊት ተቀማጭ መጫወት አለበት (1x ማዟሪያ)' },
      { en: 'Withdrawals over 2,000 ETB may require admin review', am: 'ከ2,000 ብር በላይ ማውጣት በአስተዳዳሪ ሊገመገም ይችላል' },
      { en: 'Bonus balance is for playing only — cannot be withdrawn', am: 'ጉርሻ ቀሪ ሂሳብ ለመጫወት ብቻ ነው — ማውጣት አይቻልም' },
      { en: 'Withdrawals are processed instantly via Chapa', am: 'ማውጣቶች በቻፓ በፍጥነት ይከናወናሉ' },
    ],
  },
  {
    category: { en: '🎮 Gameplay', am: '🎮 ጨዋታ' },
    items: [
      { en: 'Each turn has a timer (varies by room)', am: 'እያንዳንዱ ዙር ጊዜ ቆጣሪ አለው (በክፍል ይለያያል)' },
      { en: 'If time runs out, you forfeit the game', am: 'ጊዜ ካለቀ ጨዋታውን ያጣሉ' },
      { en: 'Leaving a match counts as a loss', am: 'ጨዋታ መተው እንደ ሽንፈት ይቆጠራል' },
      { en: 'If the board fills with no winner (draw), the game continues with a fresh board', am: 'ሰሌዳው ከተሞላ አሸናፊ ከሌለ (አቻ) ጨዋታው በአዲስ ሰሌዳ ይቀጥላል' },
      { en: 'House cut: Room 1: 20% | Room 2: 15% | Room 3: 10%', am: 'የቤት ክፍያ: ክፍል 1: 20% | ክፍል 2: 15% | ክፍል 3: 10%' },
      { en: 'Room 1 has a 25-game cap per bet tier', am: 'ክፍል 1 በእያንዳንዱ ውርርድ ደረጃ 25 ጨዋታ ገደብ አለው' },
      { en: 'You can challenge friends directly via "Play With Friend"', am: 'ጓደኞችዎን በ"ከጓደኛ ጋር ጫወት" በቀጥታ መጋበዝ ይችላሉ' },
    ],
  },
  {
    category: { en: '🔒 Security', am: '🔒 ደህንነት' },
    items: [
      { en: 'Anti-cheat protection is active at all times', am: 'ፀረ-ማታለል ጥበቃ ሁልጊዜ ንቁ ነው' },
      { en: 'All moves are validated on the server — no client spoofing', am: 'ሁሉም ጨዋታዎች በሰርቨር ተረጋግጠዋል — ማታለል አይቻልም' },
      { en: 'Suspicious activity may result in account suspension', am: 'አጠራጣሪ ድርጊት ሂሳብ ማገድ ሊያስከትል ይችላል' },
      { en: 'Your funds are secured, tracked, and audited', am: 'ገንዘብዎ ተጠብቆ ይከታተላል እና ይመረመራል' },
      { en: 'AML (Anti Money Laundering) rules are enforced', am: 'ፀረ ገንዘብ ማጠቢያ ህጎች ተግባራዊ ናቸው' },
    ],
  },
];

export default function RulesModal({ visible, onClose, language }: Props) {
  const isEN = language === 'en';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="book-outline" size={20} color="#00e5ff" />
              <Text style={styles.title}>{isEN ? 'Platform Rules' : 'የመድረክ ህጎች'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {RULES.map((section, si) => (
              <View key={si} style={styles.section}>
                <Text style={styles.categoryTitle}>
                  {isEN ? section.category.en : section.category.am}
                </Text>
                {section.items.map((rule, ri) => (
                  <View key={ri} style={styles.ruleRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.ruleText}>
                      {isEN ? rule.en : rule.am}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Footer */}
            <View style={styles.footer}>
              <Ionicons name="shield-checkmark" size={14} color="rgba(0,229,255,0.5)" />
              <Text style={styles.footerText}>
                {isEN
                  ? 'By playing on XOET, you agree to these rules.'
                  : 'XOET ላይ በመጫወት እነዚህን ህጎች ይስማማሉ።'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: '#0f1120',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  section: {
    marginTop: 16,
  },
  categoryTitle: {
    color: '#00e5ff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,229,255,0.5)',
    marginTop: 6,
  },
  ruleText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
});
