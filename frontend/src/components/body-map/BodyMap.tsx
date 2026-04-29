import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import { BODY_MAP_OUTLINE_PATH_D, BODY_MAP_VIEW } from "./bodyMapOutlinePath";
import { type BodySubpath } from "./bodyMapSampleDots";
import {
  buildGlobalHeatmapScaleFromFullDatasetCounts,
  countToPerceptualNormalized,
  generateDotsForRegion,
  getRegionCountForBodyMapPart,
  mapCountToColor,
} from "./bodyMapVisualization";

type TooltipState = { label: string; count: number; x: number; y: number };

const BODY_MAP_DOT_FILL = "#fda4af";
const BODY_MAP_DOT_FILL_OPACITY = 0.62;
const BODY_MAP_DOT_RADIUS = 7.8;

/** Inner `g` translate (path data + clip live in this space). */
const BODY_MAP_INNER_TX = 0;

const BODY_MAP_SCALE_PIVOT_OX = 418.7415;
const BODY_MAP_SCALE_PIVOT_OY = 909.6845;
const BODY_MAP_CONTENT_SCALE_X = 1.04;
const BODY_MAP_CONTENT_SCALE_Y = 1;

const BODY_MAP_UNIFORM_SCALE_TRANSFORM = `translate(${BODY_MAP_SCALE_PIVOT_OX} ${BODY_MAP_SCALE_PIVOT_OY}) scale(${BODY_MAP_CONTENT_SCALE_X} ${BODY_MAP_CONTENT_SCALE_Y}) translate(${-BODY_MAP_SCALE_PIVOT_OX} ${-BODY_MAP_SCALE_PIVOT_OY})`;

type BodyPart = {
  id: string;
  label: string;
  subpaths: BodySubpath[];
};

