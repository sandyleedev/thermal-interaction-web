import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  getResearchPaperById,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import { resolvePaperPreview, titleCaseOption } from "@/data/paperPreviews";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";
import "@/pages/LandingPage.css";

function trimText(s: string | undefined | null): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

function formatTaxonomyList(items: readonly string[] | undefined): string {
  if (!items?.length) return "";
  return items
    .map((x) => titleCaseOption(x.trim()))
    .filter(Boolean)
    .join(", ");
}

function paperPrimaryLink(p: ResearchPaper): string | undefined {
  const u = trimText(p.url);
  if (u) return u;
  const doi = trimText(p.doi);
  if (doi) return `https://doi.org/${doi}`;
  return undefined;
}

function sectionHeadingId(title: string): string {
  const slug = title
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `paper-detail-${slug || "section"}`;
}

function DetailBlock({
  title,
  when = true,
  children,
}: {
  title: string;
  when?: boolean;
  children: ReactNode;
}) {
  if (!when) return null;
  const hid = sectionHeadingId(title);
  return (
    <section className="paper-detail__panel" aria-labelledby={hid}>
      <h2 id={hid} className="paper-detail__panel-title">
        {title}
      </h2>
      <div className="paper-detail__panel-body">{children}</div>
    </section>
  );
}

function DetailParagraph({ text }: { text: string | undefined }) {
  const t = trimText(text);
  if (!t) return null;
  return <p className="paper-detail__prose">{t}</p>;
}

function DetailChipRow({ items }: { items: readonly string[] | undefined }) {
  if (!items?.length) return null;
  const labels = items
    .map((x) => titleCaseOption(String(x).trim()))
    .filter(Boolean);
  if (!labels.length) return null;
  return (
    <div className="paper-detail__tags paper-detail__tags--section">
      {labels.map((t, i) => (
        <span key={`${t}-${i}`} className="paper-detail__tag">
          {t}
        </span>
      ))}
    </div>
  );
}

function hardwareFactRows(paper: ResearchPaper): { dt: string; dd: string }[] {
  const rows: { dt: string; dd: string }[] = [];
  const push = (dt: string, v: string | undefined) => {
    const dd = trimText(v);
    if (dd) rows.push({ dt, dd });
  };
  push("Main thermal actuator", paper.mainActuatorForTemperatureSensation);
  push("Actuator model", paper.mainActuatorModel);
  push("Actuator size", paper.mainActuatorSize);
  push("Device footprint", paper.overallDeviceSize);
  push(
    "Stimulus temperature (reported)",
    paper.mainActuatorPossibleTemperatureRange,
  );
  push("Heat control", paper.heatControlMethod);
  push("Power (stated)", paper.powerConsumption);
  push("Temporal parameters", paper.temporalParameters);
  push("Energy accounting", paper.powerEnergyConsumption);
  return rows;
}

