# Contract: Sanity Report-Branding Projection

The only external interface v1 introduces is a **read** of branding content from Sanity. This documents the schema shape, the GROQ projection, and the mapped prop shape the client consumes. (No new REST/`api/` endpoint exists in v1 — generation is on-device; auth reuses the existing Google verification.)

## Source document

A singleton `reportBranding` (preferred) OR reuse of existing `siteSettings` + `emailSignature`. Fields (Sanity schema):

```ts
// studio-tandra-peters/schemaTypes/documents/reportBranding.ts
defineType({
  name: "reportBranding",
  type: "document",
  title: "Report branding",
  fields: [
    defineField({ name: "logo", type: "image", title: "Report logo" }),
    defineField({ name: "footerText", type: "string", title: "Footer text" }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "website", type: "url" }),
    defineField({ name: "address", type: "text", rows: 2 }),
    // Optional overrides; default to src/theme.ts when empty
    defineField({
      name: "colorPrimary",
      type: "string",
      title: "Primary color (optional)",
    }),
    defineField({
      name: "colorAccent",
      type: "string",
      title: "Accent color (optional)",
    }),
    defineField({
      name: "colorText",
      type: "string",
      title: "Text color (optional)",
    }),
  ],
});
```

Registered in `studio-tandra-peters/schemaTypes/index.ts` and added as a document singleton in `studio-tandra-peters/structure.ts` (documentId `reportBranding`), matching the existing `siteSettings` singleton pattern.

## GROQ projection (in `src/sanity/queries.ts`)

Resolve the logo asset URL directly in GROQ (repo convention), like the `siteSettings` projection does:

```groq
"reportBranding": *[_id == "reportBranding"][0]{
  _id, _type, _updatedAt,
  "logoUrl": logo.asset->url,
  footerText,
  phone, email, website, address,
  colorPrimary, colorAccent, colorText
}
```

## Mapped prop shape (client)

`mapReportBranding()` in `src/sanity/map-sanity-home.tsx` returns the `BrandProfile` used by the layout model:

```ts
export type BrandProfile = {
  logoUrl?: string;
  footerText?: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  colors?: { primary?: string; accent?: string; text?: string };
};
```

## Contract rules

- **Editability**: every field above is Tandra-editable in Studio (Principle I); edits appear in subsequently generated reports (FR-005).
- **Defaults**: when `colorPrimary/Accent/Text` are empty, the client falls back to `src/theme.ts` tokens (no duplication of the site palette in Sanity).
- **Image URLs**: resolved via `src/sanity/image-url.ts` (never `@sanity/image-url`).
- **Missing doc**: if the singleton is absent, the tool renders with theme-default colors and empty contact fields degrade gracefully (no crash).
- **No secrets**: branding is public content; no tokens/keys involved.
