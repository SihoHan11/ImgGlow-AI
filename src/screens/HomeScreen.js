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
        <View style={styles.topBar}>
          <View style={styles.brandGroup}>
            <View style={styles.brandMark} />
            <Text style={styles.brandText}>ImgGlow AI</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>AI STUDIO</Text>
          <Text style={styles.title}>모바일에서 바로 실행하는 AI 이미지 보정</Text>
          <Text style={styles.subtitle}>
            업스케일, 디블러, 배경 제거 기능을 선택하고 서버 기반 AI 파이프라인으로 결과를 확인하세요.
          </Text>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureChip}>
            <Text style={styles.featureChipText}>4K 업스케일</Text>
          </View>
          <View style={styles.featureChip}>
            <Text style={styles.featureChipText}>흔들림 보정</Text>
          </View>
          <View style={styles.featureChip}>
            <Text style={styles.featureChipText}>배경 분리</Text>
          </View>
        </View>

        <ImageCard
          title="선택한 이미지"
          uri={selectedImage?.uri}
          emptyMessage="아직 선택된 이미지가 없습니다."
        />

        <View style={styles.actionRow}>
          <PrimaryButton
            label="이미지 선택"
            onPress={handlePickImage}
            compact
            style={styles.actionButton}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>처리 기능 선택</Text>
            <PrimaryButton
              label="기록"
              onPress={() => navigation.navigate('History')}
              variant="ghost"
              compact
              style={styles.historyButton}
            />
          </View>
          <ModeSelector selectedMode={selectedMode} onSelect={setSelectedMode} />
        </View>

        <PrimaryButton
          label="AI 처리 실행"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedImage}
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
    padding: 14,
    gap: 14,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primaryDark,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  hero: {
    gap: 6,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(217, 160, 175, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217, 160, 175, 0.16)',
  },
  featureChipText: {
    color: COLORS.neutral,
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    gap: 0,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  historyButton: {
    minWidth: 76,
  },
});
