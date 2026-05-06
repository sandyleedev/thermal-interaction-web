import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ResearchFilterProvider } from "@/context/ResearchFilterContext";
import { LandingPage } from "@/pages/LandingPage";
import { LandingPageDemo2 } from "@/pages/LandingPageDemo2";
import { InfoPage } from "@/pages/InfoPage";
import { PaperDetailPage } from "@/pages/PaperDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ResearchFilterProvider>
              <LandingPage />
            </ResearchFilterProvider>
          }
        />
        <Route
          path="/demo1"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/demo2"
          element={
            <ResearchFilterProvider>
              <LandingPageDemo2 />
            </ResearchFilterProvider>
          }
        />
        <Route path="/demo3" element={<Navigate to="/" replace />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/paper/:paperId" element={<PaperDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
