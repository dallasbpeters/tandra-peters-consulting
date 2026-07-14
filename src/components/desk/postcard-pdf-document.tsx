/**
 * React PDF postcard document — loaded lazily via dynamic import.
 * (This file is always code-split; @react-pdf/renderer never enters the initial bundle.)
 *
 * Supports two landscape sizes:
 *   4×6  → 6" wide × 4" tall  (432 × 288 pt)
 *   6×9  → 9" wide × 6" tall  (648 × 432 pt)  ← default
 *
 * Pages:
 *   - Page 1 (optional): postcard front — vector Ad Builder layers
 *   - Page 2: postcard back — return address, indicia, message, QR, recipient block
 *
 * Uses only Helvetica (built-in to @react-pdf/renderer); no font registration needed.
 */
// oxlint-disable-next-line react-doctor/prefer-dynamic-import -- this module is a dedicated code-split chunk; postcard-pdf.tsx only ever loads it via dynamic import, so @react-pdf/renderer never enters the initial bundle.
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";

import { PostcardVectorFront } from "./postcard-vector-front";

// ---------------------------------------------------------------------------
// Size catalogue
// ---------------------------------------------------------------------------
export type PostcardSize = "4x6" | "6x9";

export const POSTCARD_SIZE_LABELS: Record<PostcardSize, string> = {
  "4x6": '4" × 6"',
  "6x9": '6" × 9"',
};

const BASE_W = 9 * 72; // 648 pt
const BASE_H = 6 * 72; // 432 pt

/**
 * Page size in PDF points (1 pt = 1/72 in) for each postcard, at physical TRIM.
 * A viewer/printer rasterizes the vector content + full-res images at whatever
 * DPI it prints, so the page carries the correct trim and stays sharp at 300+.
 */
export const SIZE_DIMS: Record<PostcardSize, { w: number; h: number }> = {
  "4x6": { w: 6 * 72, h: 4 * 72 }, // 432 × 288 pt
  "6x9": { w: BASE_W, h: BASE_H }, //  648 × 432 pt
};

// ---------------------------------------------------------------------------
// Brand palette
// ---------------------------------------------------------------------------
const C = {
  everglade: "#123a34",
  evergladeMid: "#1c5248",
  evergladeMuted: "#2a5248",
  evergladeLight: "#e8f0ef",
  borderMuted: "#c5d4d2",
  white: "#ffffff",
} as const;

// ---------------------------------------------------------------------------
// Size-scaled style factory (precomputed for each size)
// ---------------------------------------------------------------------------
const buildStyles = (w: number, h: number) => {
  const scale = w / BASE_W; // 4×6 = 0.667, 6×9 = 1.0
  const pad = Math.round(28 * scale);
  const bodyFs = Math.round(8.5 * scale * 10) / 10;
  const qrSize = Math.round(54 * scale);

  return StyleSheet.create({
    // Pages
    pageFront: { width: w, height: h, backgroundColor: C.white, padding: 0 },
    pageBack: {
      width: w,
      height: h,
      backgroundColor: C.white,
      padding: pad,
      flexDirection: "column",
      fontFamily: "Helvetica",
      color: C.everglade,
    },
    // Front
    frontImage: { width: w, height: h },
    // Top row
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: Math.round(10 * scale),
    },
    returnBlock: { flexDirection: "column", gap: Math.round(2 * scale) },
    returnName: {
      fontSize: Math.round(8 * scale * 10) / 10,
      fontFamily: "Helvetica-Bold",
      color: C.everglade,
      lineHeight: 1.4,
    },
    returnLine: {
      fontSize: Math.round(7 * scale * 10) / 10,
      fontFamily: "Helvetica",
      color: C.evergladeMid,
      lineHeight: 1.4,
    },
    indiciaBox: {
      width: Math.round(86 * scale),
      height: Math.round(50 * scale),
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: C.borderMuted,
      borderRadius: 3,
      backgroundColor: C.evergladeLight,
      alignItems: "center",
      justifyContent: "center",
      padding: Math.round(4 * scale),
    },
    indiciaText: {
      fontSize: Math.round(5 * scale * 10) / 10,
      fontFamily: "Helvetica-Bold",
      color: C.evergladeMuted,
      textAlign: "center",
      lineHeight: 1.6,
      letterSpacing: 0.5,
    },
    // Divider
    divider: {
      borderBottomWidth: 0.5,
      borderBottomColor: C.borderMuted,
      marginBottom: Math.round(12 * scale),
    },
    // Content row
    contentRow: {
      flexDirection: "row",
      flex: 1,
      gap: Math.round(18 * scale),
    },
    leftCol: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "space-between",
    },
    messageBlock: {
      flexDirection: "column",
      gap: Math.round(5 * scale),
    },
    headline: {
      fontSize: Math.round(14 * scale * 10) / 10,
      fontFamily: "Helvetica-Bold",
      color: C.everglade,
      lineHeight: 1.3,
      marginBottom: Math.round(2 * scale),
    },
    bodyText: {
      fontSize: bodyFs,
      fontFamily: "Helvetica",
      color: C.evergladeMid,
      lineHeight: 1.55,
    },
    ctaText: {
      fontSize: Math.round(8 * scale * 10) / 10,
      fontFamily: "Helvetica-Bold",
      color: C.everglade,
      lineHeight: 1.4,
      marginTop: Math.round(2 * scale),
    },
    qrBlock: {
      marginTop: Math.round(8 * scale),
      width: qrSize,
      height: qrSize,
    },
    qrImage: { width: qrSize, height: qrSize },
    // Right column (USPS OCR zone)
    rightCol: {
      width: Math.round(148 * scale),
      flexDirection: "column",
      justifyContent: "flex-end",
    },
    recipientBlock: {
      flexDirection: "column",
      gap: Math.round(3 * scale),
      borderTopWidth: 0.5,
      borderTopColor: C.borderMuted,
      paddingTop: Math.round(8 * scale),
    },
    recipientLabel: {
      fontSize: Math.round(6.5 * scale * 10) / 10,
      fontFamily: "Helvetica-Bold",
      color: C.evergladeMid,
      letterSpacing: 0.4,
      marginBottom: Math.round(3 * scale),
    },
    recipientLine: {
      fontSize: Math.round(8.5 * scale * 10) / 10,
      fontFamily: "Helvetica",
      color: C.everglade,
      lineHeight: 1.55,
    },
  });
};

