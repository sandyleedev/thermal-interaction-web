import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  getResearchPaperById,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import { formatPaperDisplay, titleCaseOption } from "@/lib/research/formatPaperDisplay";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";
import "@/pages/LandingPage.css";

function trimText(s: string | undefined | null): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

const DETAIL_NA = "N/A";

const NULLISH_DISPLAY = new Set([
  "n/a",
  "na",
  "not specified",
  "not reported",
  "not applicable",
  "none",
  "null",
]);

function displayOrNa(value: string | undefined | null): string {
  const t = trimText(value);
  if (!t || t === "—" || NULLISH_DISPLAY.has(t.toLowerCase())) return DETAIL_NA;
  return t;
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

function DetailParagraph({
  text,
  preserveLineBreaks = false,
}: {
  text: string | undefined | null;
  preserveLineBreaks?: boolean;
}) {
  const t = trimText(text);
  return (
    <p
      className={
        preserveLineBreaks
          ? "paper-detail__prose paper-detail__prose--pre-wrap"
          : "paper-detail__prose"
      }
    >
      {t ?? DETAIL_NA}
    </p>
  );
}

function DetailChipRow({
  items,
  hideWhenEmpty = false,
}: {
  items: readonly string[] | undefined;
  hideWhenEmpty?: boolean;
}) {
  const labels = (items ?? [])
    .map((x) => titleCaseOption(String(x).trim()))
    .filter(Boolean);
  if (hideWhenEmpty && labels.length === 0) return null;
  if (labels.length === 0) {
    return <p className="paper-detail__prose paper-detail__na">{DETAIL_NA}</p>;
  }
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

function DetailValueChips({ values }: { values: readonly string[] }) {
  const labels = values.map((v) => v.trim()).filter(Boolean);
  if (labels.length === 0) {
    return <p className="paper-detail__prose paper-detail__na">{DETAIL_NA}</p>;
  }
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

function DetailFactChipGroup({
  title,
  items,
  values,
}: {
  title: string;
  items?: readonly string[];
  values?: readonly string[];
}) {
  const hid = sectionHeadingId(title);
  return (
    <div className="paper-detail__chip-group" aria-labelledby={hid}>
      <h3 id={hid} className="paper-detail__subhead">
        {title}
      </h3>
      {items != null ? (
        <DetailChipRow items={items} />
      ) : (
        <DetailValueChips values={values ?? []} />
      )}
    </div>
  );
}

function isProseBlockHeaderLine(line: string): boolean {
  const t = line.trim();
  if (!t.endsWith(":")) return false;
  if (t.length > 160) return false;
  return true;
}

type StructuredProseBlock = {
  header?: string;
  lines: string[];
};

function parseStructuredProseBlocks(text: string): StructuredProseBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return null;
      if (isProseBlockHeaderLine(lines[0]!)) {
        return { header: lines[0], lines: lines.slice(1) };
      }
      return { lines };
    })
    .filter((block): block is StructuredProseBlock => block != null);
}

