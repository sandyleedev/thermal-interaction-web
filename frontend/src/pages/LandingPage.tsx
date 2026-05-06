import { BodyMapPanel } from "@/components/body-map/BodyMapPanel";
import { DurationPanel } from "@/components/duration-panel/DurationPanel";
import { Header } from "@/components/landing/Header";
import { OtherFiltersPanel } from "@/components/landing/OtherFiltersPanel";
import { ResultsPanel } from "@/components/landing/ResultsPanel";
import { TemperaturePanelHorizontal } from "@/components/temperature-panel/TemperaturePanelHorizontal";
import "@/pages/LandingPage.css";

/**
 * Main landing layout: three-column view (body map | filters | results).
 */
export function LandingPage() {
  return (
    <div className="landing-root">
      <Header />
      <div className="landing-main landing-layout-main" id="main">
        <div className="landing-layout-col landing-layout-col-left">
          <BodyMapPanel />
        </div>
        <div className="landing-layout-col landing-layout-col-center">
          <div className="landing-filters-scroll">
            <TemperaturePanelHorizontal compact />
            <DurationPanel />
            <OtherFiltersPanel />
          </div>
        </div>
        <div className="landing-layout-col landing-layout-col-right">
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
}
