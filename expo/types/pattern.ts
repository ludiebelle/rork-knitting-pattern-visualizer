import { PatternRow } from '@/utils/patternParser';

export interface MarkedCell {
  rowId: string;
  cellIndex: number;
}

export interface ActiveMarker {
  rowId: string;
  cellIndex: number;
}

export interface SavedPattern {
  id: string;
  title: string;
  sourceText: string;
  notes: string[];
  rows: PatternRow[];
  usedStitches: string[];
  currentRow: string;
  markedCells: MarkedCell[];
  activeMarker: ActiveMarker | null;
  totalRepeats: number;
  currentRepeat: number;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}
