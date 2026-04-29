import { Link, Navigate, useParams } from "react-router-dom";
import { getPaperPreviewById } from "@/data/paperPreviews";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";
import "@/pages/LandingPage.css";

export function PaperDetailPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const paper = paperId ? getPaperPreviewById(paperId) : undefined;

  if (!paperId) {
    return <Navigate to="/demo1" replace />;
  }

  if (!paper) {
    return (
      <div className="paper-detail-page paper-detail-page--bare">
        <div className="paper-detail paper-detail--missing">
          <p className="paper-detail__missing-msg">Paper not found.</p>
          <Link to="/demo1" className="paper-detail__back">
            Back to Demo 1
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-detail-page">
      <div className="paper-detail">
        <header className="paper-detail__header">
        <Link to="/demo1" className="paper-detail__back">
          ← Back to results
        </Link>
        <div className="paper-detail__hero">
          <PaperThumbnailPlaceholder label={paper.title} />
          <div className="paper-detail__titles">
            <h1 className="paper-detail__title">{paper.title}</h1>
            <p className="paper-detail__authors">{paper.authors}</p>
            <p className="paper-detail__meta-line">
              <span>{paper.year}</span>
              <span aria-hidden> · </span>
              <span>{paper.journal}</span>
            </p>
          </div>
        </div>
        </header>

        <dl className="paper-detail__facts">
        <div className="paper-detail__fact">
          <dt>Body region</dt>
          <dd>{paper.bodyRegion}</dd>
        </div>
        <div className="paper-detail__fact">
          <dt>Thermal transfer</dt>
          <dd>{paper.transferMode}</dd>
        </div>
        <div className="paper-detail__fact">
          <dt>Temperature range</dt>
          <dd>{paper.temperatureRange}</dd>
        </div>
        <div className="paper-detail__fact">
          <dt>Duration</dt>
          <dd>{paper.duration}</dd>
        </div>
        </dl>

        <section className="paper-detail__tags">
        {paper.tags.map((t) => (
          <span key={t} className="paper-detail__tag">
            {t}
          </span>
        ))}
        </section>

        <section className="paper-detail__abstract">
        <h2 className="paper-detail__section-title">Abstract</h2>
        <p>{paper.abstract}</p>
        {paper.engineeringSummary ? (
          <>
            <h2 className="paper-detail__section-title">Engineering summary</h2>
            <p>{paper.engineeringSummary}</p>
          </>
        ) : null}
        </section>
      </div>
    </div>
  );
}
