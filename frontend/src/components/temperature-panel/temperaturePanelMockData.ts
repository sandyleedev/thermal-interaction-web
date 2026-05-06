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

/** Triangular-ish noise in roughly [-spread, spread]. */
function clusterJitter(spread: number): number {
  return (rnd() + rnd() + rnd() - 1.5) * (spread / 1.2);
}

/**
 * Study midpoint °C: three common lab bands + a broad “elsewhere” draw so KDE keeps
 * peaks but shoulders/tails are not empty.
 */
function sampleStudyCenterC(): number {
  const u = rnd();
  let center: number;
  if (u < 0.26) {
    center = 22 + clusterJitter(10);
  } else if (u < 0.52) {
    center = 46 + clusterJitter(11);
  } else if (u < 0.74) {
    center = 71 + clusterJitter(13);
  } else if (u < 0.88) {
    /* Uniform between clusters / extremes */
    center = randBetween(-4, 94);
  } else {
    /* Light shoulders: mild pull toward mid-gaps without new sharp peaks */
    const gapPick = rnd();
    if (gapPick < 0.45) {
      center = randBetween(2, 14);
    } else if (gapPick < 0.78) {
      center = randBetween(32, 40);
    } else {
      center = randBetween(58, 66);
    }
  }
  return Math.min(95, Math.max(-5, center));
}

/** Build a plausible spread of ranges across -10…100 °C. */
export function buildMockPaperTempRanges(count: number): PaperTempRange[] {
  const papers: PaperTempRange[] = [];
  for (let i = 0; i < count; i++) {
    const center = sampleStudyCenterC();
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
  buildMockPaperTempRanges(200);
