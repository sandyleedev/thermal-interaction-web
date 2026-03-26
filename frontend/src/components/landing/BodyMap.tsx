import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import {
  BODY_MAP_COUNT_VISUAL_WEIGHT,
  BODY_MAP_DENSITY_VISUAL_WEIGHT,
  getMergedBodyPartBBoxArea,
  paperCountToDotCountFromBlendShare,
  sampleDotsInMergedBodyPartPaths,
  type BodySubpath,
} from "@/components/landing/bodyMapSampleDots";

type TooltipState = { label: string; count: number; x: number; y: number };

const BODY_MAP_HEAT_FILL = "#fda4af";
const BODY_MAP_DOT_FILL_OPACITY = 0.2;

/** Inner `g` translate (path data + clip live in this space). */
const BODY_MAP_INNER_TX = -59.365521;

type BodyPart = {
  id: string;
  label: string;
  subpaths: BodySubpath[];
};

function paperCountForPart(
  partId: string,
  raw: Record<string, number>,
): number {
  switch (partId) {
    case "arms":
      return (
        raw.arms ??
        (raw.leftArm ?? 0) + (raw.rightArm ?? 0)
      );
    case "legs":
      return (
        raw.legs ??
        (raw.leftLeg ?? 0) + (raw.rightLeg ?? 0)
      );
    case "hands":
      return (
        raw.hands ??
        (raw.leftHand ?? 0) + (raw.rightHand ?? 0)
      );
    case "feet":
      return (
        raw.feet ?? (raw.leftFoot ?? 0) + (raw.rightFoot ?? 0)
      );
    default:
      return raw[partId] ?? 0;
  }
}

