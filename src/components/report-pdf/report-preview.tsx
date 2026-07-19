import { Globe, Mail, MapPin, Phone } from "iconoir-react";
import { useMemo } from "react";

import { BIRDCREEK_MARK } from "../../lib/report-pdf/birdcreek-logo";
import { formatDisplayDate } from "../../lib/report-pdf/format";
import { buildPages } from "../../lib/report-pdf/layout-model";
import {
  COVER_DECOR_ROWS,
  DECOR_TOTAL_COLUMNS,
} from "../../lib/report-pdf/tokens";
import type {
  BrandProfile,
  DetailsTable,
  LayoutModel,
  ReportPage,
} from "../../lib/report-pdf/types";
import { sanityImageUrl } from "../../sanity/image-url";

interface ReportPreviewProps {
  brand: BrandProfile;
  model: LayoutModel;
}

const RunningHead = ({ brand, title }: { brand: string; title: string }) => (
  <div className="report-runhead">
    <span>{title}</span>
    <span>{brand}</span>
  </div>
);

const RunningFoot = ({
  page,
  title,
  total,
}: {
  page: number;
  title: string;
  total: number;
}) => (
  <div className="report-runfoot">
    <span>{title}</span>
    <span>
      Page {page} of {total}
    </span>
  </div>
);

