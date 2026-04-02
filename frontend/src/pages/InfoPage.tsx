import { Header } from "@/components/landing/Header";
import "@/pages/LandingPage.css";

export function InfoPage() {
  return (
    <div className="landing-root">
      <Header />
      <main className="landing-main landing-info-main" id="main">
        <div className="landing-info-inner">
          <h1 className="landing-info-title">Info</h1>
          <p className="landing-info-text">Placeholder. Replace with project info later.</p>
        </div>
      </main>
    </div>
  );
}