const BODY_PARTS: BodyPart[] = [
  {
    id: "head",
    label: "Head",
    subpaths: [
      {
        d: "M 115.76117,14.952482 A 12.299625,14.952485 0 0 1 103.46155,29.904967 12.299625,14.952485 0 0 1 91.161922,14.952482 12.299625,14.952485 0 0 1 103.46155,-2.8610229e-6 12.299625,14.952485 0 0 1 115.76117,14.952482 Z",
      },
    ],
  },
  {
    id: "torso",
    label: "Torso",
    subpaths: [
      {
        d: "M 85.0 32.799 H 120.102 C 120.35 52 120.0 72 118.8 88 C 117.8 96 116.2 101 113.5 103.5 C 110.5 104.8 106 105.2 102.5 105 C 99 105.2 94.5 104.5 91.5 103.5 C 88.8 101 87.2 96 86.2 88 C 85.5 78 85.1 52 85.0 32.799 Z",
      },
    ],
  },
  {
    id: "arms",
    label: "Arms",
    subpaths: [
      {
        transform: "rotate(12.503308)",
        d: "m 90.71978,14.939092 h 0.736908 c 3.99404,0 7.209458,2.904158 7.209458,6.511566 v 54.54158 c 0,3.607408 -3.215418,6.511566 -7.209458,6.511566 H 90.71978 c -3.994039,0 -7.209457,-2.904158 -7.209457,-6.511566 v -54.54158 c 0,-3.607408 3.215418,-6.511566 7.209457,-6.511566 z",
      },
      {
        transform: "rotate(-11.24316)",
        d: "m 112.87561,56.518188 h 0.73691 c 3.99404,0 7.20946,2.904159 7.20946,6.511567 v 54.541575 c 0,3.60741 -3.21542,6.51157 -7.20946,6.51157 h -0.73691 c -3.99404,0 -7.20946,-2.90416 -7.20946,-6.51157 V 63.029755 c 0,-3.607408 3.21542,-6.511567 7.20946,-6.511567 z",
      },
    ],
  },
  {
    id: "legs",
    label: "Legs",
    subpaths: [
      {
        transform:
          "matrix(0.99812088,0.06127571,0.01525473,0.99988364,0,0)",
        d: "m 89.010947,88.5 h 1.061756 c 5.75472,0 10.387577,3.48197 10.387577,7.80711 v 78.39312 c 0,4.32514 -4.632857,7.8071 -10.387577,7.8071 h -1.061756 c -5.754719,0 -10.38758,-3.48196 -10.38758,-7.8071 v -78.39312 c 0,-4.32514 4.632861,-7.80711 10.38758,-7.80711 z",
      },
      {
        transform:
          "matrix(0.99812088,0.06127571,0.01525473,0.99988364,0,0)",
        d: "m 112.33839,87.263 h 1.06176 c 5.75472,0 10.38758,3.48197 10.38758,7.8071 v 78.39313 c 0,4.32514 -4.63286,7.8071 -10.38758,7.8071 h -1.06176 c -5.75472,0 -10.38758,-3.48196 -10.38758,-7.8071 V 95.0801 c 0,-4.32513 4.63286,-7.8071 10.38758,-7.8071 z",
      },
    ],
  },
  {
    id: "hands",
    label: "Hands",
    subpaths: [
      {
        transform:
          "matrix(0.99969357,0.02475428,0.0377978,0.99928541,0,0)",
        d: "m 63.14005,97.228271 h 0.768476 c 4.165151,0 7.518323,1.018716 7.518323,2.284117 v 19.132002 c 0,1.2654 -3.353172,2.28411 -7.518323,2.28411 H 63.14005 c -4.165151,0 -7.518323,-1.01871 -7.518323,-2.28411 V 99.512388 c 0,-1.265401 3.353172,-2.284117 7.518323,-2.284117 z",
      },
      {
        transform:
          "matrix(0.99969357,0.02475428,0.0377978,0.99928541,0,0)",
        d: "m 135.30823,95.196106 h 0.76848 c 4.16515,0 7.51832,1.018716 7.51832,2.284116 v 19.131998 c 0,1.2654 -3.35317,2.28412 -7.51832,2.28412 h -0.76848 c -4.16515,0 -7.51832,-1.01872 -7.51832,-2.28412 V 97.480222 c 0,-1.2654 3.35317,-2.284116 7.51832,-2.284116 z",
      },
    ],
  },
  {
    id: "feet",
    label: "Feet",
    subpaths: [
      {
        transform:
          "matrix(0.99978513,0.02072885,0.04512831,0.9989812,0,0)",
        d: "m 85.760105,185.75214 h 0.768405 c 4.164769,0 7.517634,0.85323 7.517634,1.91309 v 16.02425 c 0,1.05985 -3.352865,1.91309 -7.517634,1.91309 h -0.768405 c -4.16477,0 -7.517635,-0.85324 -7.517635,-1.91309 v -16.02425 c 0,-1.05986 3.352865,-1.91309 7.517635,-1.91309 z",
      },
      {
        transform:
          "matrix(0.99978513,0.02072885,0.04512831,0.9989812,0,0)",
        d: "m 103.12097,185.35567 h 0.7684 c 4.16477,0 7.51764,0.85324 7.51764,1.91309 v 16.02425 c 0,1.05986 -3.35287,1.91309 -7.51764,1.91309 h -0.7684 c -4.164772,0 -7.517637,-0.85323 -7.517637,-1.91309 v -16.02425 c 0,-1.05985 3.352865,-1.91309 7.517637,-1.91309 z",
      },
    ],
  },
];

