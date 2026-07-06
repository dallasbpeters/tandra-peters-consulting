# Tandra Peters — Site Review, Marketing Strategy & Tools

_Source: Sanity project `7irm699i` / production (145 docs) + codebase review. Generated 2026-07-05._

---

## 1. Site Improvement Checklist

### 🔴 Critical — blocking launch & lead flow

- [ ] **Public site is behind a Google sign-in allowlist.** `VITE_GOOGLE_AUTH_GATE_ENABLED="true"`; every homepage section + nav CTA is wrapped in `GoogleAuthGate` (`src/pages/home.tsx:423`). Only 3 emails can view it. Nothing is publicly viewable or indexable — no SEO, ads, or leads possible. Turn the gate OFF for the public site; keep it only on internal tool routes.
- [ ] **Testimonials section is empty** (`elfsightWidgetId` blank). Add real reviews.
- [ ] **Certifications section is empty** (title only). Add GAF/manufacturer certs, BBB, insurance credentials.
- [ ] **CRM has only test leads** — the 4 `emailContact` records are all fakes (`test@`, `jane@`, `estimator-smoke-test@`, `dallaspeters@`). Purge before real leads arrive.

### 🟠 Trust & factual consistency

- [ ] **Brand identity muddy: "Tandra Peters" vs "Birdcreek Roofing."** About badge says "3+ YEARS Industry Experience," but Stats show 24,999 customers / 18,137 re-roofs / 6,862 repairs (Birdcreek), and Mission says Birdcreek founded by Nate Navarro in 2013 with "over 20,000 homeowners." Clarify the relationship.
- [ ] **Numbers don't reconcile:** 24,999 customers vs "over 20,000" vs ~2,100 across service-area county counts. Pick one source of truth. 24,999 reads like a placeholder.
- [ ] **Contradiction:** Expertise tagline "Trusted…for Over a Decade" vs About badge "3+ YEARS Industry Experience."
- [ ] **Dallas County shows `clientCount: 0`** on the map, yet copy says "…to Dallas." Populate or drop it.
- [ ] **Contact email is `tandra@birdcreekroofing.com`** while the site is `tandra.me`. Decide on a brand-consistent address.

### 🟡 Copy bugs

- [ ] **FAQ duplicate-answer bug:** "How can Birdcreek Roofing help?" has the identical answer pasted from "How do I schedule a free consultation?" Wrong answer.
- [ ] **FAQ tone conflict:** "What does a roofing consultant do?" uses "architecture-minded guidance" — `aiContext` guardrails say avoid architecture positioning. Align.
- [ ] **"Denied Claim? "** FAQ question is a fragment with trailing space — reword to "What if my insurance claim is denied?"
- [ ] **Marquee typo:** "…Lubbock San Antonio…" missing a separator; inconsistent dash/spacing.
- [ ] **Stray whitespace:** trailing space in hero badge, double space in "3+ YEARS Industry Experience," lone `\n` at end of several service-card bodies.

### 🔵 SEO & content (from in-app SEO dashboard, generated 2026-03-24, now stale)

- [ ] **5 of 8 articles are thin (<700 words):** roof inspection (217w), roof replacement process, maintaining your roof (264w), shingle vs metal (511w), insurance claims (660w). Expand each.
- [ ] **Zero internal links across all 8 posts.** Cross-link + link to `/articles`, `/contact`, service pages.
- [ ] **Blog cadence stalled** — newest post Nov 2025; nothing in 2026. Aim for ~2 posts/month.
- [ ] Submit sitemap to Google Search Console after public launch; confirm indexing.

### ⚪ Studio hygiene

- [ ] **Duplicate `aiContext`:** published singleton + orphaned draft `drafts.5f5f6209-…`. Consolidate/delete orphan.
- [ ] **`roofInspectionsPage` has an unpublished draft** — publish or discard.
- [ ] **Regenerate the SEO dashboard** after fixes.

---

## 2. Marketing Strategy

**Positioning:** _Tandra Peters — the honest roofing consultant and insurance advocate for Texas homeowners._ She's on your side: inspects the roof, stands with you at the adjuster visit, reviews the settlement line-by-line, supplements missed items, then oversees the Birdcreek install. Signature promise: _"If your roof just needs a repair, I'll tell you that."_ Lead with no-pressure, education-first trust.

### Wave 1 — Unlock the foundation (before spending on ads)

1. Turn off the public auth gate (scope to internal tool routes only).
2. Add testimonials + certifications; fix stat/brand inconsistencies.
3. Stand up a Google Business Profile; start collecting reviews.
4. Submit sitemap; verify indexing in Search Console.

### Wave 2 — Always-on demand capture

- **Local SEO:** target `aiContext` keywords — "Austin roofing consultant," "roof inspection Austin," "Texas roof replacement," "roof damage insurance claim Texas." Expand thin articles + internal-link.
- **Lead magnets:** promote the 60-second roof estimator (`/estimate`) and free inspection.
- **Email nurture:** leads → `emailContact` → Email Composer (Resend) "navigating your roof claim" sequence built from existing guides.

### Wave 3 — Proactive & paid

- **Storm-triggered geo campaigns:** after hail/wind in service counties (Travis, Williamson, Hays, Bexar, Tarrant, Bell…), run geo-targeted FB/IG ads with the insurance-advocacy hook. 11 ad creatives already built.
- **Paid social targeting:** homeowners ~30–65 in the county list, layered with storm-timing.
- **Video:** Remotion intro video + Vimeo assets on landing hero, social, and YouTube.
- **Referrals:** use the site's social-share section + post-project referral ask via email.

**Measurement:** PostHog (project 350659) + in-Studio GA dashboard + SEO dashboard. Track form submissions, estimator completions, article traffic, review count, ad ROAS.

---

## 3. Tools Inventory & Access

All gated to allowlisted Google accounts (`tandra@birdcreekroofing.com`, `tandralen@gmail.com`; `dallaspeters@` admin).

### A. Sanity Studio — edit all site content

Access: `https://www.tandra.me/studio` (sign in with Sanity account; member of project `7irm699i`).

| Tool                                | What it does                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Structure / content                 | Edit every page, article, FAQ, service, setting                        |
| ✨ Brand voice rewrites (AI Assist) | Rewrite in brand voice / warm up / tighten / strengthen trust / custom |
| Image Manager                       | Manage image assets                                                    |
| AI Image Studio                     | Generate images (fal)                                                  |
| Email Preview                       | Preview client email templates                                         |
| Videos                              | Render Remotion intro/marketing videos                                 |
| Analytics                           | Google Analytics dashboard in-Studio                                   |

### B. In-app dashboards & agents (direct URLs, sign in with allowlisted Google account)

| URL                        | Tool                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `/seo`                     | SEO Dashboard — insights, opportunities, recommendations          |
| `/marketing`               | Marketing Agent                                                   |
| `/ads` (or `/advertising`) | Ad creative studio/editor — FB/IG sizes, 11 saved creatives       |
| `/response`                | Response Agent — drafting lead replies                            |
| `/emails` (or `/email`)    | Email Composer (Resend)                                           |
| `/agent`                   | Feature Builder                                                   |
| `/upscaler`                | Image upscaler (fal)                                              |
| `/estimate`                | Roof cost estimator (public lead tool; config in `estimatorPage`) |
| `/workflow`                | Insurance claims process page                                     |
| Contact form               | Writes leads into `emailContact` (CRM in Studio)                  |
