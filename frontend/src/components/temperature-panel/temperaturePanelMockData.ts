/** Mock papers: each has a studied temperature range [minC, maxC] in °C. */

export type PaperTempRange = {
  id: string;
  minC: number;
  maxC: number;
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(0x9e3779b9);

function randBetween(a: number, b: number): number {
  return a + rnd() * (b - a);
}

/** Build a plausible spread of ranges across -10…100 °C. */
export function buildMockPaperTempRanges(count: number): PaperTempRange[] {
  const papers: PaperTempRange[] = [];
  for (let i = 0; i < count; i++) {
    const center = randBetween(-5, 95);
    const halfSpan = randBetween(2, 18);
    let minC = center - halfSpan;
    let maxC = center + halfSpan;
    minC = Math.max(-10, Math.min(100, minC));
    maxC = Math.max(-10, Math.min(100, maxC));
    if (minC > maxC) [minC, maxC] = [maxC, minC];
    if (maxC - minC < 1) maxC = Math.min(100, minC + 1);
    papers.push({
      id: `p-${i + 1}`,
      minC,
      maxC,
    });
  }
  return papers;
}

export const MOCK_PAPER_TEMP_RANGES: PaperTempRange[] =
  buildMockPaperTempRanges(72);
