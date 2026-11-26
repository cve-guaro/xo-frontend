// components/ui — atomic design system
// Atoms only. Screens compose these; they do not rest- style buttons/inputs/cards.
export { AppText } from './AppText';
export type { AppTextProps, AppTextRole } from './AppText';

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { Input } from './Input';
export type { InputProps } from './Input';

export { default as Avatar } from './Avatar';
export type { AvatarProps, AvatarSize } from './Avatar';

export { Confetti, ConfettiButton, triggerWinCelebration, fireConfetti } from './confetti';
export type { ConfettiOptions, ConfettiRef } from './confetti';