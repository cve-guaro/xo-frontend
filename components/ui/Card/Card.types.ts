import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export type CardVariant = 'default' | 'raised' | 'tintPrimary' | 'tintGold' | 'tintDanger';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}