const OUTLINE_D =
  "m 104.265,117.959 c -0.304,3.58 2.126,22.529 3.38,29.959 0.597,3.52 2.234,9.255 1.645,12.3 -0.841,4.244 -1.084,9.736 -0.621,12.934 0.292,1.942 1.211,10.899 -0.104,14.175 -0.688,1.718 -1.949,10.522 -1.949,10.522 -3.285,8.294 -1.431,7.886 -1.431,7.886 1.017,1.248 2.759,0.098 2.759,0.098 1.327,0.846 2.246,-0.201 2.246,-0.201 1.139,0.943 2.467,-0.116 2.467,-0.116 1.431,0.743 2.758,-0.627 2.758,-0.627 0.822,0.414 1.023,-0.109 1.023,-0.109 2.466,-0.158 -1.376,-8.05 -1.376,-8.05 -0.92,-7.088 0.913,-11.033 0.913,-11.033 6.004,-17.805 6.309,-22.53 3.909,-29.24 -0.676,-1.937 -0.847,-2.704 -0.536,-3.545 0.719,-1.941 0.195,-9.748 1.072,-12.848 1.692,-5.979 3.361,-21.142 4.231,-28.217 1.169,-9.53 -4.141,-22.308 -4.141,-22.308 -1.163,-5.2 0.542,-23.727 0.542,-23.727 2.381,3.705 2.29,10.245 2.29,10.245 -0.378,6.859 5.541,17.342 5.541,17.342 2.844,4.332 3.921,8.442 3.921,8.747 0,1.248 -0.273,4.269 -0.273,4.269 l 0.109,2.631 c 0.049,0.67 0.426,2.977 0.365,4.092 -0.444,6.862 0.646,5.571 0.646,5.571 0.92,0 1.931,-5.522 1.931,-5.522 0,1.424 -0.348,5.687 0.42,7.295 0.919,1.918 1.595,-0.329 1.607,-0.78 0.243,-8.737 0.768,-6.448 0.768,-6.448 0.511,7.088 1.139,8.689 2.265,8.135 0.853,-0.407 0.073,-8.506 0.073,-8.506 1.461,4.811 2.569,5.577 2.569,5.577 2.411,1.693 0.92,-2.983 0.585,-3.909 -1.784,-4.92 -1.839,-6.625 -1.839,-6.625 2.229,4.421 3.909,4.257 3.909,4.257 2.174,-0.694 -1.9,-6.954 -4.287,-9.953 -1.218,-1.528 -2.789,-3.574 -3.245,-4.789 -0.743,-2.058 -1.304,-8.674 -1.304,-8.674 -0.225,-7.807 -2.155,-11.198 -2.155,-11.198 -3.3,-5.282 -3.921,-15.135 -3.921,-15.135 l -0.146,-16.635 c -1.157,-11.347 -9.518,-11.429 -9.518,-11.429 -8.451,-1.258 -9.627,-3.988 -9.627,-3.988 -1.79,-2.576 -0.767,-7.514 -0.767,-7.514 1.485,-1.208 2.058,-4.415 2.058,-4.415 2.466,-1.891 2.345,-4.658 1.206,-4.628 -0.914,0.024 -0.707,-0.733 -0.707,-0.733 C 115.068,0.636 104.01,0 104.01,0 h -1.688 c 0,0 -11.063,0.636 -9.523,13.089 0,0 0.207,0.758 -0.715,0.733 -1.136,-0.03 -1.242,2.737 1.215,4.628 0,0 0.572,3.206 2.058,4.415 0,0 1.023,4.938 -0.767,7.514 0,0 -1.172,2.73 -9.627,3.988 0,0 -8.375,0.082 -9.514,11.429 l -0.158,16.635 c 0,0 -0.609,9.853 -3.922,15.135 0,0 -1.921,3.392 -2.143,11.198 0,0 -0.563,6.616 -1.303,8.674 -0.451,1.209 -2.021,3.255 -3.249,4.789 -2.408,2.993 -6.455,9.24 -4.29,9.953 0,0 1.689,0.164 3.909,-4.257 0,0 -0.046,1.693 -1.827,6.625 -0.35,0.914 -1.839,5.59 0.573,3.909 0,0 1.117,-0.767 2.569,-5.577 0,0 -0.779,8.099 0.088,8.506 1.133,0.555 1.751,-1.047 2.262,-8.135 0,0 0.524,-2.289 0.767,6.448 0.012,0.451 0.673,2.698 1.596,0.78 0.779,-1.608 0.429,-5.864 0.429,-7.295 0,0 0.999,5.522 1.933,5.522 0,0 1.099,1.291 0.648,-5.571 -0.073,-1.121 0.32,-3.422 0.369,-4.092 l 0.106,-2.631 c 0,0 -0.274,-3.014 -0.274,-4.269 0,-0.311 1.078,-4.415 3.921,-8.747 0,0 5.913,-10.488 5.532,-17.342 0,0 -0.082,-6.54 2.299,-10.245 0,0 1.69,18.526 0.545,23.727 0,0 -5.319,12.778 -4.146,22.308 0.864,7.094 2.53,22.237 4.226,28.217 0.886,3.094 0.362,10.899 1.072,12.848 0.32,0.847 0.152,1.627 -0.536,3.545 -2.387,6.71 -2.083,11.436 3.921,29.24 0,0 1.848,3.945 0.914,11.033 0,0 -3.836,7.892 -1.379,8.05 0,0 0.192,0.523 1.023,0.109 0,0 1.327,1.37 2.761,0.627 0,0 1.328,1.06 2.463,0.116 0,0 0.91,1.047 2.237,0.201 0,0 1.742,1.175 2.777,-0.098 0,0 1.839,0.408 -1.435,-7.886 0,0 -1.254,-8.793 -1.945,-10.522 -1.318,-3.275 -0.387,-12.251 -0.106,-14.175 0.453,-3.216 0.21,-8.695 -0.618,-12.934 -0.606,-3.038 1.035,-8.774 1.641,-12.3 1.245,-7.423 3.685,-26.373 3.38,-29.959 l 1.008,0.354 c 0.722,0.002 1.178,-0.351 1.178,-0.351 z";

