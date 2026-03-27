import { STITCH_DEFINITIONS, StitchDefinition } from '@/constants/stitches';

export interface StitchCell {
  stitchId: string;
  count: number;
}

export interface PatternRow {
  id: string;
  rowNumber: number;
  section: string;
  label: string;
  stitches: StitchCell[];
}

export interface ParsedPattern {
  title: string;
  notes: string[];
  rows: PatternRow[];
  usedStitches: string[];
}

function matchStitchAbbreviation(token: string): { stitch: StitchDefinition; count: number } | null {
  const cleaned = token.replace(/[.,;]/g, '').trim();
  if (!cleaned) return null;

  const cableMatch = cleaned.match(/^[cC](\d+)([fFbB])$/i);
  if (cableMatch) {
    const cableCount = parseInt(cableMatch[1], 10);
    const direction = cableMatch[2].toLowerCase();
    const stitchId = direction === 'f' ? 'cf' : 'cb';
    const stitch = STITCH_DEFINITIONS.find((s) => s.id === stitchId);
    if (stitch) {
      return { stitch, count: cableCount };
    }
  }

  const countMatch = cleaned.match(/^([a-zA-Z]+)(\d+)$/);
  if (countMatch) {
    const abbr = countMatch[1];
    const count = parseInt(countMatch[2], 10);
    const stitch = STITCH_DEFINITIONS.find((s) =>
      s.abbreviations.some((a) => a.toLowerCase() === abbr.toLowerCase())
    );
    if (stitch) {
      return { stitch, count };
    }
  }

  const countPrefixMatch = cleaned.match(/^(\d+)\s*([a-zA-Z]+)$/);
  if (countPrefixMatch) {
    const count = parseInt(countPrefixMatch[1], 10);
    const abbr = countPrefixMatch[2];
    const stitch = STITCH_DEFINITIONS.find((s) =>
      s.abbreviations.some((a) => a.toLowerCase() === abbr.toLowerCase())
    );
    if (stitch) {
      return { stitch, count };
    }
  }

  const stitch = STITCH_DEFINITIONS.find((s) =>
    s.abbreviations.some((a) => a.toLowerCase() === cleaned.toLowerCase())
  );
  if (stitch) {
    return { stitch, count: 1 };
  }

  return null;
}

function parseRowContent(content: string): StitchCell[] {
  const cells: StitchCell[] = [];

  let processedContent = content.replace(/\(([^)]+)\)\s*(\d+)\s*times?/gi, (_, group, times) => {
    const repeatCount = parseInt(times, 10);
    const repeated = Array(repeatCount).fill(group).join(', ');
    return repeated;
  });

  const repMatch = processedContent.match(/\*\s*(.+?),?\s*rep(?:eat)?\s*from\s*\*\s*(?:to\s*)?(?:last\s*(\d+)\s*st(?:s|itches)?,?\s*(.+))?(?:to\s*end\.?)?/i);
  if (repMatch) {
    const beforeStar = processedContent.substring(0, processedContent.indexOf('*')).trim();
    const repeatSection = repMatch[1];
    const lastStitches = repMatch[3] || '';

    if (beforeStar) {
      const beforeTokens = beforeStar.split(/[,\s]+/).filter(Boolean);
      for (const token of beforeTokens) {
        const result = matchStitchAbbreviation(token);
        if (result) {
          cells.push({ stitchId: result.stitch.id, count: result.count });
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const repeatTokens = repeatSection.split(/[,\s]+/).filter(Boolean);
      for (const token of repeatTokens) {
        const result = matchStitchAbbreviation(token);
        if (result) {
          cells.push({ stitchId: result.stitch.id, count: result.count });
        }
      }
    }

    if (lastStitches) {
      const lastTokens = lastStitches.split(/[,\s]+/).filter(Boolean);
      for (const token of lastTokens) {
        const result = matchStitchAbbreviation(token);
        if (result) {
          cells.push({ stitchId: result.stitch.id, count: result.count });
        }
      }
    }

    return cells;
  }

  processedContent = processedContent.replace(/\[[\d:]+\]/g, '');

  const tokens = processedContent.split(/[,\s]+/).filter(Boolean);

  for (const token of tokens) {
    if (/^(rep|from|to|end|last|sts?|stitches?|times?|more|in|rib|row|rows?|as|form)$/i.test(token)) {
      continue;
    }
    const result = matchStitchAbbreviation(token);
    if (result) {
      cells.push({ stitchId: result.stitch.id, count: result.count });
    }
  }

  return cells;
}

const SECTION_PATTERNS = [
  /^(cuff|ribbing|rib|border|brim|hem|waistband)/i,
  /^(main\s*body|body|main\s*pattern|pattern|front|back|left\s*front|right\s*front)/i,
  /^(sleeve|sleeves|left\s*sleeve|right\s*sleeve)/i,
  /^(yoke|collar|neckband|neck)/i,
  /^(shoulder|shoulders)/i,
  /^(hood|pocket|flap|thumb|gusset)/i,
];

const SECTION_SUFFIX_MAP: Record<string, string> = {
  cuff: 'E',
  ribbing: 'E',
  rib: 'E',
  border: 'E',
  brim: 'E',
  hem: 'E',
  waistband: 'E',
  main: 'M',
  'main body': 'M',
  body: 'M',
  'main pattern': 'M',
  pattern: 'M',
  front: 'M',
  back: 'M',
  'left front': 'M',
  'right front': 'M',
  sleeve: 'S',
  sleeves: 'S',
  'left sleeve': 'S',
  'right sleeve': 'S',
  yoke: 'Y',
  collar: 'N',
  neckband: 'N',
  neck: 'N',
  shoulder: 'Sh',
  shoulders: 'Sh',
  hood: 'H',
  pocket: 'Pk',
  flap: 'Fl',
  thumb: 'Th',
  gusset: 'G',
};

function getSectionSuffix(section: string): string {
  const lower = section.toLowerCase().trim();
  if (SECTION_SUFFIX_MAP[lower]) return SECTION_SUFFIX_MAP[lower];
  for (const key of Object.keys(SECTION_SUFFIX_MAP)) {
    if (lower.startsWith(key)) return SECTION_SUFFIX_MAP[key];
  }
  return section.charAt(0).toUpperCase();
}

function detectSection(line: string): string | null {
  const cleaned = line.replace(/[:\-–—]+$/, '').trim();
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
  }
  if (/^[A-Z][A-Z\s]{2,}$/.test(cleaned) && !/^(ROW|\d)/.test(cleaned)) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }
  return null;
}

