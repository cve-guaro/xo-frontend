import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ActionConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: 'red' | 'yellow' | 'blue';
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ActionConfirmModal({ 
  visible, 
  title, 
  message, 
  confirmText, 
  confirmColor = 'red',
  iconName,
  isLoading = false,
  onCancel, 
  onConfirm 
}: ActionConfirmModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';

  const colorConfig = {
    red: {
      bg: ["rgba(239,68,68,0.2)", "rgba(239,68,68,0.1)"],
      border: "rgba(239,68,68,0.3)",
      icon: "#ef4444",
      gradient: ["#ef4444", "#dc2626"]
    },
    yellow: {
      bg: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0.1)"],
      border: "rgba(245,158,11,0.3)",
      icon: "#f59e0b",
      gradient: ["#f59e0b", "#d97706"]
    },
    blue: {
      bg: ["rgba(59,130,246,0.2)", "rgba(59,130,246,0.1)"],
      border: "rgba(59,130,246,0.3)",
      icon: "#3b82f6",
      gradient: ["#3b82f6", "#2563eb"]
    }
  };

  const theme = colorConfig[confirmColor];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.backdrop, isDesktop && styles.backdropDesktop]} />
        <View style={[styles.modal, isDesktop && styles.modalDesktop]}>
          <LinearGradient colors={["#1a1d2d", "#121420"]} style={styles.gradient}>
            {/* Icon */}
            <View style={styles.iconWrap}>
              <LinearGradient colors={theme.bg as any} style={[styles.iconBg, { borderColor: theme.border }]}>
                <Ionicons name={iconName} size={28} color={theme.icon} />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.9} style={styles.cancelBtn} disabled={isLoading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onConfirm} activeOpacity={0.9} style={[styles.confirmBtn, isLoading && { opacity: 0.5 }]} disabled={isLoading}>
                <LinearGradient colors={theme.gradient as any} style={styles.confirmGradient}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{confirmText}</Text>}
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
    zIndex: 99999,
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