/** Mock paper counts for density heatmap prototype (replace with API data later). */
const DEFAULT_PAPER_COUNTS: Record<string, number> = {
  head: 96,
  torso: 210,
  arms: 80,
  legs: 120,
  hands: 223,
  feet: 69,
};

export type BodyMapVariant = "dots" | "blur";

export type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  /** dots: point cloud (area-normalized density). blur: soft filled heat per region. */
  variant?: BodyMapVariant;
};

export function BodyMap({
  paperCountsByPart = DEFAULT_PAPER_COUNTS,
  variant = "dots",
}: BodyMapProps) {
  const uid = useId().replace(/:/g, "");
  const clipPathId = `body-map-silhouette-${uid}`;
  const hoverGradientId = `body-map-hover-sky-${uid}`;
  const softFillFilterId = `body-map-soft-fill-${uid}`;
  const heatmapBlurId = `body-map-heat-blur-${uid}`;
  const torsoHeatRadialId = `body-map-torso-heat-radial-${uid}`;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [dotsByPartId, setDotsByPartId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});
  const [partBBoxArea, setPartBBoxArea] = useState<Record<
    string,
    number
  > | null>(null);

  const paperCountsKey = useMemo(
    () => JSON.stringify(paperCountsByPart),
    [paperCountsByPart],
  );

  const partPaperMap = useMemo(() => {
    const raw = JSON.parse(paperCountsKey) as Record<string, number>;
    const m: Record<string, number> = {};
    for (const p of BODY_PARTS) {
      m[p.id] = paperCountForPart(p.id, raw);
    }
    return m;
  }, [paperCountsKey]);

  /** Blend max-normalized count + density so small-area parts do not always “win” visually. */
  const visualMetrics = useMemo(() => {
    if (!partBBoxArea) return null;
    const densities: Record<string, number> = {};
    const papersById: Record<string, number> = {};
    for (const p of BODY_PARTS) {
      const c = partPaperMap[p.id] ?? 0;
      papersById[p.id] = c;
      const a = Math.max(partBBoxArea[p.id] ?? 1, 1e-9);
      densities[p.id] = c / a;
    }
    const maxD = Math.max(1e-12, ...Object.values(densities));
    const maxPapers = Math.max(1e-12, ...Object.values(papersById));
    const blends: Record<string, number> = {};
    for (const p of BODY_PARTS) {
      const c = papersById[p.id] ?? 0;
      const countShare = c / maxPapers;
      const densityShare = densities[p.id] / maxD;
      blends[p.id] =
        BODY_MAP_COUNT_VISUAL_WEIGHT * countShare +
        BODY_MAP_DENSITY_VISUAL_WEIGHT * densityShare;
    }
    const maxBlend = Math.max(1e-12, ...Object.values(blends));
    return { densities, maxD, blends, maxBlend };
  }, [partPaperMap, partBBoxArea]);

  useLayoutEffect(() => {
    let cancelled = false;
    const areas: Record<string, number> = {};
    for (const part of BODY_PARTS) {
      areas[part.id] = getMergedBodyPartBBoxArea(part.subpaths);
    }
    queueMicrotask(() => {
      if (!cancelled) setPartBBoxArea(areas);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    if (!partBBoxArea || !visualMetrics || variant === "blur") {
      if (variant === "blur") {
        queueMicrotask(() => {
          if (!cancelled) setDotsByPartId({});
        });
      }
      return () => {
        cancelled = true;
      };
    }
    const counts = JSON.parse(paperCountsKey) as Record<string, number>;
    const next: Record<string, { x: number; y: number }[]> = {};
    for (const part of BODY_PARTS) {
      const papers = paperCountForPart(part.id, counts);
      const blend = visualMetrics.blends[part.id] ?? 0;
      const n = paperCountToDotCountFromBlendShare(
        papers,
        blend,
        visualMetrics.maxBlend,
      );
      next[part.id] = sampleDotsInMergedBodyPartPaths(part.subpaths, n);
    }
    queueMicrotask(() => {
      if (!cancelled) setDotsByPartId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [paperCountsKey, partBBoxArea, variant, visualMetrics]);

  const handlePartEnter = useCallback(
    (part: BodyPart) => {
      return (e: PointerEvent<SVGPathElement>) => {
        setHoveredPartId(part.id);
        setTooltip({
          label: part.label,
          count: partPaperMap[part.id] ?? 0,
          x: e.clientX,
          y: e.clientY,
        });
      };
    },
    [partPaperMap],
  );

  const handlePartMove = useCallback((e: PointerEvent<SVGPathElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const handlePartLeave = useCallback(() => {
    setHoveredPartId(null);
    setTooltip(null);
  }, []);

  return (
    <div className="body-map-root">
      <svg
        className="body-map-svg"
        width="100%"
        height="100%"
        viewBox="0 -4 88.593706 215.19324"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          variant === "blur"
            ? "Body map: blurred pink intensity blends total papers and papers-per-area across body regions."
            : "Body map: pink dots blend total paper count and area-normalized density across regions."
        }
      >
        <defs>
          <linearGradient
            id={hoverGradientId}
            gradientUnits="userSpaceOnUse"
            x1={10}
            y1={-4}
            x2={78}
            y2={215}
          >
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity={0.75} />
            <stop offset="50%" stopColor="#bae6fd" stopOpacity={0.65} />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.55} />
          </linearGradient>
          <filter
            id={softFillFilterId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" />
          </filter>
          <filter
            id={heatmapBlurId}
            x="-65%"
            y="-65%"
            width="230%"
            height="230%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="7.2" />
          </filter>
          <radialGradient
            id={torsoHeatRadialId}
            gradientUnits="objectBoundingBox"
            cx="0.5"
            cy="0.4"
            r="1.05"
          >
            <stop offset="0%" stopColor={BODY_MAP_HEAT_FILL} stopOpacity={0.72} />
            <stop
              offset="38%"
              stopColor={BODY_MAP_HEAT_FILL}
              stopOpacity={0.62}
            />
            <stop
              offset="62%"
              stopColor={BODY_MAP_HEAT_FILL}
              stopOpacity={0.45}
            />
            <stop
              offset="85%"
              stopColor={BODY_MAP_HEAT_FILL}
              stopOpacity={0.2}
            />
            <stop
              offset="100%"
              stopColor={BODY_MAP_HEAT_FILL}
              stopOpacity={0.06}
            />
          </radialGradient>
          <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
            <path
              transform={`translate(${BODY_MAP_INNER_TX})`}
              d={OUTLINE_D}
            />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipPathId})`}>
          <rect
            x={0}
            y={-4}
            width={88.593706}
            height={215.19324}
            fill="#0f172a"
          />
          <g
            id="layer1"
            transform={`translate(${BODY_MAP_INNER_TX})`}
            style={{ mixBlendMode: "screen" }}
          >
            {variant === "blur" && visualMetrics ? (
              <g
                filter={`url(#${heatmapBlurId})`}
                pointerEvents="none"
              >
                {BODY_PARTS.flatMap((part) => {
                  const share =
                    visualMetrics.maxBlend > 0
                      ? (visualMetrics.blends[part.id] ?? 0) /
                        visualMetrics.maxBlend
                      : 0;
                  const fillOpacity = Math.min(1, 0.1 + share * 0.72);
                  const heatFill =
                    part.id === "torso"
                      ? `url(#${torsoHeatRadialId})`
                      : BODY_MAP_HEAT_FILL;
                  return part.subpaths.map((sp, i) => (
                    <path
                      key={`heat-blur-${part.id}-${i}`}
                      d={sp.d}
                      transform={sp.transform}
                      fill={heatFill}
                      fillOpacity={fillOpacity}
                    />
                  ));
                })}
              </g>
            ) : null}
            {variant === "dots"
              ? BODY_PARTS.flatMap((part) => {
                  const dots = dotsByPartId[part.id] ?? [];
                  return dots.map((p, i) => (
                    <circle
                      key={`${part.id}-dot-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={1.7}
                      fill={BODY_MAP_HEAT_FILL}
                      fillOpacity={BODY_MAP_DOT_FILL_OPACITY}
                      pointerEvents="none"
                    />
                  ));
                })
              : null}
            {BODY_PARTS.flatMap((part) =>
              part.subpaths.map((sp, i) => (
                <path
                  key={`${part.id}-hit-${i}`}
                  id={`${part.id}-hit-${i}`}
                  d={sp.d}
                  transform={sp.transform}
                  fill={
                    hoveredPartId === part.id
                      ? `url(#${hoverGradientId})`
                      : "transparent"
                  }
                  fillOpacity={hoveredPartId === part.id ? 0.78 : 1}
                  filter={
                    hoveredPartId === part.id
                      ? `url(#${softFillFilterId})`
                      : undefined
                  }
                  stroke="none"
                  pointerEvents="all"
                  style={{ cursor: "pointer" }}
                  onPointerEnter={handlePartEnter(part)}
                  onPointerMove={handlePartMove}
                  onPointerLeave={handlePartLeave}
                />
              )),
            )}
          </g>
        </g>

        <g transform={`translate(${BODY_MAP_INNER_TX})`} pointerEvents="none">
          <path
            d={OUTLINE_D}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={0.55}
          />
        </g>
      </svg>

      {tooltip ? (
        <div
          className="body-map-tooltip"
          role="tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="body-map-tooltip-title">{tooltip.label}</div>
          <div className="body-map-tooltip-meta">
            {tooltip.count.toLocaleString()} papers
          </div>
        </div>
      ) : null}
      <p className="body-map-hint">
        {variant === "blur"
          ? "Intensity mixes total papers and papers-per-area so large high-count regions read stronger than small patches that only look hot by area."
          : "Dots use the same mix: mostly total volume, partly density—hover for exact paper counts."}
      </p>
    </div>
  );
}

export default BodyMap;
