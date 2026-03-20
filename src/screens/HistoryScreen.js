import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteHistoryItem, fetchHistory } from '../api/client';
import { COLORS } from '../constants/theme';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ko-KR');
}

function formatType(value) {
  if (value === 'upscale') {
    return '업스케일';
  }

  if (value === 'deblur') {
    return '디블러';
  }

  if (value === 'remove-bg') {
    return '배경 제거';
  }

  return value || '-';
}

function formatStatus(value) {
  if (value === 'completed') {
    return '완료';
  }

  if (value === 'failed') {
    return '실패';
  }

  return '처리 중';
}

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchHistory();
      setHistory(response.items || []);
    } catch (error) {
      Alert.alert('기록 조회 실패', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  async function handleDelete(id) {
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      Alert.alert('삭제 실패', error.message);
    }
  }

  function renderItem({ item }) {
    const completed = item.status === 'completed';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{formatType(item.type)}</Text>
          <View style={[styles.statusBadge, completed ? styles.statusBadgeDone : styles.statusBadgePending]}>
            <Text style={[styles.statusText, completed ? styles.statusTextDone : styles.statusTextPending]}>
              {formatStatus(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>생성: {formatDate(item.createdAt)}</Text>
        <Text style={styles.meta}>원본: {item.originalSize ?? '-'} bytes</Text>
        <Text style={styles.meta}>결과: {item.resultSize ?? '-'} bytes</Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.viewButton]}
            onPress={() =>
              navigation.navigate('Result', {
                job: item,
                selectedImageUri: item.originalImageUrl,
              })
            }
          >
            <Text style={styles.viewButtonText}>열기</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.container}
        data={history}
        keyExtractor={(item) => item.id}
        onRefresh={loadHistory}
        refreshing={loading}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>HISTORY</Text>
            <Text style={styles.headerTitle}>최근 AI 처리 기록</Text>
            <Text style={styles.headerText}>
              완료 여부와 결과 용량을 한 번에 확인하고, 필요한 작업을 다시 열어볼 수 있습니다.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>작업 기록이 없습니다.</Text>
            <Text style={styles.emptyText}>홈 화면에서 이미지를 처리하면 여기에 기록이 쌓입니다.</Text>
          </View>
        }
      />
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
    gap: 16,
    flexGrow: 1,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.accent,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerText: {
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeDone: {
    backgroundColor: 'rgba(255, 179, 173, 0.16)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(217, 160, 175, 0.12)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextDone: {
    color: COLORS.success,
  },
  statusTextPending: {
    color: COLORS.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: 'rgba(191, 4, 54, 0.16)',
  },
  viewButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSoft,
    lineHeight: 22,
  },
});
