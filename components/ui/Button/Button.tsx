import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebPressable } from '../../WebPressable';
import { colors } from '../../../theme/tokens';
import { ButtonProps } from './Button.types';
import { styles } from './Button.styles';

const sizeHeight = { sm: styles.sm.height, md: styles.md.height, lg: styles.lg.height } as const;
const sizeLabel = { sm: styles.labelSm, md: styles.label, lg: styles.labelLg } as const;
const sizePx = { sm: styles.sm, md: styles.md, lg: styles.lg } as const;

function resolveVariant(variant: ButtonProps['variant']) {
  switch (variant) {
    case 'gold':
      return { grad: colors.gradGold, text: '#231603', border: 'rgba(255,255,255,0.20)', bg: null };
    case 'outlineGold':
      return { grad: null, text: colors.goldSoft, border: 'rgba(245, 182, 66, 0.34)', bg: 'rgba(245, 182, 66, 0.08)' };
    case 'telegram':
      return { grad: colors.gradTelegram, text: '#FFFFFF', border: 'rgba(255,255,255,0.16)', bg: null };
    case 'danger':
      return { grad: colors.gradDanger, text: '#FFFFFF', border: 'rgba(255,255,255,0.14)', bg: null };
    case 'success':
      return { grad: colors.gradSuccess, text: '#FFFFFF', border: 'rgba(255,255,255,0.14)', bg: null };
    case 'ghost':
      return { grad: null, text: colors.text, border: colors.borderStrong, bg: colors.cardRaised };
    case 'primary':
    default:
      return { grad: colors.gradCta, text: '#04222B', border: 'rgba(255,255,255,0.18)', bg: null };
  }
}

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  fullWidth,
}: ButtonProps) {
  const { grad, text, border, bg } = resolveVariant(variant);
  const height = sizeHeight[size];
  const labelStyle = sizeLabel[size];
  const sizeStyle = sizePx[size];

  return (
    <WebPressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeScale={0.97}
      hoverScale={1.01}
      style={({ pressed }) => [
        styles.wrap,
        { height, opacity: disabled ? 0.45 : pressed ? 0.94 : 1 },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {grad ? (
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.inner, sizeStyle, { borderWidth: 1, borderColor: border }]}
        >
          {!!icon && <Ionicons name={icon} size={18} color={text} />}
          <Text style={[labelStyle, { color: text }]} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.inner,
            sizeStyle,
            { backgroundColor: bg || colors.cardRaised, borderWidth: 1, borderColor: border },
          ]}
        >
          {!!icon && (
            <Ionicons
              name={icon}
              size={18}
              color={variant === 'ghost' ? colors.textSoft : text}
            />
          )}
          <Text style={[labelStyle, { color: text }]} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </WebPressable>
  );
}