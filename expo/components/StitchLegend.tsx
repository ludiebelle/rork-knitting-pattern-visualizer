import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStitchById } from '@/constants/stitches';
import colors from '@/constants/colors';

interface StitchLegendProps {
  usedStitches: string[];
}

export default function StitchLegend({ usedStitches }: StitchLegendProps) {
  if (usedStitches.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stitch Key</Text>
      <View style={styles.grid}>
        {usedStitches.map((stitchId) => {
          const stitch = getStitchById(stitchId);
          if (!stitch) return null;
          return (
            <View key={stitchId} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: stitch.color }]}>
                <Text style={[styles.swatchSymbol, { color: stitch.textColor }]}>
                  {stitch.symbol}
                </Text>
              </View>
              <View style={styles.legendInfo}>
                <Text style={styles.legendName}>{stitch.name}</Text>
                <Text style={styles.legendAbbr}>
                  {stitch.abbreviations[0].toUpperCase()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    width: '45%' as const,
    minWidth: 130,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  swatchSymbol: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  legendInfo: {
    flex: 1,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  legendAbbr: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
