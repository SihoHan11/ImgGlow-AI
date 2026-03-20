import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCard from '../components/ImageCard';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/theme';

export default function ResultScreen({ navigation, route }) {
  const { job, selectedImageUri } = route.params ?? {};

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
        <View style={styles.summaryCard}>
          <Text style={styles.eyebrow}>PROCESS REPORT</Text>
          <Text style={styles.summaryTitle}>처리 상태</Text>
          <Text style={[styles.summaryValue, statusTone]}>{statusLabel}</Text>
          <Text style={styles.metaText}>기능: {job?.type || '-'}</Text>
          <Text style={styles.metaText}>원본 크기: {job?.originalSize ?? '-'} bytes</Text>
          <Text style={styles.metaText}>결과 크기: {job?.resultSize ?? '-'} bytes</Text>
          {job?.errorMessage ? <Text style={styles.errorText}>{job.errorMessage}</Text> : null}
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

        <PrimaryButton label="결과 이미지 저장" onPress={handleSave} disabled={!job?.resultImageUrl} />
        <PrimaryButton label="작업 기록 보기" onPress={() => navigation.navigate('History')} variant="secondary" />
        <PrimaryButton label="홈으로 돌아가기" onPress={() => navigation.navigate('Home')} variant="ghost" />
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
    padding: 20,
    gap: 18,
    paddingBottom: 32,
  },
  summaryCard: {
    borderRadius: 28,
    backgroundColor: COLORS.surfaceRaised,
    padding: 18,
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.accent,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.neutral,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
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
  metaText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorText: {
    marginTop: 8,
    color: COLORS.danger,
    fontSize: 14,
  },
});
