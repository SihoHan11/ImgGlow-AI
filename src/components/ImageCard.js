import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function ImageCard({ title, uri, emptyMessage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    gap: 12,
    ...SHADOW,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceStrong,
  },
  emptyBox: {
    height: 180,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSoft,
    fontSize: 14,
  },
});
