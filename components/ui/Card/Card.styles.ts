import { StyleSheet } from 'react-native';
import { colors, radius, space, elevation } from '../../../theme/tokens';
import type { CardVariant } from './Card.types';

export const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  raised: {
    backgroundColor: colors.cardRaised,
    ...elevation.md,
  },
  tintPrimary: {
    backgroundColor: colors.tintPrimary,
    borderColor: 'rgba(0,218,243,0.25)',
  },
  tintGold: {
    backgroundColor: colors.tintGold,
    borderColor: 'rgba(245,182,66,0.30)',
  },
  tintDanger: {
    backgroundColor: colors.tintDanger,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  content: {
    // base content wrapper — padding applied via style prop
  },
  padNone: { padding: 0 },
  padSm: { padding: space.xs },
  padMd: { padding: space.sm },
  padMdLg: { padding: space.md },
});