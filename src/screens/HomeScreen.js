import * as ImagePicker from 'expo-image-picker';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { processImage } from '../api/client';
import ImageCard from '../components/ImageCard';
import ModeSelector from '../components/ModeSelector';
import PrimaryButton from '../components/PrimaryButton';
import { API_GUIDE } from '../constants/api';
import { COLORS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedMode, setSelectedMode] = useState('upscale');
  const [submitting, setSubmitting] = useState(false);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한 필요', '이미지를 선택하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets?.length) {
      setSelectedImage(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!selectedImage) {
      Alert.alert('이미지 필요', '먼저 처리할 이미지를 선택해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await processImage({
        image: selectedImage,
        mode: selectedMode,
      });

      navigation.navigate('Result', {
        job: response,
        selectedImageUri: selectedImage.uri,
      });
    } catch (error) {
      Alert.alert('처리 실패', `${error.message}\n\n${API_GUIDE}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI IMAGE ENHANCEMENT</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>모바일에서 바로 실행하는 AI 이미지 보정 스튜디오</Text>
          <Text style={styles.subtitle}>
            업스케일, 디블러, 배경 제거 기능을 선택하고 서버 기반 AI 파이프라인으로 결과를 확인하세요.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>작업 흐름</Text>
          <Text style={styles.infoText}>1. 이미지 선택</Text>
          <Text style={styles.infoText}>2. 보정 기능 선택</Text>
          <Text style={styles.infoText}>3. 처리 결과 확인 및 저장</Text>
        </View>

        <ImageCard
          title="선택한 이미지"
          uri={selectedImage?.uri}
          emptyMessage="아직 선택된 이미지가 없습니다."
        />

        <PrimaryButton label="이미지 선택" onPress={handlePickImage} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>처리 기능 선택</Text>
          <ModeSelector selectedMode={selectedMode} onSelect={setSelectedMode} />
        </View>

        <PrimaryButton
          label="AI 처리 실행"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedImage}
        />

        <PrimaryButton
          label="작업 기록 보기"
          onPress={() => navigation.navigate('History')}
          variant="secondary"
        />
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceRaised,
  },
  badgeText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hero: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  infoCard: {
    borderRadius: 28,
    padding: 18,
    gap: 6,
    backgroundColor: COLORS.surfaceRaised,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.neutral,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
