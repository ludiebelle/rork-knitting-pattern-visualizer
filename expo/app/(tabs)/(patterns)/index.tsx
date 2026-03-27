import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Grid3x3, Trash2, ChevronRight, Scissors, Star, Plus } from 'lucide-react-native';
import { usePatterns } from '@/contexts/PatternContext';
import { SavedPattern } from '@/types/pattern';
import colors from '@/constants/colors';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function timeAgo(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
}

const PatternCard = React.memo(({ pattern, onPress, onDelete, onToggleStar }: {
  pattern: SavedPattern;
  onPress: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}) => {
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Pattern',
      `Remove "${pattern.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  }, [pattern.title, onDelete]);

  const isStarred = pattern.starred ?? false;
  const lastUpdated = pattern.updatedAt || pattern.createdAt;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.card}
      testID={`pattern-card-${pattern.id}`}
    >
      <View style={styles.cardIcon}>
        <Grid3x3 size={24} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{pattern.title}</Text>
        <Text style={styles.cardMeta}>
          {pattern.rows.length} rows · {(() => { const idx = pattern.rows.findIndex(r => r.id === pattern.currentRow); return idx >= 0 ? `Step ${idx + 1}` : 'Step 1'; })()} of {pattern.rows.length}
        </Text>
        <View style={styles.timestampRow}>
          <Text style={styles.cardDate}>{formatDate(pattern.createdAt)} · {formatTime(pattern.createdAt)}</Text>
          {lastUpdated !== pattern.createdAt && (
            <Text style={styles.updatedText}>· edited {timeAgo(lastUpdated)}</Text>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={onToggleStar}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionBtn}
          testID={`star-${pattern.id}`}
        >
          <Star
            size={18}
            color={isStarred ? '#F5A623' : colors.textTertiary}
            fill={isStarred ? '#F5A623' : 'none'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionBtn}
          testID={`delete-${pattern.id}`}
        >
          <Trash2 size={16} color={colors.danger} />
        </TouchableOpacity>
        <ChevronRight size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
});

export default function PatternsScreen() {
  const router = useRouter();
  const { patterns, deletePattern, toggleStar, isLoading } = usePatterns();

  const sortedPatterns = useMemo(() => {
    const starred = patterns.filter(p => p.starred);
    const unstarred = patterns.filter(p => !p.starred);
    starred.sort((a, b) => b.updatedAt - a.updatedAt);
    unstarred.sort((a, b) => b.updatedAt - a.updatedAt);
    return [...starred, ...unstarred];
  }, [patterns]);

  const handlePatternPress = useCallback((id: string) => {
    router.push(`/pattern/${id}` as any);
  }, [router]);

  const handleDeletePattern = useCallback((id: string) => {
    deletePattern(id);
  }, [deletePattern]);

  const handleToggleStar = useCallback((id: string) => {
    toggleStar(id);
  }, [toggleStar]);

  const renderItem = useCallback(({ item }: { item: SavedPattern }) => (
    <PatternCard
      pattern={item}
      onPress={() => handlePatternPress(item.id)}
      onDelete={() => handleDeletePattern(item.id)}
      onToggleStar={() => handleToggleStar(item.id)}
    />
  ), [handlePatternPress, handleDeletePattern, handleToggleStar]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>My Patterns</Text>
        <TouchableOpacity style={styles.newPatternBtn} onPress={() => router.push('/create/new-pattern' as any)} testID="new-pattern-btn">
          <Plus size={18} color="#fff" />
          <Text style={styles.newPatternBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      {sortedPatterns.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Scissors size={48} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Patterns Yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + tab to create your first visual knitting chart
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedPatterns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  listTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.text,
  },
  newPatternBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newPatternBtnText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  separator: {
    height: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
  },
  cardDate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  updatedText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  cardActions: {
    alignItems: 'center',
    gap: 8,
    flexDirection: 'row',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
