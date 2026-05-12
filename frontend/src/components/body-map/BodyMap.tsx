import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import { contourDensity, geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import { BODY_MAP_OUTLINE_PATH_D, BODY_MAP_VIEW } from "./bodyMapOutlinePath";
import { type BodySubpath } from "./bodyMapSampleDots";
import {
  countToPerceptualNormalized,
  generateDotsForRegion,
  getRegionCountForBodyMapPart,
} from "./bodyMapVisualization";
import {
  type BodyRegionId,
} from "@/lib/research/researchPapers";

type TooltipState = { label: string; count: number; x: number; y: number };

const HEATMAP_DOT_RADIUS = 45;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const HEATMAP_DOT_RENDER_RATIO = 0.78;

/** Inner `g` translate (path data + clip live in this space). */
const BODY_MAP_INNER_TX = 0;

const BODY_MAP_SCALE_PIVOT_OX = 418.7415;
const BODY_MAP_SCALE_PIVOT_OY = 909.6845;
const BODY_MAP_CONTENT_SCALE_X = 1.04;
const BODY_MAP_CONTENT_SCALE_Y = 1;

const BODY_MAP_UNIFORM_SCALE_TRANSFORM = `translate(${BODY_MAP_SCALE_PIVOT_OX} ${BODY_MAP_SCALE_PIVOT_OY}) scale(${BODY_MAP_CONTENT_SCALE_X} ${BODY_MAP_CONTENT_SCALE_Y}) translate(${-BODY_MAP_SCALE_PIVOT_OX} ${-BODY_MAP_SCALE_PIVOT_OY})`;

type BodyPart = {
  id: BodyRegionId;
  label: string;
  subpaths: BodySubpath[];
};


type DensityAnchor = {
  x: number;
  y: number;
  spreadX: number;
  spreadY: number;
};

const BODY_PARTS: BodyPart[] = [
  {
    id: "head",
    label: "Head",
    subpaths: [
      {
        d: "M 413.91602 109.68945 C 412.91602 109.81145 392.47522 111.35825 384.07422 117.40625 C 373.76222 124.35025 368.06834 127.5567 362.52734 139.8457 C 351.30334 168.3157 356.5918 187.45545 354.5918 196.81445 C 353.0188 195.54545 352.99513 193.33361 351.70312 191.84961 C 350.58312 189.59861 347.15906 188.96894 345.41406 190.83594 C 336.90706 199.68694 352.19647 244.81239 361.48047 233.52539 C 363.52147 255.50939 370.55859 267.65039 370.55859 267.65039 C 371.03963 270.60677 371.43975 273.38916 371.76367 276.01172 L 465.5293 276.01172 C 465.85322 273.38916 466.25334 270.60677 466.73438 267.65039 C 466.73438 267.65039 473.7715 255.50939 475.8125 233.52539 C 485.0965 244.81239 500.38591 199.68694 491.87891 190.83594 C 490.13391 188.96894 486.70984 189.59861 485.58984 191.84961 C 484.29784 193.33361 484.27417 195.54545 482.70117 196.81445 C 480.70117 187.45545 485.98963 168.3157 474.76562 139.8457 C 469.22463 127.5567 463.53075 124.35025 453.21875 117.40625 C 444.81775 111.35825 424.37695 109.81145 423.37695 109.68945 L 413.91602 109.68945 z",
      },
    ],
  },
  {
    id: "neck",
    label: "Neck",
    subpaths: [
      {
        d: "m 371.76758,276.04297 c 3.86496,31.33393 -3.15144,39.86679 -12.88867,50.46289 -4.84426,5.05468 -17.80307,11.70044 -30.97071,15.84961 h 182.74668 l -0.097,0.11554 c -12.34405,-4.16812 -27.58463,-11.20796 -32.14378,-15.96515 -9.73723,-10.5961 -16.75363,-19.12896 -12.88867,-50.46289 z",
      },
    ],
  },
  {
    id: "torso",
    label: "Torso",
    subpaths: [
      {
        d: "M 509.01758 342.23828 L 327.93945 342.34375 L 327.9375 342.34375 C 320.13242 344.8055 312.25192 346.3927 305.94336 346.25195 C 288.78788 345.97213 263.81081 343.58981 245.4375 376.94141 L 290.99023 520.41406 L 291.50977 521.00195 C 291.51577 520.98585 291.5229 520.96913 291.5293 520.95312 C 291.5353 520.98302 291.54098 521.01307 291.54688 521.04297 L 291.54883 521.04492 L 291.54883 521.04883 L 291.54883 521.05078 C 329.56042 714.70013 297.55428 641.01246 274.70117 757.36719 L 274.27344 757.36719 C 273.59244 760.90898 272.92143 764.62729 272.25977 768.5293 C 272.25623 768.55015 272.25158 768.55921 272.24805 768.58008 L 272.25 768.58008 C 269.27385 786.14158 266.51454 807.4744 264.16797 833.70508 L 573.13086 833.70508 C 570.78446 807.47635 568.02667 786.14474 565.05078 768.58398 C 564.38599 764.66106 563.70972 760.92631 563.02539 757.36719 L 562.5957 757.36719 C 539.73957 640.99513 507.73197 714.72035 545.76953 520.96094 L 545.76953 520.95703 L 545.73828 520.5332 L 592.40039 377.89453 C 573.97845 343.50889 548.67169 345.9694 531.34961 346.25195 C 524.94948 346.39473 516.93307 344.76112 509.01758 342.23828 z M 290.99023 520.41406 L 232.12305 453.87109 C 232.06527 445.12103 231.26879 438.96507 231.12695 432.06445 C 231.27163 439.07553 232.09164 445.32981 232.125 454.30859 L 291.07422 520.67969 L 290.99023 520.41406 z M 245.4375 376.94141 L 245.42773 376.91406 C 245.30858 377.13037 245.20453 377.42521 245.08594 377.64453 C 245.20549 377.42341 245.31737 377.15946 245.4375 376.94141 z",
      },
    ],
  },
  {
    id: "arm",
    label: "Arm",
    subpaths: [
      {
        d: "M 245.44727 376.87891 C 241.29217 384.41464 237.47482 393.7769 234.16211 405.40625 C 228.89438 429.11102 231.99836 436.25343 232.12109 453.8125 C 232.22765 469.04669 230.09131 492.12226 218.29297 540.6582 C 212.03397 565.8572 209.02081 576.45534 202.13281 590.77734 C 158.89846 674.49554 176.01825 714.85683 154.64258 781.0625 L 196.62891 794.64844 C 203.91368 774.05529 215.46062 742.61922 233.60547 693.3457 C 233.60547 693.3457 238.90539 683.12769 247.40039 662.55469 C 257.21039 641.24469 253.38802 626.90252 267.16602 589.10352 C 267.527 588.10356 283.405 541.34837 291.5293 520.95508 L 291.30469 520.70117 L 245.44727 376.87891 z M 291.5293 520.95508 C 291.55823 521.10246 291.58638 521.24942 291.61523 521.39648 C 291.62758 521.18611 291.63477 521.07422 291.63477 521.07422 L 291.5293 520.95508 z",
      },
      {
        d: "M 592.50586 377.57031 L 545.70312 520.57031 L 545.76953 520.49805 L 545.68945 520.62109 C 545.68945 520.62109 545.70911 520.79333 545.74219 521.0918 C 545.75132 521.04525 545.76039 520.9997 545.76953 520.95312 C 553.89353 541.34514 569.77181 588.10352 570.13281 589.10352 C 583.91081 626.90352 580.08844 641.24569 589.89844 662.55469 C 598.39344 683.12769 603.69141 693.3457 603.69141 693.3457 C 620.51843 739.04034 631.67237 769.394 639.01367 789.98633 L 681.06641 775.96875 C 662.12236 712.73685 677.27663 672.32712 635.16211 590.77734 C 628.27411 576.45534 625.26095 565.8572 619.00195 540.6582 C 607.55105 493.55155 605.19927 470.42819 605.16797 455.17969 L 605.16992 455.17773 C 605.2365 437.25521 609.0885 429.9891 603.77148 406.0625 C 600.46385 394.45099 596.65354 385.10009 592.50586 377.57031 z",
      },
    ],
  },
  {
    id: "wrist",
    label: "Wrist",
    subpaths: [
      {
        d: "M 154.64062 781.06641 C 153.5336 784.49499 152.32334 787.99154 150.99609 791.56836 C 141.94787 819.02901 139.51537 823.97792 137.08594 825.40039 L 185.14062 841.55859 C 184.23697 833.70111 183.33762 832.22671 196.60938 794.70508 L 154.64062 781.06641 z",
      },
      {
        d: "M 681.06055 775.94922 L 639.02539 790.01758 C 652.36295 827.43113 653.10797 832.59912 652.44922 839.02148 L 700.50977 825.55859 C 697.96854 824.34687 695.71885 820.16333 686.29688 791.56836 C 684.30281 786.19451 682.5731 780.99935 681.06055 775.94922 z",
      },
    ],
  },
  {
    id: "hand",
    label: "Hand",
    subpaths: [
      {
        d: "M 137.66992 824.98438 C 136.55779 825.93092 135.55253 825.85719 134.05273 826.49414 C 114.13173 834.36114 101.20041 848.35016 100.56641 849.78516 C 91.643406 870.23916 77.237531 877.19886 80.644531 883.63086 C 81.540531 885.33286 83.963844 886.21872 85.589844 885.01172 C 90.778844 885.92172 98.327797 880.20311 101.7168 876.41211 C 105.8188 871.70611 105.09183 868.95573 113.04883 862.55273 C 114.87283 864.59973 110.89273 882.88622 109.92773 885.94922 C 105.05073 900.67822 83.360031 935.56919 92.332031 940.36719 C 93.277031 940.76719 94.56025 941.32108 95.40625 940.45508 C 96.95925 938.92508 98.935094 937.85198 100.24609 936.08398 C 108.27109 925.86598 117.81364 901.7237 124.30664 896.8457 C 127.58564 897.0697 125.90108 899.19291 119.83008 919.37891 C 116.15708 932.46291 114.68945 939.31836 114.68945 939.31836 C 104.56345 969.78436 120.91745 965.03495 126.18945 946.12695 C 126.63745 944.58995 135.91136 919.2148 136.31836 917.9668 C 137.55936 914.6758 140.92014 900.1617 145.11914 903.0957 C 145.76514 905.5647 144.78498 906.13823 141.58398 934.61523 C 138.98398 956.42823 138.34809 943.40502 138.87109 961.04102 C 138.95009 963.20502 143.30934 964.29825 145.15234 963.15625 C 155.69134 953.43325 157.84456 905.54577 163.22656 902.13477 C 166.89556 906.42777 167.49898 935.88847 169.20898 941.35547 C 171.86098 951.06047 176.65445 946.15675 177.18945 944.59375 C 181.01445 935.26975 177.00036 914.05708 177.81836 899.20508 C 177.81836 899.20508 182.18662 884.6753 185.01562 860.5293 C 186.03043 849.46901 185.49761 844.56865 185.0625 840.89648 L 137.66992 824.98438 z",
      },
      {
        d: "M 699.81641 825.13867 L 652.48633 838.64648 C 652.10146 842.74342 651.0481 847.0893 652.28125 860.5293 C 655.11025 884.6753 659.48047 899.20508 659.48047 899.20508 C 660.29847 914.05708 656.28242 935.26975 660.10742 944.59375 C 660.64242 946.15675 665.43784 951.06047 668.08984 941.35547 C 669.79984 935.88847 670.40131 906.42777 674.07031 902.13477 C 679.45231 905.54577 681.60553 953.43425 692.14453 963.15625 C 693.98753 964.29825 698.34873 963.20502 698.42773 961.04102 C 698.95073 943.40502 698.31484 956.42823 695.71484 934.61523 C 692.51384 906.13823 691.53173 905.5647 692.17773 903.0957 C 696.37673 900.1617 699.73752 914.6758 700.97852 917.9668 C 701.38552 919.2148 710.65942 944.58995 711.10742 946.12695 C 716.37942 965.03495 732.73538 969.78436 722.60938 939.31836 C 722.60938 939.31836 721.1398 932.46291 717.4668 919.37891 C 711.3958 899.19291 709.71319 897.0697 712.99219 896.8457 C 719.48519 901.7237 729.02578 925.86598 737.05078 936.08398 C 738.36178 937.85198 740.33958 938.92508 741.89258 940.45508 C 742.73858 941.32108 744.01984 940.76719 744.96484 940.36719 C 753.93684 935.56919 732.24614 900.67822 727.36914 885.94922 C 726.40414 882.88622 722.426 864.59973 724.25 862.55273 C 732.207 868.95573 731.48003 871.70611 735.58203 876.41211 C 738.97103 880.20311 746.51998 885.92172 751.70898 885.01172 C 753.33498 886.21872 755.75634 885.33286 756.65234 883.63086 C 760.05534 877.19886 745.65152 870.23916 736.72852 849.78516 C 736.09452 848.35016 723.16123 834.36114 703.24023 826.49414 C 701.82735 825.8941 700.85429 825.92454 699.81641 825.13867 z",
      },
    ],
  },
  {
    id: "leg",
    label: "Leg",
    subpaths: [
      {
        d: "M 308.3457 834.16797 A 85.64859 39.185631 11.238221 0 0 263.39062 844.39648 L 263.38867 844.39648 L 263.25977 844.37109 C 263.25671 844.40872 263.25305 844.44673 263.25 844.48438 C 263.03762 847.10507 262.82929 849.77144 262.625 852.48438 C 261.99056 864.15973 261.51961 874.18675 261.20703 882.99023 C 258.70735 953.39087 266.3013 945.51122 280.81445 1076.0273 C 312.53345 1365.3313 265.7278 1206.1888 316.4668 1460.3398 C 327.4568 1511.8348 326.30331 1505.199 328.32031 1516.623 C 328.60735 1519.3125 328.79357 1521.6671 328.90039 1523.7461 L 374.7207 1523.7461 C 373.26708 1509.8829 374.57621 1494.953 379.63672 1442.1992 C 386.62372 1376.3602 393.78442 1373.5229 387.35742 1305.3359 C 373.06142 1195.1859 387.13359 1236.3901 388.80859 1179.1191 C 390.31159 1111.7591 384.60916 1070.313 391.91016 1010.918 C 400.50203 941.7388 407.14269 923.675 410.80078 905.94922 A 85.64859 39.185631 11.238221 0 0 411.08984 905.76367 C 411.33517 904.57732 411.43884 903.22098 411.6543 902.02539 C 412.07698 899.65264 412.5211 896.88869 412.82031 894.29492 C 412.9745 892.95291 413.14989 891.50376 413.26953 890.05469 C 413.66163 885.27954 413.92487 880.00895 413.91797 873.31641 C 413.91792 873.26624 413.92195 873.24172 413.92188 873.19141 A 85.64859 39.185631 11.238221 0 0 413.91992 873.18945 C 413.91989 873.16989 413.92191 873.15825 413.92188 873.13867 L 413.875 873.12891 A 85.64859 39.185631 11.238221 0 0 343.4668 837.63281 A 85.64859 39.185631 11.238221 0 0 308.3457 834.16797 z",
      },
      {
        d: "M 529.05078 834.16797 A 39.185631 85.64859 78.761779 0 0 494.19531 837.63281 A 39.185631 85.64859 78.761779 0 0 423.875 873.01758 L 423.375 873.11328 C 423.3703 873.3089 423.36552 873.50384 423.36133 873.69727 C 423.22467 880.00366 423.44658 884.98491 423.82227 889.59766 C 423.92896 890.89787 424.08233 892.28868 424.22656 893.51758 C 424.52127 896.01429 425.01615 898.79554 425.45703 901.17383 C 425.71738 902.5602 425.83208 904.00976 426.13867 905.42188 A 39.185631 85.64859 78.761779 0 0 426.42773 905.61328 C 430.16732 922.97784 436.99089 943.31929 445.38672 1010.918 C 452.68772 1070.312 446.98723 1111.7581 448.49023 1179.1191 C 450.16523 1236.3891 464.23741 1195.1859 449.94141 1305.3359 C 443.51441 1373.5219 450.67316 1376.3602 457.66016 1442.1992 C 462.72067 1494.953 464.02979 1509.8829 462.57617 1523.7461 L 508.39648 1523.7461 C 508.5033 1521.6671 508.68953 1519.3125 508.97656 1516.623 C 510.99356 1505.199 509.84008 1511.8348 520.83008 1460.3398 C 571.56908 1206.1888 524.76342 1365.3323 556.48242 1076.0273 C 570.63226 948.77845 577.61395 948.69954 575.66797 883.75 A 39.185631 85.64859 78.761779 0 0 576.10352 883.35742 C 575.79105 874.46596 575.31709 864.32201 574.67383 852.48438 C 574.67352 852.48033 574.67413 852.4767 574.67383 852.47266 C 574.46621 849.71575 574.25306 847.00539 574.03711 844.34375 L 574.03516 844.34375 C 574.0324 844.30979 574.0301 844.27613 574.02734 844.24219 A 39.185631 85.64859 78.761779 0 0 529.05078 834.16797 z",
      },
    ],
  },
  {
    id: "ankle",
    label: "Ankle",
    subpaths: [
      {
        d: "M 328.9043 1523.7969 C 329.63616 1538.1843 326.54741 1539.3943 326.64258 1547.9375 C 326.0667 1567.7357 330.4866 1560.7302 327.76953 1582.2285 L 382.9082 1582.2285 C 382.99209 1581.5275 383.06014 1580.7953 383.10742 1580.0254 C 376.61442 1552.6294 381.6425 1565.4756 379.0625 1549.5156 C 376.97148 1537.8396 375.48071 1530.9548 374.72656 1523.7969 L 328.9043 1523.7969 z",
      },
      {
        d: "M 462.57227 1523.7969 C 461.81812 1530.9548 460.32735 1537.8396 458.23633 1549.5156 C 455.65633 1565.4756 460.68441 1552.6294 454.19141 1580.0254 C 454.23869 1580.7953 454.30478 1581.5275 454.38867 1582.2285 L 509.52734 1582.2285 C 506.81027 1560.7302 511.23213 1567.7357 510.65625 1547.9375 C 510.75142 1539.3943 507.66267 1538.1843 508.39453 1523.7969 L 462.57227 1523.7969 z",
      },
    ],
  },
];


const REGION_DENSITY_ANCHORS: Record<BodyRegionId, DensityAnchor[]> = {
  head: [{ x: 418, y: 198, spreadX: 20, spreadY: 22 }],
  neck: [{ x: 418, y: 305, spreadX: 14, spreadY: 12 }],
  torso: [{ x: 418, y: 610, spreadX: 84, spreadY: 120 }],
  arm: [
    { x: 275, y: 600, spreadX: 34, spreadY: 56 },
    { x: 560, y: 600, spreadX: 34, spreadY: 56 },
  ],
  wrist: [
    { x: 175, y: 810, spreadX: 16, spreadY: 18 },
    { x: 660, y: 810, spreadX: 16, spreadY: 18 },
  ],
  hand: [
    { x: 140, y: 900, spreadX: 22, spreadY: 24 },
    { x: 700, y: 900, spreadX: 22, spreadY: 24 },
  ],
  leg: [
    { x: 345, y: 1180, spreadX: 32, spreadY: 76 },
    { x: 492, y: 1180, spreadX: 32, spreadY: 76 },
  ],
  ankle: [
    { x: 350, y: 1555, spreadX: 14, spreadY: 14 },
    { x: 486, y: 1555, spreadX: 14, spreadY: 14 },
  ],
};

export type BodyMapVariant = "countHeatmap" | "rawDots";

type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  /**
   * Full-dataset region counts used only for the fixed heatmap colour domain and legend.
   * When omitted, `paperCountsByPart` is used (e.g. static view without filter context).
   */
  heatmapScaleReferenceCounts?: Record<string, number>;
  variant?: BodyMapVariant;
  selectedBodyRegion?: BodyRegionId | null;
  onSelectBodyRegion?: (mainBodyPart: BodyRegionId | null) => void;
};

