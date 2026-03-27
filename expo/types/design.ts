export type CellData = string | null;

export interface SavedDesign {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cells: CellData[][];
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
}