// Precompute both size variants so we never re-create styles at render time.
const STYLES: Record<PostcardSize, ReturnType<typeof buildStyles>> = {
  "4x6": buildStyles(SIZE_DIMS["4x6"].w, SIZE_DIMS["4x6"].h),
  "6x9": buildStyles(SIZE_DIMS["6x9"].w, SIZE_DIMS["6x9"].h),
};

// ---------------------------------------------------------------------------
// Return address — falls back to Birdcreek defaults when none is supplied.
// ---------------------------------------------------------------------------
const DEFAULT_RETURN_ADDRESS_LINES = [
  "Tandra Peters",
  "Birdcreek Roofing",
  "2300 Forsam Bend",
  "Austin, TX 78725",
] as const;

/**
 * Merge-tag delivery block for the single-postcard download (a template the
 * operator uploads to a provider that mail-merges each recipient). The self-mail
 * batch replaces these with real per-recipient lines.
 */
const MERGE_TAG_DELIVERY_LINES = [
  "{{recipient_full_name}}",
  "{{mailing_address_line1}}",
  "{{mailing_address_line2}}",
  "{{mailing_city}}, {{mailing_state}} {{mailing_zip}}",
] as const;

/** Top-right postage box: a prepaid indicia, or a "place stamp here" box. */
type PostageMode = "indicia" | "stamp";

const POSTAGE_TEXT: Record<PostageMode, string> = {
  indicia: "PRESORTED\nSTANDARD\nU.S. POSTAGE\nPAID",
  stamp: "PLACE\nFIRST-CLASS\nSTAMP\nHERE",
};

type SizeStyles = ReturnType<typeof buildStyles>;

const normalizeSrc = (src: string | undefined): string | undefined => {
  if (!src) {
    return undefined;
  }
  if (src.startsWith("data:")) {
    return src;
  }
  return `data:image/png;base64,${src}`;
};

// ---------------------------------------------------------------------------
// Shared pages — reused by the single download and the self-mail batch.
// ---------------------------------------------------------------------------
const FrontPage = ({
  frontConfig,
  frontSrc,
  s,
  size,
}: {
  frontConfig?: string;
  frontSrc?: string;
  s: SizeStyles;
  size: PostcardSize;
}) => {
  const { w, h } = SIZE_DIMS[size];
  return (
    <Page size={[w, h]} style={s.pageFront}>
      {frontConfig ? (
        <PostcardVectorFront config={frontConfig} size={size} />
      ) : (
        <Image src={frontSrc} style={s.frontImage} />
      )}
    </Page>
  );
};

