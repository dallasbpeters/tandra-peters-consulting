import hankenItalicUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-italic.woff?url";
import hankenNormalUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff?url";
import hankenBoldItalicUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-italic.woff?url";
import hankenBoldUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-normal.woff?url";
import ibmPlexItalicUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff?url";
import ibmPlexNormalUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff?url";
import ibmPlexBoldItalicUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-italic.woff?url";
import ibmPlexBoldUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-normal.woff?url";
// oxlint-disable-next-line react-doctor/prefer-dynamic-import -- loaded only through the lazily imported report PDF chunk.
import {
  Circle,
  Document,
  Font,
  Image,
  Page,
  Path,
  pdf,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { BIRDCREEK_MARK } from "../../lib/report-pdf/birdcreek-logo";
import { formatDisplayDate } from "../../lib/report-pdf/format";
import { buildPages } from "../../lib/report-pdf/layout-model";
import {
  COVER_DECOR_ROWS,
  REPORT_COLORS,
  REPORT_PAGE,
  REPORT_SPACE,
  REPORT_TYPE,
} from "../../lib/report-pdf/tokens";
import type {
  BrandProfile,
  DetailsTable,
  LayoutModel,
  ReportPage,
} from "../../lib/report-pdf/types";
import { sanityImageUrl } from "../../sanity/image-url";

let fontsRegistered = false;
const registerReportFonts = (): void => {
  if (fontsRegistered) {
    return;
  }
  Font.register({
    family: "Hanken Grotesk",
    fonts: [
      { fontStyle: "normal", fontWeight: 400, src: hankenNormalUrl },
      { fontStyle: "italic", fontWeight: 400, src: hankenItalicUrl },
      { fontStyle: "normal", fontWeight: 700, src: hankenBoldUrl },
      { fontStyle: "italic", fontWeight: 700, src: hankenBoldItalicUrl },
    ],
  });
  Font.register({
    family: "IBM Plex Serif",
    fonts: [
      { fontStyle: "normal", fontWeight: 400, src: ibmPlexNormalUrl },
      { fontStyle: "italic", fontWeight: 400, src: ibmPlexItalicUrl },
      { fontStyle: "normal", fontWeight: 700, src: ibmPlexBoldUrl },
      { fontStyle: "italic", fontWeight: 700, src: ibmPlexBoldItalicUrl },
    ],
  });
  // Keep long words intact rather than hyphenating aggressively.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
};

const styles = StyleSheet.create({
  caption: {
    color: REPORT_COLORS.text,
    fontSize: REPORT_TYPE.body,
    lineHeight: 1.35,
    marginTop: REPORT_SPACE.sm,
  },
  // ── Contact page (dark, full-bleed) ─────────────────────────────
  contactBody: { flexGrow: 1, paddingTop: REPORT_SPACE.xl },
  contactChip: {
    alignItems: "center",
    backgroundColor: REPORT_COLORS.accent,
    borderRadius: 4,
    height: 22,
    justifyContent: "center",
    marginRight: REPORT_SPACE.md,
    width: 22,
  },
  contactIntro: {
    color: REPORT_COLORS.onDarkMuted,
    fontSize: REPORT_TYPE.body,
    lineHeight: 1.6,
    marginBottom: REPORT_SPACE.xxl,
    maxWidth: 360,
  },
  contactList: { marginTop: REPORT_SPACE.sm },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: REPORT_SPACE.lg,
  },
  contactTitle: {
    color: REPORT_COLORS.onDark,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.heading,
    fontWeight: 700,
    marginBottom: REPORT_SPACE.lg,
  },
  contactValue: {
    color: REPORT_COLORS.onDark,
    fontSize: REPORT_TYPE.subtitle,
  },
  // ── Cover page (near-black green, full-bleed) ───────────────────
  coverBar: {
    borderRadius: 1,
    flexBasis: 0,
    height: 4,
    marginRight: 5,
    opacity: 0.32,
  },
  coverBarTall: {
    height: 6,
    opacity: 0.6,
  },
  coverBylineLabel: {
    color: REPORT_COLORS.onDark,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.small,
  },
  coverBylineName: {
    color: REPORT_COLORS.accent,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.subtitle,
    fontWeight: 700,
    marginTop: 2,
  },
  coverDate: {
    color: REPORT_COLORS.onDarkMuted,
    fontSize: REPORT_TYPE.small,
    marginTop: 3,
  },
  coverDecor: { marginTop: REPORT_SPACE.xl },
  coverDecorRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 5,
  },
  coverEyebrow: {
    color: REPORT_COLORS.accent,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.eyebrow,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  coverFootRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverHero: {
    flexBasis: 0,
    flexGrow: 3,
    position: "relative",
  },
  coverHeroImage: {
    bottom: 0,
    height: "100%",
    left: 0,
    objectFit: "cover",
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
  },
  coverHeroScrim: {
    backgroundColor: "rgba(11, 28, 20, 0.32)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  coverHeroText: {
    left: REPORT_PAGE.margin,
    position: "absolute",
    right: REPORT_PAGE.margin,
    top: REPORT_PAGE.margin,
  },
  coverImageBar: {
    backgroundColor: REPORT_COLORS.coverBg,
    flexBasis: 0,
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: REPORT_PAGE.margin,
    paddingVertical: REPORT_SPACE.lg,
  },
  coverImagePage: {
    backgroundColor: REPORT_COLORS.coverBg,
    display: "flex",
    flexDirection: "column",
    fontFamily: "Hanken Grotesk",
  },
  coverMark: { marginBottom: REPORT_SPACE.sm },
  coverPage: {
    backgroundColor: REPORT_COLORS.coverBg,
    display: "flex",
    flexDirection: "column",
    fontFamily: "Hanken Grotesk",
    padding: REPORT_PAGE.margin,
  },
  coverProperty: {
    color: REPORT_COLORS.onDarkMuted,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.subtitle,
    marginTop: REPORT_SPACE.sm,
  },
  coverTagline: {
    color: REPORT_COLORS.accent,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.eyebrow,
    fontWeight: 600,
  },
  coverTitle: {
    color: REPORT_COLORS.onDark,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.coverTitle,
    fontWeight: 700,
    lineHeight: 1.05,
    marginTop: REPORT_SPACE.lg,
  },
  figure: { flex: 1, marginTop: REPORT_SPACE.lg },
  image: {
    borderRadius: 4,
    flex: 1,
    objectFit: "contain",
  },
  noteBody: {
    color: REPORT_COLORS.text,
    fontSize: REPORT_TYPE.body,
    lineHeight: 1.5,
  },
  noteTitle: {
    color: REPORT_COLORS.primary,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.sectionTitle,
    fontWeight: 700,
    marginBottom: REPORT_SPACE.sm,
    marginTop: REPORT_SPACE.lg,
  },
  // ── Body pages (white) ──────────────────────────────────────────
  page: {
    display: "flex",
    flexDirection: "column",
    fontFamily: "IBM Plex Serif",
    padding: REPORT_PAGE.margin,
  },
  // ── Running header / footer ─────────────────────────────────────
  runFoot: {
    borderTopWidth: 1,
    flexDirection: "row",
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.small,
    justifyContent: "space-between",
    marginTop: REPORT_SPACE.md,
    paddingTop: REPORT_SPACE.sm,
  },
  runFootDark: {
    borderTopColor: REPORT_COLORS.onDarkRule,
    color: REPORT_COLORS.onDark,
  },
  runFootLight: {
    borderTopColor: REPORT_COLORS.border,
    color: REPORT_COLORS.text,
  },
  runHead: {
    borderBottomWidth: 1,
    flexDirection: "row",
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.small,
    justifyContent: "space-between",
    paddingBottom: REPORT_SPACE.sm,
  },
  runHeadDark: {
    borderBottomColor: REPORT_COLORS.onDarkRule,
    color: REPORT_COLORS.onDark,
  },
  runHeadLight: {
    borderBottomColor: REPORT_COLORS.border,
    color: REPORT_COLORS.text,
  },
  sectionTitle: {
    color: REPORT_COLORS.primary,
    fontFamily: "Hanken Grotesk",
    fontSize: REPORT_TYPE.sectionTitle,
    fontWeight: 700,
    marginTop: REPORT_SPACE.lg,
  },
  tableCell: {
    borderColor: REPORT_COLORS.border,
    borderWidth: 1,
    color: REPORT_COLORS.text,
    fontSize: REPORT_TYPE.caption,
    padding: 4,
  },
  tableHeaderCell: {
    backgroundColor: REPORT_COLORS.bgSubtle,
    fontFamily: "Hanken Grotesk",
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row" },
  tableWrap: { marginTop: REPORT_SPACE.md },
});

const CONTACT_ICON_SIZE = 11;

const ContactIcon = ({
  kind,
}: {
  kind: "globe" | "mail" | "phone" | "pin";
}) => {
  const stroke = REPORT_COLORS.onDark;
  const strokeWidth = 2;
  if (kind === "phone") {
    return (
      <Svg
        height={CONTACT_ICON_SIZE}
        viewBox="0 0 24 24"
        width={CONTACT_ICON_SIZE}
      >
        <Path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
    );
  }
  if (kind === "globe") {
    return (
      <Svg
        height={CONTACT_ICON_SIZE}
        viewBox="0 0 24 24"
        width={CONTACT_ICON_SIZE}
      >
        <Circle
          cx={12}
          cy={12}
          fill="none"
          r={10}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Path
          d="M2 12h20"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Path
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </Svg>
    );
  }
  if (kind === "mail") {
    return (
      <Svg
        height={CONTACT_ICON_SIZE}
        viewBox="0 0 24 24"
        width={CONTACT_ICON_SIZE}
      >
        <Path
          d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <Path
          d="M22 6l-10 7L2 6"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
    );
  }
  return (
    <Svg
      height={CONTACT_ICON_SIZE}
      viewBox="0 0 24 24"
      width={CONTACT_ICON_SIZE}
    >
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={12}
        cy={10}
        fill="none"
        r={3}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};

const Header = ({
  brand,
  title,
  tone = "light",
}: {
  brand: string;
  title: string;
  tone?: "dark" | "light";
}) => (
  <View
    style={[
      styles.runHead,
      tone === "dark" ? styles.runHeadDark : styles.runHeadLight,
    ]}
  >
    <Text>{title}</Text>
    <Text>{brand}</Text>
  </View>
);

const Footer = ({
  page,
  title,
  tone = "light",
  total,
}: {
  page: number;
  title: string;
  tone?: "dark" | "light";
  total: number;
}) => (
  <View
    style={[
      styles.runFoot,
      tone === "dark" ? styles.runFootDark : styles.runFootLight,
    ]}
  >
    <Text>{title}</Text>
    <Text>
      Page {page} of {total}
    </Text>
  </View>
);

const BirdcreekMark = ({ height }: { height: number }) => (
  <Svg
    height={height}
    style={styles.coverMark}
    viewBox={BIRDCREEK_MARK.viewBox}
    width={height * BIRDCREEK_MARK.aspectRatio}
  >
    {BIRDCREEK_MARK.paths.map((d) => (
      <Path d={d} fill={REPORT_COLORS.onDark} key={d} />
    ))}
  </Svg>
);

const DetailsTablePdf = ({ table }: { table: DetailsTable }) => (
  <View style={styles.tableWrap}>
    <View style={styles.tableRow}>
      {table.columns.map((column, index) => (
        <Text
          key={`${column}-${index}`}
          style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}
        >
          {column}
        </Text>
      ))}
    </View>
    {table.rows.map((row, rowIndex) => (
      <View key={`row-${rowIndex}`} style={styles.tableRow}>
        {table.columns.map((_column, cellIndex) => (
          <Text
            key={`cell-${rowIndex}-${cellIndex}`}
            style={[styles.tableCell, { flex: 1 }]}
          >
            {row[cellIndex] ?? ""}
          </Text>
        ))}
      </View>
    ))}
  </View>
);

const ReportPageView = ({
  accent,
  page,
  pageNumber,
  totalPages,
  model,
  primary,
}: {
  accent: string;
  model: LayoutModel;
  page: ReportPage;
  pageNumber: number;
  primary: string;
  totalPages: number;
}) => {
  if (page.kind === "cover") {
    const { cover } = page;
    const foot = (
      <View style={styles.coverFootRow}>
        <View>
          <BirdcreekMark height={30} />
          <Text style={[styles.coverTagline, { color: accent }]}>
            {cover.tagline}
          </Text>
          {cover.date ? (
            <Text style={styles.coverDate}>
              {formatDisplayDate(cover.date)}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.coverBylineLabel}>Inspected by</Text>
          <Text style={[styles.coverBylineName, { color: accent }]}>
            {cover.inspectorName}
          </Text>
        </View>
      </View>
    );

    if (cover.coverImageUrl) {
      const heroSrc = sanityImageUrl(cover.coverImageUrl, {
        fit: "max",
        fm: "jpg",
        w: 1600,
      });
      return (
        <Page size="LETTER" style={styles.coverImagePage}>
          <View style={styles.coverHero}>
            <Image src={heroSrc} style={styles.coverHeroImage} />
            <View style={styles.coverHeroScrim} />
            <View style={styles.coverHeroText}>
              <Text style={[styles.coverEyebrow, { color: accent }]}>
                {cover.brandName}
              </Text>
              <Text style={styles.coverTitle}>{cover.reportTitle}</Text>
              {cover.title ? (
                <Text style={styles.coverProperty}>{cover.title}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.coverImageBar}>{foot}</View>
        </Page>
      );
    }

    return (
      <Page size="LETTER" style={styles.coverPage}>
        <Text style={[styles.coverEyebrow, { color: accent }]}>
          {cover.brandName}
        </Text>
        <Text style={styles.coverTitle}>{cover.reportTitle}</Text>
        {cover.title ? (
          <Text style={styles.coverProperty}>{cover.title}</Text>
        ) : null}
        <View style={styles.coverDecor}>
          {COVER_DECOR_ROWS.map((row) => (
            <View key={row.id} style={styles.coverDecorRow}>
              {row.bars.map((bar) => (
                <View
                  key={bar.id}
                  style={
                    bar.tall
                      ? [
                          styles.coverBar,
                          styles.coverBarTall,
                          { backgroundColor: accent, flexGrow: bar.span },
                        ]
                      : [
                          styles.coverBar,
                          { backgroundColor: accent, flexGrow: bar.span },
                        ]
                  }
                />
              ))}
            </View>
          ))}
        </View>
        <View style={{ flexGrow: 1 }} />
        {foot}
      </Page>
    );
  }

  if (page.kind === "note") {
    return (
      <Page size="LETTER" style={styles.page}>
        <Header brand={model.footerText} title={model.headerTitle} />
        <Text style={[styles.noteTitle, { color: primary }]}>
          Inspection summary
        </Text>
        <Text style={styles.noteBody}>{page.note.text}</Text>
        <Footer
          page={pageNumber}
          title={model.headerTitle}
          total={totalPages}
        />
      </Page>
    );
  }

  if (page.kind === "contact") {
    const { contact } = page;
    const rows = [
      { kind: "phone" as const, value: contact.phone },
      { kind: "globe" as const, value: contact.website },
      { kind: "mail" as const, value: contact.email },
      { kind: "pin" as const, value: contact.address },
    ].filter((row) => row.value);
    return (
      <Page size="LETTER" style={[styles.page, { backgroundColor: primary }]}>
        <Header
          brand={contact.brandName}
          title={model.headerTitle}
          tone="dark"
        />
        <View style={styles.contactBody}>
          <Text style={styles.contactTitle}>Contact information</Text>
          {contact.intro ? (
            <Text style={styles.contactIntro}>{contact.intro}</Text>
          ) : null}
          <View style={styles.contactList}>
            {rows.map((row) => (
              <View key={row.kind} style={styles.contactRow}>
                <View style={[styles.contactChip, { backgroundColor: accent }]}>
                  <ContactIcon kind={row.kind} />
                </View>
                <Text style={styles.contactValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <Footer
          page={pageNumber}
          title={model.headerTitle}
          tone="dark"
          total={totalPages}
        />
      </Page>
    );
  }

  const { photo, sectionTitle } = page;
  return (
    <Page size="LETTER" style={styles.page}>
      <Header brand={model.footerText} title={model.headerTitle} />
      {sectionTitle ? (
        <Text style={[styles.sectionTitle, { color: primary }]}>
          {sectionTitle}
        </Text>
      ) : null}
      <View style={styles.figure}>
        <Image src={photo.imageUrl} style={styles.image} />
        {photo.caption ? (
          <Text style={styles.caption}>{photo.caption}</Text>
        ) : null}
        {photo.table ? <DetailsTablePdf table={photo.table} /> : null}
      </View>
      <Footer page={pageNumber} title={model.headerTitle} total={totalPages} />
    </Page>
  );
};

export const ReportDocument = ({
  brand,
  model,
}: {
  brand: BrandProfile;
  model: LayoutModel;
}) => {
  registerReportFonts();
  const pages = buildPages(model);
  const total = pages.length;
  return (
    <Document title={model.headerTitle}>
      {pages.map((page, index) => (
        <ReportPageView
          accent={brand.colors.accent}
          key={page.kind === "photo" ? page.photo.imageUrl : page.kind}
          model={model}
          page={page}
          pageNumber={index + 1}
          primary={brand.colors.primary}
          totalPages={total}
        />
      ))}
    </Document>
  );
};

/** Render the report to a PDF Blob (kept in this chunk so `@react-pdf` stays lazy). */
export const renderReportPdf = (
  brand: BrandProfile,
  model: LayoutModel
): Promise<Blob> => {
  registerReportFonts();
  return pdf(<ReportDocument brand={brand} model={model} />).toBlob();
};
