import { formatPaperCount } from "@/lib/research/bodyMapSiteSide";

export type BodyMapTooltipState = {
  lines: readonly { label: string; count: number }[];
  x: number;
  y: number;
};

type BodyMapHoverTooltipProps = {
  tooltip: BodyMapTooltipState | null;
};

export function BodyMapHoverTooltip({ tooltip }: BodyMapHoverTooltipProps) {
  if (!tooltip) return null;
  return (
    <div
      className="body-map-tooltip"
      role="tooltip"
      style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
    >
      {tooltip.lines.map((line, index) => (
        <div
          key={`${line.label}-${index}`}
          className={
            index === 0
              ? "body-map-tooltip-title"
              : "body-map-tooltip-side"
          }
        >
          {index === 0 ? (
            <>
              {line.label}: {formatPaperCount(line.count)}
            </>
          ) : (
            <>- {line.label}: {formatPaperCount(line.count)}</>
          )}
        </div>
      ))}
    </div>
  );
}
