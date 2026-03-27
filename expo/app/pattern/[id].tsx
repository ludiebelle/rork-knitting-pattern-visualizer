import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ChevronUp,
  ChevronDown,
  RotateCcw,
  FileText,
  Eye,
  EyeOff,
  Menu,
  Home,
  ArrowLeft,
  X,
  Plus,
  MapPin,
  Trash2,
  Repeat,
  Minus,
  Pencil,
  Palette,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePatterns } from '@/contexts/PatternContext';
import StitchGrid from '@/components/StitchGrid';
import StitchLegend from '@/components/StitchLegend';
import { parsePatternText } from '@/utils/patternParser';
import colors from '@/constants/colors';

export default function PatternViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPattern, updatePattern, setActiveMarker, clearActiveMarker, setTotalRepeats, setCurrentRepeat } = usePatterns();
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showSource, setShowSource] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [editVisible, setEditVisible] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [titleDraft, setTitleDraft] = useState<string>('');

  const pattern = useMemo(() => getPattern(id ?? ''), [getPattern, id]);

  const handleRowPress = useCallback((rowId: string) => {
    if (!pattern) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePattern(pattern.id, { currentRow: rowId });
  }, [pattern, updatePattern]);

  const handleCellPress = useCallback((rowId: string, cellIndex: number) => {
    if (!pattern) return;
    setActiveMarker(pattern.id, rowId, cellIndex);
  }, [pattern, setActiveMarker]);

  const handleCellLongPress = useCallback((_rowId: string, _cellIndex: number) => {
    if (!pattern) return;
    clearActiveMarker(pattern.id);
  }, [pattern, clearActiveMarker]);

  const handleClearMarker = useCallback(() => {
    if (!pattern) return;
    if (!pattern.activeMarker) return;
    clearActiveMarker(pattern.id);
  }, [pattern, clearActiveMarker]);

  const [editTitle, setEditTitle] = useState<string>('');

  const handleOpenEdit = useCallback(() => {
    if (!pattern) return;
    setEditText(pattern.sourceText);
    setEditTitle(pattern.title);
    setEditVisible(true);
  }, [pattern]);

  const handleSaveEdit = useCallback(() => {
    if (!pattern) return;
    const parsed = parsePatternText(editText);
    const newTitle = editTitle.trim() || pattern.title;
    updatePattern(pattern.id, {
      title: newTitle,
      sourceText: editText,
      rows: parsed.rows,
      usedStitches: parsed.usedStitches,
      notes: parsed.notes,
    });
    setEditVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pattern, editText, editTitle, updatePattern]);

  const currentRowIndex = useMemo(() => {
    if (!pattern) return 0;
    const idx = pattern.rows.findIndex((r) => r.id === pattern.currentRow);
    return idx >= 0 ? idx : 0;
  }, [pattern]);

  const handleNextRow = useCallback(() => {
    if (!pattern) return;
    if (currentRowIndex < pattern.rows.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updatePattern(pattern.id, { currentRow: pattern.rows[currentRowIndex + 1].id });
    }
  }, [pattern, updatePattern, currentRowIndex]);

  const handlePrevRow = useCallback(() => {
    if (!pattern) return;
    if (currentRowIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updatePattern(pattern.id, { currentRow: pattern.rows[currentRowIndex - 1].id });
    }
  }, [pattern, updatePattern, currentRowIndex]);

  const handleReset = useCallback(() => {
    if (!pattern) return;
    Alert.alert('Reset Progress', 'Go back to row 1, clear marker, and reset repeats?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          const firstRowId = pattern.rows.length > 0 ? pattern.rows[0].id : '';
          updatePattern(pattern.id, { currentRow: firstRowId, activeMarker: null, currentRepeat: 1 });
        },
      },
    ]);
  }, [pattern, updatePattern]);

  const handleTotalRepeatsChange = useCallback((text: string) => {
    if (!pattern) return;
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1) {
      setTotalRepeats(pattern.id, num);
    }
  }, [pattern, setTotalRepeats]);

  const handleIncrementRepeat = useCallback(() => {
    if (!pattern) return;
    const current = pattern.currentRepeat || 1;
    const total = pattern.totalRepeats || 1;
    if (current < total) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentRepeat(pattern.id, current + 1);
    }
  }, [pattern, setCurrentRepeat]);

  const handleDecrementRepeat = useCallback(() => {
    if (!pattern) return;
    const current = pattern.currentRepeat || 1;
    if (current > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentRepeat(pattern.id, current - 1);
    }
  }, [pattern, setCurrentRepeat]);

  if (!pattern) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text style={styles.errorText}>Pattern not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeRowIndex = pattern.rows.findIndex((r) => r.id === pattern.currentRow);
  const safeRowIndex = activeRowIndex >= 0 ? activeRowIndex : 0;
  const activeRow = pattern.rows[safeRowIndex];
  const totalRows = pattern.rows.length;
  const progress = totalRows > 1 ? (safeRowIndex / (totalRows - 1)) * 100 : 0;
  const isFirstRow = safeRowIndex <= 0;
  const isLastRow = safeRowIndex >= totalRows - 1;
  const hasMarker = !!pattern.activeMarker;
  const totalRepeats = pattern.totalRepeats || 1;
  const currentRepeat = pattern.currentRepeat || 1;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: pattern.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMenuVisible(true);
              }}
              style={styles.menuButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="menu-button"
            >
              <Menu size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editPanel}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Pattern</Text>
              <View style={styles.editHeaderButtons}>
                <TouchableOpacity
                  onPress={() => setEditVisible(false)}
                  style={styles.editCancelBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  style={styles.editSaveBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.editSaveText}>Save & Update</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.editTitleSection}>
              <Text style={styles.editTitleLabel}>Pattern Name</Text>
              <TextInput
                style={styles.editTitleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Pattern name"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                testID="edit-pattern-title-input"
              />
            </View>
            <Text style={styles.editPatternLabel}>Pattern Text</Text>
            <TextInput
              style={styles.editTextInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus={false}
              placeholder="Enter knitting pattern text..."
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="top"
              testID="edit-pattern-input"
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Options</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.back();
              }}
            >
              <ArrowLeft size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Back to Patterns</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/');
              }}
            >
              <Home size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/(tabs)/create' as never);
              }}
            >
              <Plus size={20} color={colors.text} />
              <Text style={styles.menuItemText}>New Pattern</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/(tabs)/design' as never);
              }}
            >
              <Palette size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Design Canvas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleOpenEdit();
              }}
            >
              <Pencil size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Edit Pattern</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setShowSource(!showSource);
              }}
            >
              <FileText size={20} color={colors.text} />
              <Text style={styles.menuItemText}>{showSource ? 'Hide Source' : 'Show Source'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setShowLegend(!showLegend);
              }}
            >
              {showLegend ? <EyeOff size={20} color={colors.text} /> : <Eye size={20} color={colors.text} />}
              <Text style={styles.menuItemText}>{showLegend ? 'Hide Legend' : 'Show Legend'}</Text>
            </TouchableOpacity>

            {hasMarker && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  handleClearMarker();
                }}
              >
                <Trash2 size={20} color={colors.accent} />
                <Text style={[styles.menuItemText, { color: colors.accent }]}>Clear Marker</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleReset();
              }}
            >
              <RotateCcw size={20} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Reset Progress</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {editingTitle ? (
        <View style={styles.patternNameContainer}>
          <View style={styles.titleEditRow}>
            <TextInput
              style={styles.titleEditInput}
              value={titleDraft}
              onChangeText={setTitleDraft}
              autoFocus
              selectTextOnFocus
              onBlur={() => {
                if (titleDraft.trim()) {
                  updatePattern(pattern.id, { title: titleDraft.trim() });
                }
                setEditingTitle(false);
              }}
              onSubmitEditing={() => {
                if (titleDraft.trim()) {
                  updatePattern(pattern.id, { title: titleDraft.trim() });
                }
                setEditingTitle(false);
              }}
              returnKeyType="done"
              testID="pattern-title-input"
            />
            <Pressable
              onPress={() => {
                if (titleDraft.trim()) {
                  updatePattern(pattern.id, { title: titleDraft.trim() });
                }
                setEditingTitle(false);
              }}
              style={styles.titleDoneBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.titleDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.patternNameContainer}
          onPress={() => {
            console.log('Title tapped, entering edit mode');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTitleDraft(pattern.title);
            setEditingTitle(true);
          }}
          testID="pattern-title-press"
        >
          <View style={styles.titleDisplayRow} pointerEvents="none">
            <Text style={styles.patternNameText} numberOfLines={1}>{pattern.title}</Text>
            <Pencil size={13} color={colors.textTertiary} />
          </View>
        </Pressable>
      )}

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
      </View>

      <View style={styles.rowIndicator}>
        <Text style={styles.rowIndicatorValue}>{pattern.title}</Text>
        <Text style={styles.rowIndicatorTotal}>({activeRow?.label ?? 'Row 1'} — {safeRowIndex + 1}/{totalRows})</Text>
        {hasMarker && (
          <View style={styles.markerBadge}>
            <MapPin size={12} color="#00FF88" />
            <Text style={styles.markerBadgeText}>Saved</Text>
          </View>
        )}
      </View>

      <View style={styles.topActionBar}>
        <TouchableOpacity
          style={styles.topActionBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
          testID="back-to-patterns-btn"
        >
          <ArrowLeft size={13} color={colors.primary} />
          <Text style={styles.topActionBtnText}>My Patterns</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topActionBtn}
          onPress={handleOpenEdit}
          activeOpacity={0.7}
        >
          <Pencil size={13} color={colors.primary} />
          <Text style={styles.topActionBtnText}>Edit Pattern</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
      >
        {showSource && (
          <View style={styles.sourceContainer}>
            <Text style={styles.sourceTitle}>Source Pattern</Text>
            <ScrollView style={styles.sourceScroll} nestedScrollEnabled>
              <Text style={styles.sourceText}>{pattern.sourceText}</Text>
            </ScrollView>
          </View>
        )}

        {pattern.notes.length > 0 && (
          <View style={styles.notesContainer}>
            {pattern.notes.map((note, idx) => (
              <Text key={idx} style={styles.noteText}>{note}</Text>
            ))}
          </View>
        )}

        <View style={styles.gridContainer}>
          <StitchGrid
            rows={pattern.rows}
            currentRow={pattern.currentRow}
            activeMarker={pattern.activeMarker ?? null}
            onRowPress={handleRowPress}
            onCellPress={handleCellPress}
            onCellLongPress={handleCellLongPress}
          />
        </View>

        {showLegend && (
          <View style={styles.legendContainer}>
            <StitchLegend usedStitches={pattern.usedStitches} />
          </View>
        )}

        <View style={styles.repeatSection}>
          <View style={styles.repeatRow}>
            <View style={styles.repeatLeft}>
              <Repeat size={16} color={colors.primary} />
              <Text style={styles.repeatLabel}>Total Repeats</Text>
            </View>
            <TextInput
              style={styles.repeatInput}
              value={String(totalRepeats)}
              onChangeText={handleTotalRepeatsChange}
              keyboardType="number-pad"
              selectTextOnFocus
              testID="total-repeats-input"
            />
          </View>
          <View style={styles.repeatTrackerRow}>
            <Text style={styles.currentRepeatLabel}>Current Repeat</Text>
            <View style={styles.repeatControls}>
              <TouchableOpacity
                onPress={handleDecrementRepeat}
                style={[styles.repeatStepBtn, currentRepeat <= 1 && styles.repeatStepBtnDisabled]}
                disabled={currentRepeat <= 1}
                activeOpacity={0.7}
              >
                <Minus size={16} color={currentRepeat <= 1 ? colors.textTertiary : colors.text} />
              </TouchableOpacity>
              <View style={styles.repeatCountContainer}>
                <Text style={styles.repeatCountValue}>{currentRepeat}</Text>
                <Text style={styles.repeatCountTotal}>/ {totalRepeats}</Text>
              </View>
              <TouchableOpacity
                onPress={handleIncrementRepeat}
                style={[styles.repeatStepBtn, currentRepeat >= totalRepeats && styles.repeatStepBtnDisabled]}
                disabled={currentRepeat >= totalRepeats}
                activeOpacity={0.7}
              >
                <Plus size={16} color={currentRepeat >= totalRepeats ? colors.textTertiary : colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.repeatProgressBar}>
              <View style={[styles.repeatProgressFill, { width: `${(currentRepeat / totalRepeats) * 100}%` }]} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePrevRow}
          style={[styles.navButton, isFirstRow && styles.navButtonDisabled]}
          activeOpacity={0.7}
          disabled={isFirstRow}
        >
          <ChevronUp size={20} color={isFirstRow ? colors.textTertiary : '#FFF'} />
          <Text style={[styles.navButtonText, isFirstRow && styles.navButtonTextDisabled]}>
            Prev
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNextRow}
          style={[styles.navButton, styles.navButtonPrimary, isLastRow && styles.navButtonDisabled]}
          activeOpacity={0.7}
          disabled={isLastRow}
        >
          <Text style={[styles.navButtonText, isLastRow && styles.navButtonTextDisabled]}>
            Next
          </Text>
          <ChevronDown size={20} color={isLastRow ? colors.textTertiary : '#FFF'} />
        </TouchableOpacity>
      </View>
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-end' as const,
    paddingTop: 100,
    paddingRight: 16,
  },
  menuPanel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  menuHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
    marginHorizontal: 14,
  },
  patternNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  titleDisplayRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  patternNameText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.text,
    textAlign: 'center' as const,
    flexShrink: 1,
  },
  titleEditRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  titleEditInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.text,
    textAlign: 'center' as const,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
  },
  titleDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  titleDoneText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.borderLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  rowIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
    gap: 5,
  },
  rowIndicatorValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.primary,
    flexShrink: 1,
  },
  rowIndicatorTotal: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500' as const,
  },
  markerBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: '#0D2818',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  markerBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#00FF88',
  },
  sourceContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    maxHeight: 120,
  },
  sourceTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sourceScroll: {
    flex: 1,
  },
  sourceText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  notesContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD54F',
  },
  noteText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 20,
  },
  gridContainer: {
    minHeight: Dimensions.get('window').height * 0.6,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  legendContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  repeatSection: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repeatRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  repeatLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  repeatLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  repeatInput: {
    width: 56,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center' as const,
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  repeatTrackerRow: {
    alignItems: 'center' as const,
  },
  currentRepeatLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  repeatControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginBottom: 8,
  },
  repeatStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repeatStepBtnDisabled: {
    opacity: 0.4,
  },
  repeatCountContainer: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 4,
  },
  repeatCountValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.accent,
  },
  repeatCountTotal: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textTertiary,
  },
  repeatProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    overflow: 'hidden' as const,
  },
  repeatProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  navButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  navButtonPrimary: {
    backgroundColor: colors.accent,
  },
  navButtonDisabled: {
    backgroundColor: colors.borderLight,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  navButtonTextDisabled: {
    color: colors.textTertiary,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editPanel: {
    flex: 1,
    paddingTop: 60,
  },
  editHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
  },
  editHeaderButtons: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  editCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  editSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  editTitleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  editTitleLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  editTitleInput: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editPatternLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  editTextInput: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  topActionBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  topActionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topActionBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
  },
});
