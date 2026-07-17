import { Link } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import "@/pages/LandingPage.css";

export function InfoPage() {
  return (
    <div className="landing-root landing-root--info">
      <Header />
      <main className="landing-main landing-info-main" id="main">
        <article className="landing-info-card">
          <header className="landing-info-hero">
            <p className="landing-info-eyebrow">
              Thermal Interaction Paper Explorer
            </p>
            <h1 className="landing-info-title">About This Visualisation</h1>
            <p className="landing-info-lead">
              Welcome to this interactive visualisation of research on thermal
              interactive technologies. This website presents findings from a
              research project that explores how temperature can be used as a
              design material to enrich human interaction and experience.
            </p>
          </header>

          <div className="landing-info-body">
            <section
              className="landing-info-section"
              aria-labelledby="info-overview"
            >
              <h2 id="info-overview" className="landing-info-section-title">
                Overview
              </h2>
              <p>
                The visualisation brings together a wide range of projects that
                employ thermal feedback in different contexts. These include,
                for example, wearable devices and smart garments that
                communicate affective information, extended reality (XR)
                applications that enhance immersive experiences, and care
                technologies that support healthcare, wellbeing, and
                companionship. By mapping and analysing these projects, the
                platform provides an overview of how thermal interactions are
                being designed and applied across different domains.
              </p>
            </section>

            <section
              className="landing-info-section landing-info-section--highlight"
              aria-labelledby="info-explore"
            >
              <h2 id="info-explore" className="landing-info-section-title">
                Explore the dataset
              </h2>
              <p>
                Filter projects by body location, temperature range, stimulation
                duration, actuation method, thermal transfer mode, and other
                design characteristics. Use the interactive filters on the main
                page to identify and compare work that matches your interests or
                research needs.
              </p>
              <Link to="/" className="landing-info-cta">
                Open the explorer
              </Link>
            </section>

            <section
              className="landing-info-section"
              aria-labelledby="info-audience"
            >
              <h2 id="info-audience" className="landing-info-section-title">
                Who it is for
              </h2>
              <p>
                We hope this resource supports researchers, designers, and
                practitioners in understanding the current landscape of thermal
                interaction design and discovering new opportunities for future
                work.
              </p>
            </section>
          </div>

          <footer className="landing-info-footer">
            <p>
              Questions, suggestions, or feedback? Contact{" "}
              <a
                className="landing-info-placeholder"
                href="mailto:thermal.interaction@gmail.com"
              >
                thermal.interaction@gmail.com
              </a>
            </p>
            <p className="landing-info-credits">
              Designed and implemented by{" "}
              <span className="landing-info-placeholder">FF, HK ,SL</span>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}
