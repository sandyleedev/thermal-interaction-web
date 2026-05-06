import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ResearchFilterProvider } from "@/context/ResearchFilterContext";
import { LandingPage } from "@/pages/LandingPage";
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
        <Route path="/info" element={<InfoPage />} />
        <Route path="/paper/:paperId" element={<PaperDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
