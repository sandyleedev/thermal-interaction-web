import { useState } from "react";
import BodyMap, {
  type BodyMapVariant,
} from "@/components/landing/BodyMap";

export function BodyMapPanel() {
  const [variant, setVariant] = useState<BodyMapVariant>("dots");

  return (
    <aside className="landing-panel landing-body-map">
      <h2 className="panel-title">Panel 1</h2>
      <div
        className="body-map-toolbar"
        role="group"
        aria-label="Body map visualization mode"
      >
        <div className="body-map-mode-switch">
          <button
            type="button"
            className={variant === "dots" ? "is-active" : undefined}
            onClick={() => setVariant("dots")}
          >
            Dots
          </button>
          <button
            type="button"
            className={variant === "blur" ? "is-active" : undefined}
            onClick={() => setVariant("blur")}
          >
            Blur heat
          </button>
          <button
            type="button"
            className={variant === "thermal" ? "is-active" : undefined}
            onClick={() => setVariant("thermal")}
          >
            Thermal
          </button>
        </div>
      </div>
      <div className="panel-content panel-content-center">
        <BodyMap variant={variant} />
      </div>
    </aside>
  );
}
