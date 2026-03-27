import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { SavedPattern, ActiveMarker } from '@/types/pattern';

const STORAGE_KEY = 'knitgrid_patterns';

async function loadPatterns(): Promise<SavedPattern[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.log('Error loading patterns:', e);
    return [];
  }
}

async function savePatterns(patterns: SavedPattern[]): Promise<SavedPattern[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  return patterns;
}

export const [PatternProvider, usePatterns] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);

  const patternsQuery = useQuery({
    queryKey: ['patterns'],
    queryFn: loadPatterns,
  });

  useEffect(() => {
    if (patternsQuery.data) {
      setPatterns(patternsQuery.data);
    }
  }, [patternsQuery.data]);

  const syncMutation = useMutation({
    mutationFn: savePatterns,
    onSuccess: (data) => {
      queryClient.setQueryData(['patterns'], data);
    },
  });

  const toggleStar = useCallback((id: string) => {
    const updated = patterns.map((p) =>
      p.id === id ? { ...p, starred: !p.starred, updatedAt: Date.now() } : p
    );
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const addPattern = useCallback((pattern: SavedPattern) => {
    const withMarkers = { ...pattern, markedCells: pattern.markedCells ?? [], starred: pattern.starred ?? false };
    const updated = [withMarkers, ...patterns];
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const updatePattern = useCallback((id: string, updates: Partial<SavedPattern>) => {
    const updated = patterns.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const deletePattern = useCallback((id: string) => {
    const updated = patterns.filter((p) => p.id !== id);
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const getPattern = useCallback((id: string) => {
    return patterns.find((p) => p.id === id);
  }, [patterns]);

  const setActiveMarker = useCallback((patternId: string, rowId: string, cellIndex: number) => {
    const pattern = patterns.find((p) => p.id === patternId);
    if (!pattern) return;
    const current = pattern.activeMarker;
    let newMarker: ActiveMarker | null;
    if (current && current.rowId === rowId && current.cellIndex === cellIndex) {
      newMarker = null;
    } else {
      newMarker = { rowId, cellIndex };
    }
    const updated = patterns.map((p) =>
      p.id === patternId ? { ...p, activeMarker: newMarker, updatedAt: Date.now() } : p
    );
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const clearActiveMarker = useCallback((patternId: string) => {
    const updated = patterns.map((p) =>
      p.id === patternId ? { ...p, activeMarker: null, updatedAt: Date.now() } : p
    );
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const setTotalRepeats = useCallback((patternId: string, total: number) => {
    const updated = patterns.map((p) =>
      p.id === patternId ? { ...p, totalRepeats: Math.max(1, total), updatedAt: Date.now() } : p
    );
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  const setCurrentRepeat = useCallback((patternId: string, repeat: number) => {
    const pattern = patterns.find((p) => p.id === patternId);
    if (!pattern) return;
    const maxRepeat = pattern.totalRepeats || 1;
    const updated = patterns.map((p) =>
      p.id === patternId ? { ...p, currentRepeat: Math.max(1, Math.min(repeat, maxRepeat)), updatedAt: Date.now() } : p
    );
    setPatterns(updated);
    syncMutation.mutate(updated);
  }, [patterns, syncMutation]);

  return {
    patterns,
    addPattern,
    updatePattern,
    deletePattern,
    getPattern,
    toggleStar,
    setActiveMarker,
    clearActiveMarker,
    setTotalRepeats,
    setCurrentRepeat,
    isLoading: patternsQuery.isLoading,
  };
});
