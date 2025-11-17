// ============================================================
// 共通パーツデータ
// ============================================================
// パーツリストページと検索ページで共有するデータ

export interface PartData {
  id: string;
  unitNumber: string;
  partNumber: string;
  partName: string;
  quantity: number;
  stockQuantity: number;
  price: number;
  notes: string;
  storageCase: string;
  orderDate: string;
  expectedArrivalDate: string;
  imageUrl: string;
}

// ジャンルごとのパーツデータ
export const PARTS_DATA: Record<string, Array<PartData>> = {
  '1': [
    {
      id: '1',
      unitNumber: '4-1-1',
      partNumber: '35181RT10B',
      partName: '529A LAYSHAFT SET',
      quantity: 1,
      stockQuantity: 2,
      price: 25000,
      notes: '',
      storageCase: 'A-12',
      orderDate: '2025-10-15',
      expectedArrivalDate: '2025-11-14',
      imageUrl: 'https://picsum.photos/seed/piston1/100/80',
    },
    {
      id: '2',
      unitNumber: '4-1-2',
      partNumber: '35182RT10A',
      partName: 'DOG RING',
      quantity: 3,
      stockQuantity: 0,
      price: 8500,
      notes: '要発注',
      storageCase: 'A-13',
      orderDate: '',
      expectedArrivalDate: '',
      imageUrl: 'https://picsum.photos/seed/crankshaft1/100/80',
    },
    {
      id: '3',
      unitNumber: '4-1-3',
      partNumber: '35183RT10A',
      partName: 'MAINSHAFT',
      quantity: 1,
      stockQuantity: 0,
      price: 32000,
      notes: '',
      storageCase: 'B-05',
      orderDate: '',
      expectedArrivalDate: '',
      imageUrl: 'https://picsum.photos/seed/camshaft1/100/80',
    },
    {
      id: '4',
      unitNumber: '4-1-4',
      partNumber: '35184RT10A',
      partName: 'GEAR RATIO 3rd (16/27)',
      quantity: 1,
      stockQuantity: 0,
      price: 15000,
      notes: '',
      storageCase: 'B-06',
      orderDate: '',
      expectedArrivalDate: '',
      imageUrl: 'https://picsum.photos/seed/cylinder1/100/80',
    },
  ],
  '2': [
    {
      id: '5',
      unitNumber: '4-2-1',
      partNumber: '35185RT10A',
      partName: 'INNER TRAC - MAINSHAFT',
      quantity: 1,
      stockQuantity: 0,
      price: 12000,
      notes: '',
      storageCase: 'C-01',
      orderDate: '',
      expectedArrivalDate: '',
      imageUrl: 'https://picsum.photos/seed/clutch/100/80',
    },
  ],
  '3': [
    {
      id: '6',
      unitNumber: '1-1-1',
      partNumber: 'GS-001',
      partName: 'ギアセット',
      quantity: 2,
      stockQuantity: 5,
      price: 18000,
      notes: '',
      storageCase: 'A-12',
      orderDate: '',
      expectedArrivalDate: '',
      imageUrl: 'https://picsum.photos/seed/gear/100/80',
    },
  ],
};

// 全パーツデータを1つの配列として取得（genreId付き）
export const getAllParts = (): Array<PartData & { genreId: string }> => {
  const allParts: Array<PartData & { genreId: string }> = [];

  Object.entries(PARTS_DATA).forEach(([genreId, parts]) => {
    parts.forEach((part) => {
      allParts.push({ ...part, genreId });
    });
  });

  return allParts;
};

// 展開図URL (16:9比率)
export const DIAGRAM_URLS: Record<string, string> = {
  '1': 'https://picsum.photos/seed/diagram-engine/1600/900',
  '2': 'https://picsum.photos/seed/diagram-transmission/1600/900',
  '3': 'https://picsum.photos/seed/diagram-suspension/1600/900',
  '4': 'https://picsum.photos/seed/diagram-brake/1600/900',
};

// ジャンル名
export const GENRE_NAMES: Record<string, string> = {
  '1': 'TRANSMISSION (SERVICE) -GEARBOX INNER PARTS_10',
  '2': 'トランスミッション',
  '3': 'サスペンション',
  '4': 'ブレーキ',
};
