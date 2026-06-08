import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/authContext';

type LogoutConfirmationProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmation({ visible, onCancel, onConfirm }: LogoutConfirmationProps) {
  const { width } = useWindowDimensions();
  const { language, t } = useAuth();
  const isDesktop = width > 768 && Platform.OS === 'web';
  const isEN = language === 'en';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.backdrop, isDesktop && styles.backdropDesktop]} />
        <View style={[styles.modal, isDesktop && styles.modalDesktop]}>
          <LinearGradient colors={["#1a1d2d", "#121420"]} style={styles.gradient}>
            {/* Icon */}
            <View style={styles.iconWrap}>
              <LinearGradient colors={["rgba(239,68,68,0.2)", "rgba(239,68,68,0.1)"]} style={styles.iconBg}>
                <Ionicons name="log-out-outline" size={28} color="#ef4444" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {t("logout_confirm_title")}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {t("logout_confirm_message")}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.9} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onConfirm} activeOpacity={0.9} style={styles.confirmBtn}>
                <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.confirmGradient}>
                  <Ionicons name="exit-outline" size={16} color="#fff" />
                  <Text style={styles.confirmText}>
                    {t("logout")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  backdropDesktop: {
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  modalDesktop: {
    maxWidth: 400,
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },
  gradient: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    marginBottom: 16,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
