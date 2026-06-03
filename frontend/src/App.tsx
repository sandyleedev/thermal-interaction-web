import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ResearchFilterProvider } from "@/context/ResearchFilterContext";
import { LandingPage } from "@/pages/LandingPage";
import { InfoPage } from "@/pages/InfoPage";
import { PaperDetailPage } from "@/pages/PaperDetailPage";

/** Strip trailing slash; omit basename when serving from domain root. */
function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (base === "/") return undefined;
  return base.replace(/\/$/, "");
}

function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
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
