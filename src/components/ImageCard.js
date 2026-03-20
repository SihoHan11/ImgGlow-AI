import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function ImageCard({ title, uri, emptyMessage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.mediaShell}>
        <View style={styles.innerShadeTop} pointerEvents="none" />
        <View style={styles.innerShadeBottom} pointerEvents="none" />
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(236, 224, 215, 0.06)',
    ...SHADOW,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  mediaShell: {
    position: 'relative',
    padding: 8,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.24)',
    overflow: 'hidden',
  },
  innerShadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
    zIndex: 2,
  },
  innerShadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
    backgroundColor: 'rgba(236, 224, 215, 0.03)',
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: 188,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceStrong,
  },
  emptyBox: {
    height: 148,
    borderRadius: 20,
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
