import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/authContext';
import { WebPressable } from './WebPressable';

type LeaveGameConfirmationProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  stakeAmount?: number;
};

export default function LeaveGameConfirmation({ visible, onCancel, onConfirm, stakeAmount = 0 }: LeaveGameConfirmationProps) {
  const { width } = useWindowDimensions();
  const { t } = useAuth();
  const isDesktop = width > 768 && Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.backdrop, isDesktop && styles.backdropDesktop]} />
        <View style={[styles.modal, isDesktop && styles.modalDesktop]}>
          <LinearGradient colors={["#1a1d2d", "#121420"]} style={styles.gradient}>
            {/* Warning Icon */}
            <View style={styles.iconWrap}>
              <LinearGradient colors={["rgba(251,191,36,0.2)", "rgba(251,191,36,0.1)"]} style={styles.iconBg}>
                <Ionicons name="warning" size={28} color="#fbbf24" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {t("leave_game_confirm_title")}
            </Text>

            {/* Warning Message */}
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={18} color="#fbbf24" style={{ marginRight: 8 }} />
              <Text style={styles.warningText}>
                {t("forfeit_warning")}
              </Text>
            </View>

            {/* Loss Amount */}
            {stakeAmount > 0 && (
              <View style={styles.lossBox}>
                <Text style={styles.lossText}>
                  {t("leave_game_loss_warning").replace("{amount}", stakeAmount.toLocaleString())}
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <WebPressable onPress={onCancel} activeScale={0.96} style={styles.cancelBtn}>
                <LinearGradient colors={["rgba(16,185,129,0.2)", "rgba(16,185,129,0.1)"]} style={styles.cancelGradient}>
                  <Ionicons name="play" size={16} color="#34d399" />
                  <Text style={styles.cancelText}>
                    {t("stay_game")}
                  </Text>
                </LinearGradient>
              </WebPressable>
 
              <WebPressable onPress={onConfirm} activeScale={0.96} style={styles.confirmBtn}>
                <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.confirmGradient}>
                  <Ionicons name="exit-outline" size={16} color="#fff" />
                  <Text style={styles.confirmText}>
                    {t("exit_game")}
                  </Text>
                </LinearGradient>
              </WebPressable>
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
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  modalDesktop: {
    maxWidth: 420,
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
    borderColor: 'rgba(251,191,36,0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    marginBottom: 16,
    width: '100%',
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  lossBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    marginBottom: 20,
    width: '100%',
  },
  lossText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
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
    overflow: 'hidden',
  },
  cancelGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  cancelText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '800',
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
    fontSize: 14,
    fontWeight: '800',
  },
});