const GARMENT_NAME_KEYWORDS = [
  /\b(jacket|cardigan|sweater|pullover|jumper|vest|coat|poncho|cape|shrug|bolero)\b/i,
  /\b(sleeve|sleeves|left\s+sleeve|right\s+sleeve)\b/i,
  /\b(front|back|left\s+front|right\s+front|jacket\s+back|jacket\s+front)\b/i,
  /\b(hood|collar|neckband|pocket|flap|yoke|bodice)\b/i,
  /\b(scarf|shawl|wrap|cowl|stole|blanket|throw|afghan)\b/i,
  /\b(hat|beanie|beret|cap|headband|earflap)\b/i,
  /\b(sock|socks|bootie|booties|slipper|slippers|mitten|mittens|glove|gloves)\b/i,
  /\b(skirt|dress|top|tank|tunic|tee)\b/i,
  /\b(panel|strip|square|motif|block|insert|border\s+panel)\b/i,
  /\b(shoulder|shoulders|gusset|thumb|cuff|ribbing|waistband|hem)\b/i,
];

function detectGarmentName(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.match(/^\d+(st|nd|rd|th)\s*row/i) || line.match(/^row\s*\d+/i)) continue;
    
    for (const pattern of GARMENT_NAME_KEYWORDS) {
      if (pattern.test(line)) {
        const cleaned = line.replace(/[:\-–—]+$/, '').trim();
        if (cleaned.length > 0 && cleaned.length <= 60) {
          return cleaned;
        }
      }
    }
  }
  
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i];
    if (line.match(/^\d+(st|nd|rd|th)\s*row/i) || line.match(/^row\s*\d+/i)) continue;
    const cleaned = line.replace(/[:\-–—]+$/, '').trim();
    if (/^[A-Z][A-Za-z\s]{2,40}$/.test(cleaned) && !/^(row|round|rnd|note|using|change)/i.test(cleaned)) {
      return cleaned;
    }
  }
  
  return null;
}

