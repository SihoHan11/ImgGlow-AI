import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  compact = false,
  style,
  labelStyle,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? COLORS.text : '#ffffff'} />
      ) : (
        <Text
          style={[
            styles.label,
            compact && styles.labelCompact,
            (variant === 'secondary' || variant === 'ghost') && styles.labelSecondary,
            variant === 'danger' && styles.labelDanger,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    ...SHADOW,
  },
  buttonCompact: {
    minHeight: 46,
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    backgroundColor: COLORS.surfaceStrong,
    borderWidth: 1,
    borderColor: 'rgba(217, 160, 175, 0.18)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(217, 160, 175, 0.28)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDanger: {
    backgroundColor: 'rgba(191, 4, 54, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.22)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    backgroundColor: '#5F5550',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 15,
  },
  labelSecondary: {
    color: COLORS.text,
  },
  labelDanger: {
    color: COLORS.danger,
  },
});
