import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Type, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import * as FileSystem from 'expo-file-system/legacy';
import { usePatterns } from '@/contexts/PatternContext';
import { parsePatternText } from '@/utils/patternParser';
import colors from '@/constants/colors';

export default function NewPatternScreen() {
  const router = useRouter();
  const { addPattern, patterns } = usePatterns();
  const [patternText, setPatternText] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  const imageToTextMutation = useMutation({
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

      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the knitting pattern text from this image. Output ONLY the raw pattern text as written, preserving row numbers and abbreviations exactly. Do not explain or interpret the pattern. Include row labels like "1st row", "2nd row" etc. Preserve all knitting abbreviations like K, P, k2tog, ssk, yo etc. If there are size variations in brackets like [35:39:43:43], include only the first number.',
              },
              {
                type: 'image',
                image: `data:image/jpeg;base64,${base64}`,
              },
            ],
          },
        ],
      });
      return result;
    },
    onSuccess: (text) => {
      console.log('Extracted pattern text:', text);
      setPatternText(text);
      const parsed = parsePatternText(text);
      if (!title && parsed.title !== 'Untitled Pattern') {
        setTitle(parsed.title);
      }
    },
    onError: (error) => {
      console.log('Image extraction error:', error);
      Alert.alert('Extraction Failed', 'Could not read the pattern from the image. Please try again or type the pattern manually.');
    },
  });

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        imageToTextMutation.mutate(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
  }, [imageToTextMutation]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Camera access is required to photograph patterns.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        imageToTextMutation.mutate(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Camera error:', e);
    }
  }, [imageToTextMutation]);

  const getNextDefaultName = useCallback(() => {
    const base = 'My New Pattern';
    const existingNumbers = patterns
      .filter((p) => p.title.startsWith(base))
      .map((p) => {
        const suffix = p.title.replace(base, '').trim();
        const num = parseInt(suffix, 10);
        return isNaN(num) ? 1 : num;
      });
    const next = existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1;
    return `${base} ${next}`;
  }, [patterns]);

  const handleCreatePattern = useCallback(() => {
    if (!patternText.trim()) {
      Alert.alert('No Pattern', 'Please enter or upload a knitting pattern first.');
      return;
    }

    const parsed = parsePatternText(patternText);

    if (parsed.rows.length === 0) {
      Alert.alert(
        'No Rows Found',
        'The parser couldn\'t identify any rows. Make sure your pattern uses standard format like "1st row. K2, P2..." or "Row 1: K2, P2..."'
      );
      return;
    }

    let finalTitle = title.trim();
    if (!finalTitle) {
      finalTitle = parsed.title || '';
    }
    if (!finalTitle) {
      finalTitle = getNextDefaultName();
    }

    const pattern = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      title: finalTitle,
      sourceText: patternText,
      notes: parsed.notes,
      rows: parsed.rows,
      usedStitches: parsed.usedStitches,
      currentRow: parsed.rows.length > 0 ? parsed.rows[0].id : '',
      markedCells: [],
      activeMarker: null,
      totalRepeats: 1,
      currentRepeat: 1,
      starred: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addPattern(pattern);
    setPatternText('');
    setTitle('');
    router.push(`/pattern/${pattern.id}` as any);
  }, [patternText, title, addPattern, router, getNextDefaultName]);

  const isExtracting = imageToTextMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: 'New Pattern' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PATTERN TITLE</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="e.g. Cable Knit Scarf"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            testID="pattern-title-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SCAN FROM IMAGE</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              style={styles.imageButton}
              activeOpacity={0.7}
              disabled={isExtracting}
              testID="take-photo-button"
            >
              <Camera size={22} color={colors.primary} />
              <Text style={styles.imageButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.imageButton}
              activeOpacity={0.7}
              disabled={isExtracting}
              testID="pick-image-button"
            >
              <ImageIcon size={22} color={colors.primary} />
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {isExtracting && (
            <View style={styles.extractingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.extractingText}>Reading pattern from image...</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>PATTERN TEXT</Text>
            <Type size={16} color={colors.textTertiary} />
          </View>
          <TextInput
            style={styles.patternInput}
            multiline
            placeholder={
              'Paste or type your pattern here...\n\nExample:\nLEFT FRONT\n1st row. K2, P2, rep from * to last 3 sts, K2, P1.\n2nd row. K1, P2, * K2, P2, rep from * to end.'
            }
            placeholderTextColor={colors.textTertiary}
            value={patternText}
            onChangeText={setPatternText}
            textAlignVertical="top"
            testID="pattern-text-input"
          />
        </View>

        <TouchableOpacity
          onPress={handleCreatePattern}
          style={[styles.createButton, !patternText.trim() && styles.createButtonDisabled]}
          activeOpacity={0.8}
          disabled={!patternText.trim()}
          testID="create-pattern-button"
        >
          <Sparkles size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Generate Chart</Text>
        </TouchableOpacity>

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>Supported abbreviations</Text>
          <Text style={styles.tipText}>
            K (knit) · P (purl) · YO (yarn over) · K2tog · SSK · SL (slip) · CO (cast on) · BO (bind off) · INC · DEC · C4F/C4B (cable)
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryFaded,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  imageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  extractingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primaryFaded,
    borderRadius: 10,
  },
  extractingText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  patternInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