export function parsePatternText(text: string): ParsedPattern {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: PatternRow[] = [];
  const notes: string[] = [];
  let title = '';

  const garmentName = detectGarmentName(text);
  if (garmentName) {
    title = garmentName;
  } else if (lines.length > 0 && !lines[0].match(/^\d+(st|nd|rd|th)\s*row/i) && !lines[0].match(/^row\s*\d+/i)) {
    const possibleSection = detectSection(lines[0]);
    if (!possibleSection) {
      const firstLine = lines[0].replace(/[:\-–—]+$/, '').trim();
      if (firstLine.length > 0 && firstLine.length <= 60 && !/^\d+$/.test(firstLine)) {
        title = firstLine;
      }
    }
  }

  let rowNum = 0;
  let currentSection = 'Main';
  const sectionRowCounts: Record<string, number> = {};
  const seenRowNumbersInSection: Record<string, Set<number>> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const sectionName = detectSection(line);
    if (sectionName) {
      currentSection = sectionName;
      if (!sectionRowCounts[currentSection]) {
        sectionRowCounts[currentSection] = 0;
      }
      continue;
    }

    const rowMatch = line.match(/^(\d+)(?:st|nd|rd|th)?\s*row\.?\s*(.+)/i) ||
                     line.match(/^row\s*(\d+)\.?\s*(.+)/i);

    if (rowMatch) {
      rowNum = parseInt(rowMatch[1], 10);
      const content = rowMatch[2];
      const sectionKey = currentSection.toLowerCase().replace(/\s+/g, '-');
      if (!sectionRowCounts[currentSection]) {
        sectionRowCounts[currentSection] = 0;
      }
      sectionRowCounts[currentSection]++;
      const rowId = `${sectionKey}-r${rowNum}-${sectionRowCounts[currentSection]}`;

      const asMatch = content.match(/^as\s+(\d+)(?:st|nd|rd|th)?\s*row\.?$/i);
      if (asMatch) {
        const refRow = parseInt(asMatch[1], 10);
        const referenced = rows.find((r) => r.rowNumber === refRow && r.section === currentSection);
        if (referenced) {
          rows.push({
            id: rowId,
            rowNumber: rowNum,
            section: currentSection,
            label: `Row ${rowNum}`,
            stitches: [...referenced.stitches],
          });
          continue;
        }
      }

      const stitches = parseRowContent(content);
      if (stitches.length > 0) {
        if (!seenRowNumbersInSection[currentSection]) {
          seenRowNumbersInSection[currentSection] = new Set();
        }
        seenRowNumbersInSection[currentSection].add(rowNum);
        rows.push({
          id: rowId,
          rowNumber: rowNum,
          section: currentSection,
          label: `Row ${rowNum}`,
          stitches,
        });
      }
    } else if (i > 0) {
      const isInstruction = /^(using|change|these|work|dec|inc)/i.test(line);
      if (isInstruction) {
        notes.push(line);
      }
    }
  }

  const usedStitchIds = new Set<string>();
  for (const row of rows) {
    for (const cell of row.stitches) {
      usedStitchIds.add(cell.stitchId);
    }
  }

  const hasRowNumberOverlap = detectRowNumberOverlap(rows);
  if (hasRowNumberOverlap) {
    assignUniqueSectionLabels(rows);
  }

  return {
    title,
    notes,
    rows,
    usedStitches: Array.from(usedStitchIds),
  };
}

function detectRowNumberOverlap(rows: PatternRow[]): boolean {
  const sectionRowNumbers: Record<string, Set<number>> = {};
  for (const row of rows) {
    if (!sectionRowNumbers[row.section]) {
      sectionRowNumbers[row.section] = new Set();
    }
    sectionRowNumbers[row.section].add(row.rowNumber);
  }

  const sections = Object.keys(sectionRowNumbers);
  if (sections.length <= 1) {
    const rowNumbers = rows.map((r) => r.rowNumber);
    const seen = new Set<number>();
    let prevNum = -1;
    let resetDetected = false;
    for (const num of rowNumbers) {
      if (seen.has(num) && num <= prevNum) {
        resetDetected = true;
        break;
      }
      seen.add(num);
      prevNum = num;
    }
    if (resetDetected && sections.length === 1) {
      splitSingleSectionByReset(rows);
      return true;
    }
    return false;
  }

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const setA = sectionRowNumbers[sections[i]];
      const setB = sectionRowNumbers[sections[j]];
      for (const num of setA) {
        if (setB.has(num)) return true;
      }
    }
  }
  return false;
}

function splitSingleSectionByReset(rows: PatternRow[]): void {
  let sectionIndex = 0;
  const sectionNames = ['Edge', 'Main', 'Section C', 'Section D', 'Section E'];
  let prevRowNum = -1;

  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].rowNumber <= prevRowNum) {
      sectionIndex++;
    }
    const sectionName = sectionIndex < sectionNames.length ? sectionNames[sectionIndex] : `Section ${sectionIndex + 1}`;
    rows[i].section = sectionName;
    const sectionKey = sectionName.toLowerCase().replace(/\s+/g, '-');
    rows[i].id = `${sectionKey}-r${rows[i].rowNumber}-${i}`;
    prevRowNum = rows[i].rowNumber;
  }
}

function assignUniqueSectionLabels(rows: PatternRow[]): void {
  const sectionOrder: string[] = [];
  for (const row of rows) {
    if (!sectionOrder.includes(row.section)) {
      sectionOrder.push(row.section);
    }
  }

  for (const row of rows) {
    const suffix = getSectionSuffix(row.section);
    row.label = `Row ${row.rowNumber} ${suffix}`;
  }
}

export function expandStitchCells(stitches: StitchCell[]): string[] {
  const expanded: string[] = [];
  for (const cell of stitches) {
    for (let i = 0; i < cell.count; i++) {
      expanded.push(cell.stitchId);
    }
  }
  return expanded;
}