export function PaperDetailPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const paper = paperId ? getResearchPaperById(paperId) : undefined;
  const preview = paper ? resolvePaperPreview(paper) : undefined;

  if (!paperId) {
    return <Navigate to="/" replace />;
  }

  if (!paper || !preview) {
    return (
      <div className="paper-detail-page paper-detail-page--bare">
        <div className="paper-detail paper-detail--missing">
          <p className="paper-detail__missing-msg">Paper not found.</p>
          <Link to="/" className="paper-detail__back">
            Back to results
          </Link>
        </div>
      </div>
    );
  }

  const primaryLink = paperPrimaryLink(paper);
  const mic = formatTaxonomyList(paper.materialsInContactWithSkin);
  const hwRows = hardwareFactRows(paper);
  const hasAuxLists =
    (paper.otherSensoryActuators?.length ?? 0) > 0 ||
    (paper.auxiliaryHardware?.length ?? 0) > 0;
  const showHardware = hwRows.length > 0 || hasAuxLists;

  const emotionTheoryLabels = paper.emotionTheoriesMentioned?.length
    ? paper.emotionTheoriesMentioned
        .map((x) => titleCaseOption(String(x)))
        .join(", ")
    : "";
  const showEmotion =
    Boolean(emotionTheoryLabels) ||
    Boolean(trimText(paper.emotionTheoriesUsage)) ||
    Boolean(trimText(paper.emotionAffectMeasurement)) ||
    Boolean(trimText(paper.thermalAffectJustification));

  return (
    <div className="paper-detail-page">
      <div className="paper-detail">
        <header className="paper-detail__header">
          <Link to="/" className="paper-detail__back">
            ← Back to results
          </Link>
          <div className="paper-detail__hero">
            <PaperThumbnailPlaceholder
              label={preview.title}
              imageUrls={preview.thumbnailUrls}
            />
            <div className="paper-detail__titles">
              <h1 className="paper-detail__title">{preview.title}</h1>
              <p className="paper-detail__authors">{preview.authors}</p>
              <p className="paper-detail__meta-line">
                <span>{preview.publicationYear}</span>
                <span aria-hidden> · </span>
                <span>{preview.publicationVenue}</span>
              </p>
              {primaryLink ? (
                <p className="paper-detail__link-line">
                  <a
                    href={primaryLink}
                    className="paper-detail__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open publication
                  </a>
                  {paper.doi ? (
                    <span className="paper-detail__doi">
                      {" "}
                      · DOI {paper.doi}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section
          className="paper-detail__panel paper-detail__panel--facts"
          aria-label="Key study facts"
        >
          <dl className="paper-detail__facts">
            <div className="paper-detail__fact">
              <dt>Body sites</dt>
              <dd>{preview.bodySitesSummary}</dd>
            </div>
            <div className="paper-detail__fact">
              <dt>Thermal transfer</dt>
              <dd>{preview.transferMode}</dd>
            </div>
            <div className="paper-detail__fact">
              <dt>Temperature range</dt>
              <dd>{preview.temperatureRange}</dd>
            </div>
            <div className="paper-detail__fact">
              <dt>Duration</dt>
              <dd>{preview.duration}</dd>
            </div>
            {paper.ambientTemperatureC != null &&
            Number.isFinite(paper.ambientTemperatureC) ? (
              <div className="paper-detail__fact">
                <dt>Ambient Temperature</dt>
                <dd>{paper.ambientTemperatureC}°C</dd>
              </div>
            ) : null}
            {mic ? (
              <div className="paper-detail__fact paper-detail__fact--wide">
                <dt>Materials on skin</dt>
                <dd>{mic}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section
          className="paper-detail__panel paper-detail__panel--chips"
          aria-labelledby="paper-detail-keywords"
        >
          <h2 id="paper-detail-keywords" className="paper-detail__panel-title">
            Keywords
          </h2>
          <div className="paper-detail__tags" role="list">
            {preview.keywords.map((t) => (
              <span key={t} className="paper-detail__tag" role="listitem">
                {t}
              </span>
            ))}
          </div>
        </section>

        <div className="paper-detail__sections">
          <DetailBlock title="Summary">
            <DetailParagraph
              text={paper.technicalSummary ?? preview.abstract}
            />
          </DetailBlock>

          <DetailBlock
            title="Study methods"
            when={Boolean(trimText(paper.studyMethods))}
          >
            <DetailParagraph text={paper.studyMethods} />
          </DetailBlock>

          <DetailBlock
            title="Contributions"
            when={Boolean(trimText(paper.contributions))}
          >
            <DetailParagraph text={paper.contributions} />
          </DetailBlock>

          <DetailBlock
            title="Design takeaways"
            when={Boolean(trimText(paper.contributionsToDesign))}
          >
            <DetailParagraph text={paper.contributionsToDesign} />
          </DetailBlock>

          <DetailBlock
            title="Thermal cue purpose"
            when={Boolean(trimText(paper.thermalCuePurpose))}
          >
            <DetailParagraph text={paper.thermalCuePurpose} />
          </DetailBlock>

          <DetailBlock
            title="Thermal vocabulary (paper)"
            when={Boolean(trimText(paper.thermalVocabularyDescription))}
          >
            <DetailParagraph text={paper.thermalVocabularyDescription} />
          </DetailBlock>

          <DetailBlock title="Emotion and affect" when={showEmotion}>
            {emotionTheoryLabels ? (
              <p className="paper-detail__prose">
                <span className="paper-detail__label">
                  Theories mentioned:{" "}
                </span>
                {emotionTheoryLabels}
              </p>
            ) : null}
            <DetailParagraph text={paper.emotionTheoriesUsage} />
            <DetailParagraph text={paper.emotionAffectMeasurement} />
            <DetailParagraph text={paper.thermalAffectJustification} />
          </DetailBlock>

          <DetailBlock title="Hardware and control" when={showHardware}>
            {hwRows.length > 0 ? (
              <dl className="paper-detail__facts paper-detail__facts--nested">
                {hwRows.map((row) => (
                  <div
                    key={row.dt}
                    className="paper-detail__fact paper-detail__fact--wide"
                  >
                    <dt>{row.dt}</dt>
                    <dd>{row.dd}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {paper.otherSensoryActuators?.length ? (
              <>
                <h3 className="paper-detail__subhead">
                  Other sensory actuators
                </h3>
                <DetailChipRow items={paper.otherSensoryActuators} />
              </>
            ) : null}
            {paper.auxiliaryHardware?.length ? (
              <>
                <h3 className="paper-detail__subhead">Auxiliary hardware</h3>
                <DetailChipRow items={paper.auxiliaryHardware} />
              </>
            ) : null}
          </DetailBlock>

          <DetailBlock title="Notes" when={Boolean(trimText(paper.otherNote))}>
            <DetailParagraph text={paper.otherNote} />
          </DetailBlock>

          {preview.engineeringSummary ? (
            <DetailBlock title="Engineering summary">
              <DetailParagraph text={preview.engineeringSummary} />
            </DetailBlock>
          ) : null}
        </div>

        <footer className="paper-detail__footer">
          <Link to="/" className="paper-detail__back-btn">
            ← Back to results
          </Link>
        </footer>
      </div>
    </div>
  );
}
