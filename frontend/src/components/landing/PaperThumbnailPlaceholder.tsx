import { useEffect, useMemo, useState } from "react";

type PaperThumbnailPlaceholderProps = {
  /** Accessible label for the decorative thumbnail. */
  label: string;
  /** Ordered candidate URLs for thumbnail lookup. */
  imageUrls?: string[];
  /** When true, clicking a loaded thumbnail opens a full-size preview. */
  expandable?: boolean;
};

/** Renders DOI-matched thumbnail and falls back to placeholder. */
export function PaperThumbnailPlaceholder({
  label,
  imageUrls = [],
  expandable = false,
}: PaperThumbnailPlaceholderProps) {
  const uniqueImageUrls = useMemo(
    () => [...new Set(imageUrls.filter(Boolean))],
    [imageUrls],
  );
  const [imageIdx, setImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeSrc =
    uniqueImageUrls.length > 0 && imageIdx < uniqueImageUrls.length
      ? uniqueImageUrls[imageIdx]
      : null;

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen]);

  if (activeSrc) {
    const image = (
      <img
        className="paper-thumb-placeholder"
        src={activeSrc}
        alt={`Thumbnail for ${label}`}
        loading="lazy"
        onError={() => setImageIdx((prev) => prev + 1)}
      />
    );

    if (!expandable) return image;

    return (
      <>
        <button
          type="button"
          className="paper-thumb-expand-btn"
          aria-label={`View full thumbnail for ${label}`}
          title="Click to view full image"
          onClick={() => setLightboxOpen(true)}
        >
          {image}
          <span className="paper-thumb-expand-btn__badge" aria-hidden>
            <svg
              className="paper-thumb-expand-btn__icon"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12.5 12.5L16 16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M8.5 6.25V10.75M6.25 8.5H10.75"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="paper-thumb-expand-btn__overlay" aria-hidden>
            <span className="paper-thumb-expand-btn__label">View Image</span>
          </span>
        </button>
        {lightboxOpen ? (
          <div
            className="paper-thumb-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Full thumbnail for ${label}`}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              className="paper-thumb-lightbox__close"
              aria-label="Close thumbnail preview"
              onClick={() => setLightboxOpen(false)}
            >
              Close
            </button>
            <img
              className="paper-thumb-lightbox__img"
              src={activeSrc}
              alt={`Full thumbnail for ${label}`}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
      </>
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
