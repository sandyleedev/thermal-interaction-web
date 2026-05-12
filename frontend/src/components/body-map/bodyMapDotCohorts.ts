import type {
  BodyMapDetailRegion,
  BodyMapPlacementRegion,
} from "@/lib/research/researchPapers";

export type DotCohortPlan =
  | { kind: "dual"; left: readonly number[]; right: readonly number[] }
  | { kind: "single"; indices: readonly number[] };

function inferSideFromInkscapeLabel(label: string): "left" | "right" | null {
  const low = label.trim().toLowerCase();
  if (low.startsWith("left")) return "left";
  if (low.startsWith("right")) return "right";
  /** Source SVG typo `RIghtFoot` → `rightfoot` without leading `r` from `right`. */
  if (/^r[i]?ght/i.test(label.trim())) return "right";
  return null;
}

function indicesWhere(
  labels: readonly string[],
  pred: (lab: string, index: number) => boolean,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (pred(labels[i]!, i)) out.push(i);
  }
  return out;
}

function allLeftRightDual(labels: readonly string[]): DotCohortPlan | null {
  const left = indicesWhere(labels, (lab) => inferSideFromInkscapeLabel(lab) === "left");
  const right = indicesWhere(labels, (lab) => inferSideFromInkscapeLabel(lab) === "right");
  if (left.length === 0 || right.length === 0) return null;
  return { kind: "dual", left, right };
}

function dualFiltered(
  labels: readonly string[],
  pred: (lab: string) => boolean,
): DotCohortPlan | null {
  const left = indicesWhere(
    labels,
    (lab) => inferSideFromInkscapeLabel(lab) === "left" && pred(lab),
  );
  const right = indicesWhere(
    labels,
    (lab) => inferSideFromInkscapeLabel(lab) === "right" && pred(lab),
  );
  if (left.length === 0 || right.length === 0) return null;
  return { kind: "dual", left, right };
}

function singleFiltered(
  labels: readonly string[],
  pred: (lab: string) => boolean,
): DotCohortPlan {
  return { kind: "single", indices: indicesWhere(labels, (lab) => pred(lab)) };
}

function singleAll(labels: readonly string[]): DotCohortPlan {
  return { kind: "single", indices: labels.map((_, i) => i) };
}

/**
 * Maps a resolved body site to silhouette subpath index cohorts for L1 dot placement.
 * Returns `null` when there are no usable Inkscape labels — caller falls back to legacy L/R bbox pairing.
 */
export function dotCohortPlanForResolvedSite(
  partId: BodyMapPlacementRegion,
  labels: readonly string[],
  resolved: BodyMapDetailRegion,
): DotCohortPlan | null {
  if (labels.length === 0 || !labels.some((l) => l.trim().length > 0)) {
    return null;
  }

  const sub = resolved.subregion.trim().toLowerCase();
  if (resolved.parent !== partId) return null;

  switch (partId) {
    case "arm": {
      if (sub === "general") return allLeftRightDual(labels);
      if (sub === "forearm") {
        return (
          dualFiltered(labels, (lab) => /fore/i.test(lab)) ?? allLeftRightDual(labels)
        );
      }
      if (sub === "upper-arm" || sub === "upper arm") {
        return (
          dualFiltered(labels, (lab) => /upper/i.test(lab)) ?? allLeftRightDual(labels)
        );
      }
      return allLeftRightDual(labels);
    }
    case "leg": {
      if (sub === "general") return allLeftRightDual(labels);
      if (sub === "thigh") {
        return dualFiltered(labels, (lab) => /thigh/i.test(lab)) ?? allLeftRightDual(labels);
      }
      if (sub === "crural" || sub === "crural-region") {
        return dualFiltered(labels, (lab) => /crural/i.test(lab)) ?? allLeftRightDual(labels);
      }
      return allLeftRightDual(labels);
    }
    case "wrist":
    case "hand":
    case "ankle":
    case "foot":
      return allLeftRightDual(labels);
    case "head": {
      if (sub === "general") return singleAll(labels);
      if (sub === "ear") {
        const s = singleFiltered(labels, (lab) => /ear/i.test(lab));
        return s.indices.length > 0 ? s : singleAll(labels);
      }
      if (sub === "forehead")
        return preferOrAll(labels, (lab) => /forehead/i.test(lab));
      if (sub === "nose") return preferOrAll(labels, (lab) => /nose/i.test(lab));
      if (sub === "lip") return preferOrAll(labels, (lab) => /lip/i.test(lab));
      if (sub === "cheek")
        return dualFiltered(labels, (lab) => /cheek/i.test(lab)) ?? singleAll(labels);
      if (sub === "tongue") return preferOrAll(labels, (lab) => /tongue/i.test(lab));
      return singleAll(labels);
    }
    case "neck":
      return labels.length <= 1
        ? { kind: "single", indices: [0] }
        : singleAll(labels);
    case "torso": {
      if (sub === "general") return singleAll(labels);
      if (sub === "shoulder") {
        return (
          dualFiltered(labels, (lab) => /shoulder/i.test(lab)) ?? singleAll(labels)
        );
      }
      if (sub === "chest") return preferOrAll(labels, (lab) => /chest/i.test(lab));
      if (sub === "abdomen") return preferOrAll(labels, (lab) => /abdomen/i.test(lab));
      if (sub === "back") return singleAll(labels);
      return singleAll(labels);
    }
    default:
      return null;
  }
}

function preferOrAll(labels: readonly string[], pred: (lab: string) => boolean): DotCohortPlan {
  const s = singleFiltered(labels, pred);
  return s.indices.length > 0 ? s : singleAll(labels);
}
