import React from 'react';
import { View } from 'react-native';
import { CardProps, CardVariant, CardPadding } from './Card.types';
import { styles } from './Card.styles';

const variantStyle: Record<CardVariant, object> = {
  default: {},
  raised: styles.raised,
  tintPrimary: styles.tintPrimary,
  tintGold: styles.tintGold,
  tintDanger: styles.tintDanger,
};

const padStyle: Record<CardPadding, object> = {
  none: styles.padNone,
  sm: styles.padSm,
  md: styles.padMd,
  lg: styles.padMdLg,
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  contentStyle,
}: CardProps) {
  return (
    <View style={[styles.base, variantStyle[variant], style]}>
      <View style={[styles.content, padStyle[padding], contentStyle]}>
        {children}
      </View>
    </View>
  );
}