import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { LandingPageDemo2 } from "@/pages/LandingPageDemo2";
import { InfoPage } from "@/pages/InfoPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demo1" replace />} />
        <Route path="/demo1" element={<LandingPage />} />
        <Route path="/demo2" element={<LandingPageDemo2 />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="*" element={<Navigate to="/demo1" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
