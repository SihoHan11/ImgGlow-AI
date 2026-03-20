import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MODES } from '../constants/modes';
import { COLORS, SHADOW } from '../constants/theme';

export default function ModeSelector({ selectedMode, onSelect }) {
  return (
    <View style={styles.container}>
      {MODES.map((mode) => {
        const active = selectedMode === mode.key;

        return (
          <Pressable
            key={mode.key}
            onPress={() => onSelect(mode.key)}
            style={[styles.card, active && styles.cardActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{mode.label}</Text>
            <Text style={[styles.description, active && styles.descriptionActive]}>
              {mode.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    ...SHADOW,
  },
  cardActive: {
    backgroundColor: COLORS.surfaceStrong,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  labelActive: {
    color: COLORS.neutral,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  descriptionActive: {
    color: COLORS.accent,
  },
});
