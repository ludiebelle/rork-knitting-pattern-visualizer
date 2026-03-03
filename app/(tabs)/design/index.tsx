import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Dimensions,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Eraser,
  Paintbrush,
  Minus,
  Plus,
  Pipette,
  X,
  Trash2,
  Palette,
  Save,
  ChevronLeft,
  Grid3x3,
  Clock,
  PenLine,
  Image as ImageIcon,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import colors from '@/constants/colors';
import { useDesigns } from '@/contexts/DesignContext';
import { SavedDesign, CellData } from '@/types/design';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DEFAULT_GRID_COLS = 20;
const DEFAULT_GRID_ROWS = 30;
const MIN_CELL = 12;
const MAX_CELL = 40;

const PALETTE_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
  '#00897B', '#43A047', '#7CB342', '#C0CA33',
  '#FDD835', '#FFB300', '#FB8C00', '#F4511E',
  '#6D4C41', '#757575', '#546E7A', '#263238',
  '#FFFFFF', '#F5F5F5', '#BDBDBD', '#212121',
  '#FF6F61', '#88B04B', '#F7CAC9', '#92A8D1',
  '#955251', '#B565A7', '#009B77', '#DD4124',
];

const HUE_COLORS = [
  '#FF0000', '#FF4000', '#FF8000', '#FFBF00',
  '#FFFF00', '#BFFF00', '#80FF00', '#40FF00',
  '#00FF00', '#00FF40', '#00FF80', '#00FFBF',
  '#00FFFF', '#00BFFF', '#0080FF', '#0040FF',
  '#0000FF', '#4000FF', '#8000FF', '#BF00FF',
  '#FF00FF', '#FF00BF', '#FF0080', '#FF0040',
];

const SHADE_LEVELS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'];

type ScreenMode = 'list' | 'editor';

