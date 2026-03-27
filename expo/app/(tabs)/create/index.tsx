import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Grid3x3, Palette, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useDesigns } from '@/contexts/DesignContext';

export default function CreateChooserScreen() {
  const router = useRouter();
  const { setRequestNewDesign } = useDesigns();
  const scalePattern = useRef(new Animated.Value(1)).current;
  const scaleDesign = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value, onDone: () => void) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  const handleNewPattern = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    animatePress(scalePattern, () => {
      router.push('/create/new-pattern' as any);
    });
  }, [router, animatePress, scalePattern]);

  const handleNewDesign = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    animatePress(scaleDesign, () => {
      setRequestNewDesign(true);
      router.push('/(tabs)/design' as any);
    });
  }, [router, animatePress, scaleDesign, setRequestNewDesign]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={28} color={colors.primary} />
        <Text style={styles.title}>What would you like to create?</Text>
        <Text style={styles.subtitle}>Choose an option to get started</Text>
      </View>

      <View style={styles.cardsContainer}>
        <Animated.View style={{ transform: [{ scale: scalePattern }] }}>
          <TouchableOpacity
            style={styles.card}
            onPress={handleNewPattern}
            activeOpacity={0.9}
            testID="new-pattern-option"
          >
            <View style={styles.cardIconContainer}>
              <View style={styles.patternIcon}>
                <Grid3x3 size={32} color={colors.primary} />
              </View>
            </View>
            <View style={styles.cardTextArea}>
              <Text style={styles.cardTitle}>New Pattern</Text>
              <Text style={styles.cardDesc}>
                Type, paste, or scan a knitting pattern to generate an interactive stitch chart
              </Text>
            </View>
            <View style={styles.cardArrow}>
              <ChevronRight size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: scaleDesign }] }}>
          <TouchableOpacity
            style={[styles.card, styles.cardDesign]}
            onPress={handleNewDesign}
            activeOpacity={0.9}
            testID="new-design-option"
          >
            <View style={styles.cardIconContainer}>
              <View style={styles.designIcon}>
                <Palette size={32} color={colors.accent} />
              </View>
            </View>
            <View style={styles.cardTextArea}>
              <Text style={styles.cardTitle}>New Design</Text>
              <Text style={styles.cardDesc}>
                Draw a colour design on a grid or upload a photo to convert into a pixel pattern
              </Text>
            </View>
            <View style={[styles.cardArrow, styles.cardArrowDesign]}>
              <ChevronRight size={22} color={colors.accent} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <View style={styles.footerRow}>
          <ImageIcon size={14} color={colors.textTertiary} />
          <Text style={styles.footerText}>
            Both options support uploading images from your gallery or camera
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryFaded,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDesign: {
    borderColor: colors.accent + '25',
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  designIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextArea: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArrowDesign: {
    backgroundColor: colors.accent + '15',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 16,
  },
  footerDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 17,
    flex: 1,
  },
});
