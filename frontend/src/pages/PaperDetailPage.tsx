import type { ReactNode, SVGProps } from "react";
import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  getResearchPaperById,
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  formatBodySiteLine,
  formatPaperDisplay,
  titleCaseOption,
} from "@/lib/research/formatPaperDisplay";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";
import {
  ARRAY_CHIP_FIELD_KEYS,
  FREE_TEXT_ARRAY_FIELD_KEYS,
  PAPER_DETAIL_SECTIONS,
  PRESERVE_LINE_BREAKS_FIELD_KEYS,
  type PaperDetailFieldConfig,
  type PaperDetailFieldKey,
  type PaperDetailSectionConfig,
  type PaperDetailSubsectionConfig,
} from "@/pages/paperDetailSections";
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

function isDetailNa(value: string | undefined | null): boolean {
  return displayOrNa(value) === DETAIL_NA;
}

const isValidValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && trimmed.toLowerCase() !== "n/a";
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

function getPaperFieldValue(
  paper: ResearchPaper,
  key: PaperDetailFieldKey,
): unknown {
  if (key === "bodySites") return normalizeBodySites(paper);
  return paper[key];
}

function shouldRenderField(
  field: PaperDetailFieldConfig,
  value: unknown,
): boolean {
  return field.showWhenEmpty || isValidValue(value);
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

type PillVariant = "purple" | "teal" | "blue";

type SubsectionVisual = {
  Icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
  iconBg: string;
  iconColor: string;
};

function IconThermometer(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      {...props}
    >
      <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76" />
      <path d="M10 14h4" />
      <path d="M12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}

function IconHand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      {...props}
    >
      <path d="M7 11V6a1 1 0 0 1 2 0v4" />
      <path d="M11 10V4a1 1 0 0 1 2 0v7" />
      <path d="M15 9V5a1 1 0 0 1 2 0v8a5 5 0 0 1-5 5h-1a4 4 0 0 1-4-4v-2a1 1 0 0 1 2 0v2" />
    </svg>
  );
}

function IconBodyScan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="5" r="2" />
      <path d="M9 9h6v3H9z" />
      <path d="M10 12v7" />
      <path d="M14 12v7" />
      <path d="M8 20h8" />
    </svg>
  );
}

function IconCpu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      {...props}
    >
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}

function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

const SUBSECTION_VISUALS: Record<string, SubsectionVisual> = {
  "Thermal cues": {
    Icon: IconThermometer,
    iconBg: "#EEEDFE",
    iconColor: "#534AB7",
  },
  Perception: {
    Icon: IconHand,
    iconBg: "#E1F5EE",
    iconColor: "#0F6E56",
  },
  Body: {
    Icon: IconBodyScan,
    iconBg: "#FAECE7",
    iconColor: "#993C1D",
  },
  "Technical implementation": {
    Icon: IconCpu,
    iconBg: "#E6F1FB",
    iconColor: "#185FA5",
  },
};

const TECH_GRID_FIELD_KEYS: PaperDetailFieldKey[] = [
  "mainActuatorForTemperatureSensation",
  "mainActuatorModel",
  "mainActuatorSize",
  "overallDeviceSize",
  "mainActuatorPossibleTemperatureRange",
  "otherSensoryActuators",
  "auxiliaryHardware",
];

function pillVariantForKey(key: PaperDetailFieldKey): PillVariant {
  if (key === "bodySites") {
    return "teal";
  }
  if (key === "materialsInContactWithSkin") return "blue";
  return "purple";
}

function DetailSectionHeader({ title }: { title: string }) {
  const hid = sectionHeadingId(title);
  return (
    <div className="paper-detail__section-header" aria-labelledby={hid}>
      <div className="paper-detail__section-header-bar" />
      <h2 id={hid} className="paper-detail__section-header-title">
        {title}
      </h2>
    </div>
  );
}

function DetailSection({
  title,
  when = true,
  children,
}: {
  title: string;
  when?: boolean;
  children: ReactNode;
}) {
  if (!when) return null;
  return (
    <section
      className="paper-detail__section"
      aria-labelledby={sectionHeadingId(title)}
    >
      <DetailSectionHeader title={title} />
      {children}
    </section>
  );
}