const BODY_PARTS: BodyPart[] = [
  {
    id: "head",
    label: "Head",
    subpaths: [
      {
        d: "m 413.91602,109.68945 c -1,0.13526 -21.4408,1.85014 -29.8418,8.55533 -10.312,7.69855 -16.00588,11.25342 -21.54688,24.87778 -11.224,31.56363 -5.93554,52.78316 -7.93554,63.15913 -1.573,-1.40689 -1.59667,-3.85908 -2.88868,-5.50433 -1.12,-2.4956 -4.54406,-3.19369 -6.28906,-1.12382 -8.507,9.81277 6.78241,59.84168 16.06641,47.3282 2.041,24.37284 9.07812,37.83312 9.07812,37.83312 0.23307,1.58804 0.44697,3.13248 0.64258,4.63169 h 94.89063 c 0.19561,-1.49921 0.40951,-3.04365 0.64258,-4.63169 0,0 7.03712,-13.46028 9.07812,-37.83312 9.284,12.51348 24.57341,-37.51543 16.06641,-47.3282 -1.745,-2.06987 -5.16907,-1.37178 -6.28907,1.12382 -1.292,1.64525 -1.31567,4.09744 -2.88867,5.50433 -2,-10.37597 3.28846,-31.5955 -7.93555,-63.15913 -5.54099,-13.62436 -11.23487,-17.17923 -21.54687,-24.87778 -8.401,-6.70519 -28.8418,-8.42007 -29.8418,-8.55533 z",
      },
    ],
  },
  {
    id: "neck",
    label: "Neck",
    subpaths: [
      {
        d: "m 372.43555,286.92834 c -0.29622,0 -0.59049,0.002 -0.88477,0.006 4.32942,26.17789 -2.76176,33.09617 -12.67187,41.72358 -1.64453,1.37278 -4.22398,2.89161 -7.42969,4.42971 5.66753,2.61044 12.98105,4.1797 20.98633,4.1797 h 95.77929 c 7.20553,0 13.85128,-1.27065 19.24024,-3.42814 -3.95352,-1.79115 -7.12929,-3.58544 -9.04102,-5.18127 -9.91092,-8.62811 -17.00156,-15.54665 -12.66992,-41.72983 z",
      },
    ],
  },
  {
    id: "torso",
    label: "Torso",
    subpaths: [
      {
        d: "m 362.73828,322.16602 c -1.22015,1.45418 -2.51373,2.88146 -3.85937,4.34885 -7.712,8.06369 -35.99255,20.16583 -52.93555,19.78705 -7.03235,-0.11494 -15.37998,-0.59022 -24.04883,1.19192 v 199.8395 c 3.49802,-9.79607 6.98055,-19.29165 9.63477,-25.96783 27.04801,138.06061 18.53399,140.22825 3.20117,171.55438 h -0.15625 c -0.80496,1.65437 -1.68953,3.87355 -2.52734,5.71888 -0.90238,1.98541 -1.73911,3.78412 -2.66993,6.04767 -2.44665,5.94518 -4.94472,12.675 -7.46093,21.28233 -0.007,0.0252 -0.0141,0.0374 -0.0215,0.0626 -2e-4,6.8e-4 2e-4,9.9e-4 0,0.002 -5.01587,17.17707 -9.98522,40.71961 -14.17578,74.88941 2.11727,0.29502 0.78416,0.0412 2.99405,0.45015 l 45.02226,0.21558 207.85088,-0.21558 H 566.375 c 1.0959,0 2.17853,-0.0377 3.24609,-0.10961 -3.96727,-32.45643 -8.63547,-55.24879 -13.38281,-72.21199 v -0.0959 c -1.52955,-5.46605 -3.05317,-9.52834 -4.57812,-13.88422 -0.77016,-2.1997 -1.54958,-5.03958 -2.31055,-7.00278 -2.28675,-5.90057 -4.51819,-10.81846 -6.625,-15.14855 -15.49973,-31.85623 -24.15826,-32.69873 3.04492,-171.55438 2.86566,7.20801 6.69487,17.70378 10.46875,28.31449 V 347.6739 c -8.96891,-1.99288 -17.62964,-1.49063 -24.88867,-1.37198 -16.944,0.37878 -45.22355,-11.72336 -52.93555,-19.78705 -1.34564,-1.46739 -2.63922,-2.89467 -3.85937,-4.34885 z",
      },
    ],
  },
  {
    id: "arms",
    label: "Arms",
    subpaths: [
      {
        d: "M 282.79883 347.26367 C 265.29113 350.55437 246.32498 362.70822 234.16211 405.40625 C 224.32411 449.67725 243.68997 436.1802 218.29297 540.6582 C 212.03397 565.8572 209.02081 576.45534 202.13281 590.77734 C 156.65881 678.83234 177.95309 718.92136 150.99609 791.56836 C 144.95711 809.89619 141.86503 818.1953 139.75391 822.11133 C 144.16259 829.0869 152.70837 835.00028 163.38672 837.59766 L 179.87695 841.60938 C 181.68527 842.04922 183.48188 842.37601 185.25391 842.5957 C 183.8559 829.11194 180.94942 836.33661 233.60547 693.3457 C 233.60547 693.3457 238.90539 683.12769 247.40039 662.55469 C 257.21039 641.24469 253.38802 626.90252 267.16602 589.10352 C 267.48586 588.21752 279.98614 551.41067 288.48242 528.84766 C 288.48266 528.84703 288.48219 528.84633 288.48242 528.8457 L 324.04102 380.59961 C 326.96703 368.40066 315.16793 355.13793 297.58594 350.86133 L 282.80078 347.26367 L 282.79883 347.26367 z",
      },
      {
        d: "M 545.46875 346.23438 L 540.52734 347.34961 C 522.88199 351.33324 510.87919 364.30379 513.61719 376.43164 L 546.88672 523.79688 C 546.8875 523.79888 546.88789 523.80073 546.88867 523.80273 C 555.2651 545.38541 569.78775 588.14767 570.13281 589.10352 C 583.91081 626.90352 580.08844 641.24569 589.89844 662.55469 C 598.39344 683.12769 603.69141 693.3457 603.69141 693.3457 C 644.03015 802.88757 651.7621 824.2709 652.54297 834.34375 L 677.12891 828.79297 C 684.79898 827.06137 691.40119 823.63289 696.19141 819.3125 C 694.12308 814.61674 691.16947 806.35632 686.29688 791.56836 C 659.33988 718.92136 680.63611 678.83234 635.16211 590.77734 C 628.27411 576.45534 625.26095 565.8572 619.00195 540.6582 C 593.60495 436.1802 612.97081 449.67725 603.13281 405.40625 C 588.83759 355.22532 565.14546 347.23355 545.46875 346.23438 z",
      },
    ],
  },
  {
    id: "legs",
    label: "Legs",
    subpaths: [
      {
        d: "M 267.66406 800.38086 C 265.8095 815.5376 264.10861 832.78163 262.625 852.48438 C 256.917 957.52638 264.48645 929.19038 280.81445 1076.0273 C 312.53345 1365.3313 265.7278 1206.1888 316.4668 1460.3398 C 327.4568 1511.8348 326.30331 1505.199 328.32031 1516.623 C 330.60031 1537.986 326.53358 1538.1525 326.64258 1547.9375 C 326.08152 1567.226 330.2637 1561.0741 327.9668 1580.625 L 383.06641 1580.625 C 383.08148 1580.4279 383.09501 1580.2275 383.10742 1580.0254 C 376.61442 1552.6294 381.6425 1565.4756 379.0625 1549.5156 C 372.9175 1515.2026 371.95672 1522.2602 379.63672 1442.1992 C 386.62372 1376.3602 393.78442 1373.5229 387.35742 1305.3359 C 373.06142 1195.1859 387.13359 1236.3901 388.80859 1179.1191 C 390.31159 1111.7591 384.60916 1070.313 391.91016 1010.918 C 404.82146 906.96017 414.01222 917.8631 413.92188 873.02148 C 415.34587 872.80348 416.80641 872.7417 418.19141 872.3457 C 418.35341 872.0117 418.49795 871.68337 418.62695 871.35938 C 418.63395 871.36636 418.64044 871.37481 418.64844 871.38281 L 418.67188 871.35938 C 418.80088 871.68336 418.94542 872.0117 419.10742 872.3457 C 419.5081 872.46027 419.91551 872.54655 420.32617 872.61719 L 420.32617 800.38086 L 267.66406 800.38086 z",
      },
      {
        d: "M 420.07422 800.38086 L 420.07422 872.57227 C 421.16296 872.7791 422.2805 872.85363 423.37695 873.02148 C 422.38517 913.64755 432.43744 906.65736 445.38672 1010.918 C 452.68772 1070.312 446.98723 1111.7581 448.49023 1179.1191 C 450.16523 1236.3891 464.23741 1195.1859 449.94141 1305.3359 C 443.51441 1373.5219 450.67316 1376.3602 457.66016 1442.1992 C 465.34016 1522.2602 464.38133 1515.2026 458.23633 1549.5156 C 455.65633 1565.4756 460.68441 1552.6294 454.19141 1580.0254 C 454.20382 1580.2275 454.21735 1580.4279 454.23242 1580.625 L 509.33203 1580.625 C 507.03513 1561.0741 511.2173 1567.226 510.65625 1547.9375 C 510.76525 1538.1525 506.69656 1537.986 508.97656 1516.623 C 510.99356 1505.199 509.84008 1511.8348 520.83008 1460.3398 C 571.56908 1206.1888 524.76342 1365.3323 556.48242 1076.0273 C 572.81042 929.19034 580.38183 957.52637 574.67383 852.48438 C 573.19022 832.78164 571.48932 815.5376 569.63477 800.38086 L 420.07422 800.38086 z",
      },
    ],
  },
  {
    id: "hands",
    label: "Hands",
    subpaths: [
      {
        d: "M 140.84375 819.89062 C 137.84662 826.49908 136.7495 825.34884 134.05273 826.49414 C 114.13173 834.36114 101.20041 848.35016 100.56641 849.78516 C 91.643406 870.23916 77.237531 877.19886 80.644531 883.63086 C 81.540531 885.33286 83.963844 886.21872 85.589844 885.01172 C 90.778844 885.92172 98.327797 880.20311 101.7168 876.41211 C 105.8188 871.70611 105.09183 868.95573 113.04883 862.55273 C 114.87283 864.59973 110.89273 882.88622 109.92773 885.94922 C 105.05073 900.67822 83.360031 935.56919 92.332031 940.36719 C 93.277031 940.76719 94.56025 941.32108 95.40625 940.45508 C 96.95925 938.92508 98.935094 937.85198 100.24609 936.08398 C 108.27109 925.86598 117.81364 901.7237 124.30664 896.8457 C 127.58564 897.0697 125.90108 899.19291 119.83008 919.37891 C 116.15708 932.46291 114.68945 939.31836 114.68945 939.31836 C 104.56345 969.78436 120.91745 965.03495 126.18945 946.12695 C 126.63745 944.58995 135.91136 919.2148 136.31836 917.9668 C 137.55936 914.6758 140.92014 900.1617 145.11914 903.0957 C 145.76514 905.5647 144.78498 906.13823 141.58398 934.61523 C 138.98398 956.42823 138.34809 943.40502 138.87109 961.04102 C 138.95009 963.20502 143.30934 964.29825 145.15234 963.15625 C 155.69134 953.43325 157.84456 905.54577 163.22656 902.13477 C 166.89556 906.42777 167.49898 935.88847 169.20898 941.35547 C 171.86098 951.06047 176.65445 946.15675 177.18945 944.59375 C 181.01445 935.26975 177.00036 914.05708 177.81836 899.20508 C 177.81836 899.20508 182.18662 884.6753 185.01562 860.5293 C 186.79102 841.17933 183.82979 840.68058 184.94336 832.63477 C 184.71108 832.56389 184.47673 832.49549 184.24219 832.42773 L 140.84375 819.89062 z",
      },
      {
        d: "M 696.57422 820.16016 L 652.54492 834.38086 C 653.03855 840.8713 650.64335 842.67795 652.28125 860.5293 C 655.11025 884.6753 659.48047 899.20508 659.48047 899.20508 C 660.29847 914.05708 656.28242 935.26975 660.10742 944.59375 C 660.64242 946.15675 665.43784 951.06047 668.08984 941.35547 C 669.79984 935.88847 670.40131 906.42777 674.07031 902.13477 C 679.45231 905.54577 681.60553 953.43425 692.14453 963.15625 C 693.98753 964.29825 698.34873 963.20502 698.42773 961.04102 C 698.95073 943.40502 698.31484 956.42823 695.71484 934.61523 C 692.51384 906.13823 691.53173 905.5647 692.17773 903.0957 C 696.37673 900.1617 699.73752 914.6758 700.97852 917.9668 C 701.38552 919.2148 710.65942 944.58995 711.10742 946.12695 C 716.37942 965.03495 732.73538 969.78436 722.60938 939.31836 C 722.60938 939.31836 721.1398 932.46291 717.4668 919.37891 C 711.3958 899.19291 709.71319 897.0697 712.99219 896.8457 C 719.48519 901.7237 729.02578 925.86598 737.05078 936.08398 C 738.36178 937.85198 740.33958 938.92508 741.89258 940.45508 C 742.73858 941.32108 744.01984 940.76719 744.96484 940.36719 C 753.93684 935.56919 732.24614 900.67822 727.36914 885.94922 C 726.40414 882.88622 722.426 864.59973 724.25 862.55273 C 732.207 868.95573 731.48003 871.70611 735.58203 876.41211 C 738.97103 880.20311 746.51998 885.92172 751.70898 885.01172 C 753.33498 886.21872 755.75634 885.33286 756.65234 883.63086 C 760.05534 877.19886 745.65152 870.23916 736.72852 849.78516 C 736.09452 848.35016 723.16123 834.36114 703.24023 826.49414 C 700.58091 825.36474 699.47837 826.46634 696.57422 820.16016 z",
      },
    ],
  },
  {
    id: "feet",
    label: "Feet",
    subpaths: [
      {
        d: "M 326.88477 1557.9727 C 327.94334 1568.2535 331.1602 1564.7883 324.92969 1600.4668 C 319.93669 1624.6478 320.01791 1609.6818 317.25391 1637.8848 C 313.79091 1651.8618 303.34137 1690.616 318.10938 1690.334 C 319.39538 1697.974 323.65023 1699.4909 327.86523 1697.0469 C 327.18123 1699.5019 329.24586 1701.3386 330.63086 1703.0566 C 335.44386 1704.3786 335.39098 1704.086 337.45898 1702.502 C 338.95398 1708.293 342.63203 1708.2441 344.20703 1708.6621 C 348.97503 1710.1381 350.11128 1697.425 350.98828 1692.502 C 351.84428 1692.456 352.69306 1692.406 353.53906 1692.373 C 352.46706 1695.524 346.37883 1708.205 356.17383 1709.207 C 363.82483 1710.445 364.71539 1709.377 368.90039 1705.418 C 375.89239 1698.408 374.31044 1696.4774 375.52344 1684.7324 C 375.71444 1682.3484 381.20753 1678.1518 376.39453 1647.0898 C 374.53953 1631.1378 375.56322 1649.78 376.69922 1611.375 C 377.07022 1594.781 382.38442 1591.7984 383.10742 1580.0254 C 378.58782 1560.9558 379.65054 1561.3842 379.84375 1558.0234 C 379.10443 1557.9894 378.35778 1557.9727 377.60547 1557.9727 L 326.88477 1557.9727 z",
      },
      {
        d: "M 457.45117 1557.9727 C 457.63634 1561.3897 458.73391 1560.8591 454.19141 1580.0254 C 454.91441 1591.7984 460.22861 1594.781 460.59961 1611.375 C 461.73561 1649.78 462.75734 1631.1378 460.90234 1647.0898 C 456.08934 1678.1518 461.58439 1682.3484 461.77539 1684.7324 C 462.98839 1696.4774 461.40644 1698.408 468.39844 1705.418 C 472.58344 1709.377 473.474 1710.445 481.125 1709.207 C 490.92 1708.205 484.83177 1695.524 483.75977 1692.373 C 484.60577 1692.406 485.45455 1692.456 486.31055 1692.502 C 487.18755 1697.425 488.3238 1710.1381 493.0918 1708.6621 C 494.6668 1708.2441 498.34484 1708.293 499.83984 1702.502 C 501.90784 1704.086 501.85497 1704.3786 506.66797 1703.0566 C 508.05297 1701.3386 510.11759 1699.5019 509.43359 1697.0469 C 513.64859 1699.4909 517.90345 1697.974 519.18945 1690.334 C 533.95745 1690.616 523.50792 1651.8618 520.04492 1637.8848 C 517.28092 1609.6818 517.36019 1624.6478 512.36719 1600.4668 C 506.13667 1564.7883 509.35354 1568.2535 510.41211 1557.9727 L 457.45117 1557.9727 z",
      },
    ],
  },
];

