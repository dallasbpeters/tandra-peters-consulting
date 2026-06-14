/**
 * Single source of truth for the hero eyebrow/badge fallback text.
 *
 * Every hero variant (Hero, HeroGlassOverlay, HeroDualCTARail, HeroPillNav)
 * defaults to this so they stay in sync. The live value is normally supplied
 * by Sanity (`homePage.hero.badge` → `badgeText` prop); this is only the
 * fallback when the CMS field is empty.
 */
export const DEFAULT_HERO_EYEBROW = "Birdcreek Roofing consultant · Austin, TX";
