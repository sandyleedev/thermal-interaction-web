import {
  useCallback,
  useEffect,
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
import { type BodyRegionId, type FootSubpartId } from "@/lib/research/researchPapers";

type TooltipState = { label: string; count: number; x: number; y: number };
type BodyMapViewMode = "full" | "feetDetail";

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
const FEET_DETAIL_VIEW = {
  x: 260,
  y: 1520,
  w: 320,
  h: 250,
} as const;
const FOOT_SUBPART_BASE_FILL: Record<FootSubpartId, string> = {
  general: "#38bdf8",
  sole: "#22c55e",
  toes: "#f59e0b",
};

type BodyPart = {
  id: BodyRegionId;
  label: string;
  subpaths: BodySubpath[];
};

type FootSubpart = {
  id: FootSubpartId;
  label: string;
  subpaths: BodySubpath[];
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
  {
    id: "foot",
    label: "Foot",
    subpaths: [
      {
        d: "M 327.78516 1582.1152 C 327.20489 1586.7279 326.29296 1592.6601 324.92969 1600.4668 C 319.93669 1624.6478 320.01791 1609.6818 317.25391 1637.8848 C 313.79091 1651.8618 303.34137 1690.616 318.10938 1690.334 C 319.39538 1697.974 323.65023 1699.4909 327.86523 1697.0469 C 327.18123 1699.5019 329.24586 1701.3386 330.63086 1703.0566 C 335.44386 1704.3786 335.39098 1704.086 337.45898 1702.502 C 338.95398 1708.293 342.63203 1708.2441 344.20703 1708.6621 C 348.97503 1710.1381 350.11128 1697.425 350.98828 1692.502 C 351.84428 1692.456 352.69306 1692.406 353.53906 1692.373 C 352.46706 1695.524 346.37883 1708.205 356.17383 1709.207 C 363.82483 1710.445 364.71539 1709.377 368.90039 1705.418 C 375.89239 1698.408 374.31044 1696.4774 375.52344 1684.7324 C 375.71444 1682.3484 381.20753 1678.1518 376.39453 1647.0898 C 374.53953 1631.1378 375.56322 1649.78 376.69922 1611.375 C 377.04727 1595.8074 381.74501 1592.2202 382.92188 1582.1152 L 327.78516 1582.1152 z",
      },
      {
        d: "M 454.375 1582.1152 C 455.55187 1592.2202 460.25156 1595.8074 460.59961 1611.375 C 461.73561 1649.78 462.75734 1631.1378 460.90234 1647.0898 C 456.08934 1678.1518 461.58439 1682.3484 461.77539 1684.7324 C 462.98839 1696.4774 461.40644 1698.408 468.39844 1705.418 C 472.58344 1709.377 473.474 1710.445 481.125 1709.207 C 490.92 1708.205 484.83177 1695.524 483.75977 1692.373 C 484.60577 1692.406 485.45455 1692.456 486.31055 1692.502 C 487.18755 1697.425 488.3238 1710.1381 493.0918 1708.6621 C 494.6668 1708.2441 498.34484 1708.293 499.83984 1702.502 C 501.90784 1704.086 501.85497 1704.3786 506.66797 1703.0566 C 508.05297 1701.3386 510.11759 1699.5019 509.43359 1697.0469 C 513.64859 1699.4909 517.90345 1697.974 519.18945 1690.334 C 533.95745 1690.616 523.50792 1651.8618 520.04492 1637.8848 C 517.28092 1609.6818 517.36019 1624.6478 512.36719 1600.4668 C 511.00391 1592.6601 510.09394 1586.7279 509.51367 1582.1152 L 454.375 1582.1152 z",
      },
    ],
  },
];

const FOOT_SUBPARTS: FootSubpart[] = [
  {
    id: "general",
    label: "General foot",
    subpaths: [
      {
        d: "M 280 1558 H 558 V 1638 H 280 Z",
      },
    ],
  },
  {
    id: "sole",
    label: "Sole",
    subpaths: [
      {
        d: "M 280 1638 H 558 V 1685 H 280 Z",
      },
    ],
  },
  {
    id: "toes",
    label: "Toes",
    subpaths: [
      {
        d: "M 280 1685 H 558 V 1718 H 280 Z",
      },
    ],
  },
];

export type BodyMapVariant = "countHeatmap" | "rawDots";

type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  paperCountsByFootSubpart?: Record<FootSubpartId, number>;
  /**
   * Full-dataset region counts used only for the fixed heatmap colour domain and legend.
   * When omitted, `paperCountsByPart` is used (e.g. static mock without filter context).
   */
  heatmapScaleReferenceCounts?: Record<string, number>;
  variant?: BodyMapVariant;
  selectedBodyRegion?: BodyRegionId | null;
  selectedFootSubpart?: FootSubpartId | null;
  onSelectBodyRegion?: (
    bodyRegion: BodyRegionId | null,
    footSubpart?: FootSubpartId | null,
  ) => void;
  onClearBodySelection?: () => void;
};