/** Area view legend alignment: #ffe4e6 → #db2777 */
function interpolatePinkDensityTone(t: number): string {
  const u = Math.min(1, Math.max(0, t));
  const c0 = { r: 255, g: 228, b: 230 };
  const c1 = { r: 219, g: 39, b: 119 };
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * u);
  return `rgb(${lerp(c0.r, c1.r)}, ${lerp(c0.g, c1.g)}, ${lerp(c0.b, c1.b)})`;
}

/** Emphasize high-density differences for clearer overlap contrast. */
function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

function heatmapDotsForCount(count: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round(count * HEATMAP_DOT_RENDER_RATIO));
}

function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rnd: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function allocateAcrossAnchors(total: number, anchorCount: number): number[] {
  if (anchorCount <= 0) return [];
  const base = Math.floor(total / anchorCount);
  const remainder = total % anchorCount;
  return Array.from({ length: anchorCount }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}

function buildPath2D(subpaths: BodySubpath[]): Path2D {
  const path = new Path2D();
  for (const subpath of subpaths) {
    path.addPath(new Path2D(subpath.d));
  }
  return path;
}

function createPathPointTester(path: Path2D): ((x: number, y: number) => boolean) | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return (x: number, y: number) => ctx.isPointInPath(path, x, y);
}

