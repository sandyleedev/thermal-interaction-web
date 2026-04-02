import { BodyMapPanel } from "@/components/body-map/BodyMapPanel";
import { DurationPanel } from "@/components/duration-panel/DurationPanel";
import { Header } from "@/components/landing/Header";
import { OtherFiltersPanel } from "@/components/landing/OtherFiltersPanel";
import { ResultsPanel } from "@/components/landing/ResultsPanel";
import { TemperaturePanel } from "@/components/temperature-panel/TemperaturePanel";
import "@/pages/LandingPage.css";

/**
 * Same panels as Demo 1; three-column layout: body map | temp + duration + other filters | results.
 */
export function LandingPageDemo2() {
  return (
    <div className="landing-root">
      <Header />
      <div className="landing-main landing-demo2-main" id="main">
        <div className="landing-demo2-col landing-demo2-col-left">
          <BodyMapPanel />
        </div>
        <div className="landing-demo2-col landing-demo2-col-center">
          <TemperaturePanel />
          <DurationPanel />
          <OtherFiltersPanel />
        </div>
        <div className="landing-demo2-col landing-demo2-col-right">
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
}