/** Softer glow spread (sqrt-normalized); matches earlier soft-blurred heatmap look. */
function heatmapRegionFillOpacity(perceptualT: number): number {
  return Math.min(1, 0.08 + perceptualT * 0.58);
}

export function BodyMap({
  paperCountsByPart = {},
  paperCountsByFootSubpart = { general: 0, sole: 0, toes: 0 },
  heatmapScaleReferenceCounts,
  variant = "countHeatmap",
  selectedBodyRegion = null,
  selectedFootSubpart = null,
  onSelectBodyRegion,
  onClearBodySelection,
}: BodyMapProps) {
  const uid = useId().replace(/:/g, "");
  const clipPathId = `body-map-silhouette-${uid}`;
  const feetClipPathId = `body-map-feet-${uid}`;
  const hoverGradientId = `body-map-hover-sky-${uid}`;
  const softFillFilterId = `body-map-soft-fill-${uid}`;
  const heatmapBlurId = `body-map-heat-blur-${uid}`;
  const heatmapWideBlurId = `body-map-heat-blur-wide-${uid}`;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<BodyMapViewMode>("full");
  const [hoveredFootSubpartId, setHoveredFootSubpartId] =
    useState<FootSubpartId | null>(null);
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

  const footSubpartCountMap = useMemo(
    () => ({
      general: paperCountsByFootSubpart.general ?? 0,
      sole: paperCountsByFootSubpart.sole ?? 0,
      toes: paperCountsByFootSubpart.toes ?? 0,
    }),
    [paperCountsByFootSubpart],
  );

  useEffect(() => {
    if (selectedBodyRegion !== "foot") {
      setViewMode("full");
    }
  }, [selectedBodyRegion]);

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
    setHoveredFootSubpartId(null);
    setTooltip(null);
  }, []);

  const handlePartClick = useCallback(
    (part: BodyPart) => {
      return () => {
        if (part.id === "foot") {
          setViewMode("feetDetail");
          onSelectBodyRegion?.("foot", selectedFootSubpart ?? null);
          return;
        }
        onSelectBodyRegion?.(part.id, null);
      };
    },
    [onSelectBodyRegion, selectedFootSubpart],
  );

  const handleBackToFull = useCallback(() => {
    setViewMode("full");
    setHoveredFootSubpartId(null);
    setHoveredPartId(null);
    setTooltip(null);
    onClearBodySelection?.();
  }, [onClearBodySelection]);

  const handleFootSubpartEnter = useCallback(
    (sub: FootSubpart) => (e: PointerEvent<SVGPathElement>) => {
      setHoveredFootSubpartId(sub.id);
      setTooltip({
        label: sub.label,
        count: footSubpartCountMap[sub.id] ?? 0,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [footSubpartCountMap],
  );

  const handleFootSubpartClick = useCallback(
    (sub: FootSubpart) => () => {
      onSelectBodyRegion?.("foot", sub.id);
    },
    [onSelectBodyRegion],
  );

  const ariaLabel =
    variant === "countHeatmap"
      ? "Body map: soft heatmap — colour encodes paper count per region on a fixed full-dataset scale (square root); tooltip shows exact counts for the current filter."
      : "Body map: one dot per paper, placed randomly within each body region.";
  const mapTransform =
    viewMode === "feetDetail"
      ? "translate(0 0)"
      : BODY_MAP_UNIFORM_SCALE_TRANSFORM;
  const activeView = viewMode === "feetDetail" ? FEET_DETAIL_VIEW : BODY_MAP_VIEW;

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
            <clipPath id={feetClipPathId} clipPathUnits="userSpaceOnUse">
              <g transform={`translate(${BODY_MAP_INNER_TX})`}>
                {(
                  BODY_PARTS.find((p) => p.id === "foot")?.subpaths ?? []
                ).map((sp, i) => (
                  <path key={`feet-clip-${i}`} d={sp.d} transform={sp.transform} />
                ))}
              </g>
            </clipPath>
          </defs>

          <g transform={mapTransform}>
            <g
              clipPath={`url(#${viewMode === "feetDetail" ? feetClipPathId : clipPathId})`}
            >
              <rect
                x={BODY_MAP_VIEW.x}
                y={BODY_MAP_VIEW.y}
                width={BODY_MAP_VIEW.w}
                height={BODY_MAP_VIEW.h}
                fill="#0f172a"
              />
              {viewMode === "feetDetail" ? (
                <g transform={`translate(${BODY_MAP_INNER_TX})`} pointerEvents="none">
                  {(BODY_PARTS.find((p) => p.id === "foot")?.subpaths ?? []).map(
                    (sp, i) => (
                      <path
                        key={`feet-base-${i}`}
                        d={sp.d}
                        transform={sp.transform}
                        fill="#1e293b"
                      />
                    ),
                  )}
                </g>
              ) : (
                <path
                  transform={`translate(${BODY_MAP_INNER_TX})`}
                  d={BODY_MAP_OUTLINE_PATH_D}
                  fill="#1e293b"
                  pointerEvents="none"
                />
              )}
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
                      {viewMode === "feetDetail"
                        ? FOOT_SUBPARTS.flatMap((sub) => {
                            const c = footSubpartCountMap[sub.id] ?? 0;
                            const t = countToPerceptualNormalized(c, countColorDomain);
                            const fill = mapCountToColor(c, countColorDomain);
                            const fillOpacity = heatmapRegionFillOpacity(t);
                            return sub.subpaths.map((sp, i) => (
                              <path
                                key={`heat-count-wide-foot-${sub.id}-${i}`}
                                d={sp.d}
                                transform={sp.transform}
                                fill={fill}
                                fillOpacity={fillOpacity}
                              />
                            ));
                          })
                        : BODY_PARTS.flatMap((part) => {
                            const c = partPaperMap[part.id] ?? 0;
                            const t = countToPerceptualNormalized(c, countColorDomain);
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
                      {viewMode === "feetDetail"
                        ? FOOT_SUBPARTS.flatMap((sub) => {
                            const c = footSubpartCountMap[sub.id] ?? 0;
                            const t = countToPerceptualNormalized(c, countColorDomain);
                            const fill = mapCountToColor(c, countColorDomain);
                            const fillOpacity = heatmapRegionFillOpacity(t);
                            return sub.subpaths.map((sp, i) => (
                              <path
                                key={`heat-count-foot-${sub.id}-${i}`}
                                d={sp.d}
                                transform={sp.transform}
                                fill={fill}
                                fillOpacity={fillOpacity}
                              />
                            ));
                          })
                        : BODY_PARTS.flatMap((part) => {
                            const c = partPaperMap[part.id] ?? 0;
                            const t = countToPerceptualNormalized(c, countColorDomain);
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
                      if (viewMode === "feetDetail" && part.id !== "foot") return [];
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
                {viewMode === "feetDetail"
                  ? FOOT_SUBPARTS.flatMap((sub) =>
                      sub.subpaths.map((sp, i) => (
                        <path
                          key={`${sub.id}-hit-${i}`}
                          d={sp.d}
                          transform={sp.transform}
                          fill={FOOT_SUBPART_BASE_FILL[sub.id]}
                          fillOpacity={
                            hoveredFootSubpartId === sub.id ||
                            selectedFootSubpart === sub.id
                              ? 0.9
                              : 0.56
                          }
                          filter={
                            hoveredFootSubpartId === sub.id ||
                            selectedFootSubpart === sub.id
                              ? `url(#${softFillFilterId})`
                              : undefined
                          }
                          stroke="none"
                          pointerEvents="all"
                          style={{ cursor: "pointer" }}
                          onPointerEnter={handleFootSubpartEnter(sub)}
                          onPointerMove={handlePartMove}
                          onPointerLeave={handlePartLeave}
                          onClick={handleFootSubpartClick(sub)}
                        />
                      )),
                    )
                  : BODY_PARTS.flatMap((part) =>
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

            <g transform={`translate(${BODY_MAP_INNER_TX})`} pointerEvents="none">
              {viewMode === "feetDetail" ? (
                (BODY_PARTS.find((p) => p.id === "foot")?.subpaths ?? []).map(
                  (sp, i) => (
                    <path
                      key={`feet-outline-${i}`}
                      d={sp.d}
                      transform={sp.transform}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={0.55}
                    />
                  ),
                )
              ) : (
                <path
                  d={BODY_MAP_OUTLINE_PATH_D}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={0.55}
                />
              )}
            </g>
          </g>
        </svg>
      </div>
      {viewMode === "feetDetail" ? (
        <button
          type="button"
          className="body-map-detail-back"
          onClick={handleBackToFull}
          aria-label="Back to full body map"
        >
          ←
        </button>
      ) : null}

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