const BackPage = ({
  body,
  cta,
  deliveryLines,
  headline,
  postageMode,
  qrDataUri,
  returnLines,
  s,
  size,
}: {
  body: string;
  cta: string;
  deliveryLines: readonly string[];
  headline: string;
  postageMode: PostageMode;
  qrDataUri: string;
  returnLines: readonly string[];
  s: SizeStyles;
  size: PostcardSize;
}) => {
  const { w, h } = SIZE_DIMS[size];
  return (
    <Page size={[w, h]} style={s.pageBack}>
      {/* ── Top row ─────────────────────────────────────────────────── */}
      <View style={s.topRow}>
        <View style={s.returnBlock}>
          {returnLines.map((line, i) => (
            <Text key={line} style={i === 0 ? s.returnName : s.returnLine}>
              {line}
            </Text>
          ))}
        </View>
        <View style={s.indiciaBox}>
          <Text style={s.indiciaText}>{POSTAGE_TEXT[postageMode]}</Text>
        </View>
      </View>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <View style={s.divider} />

      {/* ── Content row ─────────────────────────────────────────────── */}
      <View style={s.contentRow}>
        {/* Left: message + QR */}
        <View style={s.leftCol}>
          <View style={s.messageBlock}>
            <Text style={s.headline}>{headline}</Text>
            <Text style={s.bodyText}>{body}</Text>
            <Text style={s.ctaText}>{cta}</Text>
          </View>
          <View style={s.qrBlock}>
            <Image src={qrDataUri} style={s.qrImage} />
          </View>
        </View>

        {/* Right: recipient address (USPS OCR zone) */}
        <View style={s.rightCol}>
          <View style={s.recipientBlock}>
            <Text style={s.recipientLabel}>DELIVERY ADDRESS</Text>
            {deliveryLines.map((line) => (
              <Text key={line} style={s.recipientLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Page>
  );
};

// ---------------------------------------------------------------------------
// PostcardDocument — single postcard (front + merge-tag back) for download
// ---------------------------------------------------------------------------
export interface PostcardDocumentProps {
  /** Postcard back copy */
  body: string;
  cta: string;
  headline: string;
  /** QR code data URI (from buildQrDataUri) */
  qrDataUri: string;
  /** Legacy flattened fallback for versions without saved layer config. */
  frontImageDataUri?: string;
  /** Saved Ad Builder layer config. Preferred over the flattened fallback image. */
  frontConfig?: string;
  /** Editable return-address display lines; defaults to Birdcreek. */
  returnAddressLines?: readonly string[];
  /** Physical size of the postcard. Defaults to "6x9". */
  size?: PostcardSize;
}

const resolveReturnLines = (
  lines: readonly string[] | undefined
): readonly string[] =>
  lines && lines.length > 0 ? lines : DEFAULT_RETURN_ADDRESS_LINES;

export const PostcardDocument = ({
  body,
  cta,
  headline,
  qrDataUri,
  frontConfig,
  frontImageDataUri,
  returnAddressLines,
  size = "6x9",
}: PostcardDocumentProps) => {
  const s = STYLES[size];
  const frontSrc = normalizeSrc(frontImageDataUri);
  const returnLines = resolveReturnLines(returnAddressLines);

  return (
    <Document>
      {frontConfig || frontSrc ? (
        <FrontPage
          frontConfig={frontConfig}
          frontSrc={frontSrc}
          s={s}
          size={size}
        />
      ) : null}
      <BackPage
        body={body}
        cta={cta}
        deliveryLines={MERGE_TAG_DELIVERY_LINES}
        headline={headline}
        postageMode="indicia"
        qrDataUri={qrDataUri}
        returnLines={returnLines}
        s={s}
        size={size}
      />
    </Document>
  );
};

// ---------------------------------------------------------------------------
// PostcardBatchDocument — one personalized postcard per recipient (self-mail)
// ---------------------------------------------------------------------------
export interface SelfMailPage {
  /** Stable key for the recipient (address-derived). */
  key: string;
  /** Delivery address block lines (already occupant-addressed). */
  lines: readonly string[];
}

export interface PostcardBatchDocumentProps extends Omit<
  PostcardDocumentProps,
  "returnAddressLines"
> {
  recipients: readonly SelfMailPage[];
  returnAddressLines?: readonly string[];
}

export const PostcardBatchDocument = ({
  body,
  cta,
  headline,
  qrDataUri,
  frontConfig,
  frontImageDataUri,
  recipients,
  returnAddressLines,
  size = "6x9",
}: PostcardBatchDocumentProps) => {
  const s = STYLES[size];
  const frontSrc = normalizeSrc(frontImageDataUri);
  const returnLines = resolveReturnLines(returnAddressLines);
  const hasFront = Boolean(frontConfig || frontSrc);

  return (
    <Document>
      {recipients.flatMap((recipient) => {
        const pages: ReactElement[] = [];
        if (hasFront) {
          pages.push(
            <FrontPage
              frontConfig={frontConfig}
              frontSrc={frontSrc}
              key={`${recipient.key}-front`}
              s={s}
              size={size}
            />
          );
        }
        pages.push(
          <BackPage
            body={body}
            cta={cta}
            deliveryLines={recipient.lines}
            headline={headline}
            key={`${recipient.key}-back`}
            postageMode="stamp"
            qrDataUri={qrDataUri}
            returnLines={returnLines}
            s={s}
            size={size}
          />
        );
        return pages;
      })}
    </Document>
  );
};