export type BodyMapVariant = "countHeatmap" | "rawDots";

type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  /**
   * Full-dataset region counts used only for the fixed heatmap colour domain and legend.
   * When omitted, `paperCountsByPart` is used (e.g. static mock without filter context).
   */
  heatmapScaleReferenceCounts?: Record<string, number>;
  variant?: BodyMapVariant;
};

/** Softer glow spread (sqrt-normalized); matches earlier soft-blurred heatmap look. */
function heatmapRegionFillOpacity(perceptualT: number): number {
  return Math.min(1, 0.08 + perceptualT * 0.58);
}

export function BodyMap({
  paperCountsByPart = {},
  heatmapScaleReferenceCounts,
  variant = "countHeatmap",
}: BodyMapProps) {
  const uid = useId().replace(/:/g, "");
  const clipPathId = `body-map-silhouette-${uid}`;
  const hoverGradientId = `body-map-hover-sky-${uid}`;
  const softFillFilterId = `body-map-soft-fill-${uid}`;
  const heatmapBlurId = `body-map-heat-blur-${uid}`;
  const heatmapWideBlurId = `body-map-heat-blur-wide-${uid}`;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [dotsByPartId, setDotsByPartId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const paperCountsKey = useMemo(
    () => JSON.stringify(paperCountsByPart),
    [paperCountsByPart],
  );

  const partPaperMap = useMemo(() => {
    const raw = JSON.parse(paperCountsKey) as Record<string, number>;
    const m: Record<string, number> = {};
    for (const p of BODY_PARTS) {
      m[p.id] = getRegionCountForBodyMapPart(p.id, raw);
    }
    return m;
  }, [paperCountsKey]);

  const rawForGlobalHeatmapScale =
    heatmapScaleReferenceCounts ?? paperCountsByPart;

  const { colorDomain: countColorDomain, legendItems: heatmapColorLegend } =
    useMemo(
      () =>
        buildGlobalHeatmapScaleFromFullDatasetCounts(rawForGlobalHeatmapScale),
      [rawForGlobalHeatmapScale],
    );

  useLayoutEffect(() => {
    let cancelled = false;
    if (variant !== "rawDots") {
      queueMicrotask(() => {
        if (!cancelled) setDotsByPartId({});
      });
      return () => {
        cancelled = true;
      };
    }
    const counts = JSON.parse(paperCountsKey) as Record<string, number>;
    const next: Record<string, { x: number; y: number }[]> = {};
    for (const part of BODY_PARTS) {
      const papers = getRegionCountForBodyMapPart(part.id, counts);
      next[part.id] = generateDotsForRegion(part.subpaths, papers);
    }
    queueMicrotask(() => {
      if (!cancelled) setDotsByPartId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [paperCountsKey, variant]);

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

  const ariaLabel =
    variant === "countHeatmap"
      ? "Body map: soft heatmap — colour encodes paper count per region on a fixed full-dataset scale (square root); tooltip shows exact counts for the current filter."
      : "Body map: one dot per paper, placed randomly within each body region.";

  return (
    <div className="body-map-root">
      <div className="body-map-svg-wrap">
        <svg
          className="body-map-svg"
          width="100%"
          height="100%"
          viewBox={`${BODY_MAP_VIEW.x} ${BODY_MAP_VIEW.y} ${BODY_MAP_VIEW.w} ${BODY_MAP_VIEW.h}`}
          preserveAspectRatio="xMidYMin meet"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient
              id={hoverGradientId}
              gradientUnits="userSpaceOnUse"
              x1={10}
              y1={BODY_MAP_VIEW.y}
              x2={78}
              y2={BODY_MAP_VIEW.y + BODY_MAP_VIEW.h}
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
              <feGaussianBlur in="SourceGraphic" stdDeviation="6.8" />
            </filter>
            <filter
              id={heatmapBlurId}
              x="-65%"
              y="-65%"
              width="230%"
              height="230%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
            </filter>
            <filter
              id={heatmapWideBlurId}
              x="-90%"
              y="-90%"
              width="280%"
              height="280%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="52" />
            </filter>
            <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
              <path
                transform={`translate(${BODY_MAP_INNER_TX})`}
                d={BODY_MAP_OUTLINE_PATH_D}
              />
            </clipPath>
          </defs>

          <g transform={BODY_MAP_UNIFORM_SCALE_TRANSFORM}>
            <g clipPath={`url(#${clipPathId})`}>
              <rect
                x={BODY_MAP_VIEW.x}
                y={BODY_MAP_VIEW.y}
                width={BODY_MAP_VIEW.w}
                height={BODY_MAP_VIEW.h}
                fill="#0f172a"
              />
              <path
                transform={`translate(${BODY_MAP_INNER_TX})`}
                d={BODY_MAP_OUTLINE_PATH_D}
                fill="#1e293b"
                pointerEvents="none"
              />
              <g
                id="layer1"
                transform={`translate(${BODY_MAP_INNER_TX})`}
                style={
                  variant === "countHeatmap"
                    ? { mixBlendMode: "screen" }
                    : undefined
                }
              >
                {variant === "countHeatmap" ? (
                  <>
                    <g
                      filter={`url(#${heatmapWideBlurId})`}
                      pointerEvents="none"
                      opacity={0.62}
                    >
                      {BODY_PARTS.flatMap((part) => {
                        const c = partPaperMap[part.id] ?? 0;
                        const t = countToPerceptualNormalized(
                          c,
                          countColorDomain,
                        );
                        const fill = mapCountToColor(c, countColorDomain);
                        const fillOpacity = heatmapRegionFillOpacity(t);
                        return part.subpaths.map((sp, i) => (
                          <path
                            key={`heat-count-wide-${part.id}-${i}`}
                            d={sp.d}
                            transform={sp.transform}
                            fill={fill}
                            fillOpacity={fillOpacity}
                          />
                        ));
                      })}
                    </g>
                    <g filter={`url(#${heatmapBlurId})`} pointerEvents="none">
                      {BODY_PARTS.flatMap((part) => {
                        const c = partPaperMap[part.id] ?? 0;
                        const t = countToPerceptualNormalized(
                          c,
                          countColorDomain,
                        );
                        const fill = mapCountToColor(c, countColorDomain);
                        const fillOpacity = heatmapRegionFillOpacity(t);
                        return part.subpaths.map((sp, i) => (
                          <path
                            key={`heat-count-${part.id}-${i}`}
                            d={sp.d}
                            transform={sp.transform}
                            fill={fill}
                            fillOpacity={fillOpacity}
                          />
                        ));
                      })}
                    </g>
                  </>
                ) : null}
                {variant === "rawDots"
                  ? BODY_PARTS.flatMap((part) => {
                      const dots = dotsByPartId[part.id] ?? [];
                      return dots.map((p, i) => (
                        <circle
                          key={`${part.id}-dot-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={BODY_MAP_DOT_RADIUS}
                          fill={BODY_MAP_DOT_FILL}
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

            <g
              transform={`translate(${BODY_MAP_INNER_TX})`}
              pointerEvents="none"
            >
              <path
                d={BODY_MAP_OUTLINE_PATH_D}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={0.55}
              />
            </g>
          </g>
        </svg>
      </div>

      {variant === "countHeatmap" ? (
        <div className="body-map-heatmap-legend">
          <ul
            className="body-map-heatmap-legend-swatches"
            aria-label="Paper count ranges by colour"
          >
            {heatmapColorLegend.map((item, i) => (
              <li key={i} className="body-map-heatmap-legend-item">
                <span
                  className="body-map-heatmap-legend-swatch"
                  style={{ backgroundColor: item.color }}
                />
                <span className="body-map-heatmap-legend-label">
                  {item.rangeLabel}
                </span>
              </li>
            ))}
          </ul>
          <p className="body-map-heatmap-legend-caption">
            Legend thresholds are fixed from the full dataset (quantile bands);
            colours use the same absolute square-root scale. Hover for exact
            region counts.
          </p>
        </div>
      ) : null}
      {variant === "rawDots" ? (
        <div className="body-map-heatmap-legend">
          <p className="body-map-heatmap-legend-caption">
            Dot counts are fixed from the full dataset and plotted on the same
            absolute paper-count basis; each dot represents one paper in a body
            region. Hover for exact region counts.
          </p>
        </div>
      ) : null}

      {tooltip ? (
        <div
          className="body-map-tooltip"
          role="tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="body-map-tooltip-title">
            {tooltip.label}: {tooltip.count.toLocaleString()} papers
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BodyMap;
