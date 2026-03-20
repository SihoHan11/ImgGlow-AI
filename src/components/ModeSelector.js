import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MODES } from '../constants/modes';
import { COLORS, SHADOW } from '../constants/theme';

export default function ModeSelector({ selectedMode, onSelect }) {
  const activeMode = MODES.find((mode) => mode.key === selectedMode) || MODES[0];
  const inactiveModes = MODES.filter((mode) => mode.key !== activeMode.key);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onSelect(activeMode.key)}
        style={[styles.card, styles.featuredCard, styles.cardActive]}
      >
        <View style={styles.featuredHeader}>
          <Text style={styles.eyebrow}>SELECTED MODE</Text>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>AI</Text>
          </View>
        </View>
        <Text style={[styles.label, styles.labelActive, styles.featuredLabel]}>{activeMode.label}</Text>
        <Text style={[styles.description, styles.descriptionActive, styles.featuredDescription]}>
          {activeMode.description}
        </Text>
      </Pressable>

      <View style={styles.grid}>
        {inactiveModes.map((mode) => (
          <Pressable
            key={mode.key}
            onPress={() => onSelect(mode.key)}
            style={[styles.card, styles.smallCard]}
          >
            <Text style={styles.smallEyebrow}>MODE</Text>
            <Text style={styles.label}>{mode.label}</Text>
            <Text style={styles.description}>{mode.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(236, 224, 215, 0.06)',
    ...SHADOW,
  },
  cardActive: {
    backgroundColor: '#342720',
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.4,
  },
  featuredCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.2,
  },
  featuredBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191, 4, 54, 0.24)',
  },
  featuredBadgeText: {
    color: COLORS.neutral,
    fontWeight: '800',
    fontSize: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  labelActive: {
    color: COLORS.neutral,
  },
  featuredLabel: {
    fontSize: 22,
    lineHeight: 28,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  descriptionActive: {
    color: COLORS.accent,
  },
  featuredDescription: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '75%',
  },
  grid: {
    flexDirection: 'row',
    gap: 14,
  },
  smallCard: {
    flex: 1,
    minHeight: 112,
    justifyContent: 'flex-end',
  },
  smallEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSoft,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
});