const DetailsTableView = ({ table }: { table: DetailsTable }) => (
  <table className="report-details-table">
    <thead>
      <tr>
        {table.columns.map((column, index) => (
          <th key={`${column}-${index}`} scope="col">
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {table.rows.map((row, rowIndex) => (
        <tr key={`row-${rowIndex}`}>
          {table.columns.map((_column, cellIndex) => (
            <td key={`cell-${rowIndex}-${cellIndex}`}>
              {row[cellIndex] ?? ""}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const CONTACT_ICONS = {
  globe: Globe,
  mail: Mail,
  phone: Phone,
  pin: MapPin,
} as const;

const ContactChipIcon = ({ kind }: { kind: keyof typeof CONTACT_ICONS }) => {
  const Icon = CONTACT_ICONS[kind];
  return <Icon aria-hidden height={12} width={12} />;
};

type CoverContent = Extract<ReportPage, { kind: "cover" }>["cover"];

const BirdcreekMark = () => (
  <svg
    aria-hidden
    className="report-cover-mark"
    viewBox={BIRDCREEK_MARK.viewBox}
  >
    {BIRDCREEK_MARK.paths.map((d) => (
      <path d={d} fill="currentColor" key={d} />
    ))}
  </svg>
);

const CoverFoot = ({ cover }: { cover: CoverContent }) => (
  <div className="report-cover-foot">
    <div>
      <BirdcreekMark />
      <p className="report-cover-tagline">{cover.tagline}</p>
      {cover.date ? (
        <p className="report-cover-date">{formatDisplayDate(cover.date)}</p>
      ) : null}
    </div>
    <div className="report-cover-byline">
      <p className="report-cover-byline-label">Inspected by</p>
      <p className="report-cover-byline-name">{cover.inspectorName}</p>
    </div>
  </div>
);

const CoverHeadline = ({ cover }: { cover: CoverContent }) => (
  <>
    <p className="report-cover-eyebrow">{cover.brandName}</p>
    <h2 className="report-cover-title">{cover.reportTitle}</h2>
    {cover.title ? (
      <p className="report-cover-property">{cover.title}</p>
    ) : null}
  </>
);

const CoverPage = ({ cover }: { cover: CoverContent }) => {
  if (cover.coverImageUrl) {
    const heroSrc = sanityImageUrl(cover.coverImageUrl, {
      fit: "crop",
      h: 1500,
      w: 1200,
    });
    return (
      <div className="report-page report-page--cover report-page--cover-image">
        <div className="report-cover-hero">
          {/* biome-ignore lint/correctness/useImageSize: sized by CSS */}
          <img alt="" className="report-cover-hero-img" src={heroSrc} />
          <div aria-hidden className="report-cover-hero-scrim" />
          <div className="report-cover-hero-text">
            <CoverHeadline cover={cover} />
          </div>
        </div>
        <div className="report-cover-bar">
          <CoverFoot cover={cover} />
        </div>
      </div>
    );
  }

  return (
    <div className="report-page report-page--cover">
      <div className="report-page-inner">
        <CoverHeadline cover={cover} />
        <div
          aria-hidden
          className="report-cover-decor"
          style={
            {
              "--report-decor-cols": DECOR_TOTAL_COLUMNS,
            } as React.CSSProperties
          }
        >
          {COVER_DECOR_ROWS.flatMap((row) =>
            row.bars.map((bar, index) => (
              <span
                data-tall={bar.tall}
                key={bar.id}
                style={
                  {
                    "--report-decor-gc":
                      index === 0 ? `1 / span ${bar.span}` : `span ${bar.span}`,
                  } as React.CSSProperties
                }
              />
            ))
          )}
        </div>
        <CoverFoot cover={cover} />
      </div>
    </div>
  );
};

const ContactPage = ({
  contact,
  headerTitle,
  pageNumber,
  totalPages,
}: {
  contact: Extract<ReportPage, { kind: "contact" }>["contact"];
  headerTitle: string;
  pageNumber: number;
  totalPages: number;
}) => {
  const rows = [
    { kind: "phone" as const, value: contact.phone },
    { kind: "globe" as const, value: contact.website },
    { kind: "mail" as const, value: contact.email },
    { kind: "pin" as const, value: contact.address },
  ].filter((row) => row.value);
  return (
    <div className="report-page report-page--contact">
      <div className="report-page-inner">
        <RunningHead brand={contact.brandName} title={headerTitle} />
        <div className="report-contact-body">
          <h3 className="report-contact-title">Contact information</h3>
          {contact.intro ? (
            <p className="report-contact-intro">{contact.intro}</p>
          ) : null}
          <ul className="report-contact-list">
            {rows.map((row) => (
              <li key={row.kind}>
                <span className="report-contact-chip">
                  <ContactChipIcon kind={row.kind} />
                </span>
                {row.value}
              </li>
            ))}
          </ul>
        </div>
        <RunningFoot page={pageNumber} title={headerTitle} total={totalPages} />
      </div>
    </div>
  );
};

const PreviewPage = ({
  page,
  pageNumber,
  totalPages,
  footerText,
  headerTitle,
}: {
  footerText: string;
  headerTitle: string;
  page: ReportPage;
  pageNumber: number;
  totalPages: number;
}) => {
  if (page.kind === "cover") {
    return <CoverPage cover={page.cover} />;
  }

  if (page.kind === "note") {
    return (
      <div className="report-page report-page--note">
        <div className="report-page-inner">
          <RunningHead brand={footerText} title={headerTitle} />
          <h3 className="report-note-title">Inspection summary</h3>
          <p className="report-note-body">{page.note.text}</p>
          <RunningFoot
            page={pageNumber}
            title={headerTitle}
            total={totalPages}
          />
        </div>
      </div>
    );
  }

  if (page.kind === "contact") {
    return (
      <ContactPage
        contact={page.contact}
        headerTitle={headerTitle}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    );
  }

  const { photo, sectionTitle } = page;
  return (
    <div className="report-page report-page--photo">
      <div className="report-page-inner">
        <RunningHead brand={footerText} title={headerTitle} />
        {sectionTitle ? (
          <p className="report-section-title">{sectionTitle}</p>
        ) : null}
        <figure className="report-photo-figure">
          <img
            alt={photo.caption || "Inspection photo"}
            className="report-photo-image"
            src={photo.imageUrl}
          />
          {photo.caption ? (
            <figcaption className="report-photo-caption">
              {photo.caption}
            </figcaption>
          ) : null}
          {photo.table ? <DetailsTableView table={photo.table} /> : null}
        </figure>
        <RunningFoot page={pageNumber} title={headerTitle} total={totalPages} />
      </div>
    </div>
  );
};

export const ReportPreview = ({ brand, model }: ReportPreviewProps) => {
  const pages = useMemo(() => buildPages(model), [model]);
  const totalPages = pages.length;

  return (
    <div
      className="report-preview"
      style={
        {
          "--report-accent": brand.colors.accent,
          "--report-primary": brand.colors.primary,
          "--report-text": brand.colors.text,
        } as React.CSSProperties
      }
    >
      {pages.map((page, index) => (
        <PreviewPage
          footerText={model.footerText}
          headerTitle={model.headerTitle}
          key={page.kind === "photo" ? page.photo.imageUrl : page.kind}
          page={page}
          pageNumber={index + 1}
          totalPages={totalPages}
        />
      ))}
    </div>
  );
};
