type BodyMapDetailBackButtonProps = {
  onBack: () => void;
};

export function BodyMapDetailBackButton({ onBack }: BodyMapDetailBackButtonProps) {
  return (
    <button
      type="button"
      className="body-map-detail-back-btn"
      onClick={onBack}
      aria-label="Back to full body map"
    >
      <svg
        className="body-map-detail-back-btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M15 6L9 12L15 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Full body
    </button>
  );
}
