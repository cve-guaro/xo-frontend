// components/rps/ChoiceRow.tsx
// ────────────────────────────────────────────────────────────────────────────
// Accessible 3-Choice selector (Rock, Paper, Scissors) and LockInButton.
// Conforms strictly to .ux-profile.md:
// - Generous touch targets (>44px)
// - Glow reserved for the single selected choice
// - Uses theme tokens (no hardcoded hexes)
// ────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { Choice, Phase } from '../../lib/rps/rpsTypes';
import { capitalize } from '../../lib/rps/rpsEngine';
import { colors } from '../../theme/tokens';

interface ChoiceRowProps {
  selected: Choice | null;
  locked: boolean;
  disabled: boolean;
  onSelect: (choice: Choice) => void;
}

const CHOICES: { id: Choice; label: string }[] = [
  { id: 'rock', label: 'Rock' },
  { id: 'paper', label: 'Paper' },
  { id: 'scissors', label: 'Scissors' },
];

export const ChoiceRow: React.FC<ChoiceRowProps> = ({
  selected,
  locked,
  disabled,
  onSelect,
}) => {
  const handlePress = (choice: Choice) => {
    if (disabled || locked) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onSelect(choice);
  };

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {CHOICES.map((item) => {
        const isSelected = selected === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            disabled={disabled || locked}
            onPress={() => handlePress(item.id)}
            style={[
              styles.choiceCard,
              isSelected && styles.choiceCardSelected,
              locked && isSelected && styles.choiceCardLocked,
              disabled && styles.choiceCardDisabled,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: disabled || locked }}
            accessibilityLabel={`${item.label} choice`}
          >
            <View
              style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
              ]}
            >
              {item.id === 'rock' ? (
                <FontAwesome5
                  name="hand-rock"
                  size={28}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              ) : item.id === 'paper' ? (
                <FontAwesome5
                  name="hand-paper"
                  size={28}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              ) : (
                <FontAwesome5
                  name="hand-scissors"
                  size={28}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              )}
            </View>
            <Text
              style={[
                styles.choiceLabel,
                isSelected && styles.choiceLabelSelected,
              ]}
            >
              {item.label}
            </Text>
            {locked && isSelected && (
              <View style={styles.lockedBadge}>
                <Feather name="lock" size={10} color={colors.text} />
                <Text style={styles.lockedText}>Locked</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── LockInButton ────────────────────────────────────────────────────────────
interface LockInButtonProps {
  phase: Phase;
  selected: Choice | null;
  locked: boolean;
  onLock: () => void;
}

export const LockInButton: React.FC<LockInButtonProps> = ({
  phase,
  selected,
  locked,
  onLock,
}) => {
  const isEnabled = phase === 'choose' && selected !== null && !locked;

  const handleLock = () => {
    if (!isEnabled) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onLock();
  };

  if (phase !== 'choose' && phase !== 'locked') {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!isEnabled}
      onPress={handleLock}
      style={[
        styles.lockButton,
        isEnabled && styles.lockButtonEnabled,
        locked && styles.lockButtonLocked,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        locked
          ? 'Choice locked, waiting for opponent'
          : selected
          ? `Lock in ${selected}`
          : 'Select a move first'
      }
    >
      <Text
        style={[
          styles.lockButtonText,
          isEnabled && styles.lockButtonTextEnabled,
        ]}
      >
        {locked
          ? 'Choice locked'
          : selected
          ? `Lock in ${capitalize(selected)}`
          : 'Select a move'}
      </Text>
      {locked && (
        <Feather name="check-circle" size={16} color={colors.success} style={{ marginLeft: 6 }} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  choiceCard: {
    flex: 1,
    maxWidth: 124,
    height: 112,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  choiceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tintPrimary,
  },
  choiceCardLocked: {
    borderColor: colors.success,
    backgroundColor: colors.tintSuccess,
  },
  choiceCardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: colors.tintPrimaryStrong,
  },
  choiceLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceLabelSelected: {
    color: colors.text,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lockedText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  lockButton: {
    minHeight: 48,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: colors.cardRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  lockButtonEnabled: {
    backgroundColor: colors.primary,
    borderColor: colors.primarySoft,
  },
  lockButtonLocked: {
    backgroundColor: colors.tintSuccess,
    borderColor: colors.success,
  },
  lockButtonText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '800',
  },
  lockButtonTextEnabled: {
    color: colors.bgDeep,
  },
});
