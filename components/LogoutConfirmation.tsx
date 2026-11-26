import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { colors } from '../theme/tokens';

type LogoutConfirmationProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmation({ visible, onCancel, onConfirm }: LogoutConfirmationProps) {
  const { width } = useWindowDimensions();
  const { t } = useAuth();
  const isDesktop = width > 768 && Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={[styles.modal, isDesktop && styles.modalDesktop]}>
          <View style={styles.inner}>
            <View style={styles.iconBg}>
              <Ionicons name="log-out-outline" size={24} color={colors.danger} />
            </View>

            <Text style={styles.title}>{t("logout_confirm_title")}</Text>
            <Text style={styles.message}>{t("logout_confirm_message")}</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.8} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>{t("logout")}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: 'rgba(5, 7, 14, 0.82)',
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  modalDesktop: {
    maxWidth: 380,
  },
  inner: {
    padding: 24,
    alignItems: 'center',
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tintDanger,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13.5,
    textAlign: 'center',
    marginBottom: 22,
    fontWeight: '500',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
