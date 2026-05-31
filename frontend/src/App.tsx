import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ResearchFilterProvider } from "@/context/ResearchFilterContext";
import { LandingPage } from "@/pages/LandingPage";
import { InfoPage } from "@/pages/InfoPage";
import { PaperDetailPage } from "@/pages/PaperDetailPage";

function App() {
  return (
    <BrowserRouter>
      <ResearchFilterProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/paper/:paperId" element={<PaperDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ResearchFilterProvider>
    </BrowserRouter>
  );
}

export default App;