function DetailSubCard({
  title,
  showHeader = true,
  children,
}: {
  title: string;
  showHeader?: boolean;
  children: ReactNode;
}) {
  if (!showHeader) {
    return <div className="paper-detail__subcard">{children}</div>;
  }

  const visual = SUBSECTION_VISUALS[title];
  const Icon = visual?.Icon ?? IconCpu;
  const hid = sectionHeadingId(title);

  return (
    <div className="paper-detail__subcard" aria-labelledby={hid}>
      <div className="paper-detail__subcard-header">
        <div
          className="paper-detail__subcard-icon"
          style={{
            backgroundColor: visual?.iconBg ?? "#E6F1FB",
            color: visual?.iconColor ?? "#185FA5",
          }}
        >
          <Icon width={14} height={14} />
        </div>
        <h3 id={hid} className="paper-detail__subcard-title">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function DetailDash() {
  return (
    <span className="paper-detail__field-value paper-detail__field-value--missing">
      —
    </span>
  );
}

function DetailFieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const hid = sectionHeadingId(label);
  return (
    <div className="paper-detail__field-block" aria-labelledby={hid}>
      <p id={hid} className="paper-detail__field-label">
        {label}
      </p>
      <div className="paper-detail__field-value-wrap">{children}</div>
    </div>
  );
}

function DetailTextValue({
  text,
  preserveLineBreaks = false,
}: {
  text: string | undefined | null;
  preserveLineBreaks?: boolean;
}) {
  const t = trimText(text);
  if (isDetailNa(text)) return <DetailDash />;
  return (
    <p
      className={
        preserveLineBreaks
          ? "paper-detail__field-value paper-detail__field-value--pre-wrap"
          : "paper-detail__field-value"
      }
    >
      {t}
    </p>
  );
}

function DetailAbstract({ text }: { text: string | undefined | null }) {
  const t = trimText(text);
  if (!t || isDetailNa(text)) {
    return (
      <div className="paper-detail__abstract-placeholder">
        <IconClock width={14} height={14} />
        <span>Abstract will be added soon.</span>
      </div>
    );
  }
  return <DetailTextValue text={text} preserveLineBreaks />;
}

function DetailPillRow({
  items,
  rawLabels = false,
  variant = "purple",
}: {
  items: readonly string[] | undefined;
  rawLabels?: boolean;
  variant?: PillVariant;
}) {
  const labels = (items ?? [])
    .map((x) => {
      const trimmed = String(x).trim();
      return rawLabels ? trimmed : titleCaseOption(trimmed);
    })
    .filter(Boolean);

  if (labels.length === 0) return <DetailDash />;

  return (
    <div className="paper-detail__pill-row">
      {labels.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className={`paper-detail__pill paper-detail__pill--${variant}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function DetailAmbientTemp({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) return <DetailDash />;
  return <p className="paper-detail__field-value">{`${value}°C`}</p>;
}

function DetailBodySites({ paper }: { paper: ResearchPaper }) {
  const sites = normalizeBodySites(paper);
  if (sites.length === 0) return <DetailDash />;
  return (
    <DetailPillRow
      items={sites.map((site) => formatBodySiteLine(site))}
      rawLabels
      variant="teal"
    />
  );
}

function DetailPurposeCard({ text }: { text: string | undefined | null }) {
  return (
    <div className="paper-detail__purpose-card">
      <DetailTextValue text={text} preserveLineBreaks />
    </div>
  );
}

function DetailDivider() {
  return <hr className="paper-detail__divider" />;
}

function renderFieldValue(
  paper: ResearchPaper,
  key: PaperDetailFieldKey,
  value: unknown,
): ReactNode {
  if (key === "abstract") {
    return <DetailAbstract text={paper.abstract} />;
  }
  if (key === "ambientTempC") {
    return <DetailAmbientTemp value={paper.ambientTempC} />;
  }
  if (key === "bodySites") {
    return <DetailBodySites paper={paper} />;
  }
  if (key === "auxiliaryHardware") {
    const text = (value as string[] | undefined)
      ?.map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
    return <DetailTextValue text={text} />;
  }
  if (ARRAY_CHIP_FIELD_KEYS.has(key)) {
    return (
      <DetailPillRow
        items={value as string[] | undefined}
        rawLabels={FREE_TEXT_ARRAY_FIELD_KEYS.has(key)}
        variant={pillVariantForKey(key)}
      />
    );
  }
  return (
    <DetailTextValue
      text={value as string | undefined | null}
      preserveLineBreaks={PRESERVE_LINE_BREAKS_FIELD_KEYS.has(key)}
    />
  );
}

function renderLabeledField(
  field: PaperDetailFieldConfig,
  paper: ResearchPaper,
  sectionTitle: string,
  fieldsInGroup: PaperDetailFieldConfig[],
): ReactNode {
  const value = getPaperFieldValue(paper, field.key);
  if (!shouldRenderField(field, value)) return null;

  const content = renderFieldValue(paper, field.key, value);
  const hideLabel = fieldsInGroup.length === 1 && field.label === sectionTitle;

  if (hideLabel) {
    return <div key={field.key}>{content}</div>;
  }

  return (
    <DetailFieldBlock key={field.key} label={field.label}>
      {content}
    </DetailFieldBlock>
  );
}

function renderDetailFields(
  fields: PaperDetailFieldConfig[],
  paper: ResearchPaper,
  sectionTitle: string,
): ReactNode {
  return fields.map((field) =>
    renderLabeledField(field, paper, sectionTitle, fields),
  );
}

function renderTechnicalImplementation(
  section: PaperDetailSectionConfig,
  paper: ResearchPaper,
) {
  const fields = section.fields ?? [];
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));

  const gridFields = TECH_GRID_FIELD_KEYS.map((key) =>
    fieldByKey.get(key),
  ).filter((field): field is PaperDetailFieldConfig => field != null);

  const heatControlField = fieldByKey.get("heatControlMethod");
  const powerConsumptionField = fieldByKey.get("powerConsumption");
  const temporalField = fieldByKey.get("temporalParameters");
  const otherNoteField = fieldByKey.get("otherNote");

  return (
    <DetailSubCard title="Technical implementation" showHeader={false}>
      <div className="paper-detail__tech-grid">
        {gridFields.map((field) => {
          const value = getPaperFieldValue(paper, field.key);
          if (!shouldRenderField(field, value)) return null;
          return (
            <DetailFieldBlock key={field.key} label={field.label}>
              {renderFieldValue(paper, field.key, value)}
            </DetailFieldBlock>
          );
        })}
      </div>

      {[heatControlField, powerConsumptionField, temporalField, otherNoteField]
        .filter((field): field is PaperDetailFieldConfig => field != null)
        .some((field) =>
          shouldRenderField(field, getPaperFieldValue(paper, field.key)),
        ) ? (
        <DetailDivider />
      ) : null}

      {heatControlField &&
      shouldRenderField(
        heatControlField,
        getPaperFieldValue(paper, heatControlField.key),
      ) ? (
        <DetailFieldBlock label={heatControlField.label}>
          {renderFieldValue(
            paper,
            heatControlField.key,
            paper.heatControlMethod,
          )}
        </DetailFieldBlock>
      ) : null}

      {powerConsumptionField &&
      shouldRenderField(
        powerConsumptionField,
        getPaperFieldValue(paper, powerConsumptionField.key),
      ) ? (
        <DetailFieldBlock label={powerConsumptionField.label}>
          {renderFieldValue(
            paper,
            powerConsumptionField.key,
            paper.powerConsumption,
          )}
        </DetailFieldBlock>
      ) : null}

      {temporalField &&
      shouldRenderField(
        temporalField,
        getPaperFieldValue(paper, temporalField.key),
      ) ? (
        <DetailFieldBlock label={temporalField.label}>
          {renderFieldValue(paper, temporalField.key, paper.temporalParameters)}
        </DetailFieldBlock>
      ) : null}

      {otherNoteField &&
      shouldRenderField(
        otherNoteField,
        getPaperFieldValue(paper, otherNoteField.key),
      ) ? (
        <DetailFieldBlock label={otherNoteField.label}>
          {renderFieldValue(paper, otherNoteField.key, paper.otherNote)}
        </DetailFieldBlock>
      ) : null}
    </DetailSubCard>
  );
}

function subsectionHasVisibleFields(
  subsection: PaperDetailSubsectionConfig,
  paper: ResearchPaper,
): boolean {
  return subsection.fields.some((field) =>
    shouldRenderField(field, getPaperFieldValue(paper, field.key)),
  );
}

function sectionHasVisibleContent(
  section: PaperDetailSectionConfig,
  paper: ResearchPaper,
): boolean {
  if (
    section.fields?.some((field) =>
      shouldRenderField(field, getPaperFieldValue(paper, field.key)),
    )
  ) {
    return true;
  }
  return (
    section.subsections?.some((subsection) =>
      subsectionHasVisibleFields(subsection, paper),
    ) ?? false
  );
}

function renderDetailSection(
  section: PaperDetailSectionConfig,
  paper: ResearchPaper,
) {
  if (!sectionHasVisibleContent(section, paper)) return null;

  if (section.title === "Purpose of applying thermal cues") {
    return (
      <DetailSection key={section.title} title={section.title}>
        <DetailPurposeCard text={paper.thermalCuePurpose} />
      </DetailSection>
    );
  }

  if (section.title === "Technical implementation") {
    return (
      <DetailSection key={section.title} title={section.title}>
        {renderTechnicalImplementation(section, paper)}
      </DetailSection>
    );
  }

  if (section.subsections?.length) {
    return (
      <DetailSection key={section.title} title={section.title}>
        {section.subsections.map((subsection) => {
          if (!subsectionHasVisibleFields(subsection, paper)) return null;
          return (
            <DetailSubCard key={subsection.title} title={subsection.title}>
              {renderDetailFields(subsection.fields, paper, subsection.title)}
            </DetailSubCard>
          );
        })}
      </DetailSection>
    );
  }

  return (
    <DetailSection key={section.title} title={section.title}>
      {section.fields
        ? renderDetailFields(section.fields, paper, section.title)
        : null}
    </DetailSection>
  );
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
              {(display.publicationYear != null ||
                display.publicationVenue) && (
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

        <div className="paper-detail__sections">
          {PAPER_DETAIL_SECTIONS.map((section) =>
            renderDetailSection(section, paper),
          )}
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
