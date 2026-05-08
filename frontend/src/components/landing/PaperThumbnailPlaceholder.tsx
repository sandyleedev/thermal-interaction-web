import { useMemo, useState } from "react";

/** Renders DOI-matched thumbnail and falls back to placeholder. */
export function PaperThumbnailPlaceholder({
  label,
  imageUrls = [],
}: {
  /** Accessible label for the decorative thumbnail. */
  label: string;
  /** Ordered candidate URLs for thumbnail lookup. */
  imageUrls?: string[];
}) {
  const uniqueImageUrls = useMemo(
    () => [...new Set(imageUrls.filter(Boolean))],
    [imageUrls],
  );
  const [imageIdx, setImageIdx] = useState(0);

  const activeSrc =
    uniqueImageUrls.length > 0 && imageIdx < uniqueImageUrls.length
      ? uniqueImageUrls[imageIdx]
      : null;

  if (activeSrc) {
    return (
      <img
        className="paper-thumb-placeholder"
        src={activeSrc}
        alt={`Thumbnail for ${label}`}
        loading="lazy"
        onError={() => setImageIdx((prev) => prev + 1)}
      />
    );
  }

  return (
    <div
      className="paper-thumb-placeholder"
      role="img"
      aria-label={`Placeholder thumbnail for ${label}`}
    >
      <div className="paper-thumb-placeholder__frame" aria-hidden>
        <span className="paper-thumb-placeholder__line" />
        <span className="paper-thumb-placeholder__line paper-thumb-placeholder__line--short" />
        <span className="paper-thumb-placeholder__line paper-thumb-placeholder__line--medium" />
      </div>
    </div>
  );
}
