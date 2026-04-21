import { BodyMapPanel } from "@/components/body-map/BodyMapPanel";
import { DurationPanel } from "@/components/duration-panel/DurationPanel";
import { Header } from "@/components/landing/Header";
import { OtherFiltersPanel } from "@/components/landing/OtherFiltersPanel";
import { SensesPanel } from "@/components/landing/SensesPanel";
import { ResultsPanel } from "@/components/landing/ResultsPanel";
import { TemperaturePanel } from "@/components/temperature-panel/TemperaturePanel";
import "@/pages/LandingPage.css";

/**
 * Same three columns as Demo 2; top strip = Temperature | Duration + Senses; Other filters scroll below (without Senses).
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
                <TemperaturePanel
                  densityPreserveAspectRatio="none"
                  compactTrackHeightPx={156}
                  plotWidthPx={74}
                />
              </div>
              <div className="landing-demo3-filters-top-duration-wrap">
                <DurationPanel />
              </div>
              <div className="landing-demo3-filters-top-senses-wrap">
                <SensesPanel />
              </div>
            </div>
            <OtherFiltersPanel
              excludeCategories={["senses"]}
              className="landing-other-filters-panel--demo3"
            />
          </div>
        </div>
        <div className="landing-demo2-col landing-demo2-col-right">
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
}