function DetailStructuredProse({ text }: { text: string | undefined | null }) {
  const t = trimText(text);
  if (!t) {
    return <p className="paper-detail__prose paper-detail__na">{DETAIL_NA}</p>;
  }

  const blocks = parseStructuredProseBlocks(t);
  if (blocks.length === 0) {
    return <p className="paper-detail__prose paper-detail__na">{DETAIL_NA}</p>;
  }

  return (
    <div className="paper-detail__structured-prose">
      {blocks.map((block, blockIndex) => (
        <div
          key={`${block.header ?? "block"}-${blockIndex}`}
          className="paper-detail__prose-block"
        >
          {block.header ? (
            <p className="paper-detail__prose-header">{block.header}</p>
          ) : null}
          {block.lines.length > 1 ? (
            <ul className="paper-detail__prose-list">
              {block.lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line}</li>
              ))}
            </ul>
          ) : block.lines.length === 1 ? (
            <p className="paper-detail__prose">{block.lines[0]}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatItemList(items: readonly string[] | undefined): string | undefined {
  if (!items?.length) return undefined;
  const labels = items
    .map((x) => titleCaseOption(String(x).trim()))
    .filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : undefined;
}

function hardwareFactRows(paper: ResearchPaper): { dt: string; dd: string }[] {
  const rows: { dt: string; dd: string }[] = [];
  const pushAlways = (dt: string, v: string | undefined | null) => {
    rows.push({ dt, dd: trimText(v) ?? DETAIL_NA });
  };
  const pushIfPresent = (dt: string, v: string | undefined | null) => {
    const dd = trimText(v);
    if (dd) rows.push({ dt, dd });
  };
  pushAlways(
    "Main Actuator for Temperature Sensation",
    paper.mainActuatorForTemperatureSensation,
  );
  pushAlways("Main Actuator Model", paper.mainActuatorModel);
  pushIfPresent("Main Actuator Size", paper.mainActuatorSize);
  pushIfPresent("Overall Device Size", paper.overallDeviceSize);
  pushIfPresent(
    "Possible Temperature Range of the Main Actuator",
    paper.mainActuatorPossibleTemperatureRange,
  );
  pushAlways("Heat Control Method", paper.heatControlMethod);
  pushAlways("Power consumption", paper.powerConsumption);
  pushIfPresent("Temporal Parameters", paper.temporalParameters);
  pushIfPresent(
    "Other Sensory Actuators",
    formatItemList(paper.otherSensoryActuators),
  );
  pushIfPresent("Auxiliary Hardware", formatItemList(paper.auxiliaryHardware));
  return rows;
}

export function PaperDetailPage() {
  const { paperId } = useParams<{ paperId: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [paperId]);

  const paper = paperId ? getResearchPaperById(paperId) : undefined;
  const display = paper ? formatPaperDisplay(paper) : undefined;

  if (!paperId) {
    return <Navigate to="/" replace />;
  }

  if (!paper || !display) {
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
  const hwRows = hardwareFactRows(paper);
  const showOtherNote = Boolean(trimText(paper.otherNote));
  const ambientTempLabel =
    paper.ambientTempC != null && Number.isFinite(paper.ambientTempC)
      ? `${paper.ambientTempC}°C`
      : DETAIL_NA;

  return (
    <div className="paper-detail-page">
      <div className="paper-detail">
        <header className="paper-detail__header">
          <Link to="/" className="paper-detail__back">
            ← Back to results
          </Link>
          <div className="paper-detail__hero">
            <PaperThumbnailPlaceholder
              label={display.title}
              imageUrls={display.thumbnailUrls}
              expandable
            />
            <div className="paper-detail__titles">
              <h1 className="paper-detail__title">{display.title}</h1>
              <p className="paper-detail__authors">{display.authors}</p>
              {(display.publicationYear != null || display.publicationVenue) && (
                <p className="paper-detail__meta-line">
                  {[
                    display.publicationYear != null
                      ? String(display.publicationYear)
                      : null,
                    display.publicationVenue ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
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
          <DetailFactChipGroup
            title="Thermal transfer mode"
            items={paper.thermalTransferModes}
          />
          <DetailFactChipGroup title="Senses" items={paper.senses} />
          <DetailFactChipGroup
            title="Ambient temperature"
            values={[ambientTempLabel]}
          />
          <DetailFactChipGroup
            title="Temperature range"
            values={[displayOrNa(display.temperatureRange)]}
          />
          <DetailFactChipGroup
            title="Duration"
            values={[displayOrNa(display.duration)]}
          />
          <DetailFactChipGroup
            title="Material(s) in contact with skin"
            items={paper.materialsInContactWithSkin}
          />
        </section>

        <div className="paper-detail__sections">
          <DetailBlock title="Body parts involved">
            <DetailParagraph
              text={paper.bodyPartsInvolved}
              preserveLineBreaks
            />
          </DetailBlock>

          <DetailBlock title="How did they measure thermal perception">
            <DetailStructuredProse text={paper.thermalPerceptionMeasure} />
          </DetailBlock>

          <DetailBlock title="Purpose of applying thermal cues">
            <DetailParagraph text={paper.thermalCuePurpose} />
          </DetailBlock>

          <DetailBlock title="Hardware and control">
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
            {showOtherNote ? (
              <>
                <h3 className="paper-detail__subhead">Other Note</h3>
                <DetailParagraph text={paper.otherNote} preserveLineBreaks />
              </>
            ) : null}
          </DetailBlock>

          <DetailBlock title="Power/Energy Consumption">
            <DetailParagraph text={paper.powerEnergyConsumption} />
          </DetailBlock>

          <DetailBlock title="Technical Summary">
            <DetailParagraph text={paper.technicalSummary} />
          </DetailBlock>
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
