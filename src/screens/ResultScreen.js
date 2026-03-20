import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCard from '../components/ImageCard';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/theme';

export default function ResultScreen({ navigation, route }) {
  const { job, selectedImageUri } = route.params ?? {};

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  }

  async function handleSave() {
    if (!job?.resultImageUrl) {
      Alert.alert('저장 불가', '저장할 결과 이미지가 없습니다.');
      return;
    }

    const permission = await MediaLibrary.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한 필요', '결과 이미지를 저장하려면 미디어 라이브러리 권한이 필요합니다.');
      return;
    }

    try {
      const fileUri = `${FileSystem.cacheDirectory}${job.id || Date.now()}.jpg`;
      const downloaded = await FileSystem.downloadAsync(job.resultImageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);
      Alert.alert('저장 완료', '결과 이미지를 갤러리에 저장했습니다.');
    } catch (error) {
      Alert.alert('저장 실패', error.message);
    }
  }

  const statusLabel = job?.status === 'completed' ? '완료' : job?.status === 'failed' ? '실패' : '처리 중';
  const statusTone =
    job?.status === 'completed' ? styles.statusComplete : job?.status === 'failed' ? styles.statusFailed : styles.statusProcessing;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.topBarAction}>
            <Text style={styles.topBarActionText}>{'<'} 뒤로</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>처리 결과</Text>
          <Pressable onPress={() => navigation.navigate('History')} style={styles.topBarAction}>
            <Text style={styles.topBarActionText}>기록</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryInset}>
            <View style={styles.summaryTopRow}>
              <Text style={styles.eyebrow}>RESULT</Text>
              <Text style={[styles.statusPill, statusTone]}>{statusLabel}</Text>
            </View>
            <Text style={styles.summaryTitle}>처리 결과</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>기능</Text>
                <Text style={styles.metaValue}>{job?.type || '-'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>원본</Text>
                <Text style={styles.metaValue}>{job?.originalSize ?? '-'} bytes</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>결과</Text>
                <Text style={styles.metaValue}>{job?.resultSize ?? '-'} bytes</Text>
              </View>
            </View>
            {job?.errorMessage ? <Text style={styles.errorText}>{job.errorMessage}</Text> : null}
          </View>
        </View>

        <ImageCard
          title="원본 이미지"
          uri={selectedImageUri || job?.originalImageUrl}
          emptyMessage="원본 이미지가 없습니다."
        />

        <ImageCard
          title="결과 이미지"
          uri={job?.resultImageUrl}
          emptyMessage="아직 결과 이미지가 없습니다."
        />

        <View style={styles.actionRow}>
          <PrimaryButton
            label="저장"
            onPress={handleSave}
            disabled={!job?.resultImageUrl}
            compact
            style={styles.actionButton}
          />
          <PrimaryButton
            label="기록"
            onPress={() => navigation.navigate('History')}
            variant="secondary"
            compact
            style={styles.actionButton}
          />
          <PrimaryButton
            label="홈"
            onPress={() => navigation.navigate('Home')}
            variant="ghost"
            compact
            style={styles.homeButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 14,
    gap: 14,
    paddingBottom: 20,
  },
  topBar: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  topBarAction: {
    minWidth: 58,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217, 160, 175, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 160, 175, 0.18)',
  },
  topBarActionText: {
    color: COLORS.neutral,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: COLORS.surfaceRaised,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(236, 224, 215, 0.06)',
  },
  summaryInset: {
    borderRadius: 18,
    backgroundColor: COLORS.surfaceMuted,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.22)',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.accent,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(217, 160, 175, 0.08)',
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryTitle: {
    fontSize: 20,
    marginBottom: 12,
    fontWeight: '700',
    color: COLORS.neutral,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(236, 224, 215, 0.03)',
  },
  metaLabel: {
    fontSize: 11,
    marginBottom: 4,
    color: COLORS.textSoft,
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  statusComplete: {
    color: COLORS.success,
  },
  statusFailed: {
    color: COLORS.danger,
  },
  statusProcessing: {
    color: COLORS.neutral,
  },
  errorText: {
    marginTop: 8,
    color: COLORS.danger,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  homeButton: {
    minWidth: 76,
  },
});
