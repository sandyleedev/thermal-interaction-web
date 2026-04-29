/** Fixed-size placeholder (no remote URLs). */
export function PaperThumbnailPlaceholder({
  label,
}: {
  /** Accessible label for the decorative thumbnail. */
  label: string;
}) {
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
