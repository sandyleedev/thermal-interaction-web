import { BodyMapPanel } from "@/components/landing/BodyMapPanel";
import { DurationPanel } from "@/components/landing/DurationPanel";
import { Header } from "@/components/landing/Header";
import { OtherFiltersPanel } from "@/components/landing/OtherFiltersPanel";
import { ResultsPanel } from "@/components/landing/ResultsPanel";
import { TemperaturePanel } from "@/components/landing/TemperaturePanel";
import "@/pages/LandingPage.css";

export function LandingPage() {
  return (
    <div className="landing-root">
      <Header />
      <div className="landing-main">
        <div className="landing-left">
          <BodyMapPanel />
        </div>
        <div className="landing-right">
          <div className="landing-filters">
            <TemperaturePanel />
            <DurationPanel />
            <OtherFiltersPanel />
          </div>
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
}
