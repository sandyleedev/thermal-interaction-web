import { BodyMapPanel } from "@/components/body-map/BodyMapPanel";
import { DurationPanel } from "@/components/duration-panel/DurationPanel";
import { Header } from "@/components/landing/Header";
import { OtherFiltersPanel } from "@/components/landing/OtherFiltersPanel";
import { ResultsPanel } from "@/components/landing/ResultsPanel";
import { TemperaturePanel } from "@/components/temperature-panel/TemperaturePanel";
import "@/pages/LandingPage.css";

/**
 * Demo 2 column layout with a reorganised filter panel: vertical Temperature and
 * horizontal Duration side-by-side on top; Other filters below with the same chip UI and scroll behaviour.
 */
export function LandingPageDemo3() {
  return (
    <div className="landing-root">
      <Header />
      <div className="landing-main landing-demo2-main" id="main">
        <div className="landing-demo2-col landing-demo2-col-left">
          <BodyMapPanel />
        </div>
        <div className="landing-demo2-col landing-demo2-col-center">
          <div className="landing-demo3-filters">
            <div className="landing-demo3-filters-top">
              <div className="landing-demo3-filters-top-temperature">
                <TemperaturePanel densityPreserveAspectRatio="none" />
              </div>
              <div className="landing-demo3-filters-top-duration">
                <DurationPanel />
              </div>
            </div>
            <OtherFiltersPanel />
          </div>
        </div>
        <div className="landing-demo2-col landing-demo2-col-right">
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
}
