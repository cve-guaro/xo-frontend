import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { CheckmarkCircleIcon, AlertCircleIcon, InfoIcon, WarningIcon, CloseIcon } from './SvgIcons';
import { useToast, ToastItem, ToastVariant } from '../context/ToastContext';

// ─── Variant Configs ──────────────────────────────────────────
const VARIANT_CONFIG: Record<ToastVariant, {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  success: {
    icon: CheckmarkCircleIcon,
    color: '#34d399',
    bgColor: '#10162a',
    borderColor: 'rgba(52, 211, 153, 0.45)',
    glowColor: 'rgba(52, 211, 153, 0.2)',
  },
  error: {
    icon: AlertCircleIcon,
    color: '#fb7185',
    bgColor: '#151326',
    borderColor: 'rgba(244, 63, 94, 0.45)',
    glowColor: 'rgba(244, 63, 94, 0.2)',
  },
  info: {
    icon: InfoIcon,
    color: '#60a5fa',
    bgColor: '#10162a',
    borderColor: 'rgba(96, 165, 250, 0.45)',
    glowColor: 'rgba(96, 165, 250, 0.2)',
  },
  warning: {
    icon: WarningIcon,
    color: '#fbbf24',
    bgColor: '#18161d',
    borderColor: 'rgba(251, 191, 36, 0.45)',
    glowColor: 'rgba(251, 191, 36, 0.2)',
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
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const cfg = VARIANT_CONFIG[item.variant];

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        speed: 14,
        bounciness: 4,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 14,
        bounciness: 4,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => onDismiss(item.id));
    }, item.duration || 3000);

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
        },
      ]}
    >
      {/* Glow accent */}
      <View style={[styles.glowStrip, { backgroundColor: cfg.color }]} />

      <TouchableOpacity
        style={styles.toastContent}
        activeOpacity={0.8}
        onPress={() => onDismiss(item.id)}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.glowColor }]}>
          <cfg.icon size={20} color={cfg.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.toastTitle, { color: cfg.color }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.message && (
            <Text style={styles.toastMessage} numberOfLines={2}>
              {item.message}
            </Text>
          )}
        </View>
        <CloseIcon size={16} color="rgba(255,255,255,0.3)" />
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

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 54,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
  } as any,
  toastCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 20,
  },
  glowStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 16,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  toastMessage: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
});