function generateAnchoredGaussianDots(
  regionId: BodyRegionId,
  regionSubpaths: BodySubpath[],
  dotCount: number,
): { x: number; y: number }[] {
  if (dotCount <= 0) return [];
  const anchors = REGION_DENSITY_ANCHORS[regionId];
  if (!anchors?.length) return [];
  const rnd = mulberry32(hashStringToSeed(`${regionId}:${dotCount}`));
  const bodyPath = new Path2D(BODY_MAP_OUTLINE_PATH_D);
  const regionPath = buildPath2D(regionSubpaths);
  const isInBody = createPathPointTester(bodyPath);
  const isInRegion = createPathPointTester(regionPath);
  const pointsPerAnchor = allocateAcrossAnchors(dotCount, anchors.length);
  const out: { x: number; y: number }[] = [];
  for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
    const anchor = anchors[anchorIndex];
    const n = pointsPerAnchor[anchorIndex] ?? 0;
    for (let i = 0; i < n; i++) {
      let accepted: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 80; attempt++) {
        const x = anchor.x + gaussianRandom(rnd) * anchor.spreadX;
        const y = anchor.y + gaussianRandom(rnd) * anchor.spreadY;
        const bodyPass = isInBody ? isInBody(x, y) : true;
        const regionPass = isInRegion ? isInRegion(x, y) : true;
        if (bodyPass && regionPass) {
          accepted = { x, y };
          break;
        }
      }
      if (accepted) {
        out.push(accepted);
      } else {
        out.push({ x: anchor.x, y: anchor.y });
      }
    }
  }
  return out;
}

