import { motion } from '../theme/tokens';
// components/GlobalToast.tsx — Sleek Toast Component (Matching Image 5 & XOET Brand Theme)
import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { CheckmarkCircleIcon, AlertCircleIcon, InfoIcon, WarningIcon, CloseIcon, SyncIcon } from './SvgIcons';
import { useToast, ToastItem, ToastVariant } from '../context/ToastContext';
import { playNotificationChime, playTickSound } from '../lib/pinTickAudio';

// ─── Variant Configs (XOET Dark Gaming Palette) ──────────────
const VARIANT_CONFIG: Record<ToastVariant, {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
  messageColor: string;
}> = {
  success: {
    icon: CheckmarkCircleIcon,
    color: '#10b981', // Emerald
    bgColor: '#081412',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    glowColor: 'rgba(16, 185, 129, 0.20)',
    textColor: '#ffffff',
    messageColor: '#a7f3d0',
  },
  error: {
    icon: AlertCircleIcon,
    color: '#ff2a5f', // Coral Red
    bgColor: '#160b12',
    borderColor: 'rgba(255, 42, 95, 0.45)',
    glowColor: 'rgba(255, 42, 95, 0.20)',
    textColor: '#ffffff',
    messageColor: '#fecdd3',
  },
  info: {
    icon: InfoIcon,
    color: '#00daf3', // Cyan
    bgColor: '#08131e',
    borderColor: 'rgba(0, 218, 243, 0.45)',
    glowColor: 'rgba(0, 218, 243, 0.20)',
    textColor: '#ffffff',
    messageColor: '#bae6fd',
  },
  warning: {
    icon: WarningIcon,
    color: '#f59e0b', // Amber
    bgColor: '#161208',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    glowColor: 'rgba(245, 158, 11, 0.20)',
    textColor: '#ffffff',
    messageColor: '#fde68a',
  },
};

// ─── Single Toast Item ────────────────────────────────────────
const SingleToast = memo(function SingleToast({
  item,
  index,
  onDismiss,
}: {
  item: ToastItem;
  index: number;
  onDismiss: (id: number) => void;
}) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  // Dynamic styling based on message and notification context
  const isBalanceNotification =
    (item.title && (item.title.toLowerCase().includes('balance') || item.title.includes('ሂሳብ'))) ||
    (item.message && (item.message.toLowerCase().includes('balance') || item.message.includes('ሂሳብ')));

  const cfg = isBalanceNotification
    ? {
        icon: SyncIcon,
        color: '#00daf3',
        bgColor: '#071524',
        borderColor: 'rgba(0, 218, 243, 0.55)',
        glowColor: 'rgba(0, 218, 243, 0.22)',
        textColor: '#ffffff',
        messageColor: '#bae6fd',
      }
    : VARIANT_CONFIG[item.variant] || VARIANT_CONFIG.info;

  useEffect(() => {
    // Notification chime on toast appearance
    try {
      playNotificationChime();
    } catch {}

    // Slide in with motion tokens (200ms ease-out, transform & opacity only)
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.duration.enter,
        easing: motion.easing.enter,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.enter,
        easing: motion.easing.enter,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.duration.enter,
        easing: motion.easing.enter,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Auto dismiss with motion tokens (150ms ease-in, fast exit)
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -60,
          duration: motion.duration.exit,
          easing: motion.easing.exit,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: motion.duration.exit,
          easing: motion.easing.exit,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => onDismiss(item.id));
    }, item.duration || 3200);

    return () => clearTimeout(timer);
  }, [item.id, item.duration]);

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          backgroundColor: cfg.bgColor,
          borderColor: cfg.borderColor,
          transform: [{ translateY }, { scale }],
          opacity,
          marginTop: index > 0 ? 8 : 0,
        } as any,
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        activeOpacity={0.85}
        onPress={() => onDismiss(item.id)}
      >
        {/* Left circular badge */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.glowColor }]}>
          <cfg.icon size={18} color={cfg.color} />
        </View>

        {/* Text Container */}
        <View style={styles.textWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.toastTitle, { color: cfg.textColor }]} numberOfLines={1}>
              {item.title}
            </Text>
            {isBalanceNotification && (
              <View style={{ backgroundColor: 'rgba(0, 218, 243, 0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#00daf3', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 }}>SYNCED</Text>
              </View>
            )}
          </View>
          {!!item.message && (
            <Text style={[styles.toastMessage, { color: cfg.messageColor }]} numberOfLines={2}>
              {item.message}
            </Text>
          )}
        </View>

        {/* Dismiss '✕' button */}
        <View style={styles.closeWrap}>
          <CloseIcon size={14} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Toast Container (rendered at app root) ───────────────────
export default function GlobalToastContainer() {
  const { items, dismiss } = useToast();

  if (items.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {items.map((item, i) => (
        <SingleToast key={item.id} item={item} index={i} onDismiss={dismiss} />
      ))}
    </View>
  );
}

// ─── Styles (Matching Image 5) ────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
  } as any,
  toastCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  toastTitle: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: -0.2,
  },
  toastMessage: {
    color: '#8b93a7',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },
  closeWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
