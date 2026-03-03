import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { SavedDesign } from '@/types/design';

const STORAGE_KEY = 'knitgrid_designs';

async function loadDesigns(): Promise<SavedDesign[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.log('Error loading designs:', e);
    return [];
  }
}

async function persistDesigns(designs: SavedDesign[]): Promise<SavedDesign[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  return designs;
}

export const [DesignProvider, useDesigns] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [requestNewDesign, setRequestNewDesign] = useState<boolean>(false);

  const designsQuery = useQuery({
    queryKey: ['designs'],
    queryFn: loadDesigns,
  });

  useEffect(() => {
    if (designsQuery.data) {
      setDesigns(designsQuery.data);
    }
  }, [designsQuery.data]);

  const syncMutation = useMutation({
    mutationFn: persistDesigns,
    onSuccess: (data) => {
      queryClient.setQueryData(['designs'], data);
    },
  });

  const addDesign = useCallback((design: SavedDesign) => {
    const updated = [design, ...designs];
    setDesigns(updated);
    syncMutation.mutate(updated);
  }, [designs, syncMutation]);

  const updateDesign = useCallback((id: string, updates: Partial<SavedDesign>) => {
    const updated = designs.map((d) =>
      d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
    );
    setDesigns(updated);
    syncMutation.mutate(updated);
  }, [designs, syncMutation]);

  const deleteDesign = useCallback((id: string) => {
    const updated = designs.filter((d) => d.id !== id);
    setDesigns(updated);
    syncMutation.mutate(updated);
  }, [designs, syncMutation]);

  const getDesign = useCallback((id: string) => {
    return designs.find((d) => d.id === id);
  }, [designs]);

  const toggleDesignStar = useCallback((id: string) => {
    const updated = designs.map((d) =>
      d.id === id ? { ...d, starred: !d.starred } : d
    );
    setDesigns(updated);
    syncMutation.mutate(updated);
  }, [designs, syncMutation]);

  return {
    designs,
    addDesign,
    updateDesign,
    deleteDesign,
    getDesign,
    toggleDesignStar,
    isLoading: designsQuery.isLoading,
    requestNewDesign,
    setRequestNewDesign,
  };
});
