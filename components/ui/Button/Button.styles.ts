import { StyleSheet } from 'react-native';
import { colors, radius, space } from '../../../theme/tokens';

export const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inner: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelLg: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sm: { height: 38, paddingHorizontal: space.md },
  md: { height: 44, paddingHorizontal: space.lg },
  lg: { height: 50, paddingHorizontal: space.xl },
  fullWidth: { width: '100%', alignSelf: 'stretch' },
});