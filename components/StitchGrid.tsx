import React, { useMemo, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { PatternRow, expandStitchCells } from '@/utils/patternParser';
import { ActiveMarker } from '@/types/pattern';
import { getStitchById } from '@/constants/stitches';
import colors from '@/constants/colors';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface StitchGridProps {
  rows: PatternRow[];
  currentRow: string;
  activeMarker: ActiveMarker | null;
  onRowPress: (rowId: string) => void;
  onCellPress: (rowId: string, cellIndex: number) => void;
  onCellLongPress: (rowId: string, cellIndex: number) => void;
}

const BASE_CELL_SIZE = 34;
const ROW_LABEL_WIDTH = 56;
const ZOOM_LEVELS = [0.15, 0.25, 0.35, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2.0];
const DEFAULT_ZOOM_INDEX = 6;

const NEON_COLOR = '#00FF88';
const NEON_SHADOW = '#00FF8880';

const StitchCell = React.memo(({ stitchId, cellSize, fontSize, isMarked, onPress, onLongPress }: {
  stitchId: string;
  cellSize: number;
  fontSize: number;
  isMarked: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const stitch = getStitchById(stitchId);
  if (!stitch) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.6}
      style={[
        styles.cell,
        {
          backgroundColor: stitch.color,
          width: cellSize,
          height: cellSize,
          borderRadius: Math.max(2, cellSize * 0.12),
        },
        isMarked && {
          borderWidth: Math.max(2, cellSize * 0.1),
          borderColor: NEON_COLOR,
          ...(Platform.OS !== 'web' ? {
            shadowColor: NEON_COLOR,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 2,
            elevation: 3,
          } : {}),
        },
      ]}
    >
      <Text
        style={[
          styles.cellSymbol,
          { color: stitch.textColor, fontSize },
        ]}
        numberOfLines={1}
      >
        {stitch.symbol}
      </Text>
      {isMarked && Platform.OS === 'web' && (
        <View style={[styles.neonGlowWeb, {
          borderRadius: Math.max(2, cellSize * 0.12),
          borderWidth: Math.max(2, cellSize * 0.1),
        }]} />
      )}
    </TouchableOpacity>
  );
});

const YELLOW_HIGHLIGHT = '#FFD54F';
const YELLOW_HIGHLIGHT_BG = '#FFF8E1';

const StitchGridRow = React.memo(({ row, isActive, cellSize, activeMarkerKey, hasMarkerInRow, isFaded, onRowPress, onCellPress, onCellLongPress }: {
  row: PatternRow;
  isActive: boolean;
  cellSize: number;
  activeMarkerKey: string | null;
  hasMarkerInRow: boolean;
  isFaded: boolean;
  onRowPress: () => void;
  onCellPress: (rowId: string, cellIndex: number) => void;
  onCellLongPress: (rowId: string, cellIndex: number) => void;
}) => {
  const expandedStitches = useMemo(() => expandStitchCells(row.stitches), [row.stitches]);
  const fontSize = Math.max(8, cellSize * 0.42);
  const labelFontSize = Math.max(8, Math.min(12, cellSize * 0.38));
  const showSymbols = cellSize >= 12;

  return (
    <View style={[styles.gridRow, isActive && styles.gridRowActive, hasMarkerInRow && styles.gridRowMarked, isFaded && styles.gridRowFaded]}>
      <TouchableOpacity
        onPress={onRowPress}
        activeOpacity={0.7}
        style={[styles.rowLabel, isActive && styles.rowLabelActive, { height: cellSize + 6, minWidth: Math.max(32, ROW_LABEL_WIDTH * Math.min(1, cellSize / BASE_CELL_SIZE)) }]}
      >
        <Text style={[styles.rowLabelText, isActive && styles.rowLabelTextActive, { fontSize: labelFontSize }]} numberOfLines={1}>
          {row.label}
        </Text>
      </TouchableOpacity>
      <View style={styles.cellsContainer}>
        {expandedStitches.map((stitchId, idx) => {
          const markKey = `${row.id}:${idx}`;
          const isMarked = activeMarkerKey === markKey;

          if (!showSymbols) {
            const stitch = getStitchById(stitchId);
            if (!stitch) return null;
            return (
              <TouchableOpacity
                key={`${row.id}-${idx}`}
                onPress={() => onCellPress(row.id, idx)}
                onLongPress={() => onCellLongPress(row.id, idx)}
                delayLongPress={500}
                activeOpacity={0.6}
                style={[
                  {
                    backgroundColor: stitch.color,
                    width: cellSize,
                    height: cellSize,
                    borderRadius: Math.max(1, cellSize * 0.1),
                    borderWidth: isMarked ? Math.max(2, cellSize * 0.12) : 0.5,
                    borderColor: isMarked ? NEON_COLOR : 'rgba(0,0,0,0.08)',
                  },
                ]}
              />
            );
          }

          return (
            <StitchCell
              key={`${row.id}-${idx}`}
              stitchId={stitchId}
              cellSize={cellSize}
              fontSize={fontSize}
              isMarked={isMarked}
              onPress={() => onCellPress(row.id, idx)}
              onLongPress={() => onCellLongPress(row.id, idx)}
            />
          );
        })}
      </View>
    </View>
  );
});

