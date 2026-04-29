import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ResearchFilterProvider } from "@/context/ResearchFilterContext";
import { LandingPage } from "@/pages/LandingPage";
import { LandingPageDemo2 } from "@/pages/LandingPageDemo2";
import { LandingPageDemo3 } from "@/pages/LandingPageDemo3";
import { InfoPage } from "@/pages/InfoPage";
import { PaperDetailPage } from "@/pages/PaperDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demo1" replace />} />
        <Route
          path="/demo1"
          element={
            <ResearchFilterProvider>
              <LandingPage />
            </ResearchFilterProvider>
          }
        />
        <Route
          path="/demo2"
          element={
            <ResearchFilterProvider>
              <LandingPageDemo2 />
            </ResearchFilterProvider>
          }
        />
        <Route
          path="/demo3"
          element={
            <ResearchFilterProvider>
              <LandingPageDemo3 />
            </ResearchFilterProvider>
          }
        />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/paper/:paperId" element={<PaperDetailPage />} />
        <Route path="*" element={<Navigate to="/demo1" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
