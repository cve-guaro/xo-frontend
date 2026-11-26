import { StyleSheet } from 'react-native';
import { colors, radius, space } from '../../../theme/tokens';

export const styles = StyleSheet.create({
  container: {
    marginBottom: space.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: space.xs,
  },
  error: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
    marginTop: space.xs,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  fieldWrapError: {
    borderColor: colors.danger,
  },
  icon: {
    marginRight: space.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: space.sm,
  },
  right: {
    marginLeft: space.sm,
  },
});