interface SectionGroup {
  section: string;
  rows: PatternRow[];
}

function groupRowsBySections(rows: PatternRow[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let current: SectionGroup | null = null;

  for (const row of rows) {
    if (!current || current.section !== row.section) {
      current = { section: row.section, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }

  return groups;
}

export default function StitchGrid({ rows, currentRow, activeMarker, onRowPress, onCellPress, onCellLongPress }: StitchGridProps) {
  const verticalScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);

  const zoomLevel = ZOOM_LEVELS[zoomIndex];
  const cellSize = Math.max(4, Math.round(BASE_CELL_SIZE * zoomLevel));

  const activeMarkerKey = useMemo(() => {
    if (!activeMarker) return null;
    return `${activeMarker.rowId}:${activeMarker.cellIndex}`;
  }, [activeMarker]);

  const sectionGroups = useMemo(() => groupRowsBySections(rows), [rows]);
  const hasMultipleSections = sectionGroups.length > 1 || (sectionGroups.length === 1 && sectionGroups[0].section !== 'Main');

  const handleRowPress = useCallback((rowId: string) => {
    onRowPress(rowId);
  }, [onRowPress]);

  const handleCellPress = useCallback((rowId: string, cellIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCellPress(rowId, cellIndex);
  }, [onCellPress]);

  const handleCellLongPress = useCallback((rowId: string, cellIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCellLongPress(rowId, cellIndex);
  }, [onCellLongPress]);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleFitAll = useCallback(() => {
    setZoomIndex(0);
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, []);

  if (rows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No rows to display</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.zoomControls}>
        <TouchableOpacity
          onPress={handleFitAll}
          style={styles.zoomButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Minimize2 size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleZoomOut}
          style={[styles.zoomButton, zoomIndex <= 0 && styles.zoomButtonDisabled]}
          disabled={zoomIndex <= 0}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ZoomOut size={14} color={zoomIndex <= 0 ? colors.textTertiary : colors.text} />
        </TouchableOpacity>
        <Text style={styles.zoomLabel}>{Math.round(zoomLevel * 100)}%</Text>
        <TouchableOpacity
          onPress={handleZoomIn}
          style={[styles.zoomButton, zoomIndex >= ZOOM_LEVELS.length - 1 && styles.zoomButtonDisabled]}
          disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ZoomIn size={14} color={zoomIndex >= ZOOM_LEVELS.length - 1 ? colors.textTertiary : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleResetZoom}
          style={styles.zoomButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Maximize2 size={14} color={colors.text} />
        </TouchableOpacity>
      </View>

      {activeMarker && (
        <View style={styles.markerIndicator}>
          <View style={styles.markerDot} />
          <Text style={styles.markerText}>Marker placed • Long press to remove</Text>
        </View>
      )}

      <ScrollView
        ref={verticalScrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
      >
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          nestedScrollEnabled
          contentContainerStyle={styles.horizontalContent}
        >
          <View>
            {sectionGroups.map((group, groupIdx) => (
              <View key={`${group.section}-${groupIdx}`}>
                {hasMultipleSections && (
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionLine} />
                    <Text style={[styles.sectionTitle, { fontSize: Math.max(10, 13 * Math.min(1, zoomLevel)) }]}>{group.section}</Text>
                    <View style={styles.sectionLine} />
                  </View>
                )}
                {group.rows.map((row) => (
                  <StitchGridRow
                    key={row.id}
                    row={row}
                    isActive={row.id === currentRow}
                    cellSize={cellSize}
                    activeMarkerKey={activeMarkerKey}
                    hasMarkerInRow={activeMarker?.rowId === row.id}
                    isFaded={activeMarker != null && activeMarker.rowId !== row.id}
                    onRowPress={() => handleRowPress(row.id)}
                    onCellPress={handleCellPress}
                    onCellLongPress={handleCellLongPress}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
  },
  scrollView: {
    flex: 1,
  },
  horizontalContent: {
    paddingRight: 16,
  },
  zoomControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  zoomButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    minWidth: 36,
    textAlign: 'center' as const,
  },
  markerIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NEON_COLOR,
  },
  markerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontWeight: '700' as const,
    color: colors.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
  gridRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 2,
    borderRadius: 6,
    overflow: 'visible' as const,
    backgroundColor: colors.surface,
  },
  gridRowActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  gridRowMarked: {
    backgroundColor: YELLOW_HIGHLIGHT_BG,
    borderWidth: 2,
    borderColor: YELLOW_HIGHLIGHT,
    borderRadius: 6,
  },
  gridRowFaded: {
    opacity: 0.3,
  },
  rowLabel: {
    width: ROW_LABEL_WIDTH,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surfaceAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  rowLabelActive: {
    backgroundColor: colors.row.activeBorder,
  },
  rowLabelText: {
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  rowLabelTextActive: {
    color: colors.text,
    fontWeight: '700' as const,
  },
  cellsContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 2,
    flexWrap: 'nowrap' as const,
  },
  cell: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    overflow: 'visible' as const,
  },
  cellSymbol: {
    fontWeight: '800' as const,
  },
  neonGlowWeb: {
    position: 'absolute' as const,
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderColor: NEON_SHADOW,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
