import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PARTS_DATA as INITIAL_PARTS_DATA, DIAGRAM_URLS as INITIAL_DIAGRAM_URLS, type PartData } from '@/data/partsData';

interface PartsStore {
  partsData: Record<string, Array<PartData & { id: string }>>;
  diagramUrls: Record<string, string>;
  updatePartsData: (genreId: string, parts: Array<PartData & { id: string }>) => void;
  updateDiagramUrl: (genreId: string, url: string) => void;
  getPartsByGenreId: (genreId: string) => Array<PartData & { id: string }>;
  getDiagramUrl: (genreId: string) => string;
}

export const usePartsStore = create<PartsStore>()(
  persist(
    (set, get) => ({
      // 深いコピーで初期化（配列とオブジェクトを完全にコピー）
      partsData: Object.fromEntries(
        Object.entries(INITIAL_PARTS_DATA).map(([key, value]) => [
          key,
          value.map(part => ({ ...part }))
        ])
      ) as Record<string, Array<PartData & { id: string }>>,

      // 展開図URLの初期化
      diagramUrls: { ...INITIAL_DIAGRAM_URLS },

      updatePartsData: (genreId: string, parts: Array<PartData & { id: string }>) => {
        set((state) => ({
          partsData: {
            ...state.partsData,
            [genreId]: [...parts],
          },
        }));
      },

      updateDiagramUrl: (genreId: string, url: string) => {
        set((state) => ({
          diagramUrls: {
            ...state.diagramUrls,
            [genreId]: url,
          },
        }));
      },

      getPartsByGenreId: (genreId: string) => {
        return get().partsData[genreId] || [];
      },

      getDiagramUrl: (genreId: string) => {
        return get().diagramUrls[genreId] || '';
      },
    }),
    {
      name: 'parts-storage', // localStorageのキー名
    }
  )
);