function createEmptyGrid(rows: number, cols: number): CellData[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${hours}:${mins}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

interface EditorState {
  name: string;
  cols: number;
  rows: number;
  cells: CellData[][];
  existingId: string | null;
}

export default function DesignScreen() {
  const { designs, addDesign, updateDesign, deleteDesign, toggleDesignStar, requestNewDesign, setRequestNewDesign } = useDesigns();

  const sortedDesigns = useMemo(() => {
    const starred = designs.filter(d => d.starred);
    const unstarred = designs.filter(d => !d.starred);
    starred.sort((a, b) => b.updatedAt - a.updatedAt);
    unstarred.sort((a, b) => b.updatedAt - a.updatedAt);
    return [...starred, ...unstarred];
  }, [designs]);

  const [mode, setMode] = useState<ScreenMode>('list');
  const [editor, setEditor] = useState<EditorState>({
    name: 'My Design',
    cols: DEFAULT_GRID_COLS,
    rows: DEFAULT_GRID_ROWS,
    cells: createEmptyGrid(DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS),
    existingId: null,
  });

  const [activeColor, setActiveColor] = useState<string>('#E53935');
  const [tool, setTool] = useState<'paint' | 'erase' | 'pick'>('paint');
  const [cellSize, setCellSize] = useState<number>(20);
  const [colorPickerVisible, setColorPickerVisible] = useState<boolean>(false);
  const [hexInput, setHexInput] = useState<string>('');
  const [sizeModalVisible, setSizeModalVisible] = useState<boolean>(false);

  const [newCols, setNewCols] = useState<string>(String(DEFAULT_GRID_COLS));
  const [newRows, setNewRows] = useState<string>(String(DEFAULT_GRID_ROWS));

  const [editingName, setEditingName] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>('');

  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [isPixelating, setIsPixelating] = useState<boolean>(false);

  const gridRef = useRef<View>(null);
  const gridOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPaintedRef = useRef<string | null>(null);

  const measureGrid = useCallback(() => {
    if (Platform.OS === 'web' && gridRef.current) {
      try {
        const node = gridRef.current as unknown as { getBoundingClientRect?: () => DOMRect };
        if (node.getBoundingClientRect) {
          const rect = node.getBoundingClientRect();
          gridOriginRef.current = { x: rect.left, y: rect.top };
          return;
        }
      } catch (e) {
        console.log('Web measure fallback error:', e);
      }
    }
    gridRef.current?.measureInWindow((x, y) => {
      gridOriginRef.current = { x, y };
    });
  }, []);

  const totalWidth = editor.cols * cellSize;
  const totalHeight = editor.rows * cellSize;

  useEffect(() => {
    if (requestNewDesign) {
      setRequestNewDesign(false);
      startNewDesign();
    }
  }, [requestNewDesign]);

  const startNewDesign = useCallback(() => {
    setEditor({
      name: 'My Design',
      cols: DEFAULT_GRID_COLS,
      rows: DEFAULT_GRID_ROWS,
      cells: createEmptyGrid(DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS),
      existingId: null,
    });
    setNewCols(String(DEFAULT_GRID_COLS));
    setNewRows(String(DEFAULT_GRID_ROWS));
    setCellSize(20);
    setTool('paint');
    setMode('editor');
  }, []);

  const openDesign = useCallback((design: SavedDesign) => {
    setEditor({
      name: design.name,
      cols: design.cols,
      rows: design.rows,
      cells: design.cells,
      existingId: design.id,
    });
    setNewCols(String(design.cols));
    setNewRows(String(design.rows));
    setCellSize(20);
    setTool('paint');
    setMode('editor');
  }, []);

  const pixelateMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      let base64: string;
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const cols = editor.cols;
      const rows = editor.rows;

      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and convert it into a simplified pixel grid of ${cols} columns by ${rows} rows. For each cell, determine the dominant color and return it as a hex code. Return a JSON object with a "grid" property that is an array of ${rows} arrays, each containing ${cols} hex color strings (like "#FF5733"). Simplify the colors to create a clear, recognizable pixel art version of the image. Use null for cells that should be empty/white.`,
              },
              {
                type: 'image',
                image: `data:image/jpeg;base64,${base64}`,
              },
            ],
          },
        ],
        schema: z.object({
          grid: z.array(z.array(z.string().nullable())),
        }),
      });
      return result;
    },
    onSuccess: (data) => {
      console.log('Pixelation complete, grid rows:', data.grid.length);
      const newCells: CellData[][] = Array.from({ length: editor.rows }, (_, r) =>
        Array.from({ length: editor.cols }, (_, c) => {
          const val = data.grid[r]?.[c];
          if (!val || val === 'null' || val === '#FFFFFF' || val === '#ffffff') return null;
          return val;
        })
      );
      setEditor(prev => ({ ...prev, cells: newCells }));
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      console.log('Pixelation error:', error);
      Alert.alert('Conversion Failed', 'Could not convert the image to a pixel pattern. Try a simpler image or adjust grid size.');
    },
  });

  const handleUploadPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        pixelateMutation.mutate(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
  }, [pixelateMutation]);

  const handleDeleteDesign = useCallback((id: string, name: string) => {
    Alert.alert('Delete Design', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDesign(id) },
    ]);
  }, [deleteDesign]);

  const getCellFromTouch = useCallback((pageX: number, pageY: number): { row: number; col: number } | null => {
    const ox = gridOriginRef.current.x;
    const oy = gridOriginRef.current.y;
    const col = Math.floor((pageX - ox) / cellSize);
    const row = Math.floor((pageY - oy) / cellSize);
    if (row >= 0 && row < editor.rows && col >= 0 && col < editor.cols) {
      return { row, col };
    }
    return null;
  }, [cellSize, editor.rows, editor.cols]);

  const paintCell = useCallback((row: number, col: number) => {
    const key = `${row}-${col}`;
    if (lastPaintedRef.current === key) return;
    lastPaintedRef.current = key;

    setEditor(prev => {
      const newCells = prev.cells.map(r => [...r]);
      if (tool === 'erase') {
        newCells[row][col] = null;
      } else if (tool === 'pick') {
        const picked = newCells[row][col];
        if (picked) {
          setActiveColor(picked);
          setTool('paint');
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        return prev;
      } else {
        newCells[row][col] = activeColor;
      }
      return { ...prev, cells: newCells };
    });
  }, [tool, activeColor]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      lastPaintedRef.current = null;
      measureGrid();
      const { pageX, pageY } = evt.nativeEvent;
      requestAnimationFrame(() => {
        const cell = getCellFromTouch(pageX, pageY);
        if (cell) {
          paintCell(cell.row, cell.col);
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      });
    },
    onPanResponderMove: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const cell = getCellFromTouch(pageX, pageY);
      if (cell) {
        paintCell(cell.row, cell.col);
      }
    },
    onPanResponderRelease: () => {
      lastPaintedRef.current = null;
    },
  }), [getCellFromTouch, paintCell, measureGrid]);

  const zoomIn = useCallback(() => {
    setCellSize(prev => Math.min(MAX_CELL, prev + 2));
  }, []);

  const zoomOut = useCallback(() => {
    setCellSize(prev => Math.max(MIN_CELL, prev - 2));
  }, []);

  const clearGrid = useCallback(() => {
    Alert.alert('Clear Canvas', 'Erase your entire design?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setEditor(prev => ({
            ...prev,
            cells: createEmptyGrid(prev.rows, prev.cols),
          }));
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
      },
    ]);
  }, []);

  const applyGridSettings = useCallback(() => {
    const cols = Math.max(5, Math.min(60, parseInt(newCols, 10) || DEFAULT_GRID_COLS));
    const rows = Math.max(5, Math.min(80, parseInt(newRows, 10) || DEFAULT_GRID_ROWS));
    setEditor(prev => {
      const newCells = createEmptyGrid(rows, cols);
      for (let r = 0; r < Math.min(rows, prev.rows); r++) {
        for (let c = 0; c < Math.min(cols, prev.cols); c++) {
          newCells[r][c] = prev.cells[r]?.[c] ?? null;
        }
      }
      return { ...prev, cols, rows, cells: newCells };
    });
    setNewCols(String(cols));
    setNewRows(String(rows));
    setSizeModalVisible(false);
  }, [newCols, newRows]);

  const applyHexColor = useCallback(() => {
    let hex = hexInput.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setActiveColor(hex);
      setHexInput('');
      setColorPickerVisible(false);
    } else {
      Alert.alert('Invalid Color', 'Enter a valid 6-digit hex code (e.g. FF5733)');
    }
  }, [hexInput]);

  const handleNamePress = useCallback(() => {
    setNameDraft(editor.name);
    setEditingName(true);
  }, [editor.name]);

  const confirmName = useCallback(() => {
    setEditor(prev => ({ ...prev, name: nameDraft.trim() || 'My Design' }));
    setEditingName(false);
  }, [nameDraft]);

  const openSaveModal = useCallback(() => {
    setSaveName(editor.name);
    setSaveModalVisible(true);
  }, [editor.name]);

  const handleSave = useCallback(() => {
    const name = saveName.trim() || 'My Design';
    const now = Date.now();

    if (editor.existingId) {
      updateDesign(editor.existingId, {
        name,
        cols: editor.cols,
        rows: editor.rows,
        cells: editor.cells,
      });
      setEditor(prev => ({ ...prev, name }));
      setSaveModalVisible(false);
      Alert.alert('Saved', `"${name}" has been updated.`);
    } else {
      const newDesign: SavedDesign = {
        id: generateId(),
        name,
        cols: editor.cols,
        rows: editor.rows,
        cells: editor.cells,
        createdAt: now,
        updatedAt: now,
      };
      addDesign(newDesign);
      setEditor(prev => ({ ...prev, name, existingId: newDesign.id }));
      setSaveModalVisible(false);
      Alert.alert('Saved', `"${name}" has been saved.`);
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [saveName, editor, addDesign, updateDesign]);

  const renderedGrid = useMemo(() => {
    const rowElements: React.ReactNode[] = [];
    for (let r = 0; r < editor.rows; r++) {
      const cellElements: React.ReactNode[] = [];
      for (let c = 0; c < editor.cols; c++) {
        const fill = editor.cells[r]?.[c];
        cellElements.push(
          <View
            key={`${r}-${c}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: fill || '#FAFAFA',
                borderColor: fill ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          />
        );
      }
      rowElements.push(
        <View key={`row-${r}`} style={styles.gridRow}>
          {cellElements}
        </View>
      );
    }
    return rowElements;
  }, [editor.cells, editor.rows, editor.cols, cellSize]);

  const handleToggleDesignStar = useCallback((id: string) => {
    toggleDesignStar(id);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [toggleDesignStar]);

  const renderDesignCard = useCallback(({ item }: { item: SavedDesign }) => {
    const filledCount = item.cells.flat().filter(c => c !== null).length;
    const totalCells = item.cols * item.rows;
    const progress = totalCells > 0 ? Math.round((filledCount / totalCells) * 100) : 0;
    const isStarred = item.starred ?? false;

    return (
      <TouchableOpacity
        style={styles.designCard}
        onPress={() => openDesign(item)}
        activeOpacity={0.7}
        testID={`design-card-${item.id}`}
      >
        <View style={styles.cardPreview}>
          {renderMiniGrid(item)}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <Grid3x3 size={12} color={colors.textTertiary} />
            <Text style={styles.cardMetaText}>{item.cols} × {item.rows}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={styles.cardMetaText}>{formatDate(item.updatedAt)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` as string }]} />
          </View>
        </View>
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            onPress={() => handleToggleDesignStar(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.starBtn}
            testID={`star-design-${item.id}`}
          >
            <Star
              size={18}
              color={isStarred ? '#F5A623' : colors.textTertiary}
              fill={isStarred ? '#F5A623' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardDeleteBtn}
            onPress={() => handleDeleteDesign(item.id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [openDesign, handleDeleteDesign, handleToggleDesignStar]);

  if (mode === 'list') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Design', headerShown: true }} />
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>My Designs</Text>
          <TouchableOpacity style={styles.newDesignBtn} onPress={startNewDesign} testID="new-design-btn">
            <Plus size={18} color="#fff" />
            <Text style={styles.newDesignBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {designs.length === 0 ? (
          <View style={styles.emptyState}>
            <Palette size={56} color={colors.borderLight} />
            <Text style={styles.emptyTitle}>No designs yet</Text>
            <Text style={styles.emptySubtitle}>Tap "New" to create your first colour design</Text>
          </View>
        ) : (
          <FlatList
            data={sortedDesigns}
            keyExtractor={(item) => item.id}
            renderItem={renderDesignCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.editorHeader}>
        <TouchableOpacity style={styles.myDesignsBtn} onPress={() => setMode('list')} testID="back-to-list" activeOpacity={0.7}>
          <ChevronLeft size={18} color={colors.primary} />
          <Text style={styles.myDesignsBtnText}>My Designs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={openSaveModal} testID="save-design">
          <Save size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.topControlsCard}>
        <View style={styles.topControlRow}>
          <View style={styles.topControlBlock}>
            <Text style={styles.topControlLabel}>Design Name</Text>
            <TouchableOpacity onPress={handleNamePress} activeOpacity={0.7} style={styles.nameFieldWrap}>
              {editingName ? (
                <TextInput
                  style={styles.nameFieldInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onSubmitEditing={confirmName}
                  onBlur={confirmName}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  testID="design-name-input"
                />
              ) : (
                <View style={styles.nameFieldDisplay}>
                  <Text style={styles.nameFieldText} numberOfLines={1}>{editor.name}</Text>
                  <PenLine size={13} color={colors.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.topControlRow}>
          <View style={styles.topControlBlock}>
            <Text style={styles.topControlLabel}>Colour</Text>
            <TouchableOpacity
              style={styles.colorPickerField}
              onPress={() => setColorPickerVisible(true)}
              activeOpacity={0.7}
              testID="open-color-picker"
            >
              <View style={[styles.colorSwatchLarge, { backgroundColor: activeColor }]} />
              <Text style={styles.colorHexLabel}>{activeColor.toUpperCase()}</Text>
              <Palette size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.topControlBlock}>
            <Text style={styles.topControlLabel}>Grid Size (W × H)</Text>
            <View style={styles.dimensionFieldRow}>
              <TextInput
                style={styles.dimensionInput}
                value={newCols}
                onChangeText={setNewCols}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="W"
                placeholderTextColor={colors.textTertiary}
                onEndEditing={applyGridSettings}
                testID="inline-width-input"
              />
              <Text style={styles.dimensionX}>×</Text>
              <TextInput
                style={styles.dimensionInput}
                value={newRows}
                onChangeText={setNewRows}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="H"
                placeholderTextColor={colors.textTertiary}
                onEndEditing={applyGridSettings}
                testID="inline-height-input"
              />
              <TouchableOpacity style={styles.dimensionApplyBtn} onPress={applyGridSettings} testID="apply-grid-size">
                <Grid3x3 size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolGroup}>
          <TouchableOpacity
            style={[styles.toolBtn, tool === 'paint' && styles.toolBtnActive]}
            onPress={() => setTool('paint')}
            testID="tool-paint"
          >
            <Paintbrush size={18} color={tool === 'paint' ? '#fff' : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, tool === 'erase' && styles.toolBtnErase]}
            onPress={() => setTool('erase')}
            testID="tool-erase"
          >
            <Eraser size={18} color={tool === 'erase' ? '#fff' : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, tool === 'pick' && styles.toolBtnPick]}
            onPress={() => setTool('pick')}
            testID="tool-pick"
          >
            <Pipette size={18} color={tool === 'pick' ? '#fff' : colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.toolGroup}>
          <TouchableOpacity style={styles.toolBtn} onPress={zoomOut} testID="zoom-out">
            <Minus size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={zoomIn} testID="zoom-in">
            <Plus size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={handleUploadPhoto}
          disabled={pixelateMutation.isPending}
          testID="upload-photo"
        >
          <ImageIcon size={16} color={colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={clearGrid} testID="clear-grid">
          <Trash2 size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {pixelateMutation.isPending && (
        <View style={styles.pixelatingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.pixelatingText}>Converting image to pixel pattern...</Text>
        </View>
      )}

      <View style={styles.quickPalette}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPaletteInner}>
          {PALETTE_COLORS.slice(0, 16).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => { setActiveColor(c); setTool('paint'); }}
              style={[
                styles.quickColor,
                { backgroundColor: c },
                activeColor === c && styles.quickColorActive,
              ]}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.canvasScroll}
        contentContainerStyle={styles.canvasContent}
        horizontal={false}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={true}
        bounces={false}
        maximumZoomScale={3}
        minimumZoomScale={0.5}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.gridOuter}>
            <View style={styles.colNumbers}>
              {Array.from({ length: editor.cols }, (_, i) => (
                <View key={i} style={[styles.colLabel, { width: cellSize }]}>
                  <Text style={styles.labelText}>{i + 1}</Text>
                </View>
              ))}
            </View>
            <View style={styles.gridWithRows}>
              <View style={styles.rowNumbers}>
                {Array.from({ length: editor.rows }, (_, i) => (
                  <View key={i} style={[styles.rowLabel, { height: cellSize }]}>
                    <Text style={styles.labelText}>{i + 1}</Text>
                  </View>
                ))}
              </View>
              <View
                ref={gridRef}
                style={[styles.grid, { width: totalWidth, height: totalHeight }]}
                onLayout={() => measureGrid()}
                {...panResponder.panHandlers}
              >
                {renderedGrid}
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <TouchableOpacity
        style={styles.saveDesignButton}
        onPress={openSaveModal}
        activeOpacity={0.8}
        testID="save-design-bottom"
      >
        <Save size={18} color="#fff" />
        <Text style={styles.saveDesignButtonText}>
          {editor.existingId ? 'Update Design' : 'Save Design'}
        </Text>
      </TouchableOpacity>

      <Modal visible={colorPickerVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setColorPickerVisible(false)}>
          <Pressable style={styles.colorPickerSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choose Colour</Text>
              <TouchableOpacity onPress={() => setColorPickerVisible(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.currentColorRow}>
                <View style={[styles.currentColorPreview, { backgroundColor: activeColor }]} />
                <Text style={styles.currentColorHex}>{activeColor.toUpperCase()}</Text>
              </View>

              <Text style={styles.sectionLabel}>Palette</Text>
              <View style={styles.colorGrid}>
                {PALETTE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setActiveColor(c); }}
                    style={[
                      styles.paletteColor,
                      { backgroundColor: c },
                      activeColor === c && styles.paletteColorActive,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.sectionLabel}>Hue Spectrum</Text>
              <View style={styles.hueRow}>
                {HUE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setActiveColor(c); }}
                    style={[styles.hueColor, { backgroundColor: c }, activeColor === c && styles.hueColorActive]}
                  />
                ))}
              </View>

              <Text style={styles.sectionLabel}>Shades</Text>
              <View style={styles.hueRow}>
                {SHADE_LEVELS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setActiveColor(c); }}
                    style={[styles.shadeColor, { backgroundColor: c, borderWidth: c === '#FFFFFF' ? 1 : 0, borderColor: '#ddd' }, activeColor === c && styles.hueColorActive]}
                  />
                ))}
              </View>

              <Text style={styles.sectionLabel}>Hex / RAL Code</Text>
              <View style={styles.hexRow}>
                <Text style={styles.hexHash}>#</Text>
                <TextInput
                  style={styles.hexField}
                  value={hexInput}
                  onChangeText={setHexInput}
                  placeholder="FF5733"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={6}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={applyHexColor}
                />
                <TouchableOpacity style={styles.hexApply} onPress={applyHexColor}>
                  <Text style={styles.hexApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={sizeModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSizeModalVisible(false)}>
          <Pressable style={styles.sizeModal} onPress={() => {}}>
            <Text style={styles.sizeModalTitle}>Grid Size</Text>
            <Text style={styles.sizeModalDesc}>Set the width (stitches) and height (rows) of your grid</Text>
            <View style={styles.sizeInputRow}>
              <View style={styles.sizeInputBlock}>
                <Text style={styles.sizeInputLabel}>Width</Text>
                <TextInput
                  style={styles.sizeModalField}
                  value={newCols}
                  onChangeText={setNewCols}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="20"
                  placeholderTextColor={colors.textTertiary}
                  testID="modal-width-input"
                />
              </View>
              <Text style={styles.sizeModalX}>×</Text>
              <View style={styles.sizeInputBlock}>
                <Text style={styles.sizeInputLabel}>Height</Text>
                <TextInput
                  style={styles.sizeModalField}
                  value={newRows}
                  onChangeText={setNewRows}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="30"
                  placeholderTextColor={colors.textTertiary}
                  testID="modal-height-input"
                />
              </View>
            </View>
            <View style={styles.sizeModalActions}>
              <TouchableOpacity style={styles.sizeModalCancel} onPress={() => setSizeModalVisible(false)}>
                <Text style={styles.sizeModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sizeModalApply} onPress={applyGridSettings}>
                <Text style={styles.sizeModalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={saveModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSaveModalVisible(false)}>
          <Pressable style={styles.saveModal} onPress={() => {}}>
            <Text style={styles.saveModalTitle}>
              {editor.existingId ? 'Update Design' : 'Save Design'}
            </Text>
            <Text style={styles.saveModalDesc}>Give your design a name</Text>
            <TextInput
              style={styles.saveNameInput}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="My Design"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
              testID="save-name-input"
            />
            <View style={styles.saveModalMeta}>
              <Text style={styles.saveModalMetaText}>
                {editor.cols} × {editor.rows} grid
              </Text>
            </View>
            <View style={styles.sizeModalActions}>
              <TouchableOpacity style={styles.sizeModalCancel} onPress={() => setSaveModalVisible(false)}>
                <Text style={styles.sizeModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveConfirmBtn} onPress={handleSave}>
                <Save size={16} color="#fff" />
                <Text style={styles.saveConfirmText}>
                  {editor.existingId ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function renderMiniGrid(design: SavedDesign): React.ReactNode {
  const maxPreviewCells = 10;
  const previewCellSize = 6;
  const displayRows = Math.min(design.rows, maxPreviewCells);
  const displayCols = Math.min(design.cols, maxPreviewCells);

  const rows: React.ReactNode[] = [];
  for (let r = 0; r < displayRows; r++) {
    const cells: React.ReactNode[] = [];
    for (let c = 0; c < displayCols; c++) {
      const fill = design.cells[r]?.[c];
      cells.push(
        <View
          key={`${r}-${c}`}
          style={{
            width: previewCellSize,
            height: previewCellSize,
            backgroundColor: fill || '#F0EBE3',
            borderWidth: 0.5,
            borderColor: 'rgba(0,0,0,0.05)',
          }}
        />
      );
    }
    rows.push(
      <View key={`r-${r}`} style={{ flexDirection: 'row' as const }}>
        {cells}
      </View>
    );
  }
  return <View style={{ borderRadius: 4, overflow: 'hidden' }}>{rows}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontWeight: '800',
    color: colors.text,
  },
  newDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newDesignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  designCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardPreview: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  cardActionsRow: {
    alignItems: 'center',
    gap: 6,
  },
  starBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  cardDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  myDesignsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  myDesignsBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControlsCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 10,
  },
  topControlRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topControlBlock: {
    flex: 1,
    gap: 4,
  },
  topControlLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  nameFieldWrap: {
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  nameFieldDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameFieldText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    flex: 1,
  },
  nameFieldInput: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    padding: 0,
  },
  colorPickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    gap: 8,
  },
  colorSwatchLarge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorHexLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
    letterSpacing: 0.5,
  },
  dimensionFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dimensionInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    textAlign: 'center' as const,
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  dimensionX: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textTertiary,
  },
  dimensionApplyBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  toolGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  toolBtnActive: {
    backgroundColor: colors.primary,
  },
  toolBtnErase: {
    backgroundColor: colors.accent,
  },
  toolBtnPick: {
    backgroundColor: '#5E35B1',
  },

  quickPalette: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  quickPaletteInner: {
    paddingHorizontal: 10,
    gap: 6,
    flexDirection: 'row',
  },
  quickColor: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickColorActive: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  canvasScroll: {
    flex: 1,
  },
  canvasContent: {
    padding: 8,
  },
  gridOuter: {
    alignItems: 'flex-start',
  },
  colNumbers: {
    flexDirection: 'row',
    marginLeft: 24,
    marginBottom: 2,
  },
  colLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridWithRows: {
    flexDirection: 'row',
  },
  rowNumbers: {
    marginRight: 2,
  },
  rowLabel: {
    width: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 8,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  grid: {
    overflow: 'hidden',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FAFAFA',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '85%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  currentColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  currentColorPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  currentColorHex: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paletteColor: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paletteColorActive: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  hueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  hueColor: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  hueColorActive: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  shadeColor: {
    width: 40,
    height: 28,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  hexHash: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  hexField: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 2,
  },
  hexApply: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexApplyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  sizeModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 60,
    maxWidth: 360,
  },
  sizeModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  sizeModalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  sizeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sizeInputBlock: {
    alignItems: 'center',
    gap: 6,
  },
  sizeInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  sizeModalField: {
    width: 80,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    textAlign: 'center' as const,
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
  },
  sizeModalX: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textTertiary,
    marginTop: 20,
  },
  sizeModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeModalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sizeModalApply: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeModalApplyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  saveModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 60,
    maxWidth: 360,
  },
  saveModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  saveModalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  saveNameInput: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  saveModalMeta: {
    marginBottom: 20,
    alignItems: 'center',
  },
  saveModalMetaText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  saveConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  saveConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  saveDesignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveDesignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pixelatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryFaded,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pixelatingText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
