import { useEffect } from "react";
import { BodyMapPanel } from "@/components/body-map/BodyMapPanel";
import { DurationPanel } from "@/components/duration-panel/DurationPanel";
import { Header } from "@/components/landing/Header";
import { OtherFilterCategoryPanel } from "@/components/landing/OtherFiltersPanel";
import { OTHER_FILTER_CATEGORY_ORDER } from "@/lib/research/otherFilterVocab";
import { consumeLandingScrollRestore } from "@/lib/navigation/landingScrollRestore";
import { ResultsPanel } from "@/components/landing/ResultsPanel";
import { ScrollToTopButton } from "@/components/landing/ScrollToTopButton";
import { TemperaturePanelHorizontal } from "@/components/temperature-panel/TemperaturePanelHorizontal";
import "@/pages/LandingPage.css";

/**
 * Main landing layout: three-column view (body map | filters | results).
 */
export function LandingPage() {
  useEffect(() => {
    const savedY = consumeLandingScrollRestore();
    if (savedY != null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedY);
      });
      return;
    }
    window.scrollTo(0, 0);
  }, []);

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
            {OTHER_FILTER_CATEGORY_ORDER.map((category, index) => (
              <OtherFilterCategoryPanel
                key={category}
                category={category}
                showFilterLogicInfo={index === 0}
              />
            ))}
          </div>
        </div>
        <div className="landing-layout-col landing-layout-col-right">
          <ResultsPanel />
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
}
