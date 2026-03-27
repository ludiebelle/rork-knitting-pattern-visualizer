export interface StitchDefinition {
  id: string;
  name: string;
  abbreviations: string[];
  symbol: string;
  color: string;
  textColor: string;
  description: string;
}

export const STITCH_DEFINITIONS: StitchDefinition[] = [
  {
    id: 'k',
    name: 'Knit',
    abbreviations: ['k', 'K'],
    symbol: '—',
    color: '#FF3B6F',
    textColor: '#FFFFFF',
    description: 'Knit stitch',
  },
  {
    id: 'p',
    name: 'Purl',
    abbreviations: ['p', 'P'],
    symbol: '•',
    color: '#FFB627',
    textColor: '#1A1A1A',
    description: 'Purl stitch',
  },
  {
    id: 'yo',
    name: 'Yarn Over',
    abbreviations: ['yo', 'YO', 'yfwd', 'yon'],
    symbol: 'O',
    color: '#FFEE58',
    textColor: '#5D4E00',
    description: 'Yarn over - creates a hole/eyelet',
  },
  {
    id: 'k2tog',
    name: 'Knit 2 Together',
    abbreviations: ['k2tog', 'K2tog'],
    symbol: '⟋',
    color: '#E5383B',
    textColor: '#FFFFFF',
    description: 'Right-leaning decrease',
  },
  {
    id: 'ssk',
    name: 'Slip Slip Knit',
    abbreviations: ['ssk', 'SSK', 'skpo', 'sl1-k1-psso'],
    symbol: '⟍',
    color: '#C77DFF',
    textColor: '#FFFFFF',
    description: 'Left-leaning decrease',
  },
  {
    id: 'sl',
    name: 'Slip',
    abbreviations: ['sl', 'SL', 'sl1'],
    symbol: 'V',
    color: '#06D6A0',
    textColor: '#1A1A1A',
    description: 'Slip stitch purlwise',
  },
  {
    id: 'co',
    name: 'Cast On',
    abbreviations: ['co', 'CO', 'cast on'],
    symbol: '∧',
    color: '#118AB2',
    textColor: '#FFFFFF',
    description: 'Cast on stitch',
  },
  {
    id: 'bo',
    name: 'Bind Off',
    abbreviations: ['bo', 'BO', 'cast off'],
    symbol: '∨',
    color: '#073B4C',
    textColor: '#FFFFFF',
    description: 'Bind off / cast off stitch',
  },
  {
    id: 'p2tog',
    name: 'Purl 2 Together',
    abbreviations: ['p2tog', 'P2tog'],
    symbol: '⟋•',
    color: '#EF476F',
    textColor: '#FFFFFF',
    description: 'Purl decrease',
  },
  {
    id: 'inc',
    name: 'Increase',
    abbreviations: ['inc', 'INC', 'kfb', 'KFB', 'm1', 'M1'],
    symbol: '↑',
    color: '#26C6DA',
    textColor: '#1A1A1A',
    description: 'Increase one stitch',
  },
  {
    id: 'dec',
    name: 'Decrease',
    abbreviations: ['dec', 'DEC'],
    symbol: '↓',
    color: '#FF6B6B',
    textColor: '#FFFFFF',
    description: 'Decrease one stitch',
  },
  {
    id: 'cf',
    name: 'Cable Front',
    abbreviations: ['cf', 'CF', 'c4f', 'C4F', 'c6f', 'C6F', 'c8f', 'C8F'],
    symbol: '⤬',
    color: '#FF8500',
    textColor: '#FFFFFF',
    description: 'Cable cross to the front (left-leaning cable)',
  },
  {
    id: 'cb',
    name: 'Cable Back',
    abbreviations: ['cb', 'CB', 'c4b', 'C4B', 'c6b', 'C6B', 'c8b', 'C8B'],
    symbol: '⤫',
    color: '#7209B7',
    textColor: '#FFFFFF',
    description: 'Cable cross to the back (right-leaning cable)',
  },
];

export function getStitchById(id: string): StitchDefinition | undefined {
  return STITCH_DEFINITIONS.find((s) => s.id === id);
}

export function getStitchByAbbreviation(abbr: string): StitchDefinition | undefined {
  const lower = abbr.toLowerCase();
  return STITCH_DEFINITIONS.find((s) =>
    s.abbreviations.some((a) => a.toLowerCase() === lower)
  );
}