export function BodyMap({
  paperCountsByPart = {},
  heatmapScaleReferenceCounts,
  variant = "countHeatmap",
  selectedBodyRegion = null,
  onSelectBodyRegion,
}: BodyMapProps) {
  const uid = useId().replace(/:/g, "");
  const clipPathId = `body-map-silhouette-${uid}`;
  const hoverGradientId = `body-map-hover-sky-${uid}`;
  const softFillFilterId = `body-map-soft-fill-${uid}`;
  const heatLegendGradientId = `body-map-heat-legend-${uid}`;
  const heatDotRadialGradientId = `body-map-heat-dot-radial-${uid}`;
  const rawDotsLegendGradientId = `body-map-raw-dots-legend-${uid}`;
  const rawDotsSoftBlurId = `body-map-raw-dots-soft-blur-${uid}`;
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

  const countColorDomain = useMemo<[number, number]>(() => {
    const maxVal = Math.max(
      0,
      ...BODY_PARTS.map((part) =>
        getRegionCountForBodyMapPart(part.id, rawForGlobalHeatmapScale),
      ),
    );
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [rawForGlobalHeatmapScale]);
  const legendTickValues = useMemo(() => {
    const lo = countColorDomain[0];
    const hi = countColorDomain[1];
    const mid = lo + (hi - lo) / 2;
    return [lo, mid, hi].map((v) => Math.round(v));
  }, [countColorDomain]);
  const rawDotsContoursByPart = useMemo<
    { partId: BodyRegionId; contours: ContourMultiPolygon[] }[]
  >(() => {
    if (variant !== "rawDots") return [];
    const parts = BODY_PARTS;
    const density = contourDensity<{ x: number; y: number }>()
      .x((d: { x: number; y: number }) => d.x)
      .y((d: { x: number; y: number }) => d.y)
      .size([BODY_MAP_VIEW.w, BODY_MAP_VIEW.y + BODY_MAP_VIEW.h])
      .bandwidth(36)
      .thresholds(28);
    return parts
      .map((part) => {
        const points = dotsByPartId[part.id] ?? [];
        if (points.length < 2) return null;
        const contours = density(points);
        return { partId: part.id, contours };
      })
      .filter(
        (
          entry,
        ): entry is {
          partId: BodyRegionId;
          contours: ContourMultiPolygon[];
        } => entry !== null,
      );
  }, [dotsByPartId, variant]);
  const rawDotsGlobalContourMaxValue = useMemo(() => {
    return Math.max(
      0,
      ...rawDotsContoursByPart.flatMap((entry) =>
        entry.contours.map((contour: ContourMultiPolygon) => contour.value ?? 0),
      ),
    );
  }, [rawDotsContoursByPart]);
  const rawDotsContourPath = useMemo(() => geoPath(), []);
  const rawDotsLegendTicks = useMemo(() => {
    const lo = countColorDomain[0];
    const hi = countColorDomain[1];
    const mid = lo + (hi - lo) / 2;
    return [lo, mid, hi].map((v) => Math.round(v));
  }, [countColorDomain]);

  useLayoutEffect(() => {
    let cancelled = false;
    const counts = JSON.parse(paperCountsKey) as Record<string, number>;
    const next: Record<string, { x: number; y: number }[]> = {};
    for (const part of BODY_PARTS) {
      const papers = getRegionCountForBodyMapPart(part.id, counts);
      const dotsToRender =
        variant === "countHeatmap"
          ? heatmapDotsForCount(papers)
          : papers;
      next[part.id] =
        variant === "rawDots"
          ? generateAnchoredGaussianDots(part.id, part.subpaths, dotsToRender)
          : generateDotsForRegion(part.subpaths, dotsToRender);
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

  const handlePartClick = useCallback(
    (part: BodyPart) => {
      return () => {
        onSelectBodyRegion?.(part.id);
      };
    },
    [onSelectBodyRegion],
  );

  const ariaLabel =
    variant === "countHeatmap"
      ? "Body map: smooth density heatmap — overlapping dots encode paper concentration per region on a fixed full-dataset scale; tooltip shows exact counts for the current filter."
      : "Body map: one dot per paper, placed randomly within each body region.";
  const mapTransform = BODY_MAP_UNIFORM_SCALE_TRANSFORM;
  const activeView = BODY_MAP_VIEW;
  const activeClipPath = `url(#${clipPathId})`;

  return (
    <div className="body-map-root">
      <div className="body-map-svg-wrap">
        <svg
          className="body-map-svg"
          width="100%"
          height="100%"
          viewBox={`${activeView.x} ${activeView.y} ${activeView.w} ${activeView.h}`}
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
            <linearGradient
              id={rawDotsLegendGradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ffe4e6" />
              <stop offset="100%" stopColor="#db2777" />
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
              id={rawDotsSoftBlurId}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            <radialGradient
              id={heatDotRadialGradientId}
              gradientUnits="objectBoundingBox"
              cx="0.5"
              cy="0.5"
              r="0.5"
            >
              <stop offset="0%" stopColor="#be185d" stopOpacity="1" />
              <stop offset="38%" stopColor="#db2777" stopOpacity="0.72" />
              <stop offset="72%" stopColor="#fb7185" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffe4e6" stopOpacity="0" />
            </radialGradient>
            <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
              <path
                transform={`translate(${BODY_MAP_INNER_TX})`}
                d={BODY_MAP_OUTLINE_PATH_D}
              />
            </clipPath>
          </defs>

          <g transform={mapTransform}>
            <g clipPath={activeClipPath}>
              <rect
                x={BODY_MAP_VIEW.x}
                y={BODY_MAP_VIEW.y}
                width={BODY_MAP_VIEW.w}
                height={BODY_MAP_VIEW.h}
                fill="transparent"
              />
              <path
                transform={`translate(${BODY_MAP_INNER_TX})`}
                d={BODY_MAP_OUTLINE_PATH_D}
                fill="transparent"
                pointerEvents="none"
              />
              <g id="layer1" transform={`translate(${BODY_MAP_INNER_TX})`}>
                {variant === "countHeatmap" ? (
                  <g pointerEvents="none">
                    {BODY_PARTS.flatMap((part) => {
                      const c = partPaperMap[part.id] ?? 0;
                      const t = countToPerceptualNormalized(
                        c,
                        countColorDomain,
                      );
                      const tAdj = heatmapContrastT(t);
                      const dots = dotsByPartId[part.id] ?? [];
                      const opacity =
                        HEATMAP_DOT_OPACITY_MIN +
                        (HEATMAP_DOT_OPACITY_MAX - HEATMAP_DOT_OPACITY_MIN) *
                          tAdj;
                      return dots.map((p, i) => (
                        <circle
                          key={`heat-single-${part.id}-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={HEATMAP_DOT_RADIUS}
                          fill={`url(#${heatDotRadialGradientId})`}
                          fillOpacity={opacity}
                        />
                      ));
                    })}
                  </g>
                ) : null}
                {variant === "rawDots" ? (
                  <g
                    pointerEvents="none"
                    filter={`url(#${rawDotsSoftBlurId})`}
                  >
                    {rawDotsContoursByPart.flatMap((entry) => {
                      const partCount = partPaperMap[entry.partId] ?? 0;
                      const countStrength = countToPerceptualNormalized(
                        partCount,
                        countColorDomain,
                      );
                      const countBoost = 0.35 + Math.pow(countStrength, 0.9) * 0.65;
                      const globalMax =
                        rawDotsGlobalContourMaxValue <= 0
                          ? 1
                          : rawDotsGlobalContourMaxValue;
                      return entry.contours.map(
                        (contour: ContourMultiPolygon, i: number) => {
                          const d = rawDotsContourPath(contour);
                          if (!d) return null;
                          const value = contour.value ?? 0;
                          const normalized = Math.min(
                            1,
                            Math.max(0, value / globalMax),
                          );
                          const contrastAdjusted = Math.pow(normalized, 1.7);
                          const opacity =
                            (0.015 + contrastAdjusted * 0.9) * countBoost;
                          return (
                            <path
                              key={`raw-density-${entry.partId}-${i}`}
                              d={d}
                              fill="#db2777"
                              fillOpacity={opacity}
                              stroke="none"
                              pointerEvents="none"
                            />
                          );
                        },
                      );
                    })}
                    {rawDotsContoursByPart.length === 0
                      ? BODY_PARTS.flatMap((part) => {
                          const dots = dotsByPartId[part.id] ?? [];
                          return dots.map((p, i) => (
                            <circle
                              key={`raw-fallback-dot-${part.id}-${i}`}
                              cx={p.x}
                              cy={p.y}
                              r={3.8}
                              fill="#db2777"
                              fillOpacity={0.42}
                            />
                          ));
                        })
                      : null}
                  </g>
                ) : null}
                {BODY_PARTS.flatMap((part) =>
                  part.subpaths.map((sp, i) => (
                    <path
                      key={`${part.id}-hit-${i}`}
                      id={`${part.id}-hit-${i}`}
                      d={sp.d}
                      transform={sp.transform}
                      fill={
                        hoveredPartId === part.id || selectedBodyRegion === part.id
                          ? `url(#${hoverGradientId})`
                          : "transparent"
                      }
                      fillOpacity={
                        hoveredPartId === part.id || selectedBodyRegion === part.id
                          ? 0.78
                          : 1
                      }
                      filter={
                        hoveredPartId === part.id || selectedBodyRegion === part.id
                          ? `url(#${softFillFilterId})`
                          : undefined
                      }
                      stroke="none"
                      pointerEvents="all"
                      style={{ cursor: "pointer" }}
                      onPointerEnter={handlePartEnter(part)}
                      onPointerMove={handlePartMove}
                      onPointerLeave={handlePartLeave}
                      onClick={handlePartClick(part)}
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
                stroke="#1e293b"
                strokeOpacity={0.65}
                strokeWidth={1.1}
                vectorEffect="non-scaling-stroke"
                shapeRendering="geometricPrecision"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          </g>
        </svg>
      </div>

      {variant === "countHeatmap" ? (
        <div className="body-map-heatmap-legend">
          <svg
            width="100%"
            height="18"
            role="img"
            aria-label="Paper density gradient legend"
          >
            <defs>
              <linearGradient
                id={heatLegendGradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={interpolatePinkDensityTone(0)} />
                <stop offset="100%" stopColor={interpolatePinkDensityTone(1)} />
              </linearGradient>
            </defs>
            <rect
              x="0"
              y="2"
              width="100%"
              height="10"
              rx="5"
              fill={`url(#${heatLegendGradientId})`}
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "0.15rem",
              fontVariantNumeric: "tabular-nums",
            }}
            aria-hidden
          >
            <span>{legendTickValues[0].toLocaleString()}</span>
            <span>{legendTickValues[1].toLocaleString()}</span>
            <span>{legendTickValues[2].toLocaleString()}</span>
          </div>
          <p className="body-map-heatmap-legend-caption">
            Paper density (low to high): {countColorDomain[0].toLocaleString()}{" "}
            to {countColorDomain[1].toLocaleString()} papers. Hover for exact
            region counts.
          </p>
        </div>
      ) : null}
      {variant === "rawDots" ? (
        <div className="body-map-heatmap-legend">
          <svg
            width="100%"
            height="18"
            role="img"
            aria-label="Density strength gradient legend"
          >
            <rect
              x="0"
              y="2"
              width="100%"
              height="10"
              rx="5"
              fill={`url(#${rawDotsLegendGradientId})`}
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "0.15rem",
              fontVariantNumeric: "tabular-nums",
            }}
            aria-hidden
          >
            <span>{rawDotsLegendTicks[0].toLocaleString()}</span>
            <span>{rawDotsLegendTicks[1].toLocaleString()}</span>
            <span>{rawDotsLegendTicks[2].toLocaleString()}</span>
          </div>
          <p className="body-map-heatmap-legend-caption">
            Paper count (low to high): {countColorDomain[0].toLocaleString()} to{" "}
            {countColorDomain[1].toLocaleString()}. Dots use d3 density
            smoothing for visual clustering.
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
