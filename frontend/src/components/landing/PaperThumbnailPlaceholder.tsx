import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type PaperThumbnailPlaceholderProps = {
  /** Accessible label for the decorative thumbnail. */
  label: string;
  /** Ordered candidate URLs for thumbnail lookup. */
  imageUrls?: string[];
  /** When true, clicking a loaded thumbnail opens a full-size preview. */
  expandable?: boolean;
};

function ThumbnailPlaceholderGraphic({ label }: { label: string }) {
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

type PaperThumbLightboxProps = {
  label: string;
  src: string;
  onClose: () => void;
};

function PaperThumbLightbox({ label, src, onClose }: PaperThumbLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="paper-thumb-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Full thumbnail for ${label}`}
    >
      <button
        type="button"
        className="paper-thumb-lightbox__backdrop"
        aria-label="Close thumbnail preview"
        onClick={onClose}
      />
      <button
        type="button"
        className="paper-thumb-lightbox__close"
        aria-label="Close thumbnail preview"
        onClick={onClose}
      >
        Close
      </button>
      <div className="paper-thumb-lightbox__stage">
        <img
          className="paper-thumb-lightbox__img"
          src={src}
          alt={`Full thumbnail for ${label}`}
        />
      </div>
    </div>
  );
}

/** Renders DOI-matched thumbnail and falls back to placeholder. */
export function PaperThumbnailPlaceholder({
  label,
  imageUrls = [],
  expandable = false,
}: PaperThumbnailPlaceholderProps) {
  const urlsKey = imageUrls.filter(Boolean).join("\u0000");
  const uniqueImageUrls = useMemo(
    () => [...new Set(imageUrls.filter(Boolean))],
    [urlsKey],
  );

  const [imageIdx, setImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setImageIdx(0);
  }, [urlsKey]);

  const activeSrc =
    uniqueImageUrls.length > 0 && imageIdx < uniqueImageUrls.length
      ? uniqueImageUrls[imageIdx]
      : null;

  const frame = (
    <span className="paper-thumb-frame">
      <ThumbnailPlaceholderGraphic label={label} />
      {activeSrc ? (
        <img
          key={activeSrc}
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0) {
              img.classList.add("is-loaded");
            }
          }}
          className="paper-thumb-image"
          src={activeSrc}
          alt={`Thumbnail for ${label}`}
          decoding="async"
          onLoad={(event) => {
            event.currentTarget.classList.add("is-loaded");
          }}
          onError={() => setImageIdx((prev) => prev + 1)}
        />
      ) : null}
    </span>
  );

  if (!expandable || !activeSrc) {
    return frame;
  }

  return (
    <>
      <button
        type="button"
        className="paper-thumb-expand-btn"
        aria-label={`View full thumbnail for ${label}`}
        title="Click to view full image"
        onClick={() => setLightboxOpen(true)}
      >
        {frame}
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
      {lightboxOpen && typeof document !== "undefined"
        ? createPortal(
            <PaperThumbLightbox
              label={label}
              src={activeSrc}
              onClose={() => setLightboxOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}
