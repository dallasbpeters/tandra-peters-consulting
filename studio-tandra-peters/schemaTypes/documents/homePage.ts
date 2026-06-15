import { defineField, defineType } from "sanity";

const canvasPurpose = (purpose: string) => ({ canvasApp: { purpose } });

export const homePageType = defineType({
  name: "homePage",
  title: "Home page",
  type: "document",
  groups: [
    { name: "seo", title: "SEO" },
    { name: "hero", title: "Hero", default: true },
    { name: "video", title: "Video" },
    { name: "marquee", title: "Marquee" },
    { name: "about", title: "About" },
    { name: "stats", title: "Stats" },
    { name: "services", title: "Services" },
    { name: "mission", title: "Mission" },
    { name: "beforeAfter", title: "Before / After" },
    { name: "expertise", title: "Expertise" },
    { name: "testimonials", title: "Testimonials" },
    { name: "faq", title: "FAQ" },
    { name: "articles", title: "Articles teaser" },
    { name: "sections", title: "Page builder" },
    { name: "contact", title: "Contact" },
    { name: "social", title: "Social share" },
    { name: "serviceAreaMap", title: "Service Area Map" },
  ],
  fields: [
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
      group: "seo",
      description:
        "Browser tab title for the homepage. If empty, the app falls back to its built-in title.",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 3,
      group: "seo",
      description: "Meta description for search and social previews on the homepage.",
    }),
    defineField({
      name: "hero",
      type: "heroSection",
      group: "hero",
      options: canvasPurpose("Homepage hero section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "sections",
      title: "Homepage sections",
      type: "array",
      group: "sections",
      options: canvasPurpose("Sortable homepage sections."),
      description:
        "Drag to reorder sections, remove what you do not want, or duplicate items to add more homepage blocks.",
      of: [
        { type: "heroSection" },
        { type: "marqueeSection" },
        { type: "birdcreekVideoBannerSection" },
        { type: "videoSection" },
        { type: "aboutSection" },
        { type: "statsSection" },
        { type: "servicesSection" },
        { type: "serviceAreaMap" },
        { type: "missionSection" },
        { type: "beforeAfterSection" },
        { type: "expertiseSection" },
        { type: "contactBannerSection" },
        { type: "testimonialsSection" },
        { type: "faqSection" },
        { type: "articlesTeaserSection" },
        { type: "certificationsSection" },
        { type: "contactSection" },
        { type: "socialShareSection" },
      ],
    }),
    defineField({
      name: "marquee",
      type: "marqueeSection",
      group: "marquee",
      options: canvasPurpose("Scrolling marquee section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "featuredVideoSection",
      type: "videoSection",
      title: "Featured Video (upload)",
      group: "video",
      options: canvasPurpose("Uploaded featured video section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "tandraIntroVideo",
      type: "tandraIntroVideo",
      title: "Tandra intro video",
      group: "video",
      options: canvasPurpose("Remotion intro video content and render output."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
      description:
        "Remotion-powered intro video copy, thumbnail, and latest Vercel render output. This is embedded here so it can be edited in Presentation on the homepage.",
    }),
    defineField({
      name: "featuredVideo",
      type: "videoSection",
      title: "Featured Video (legacy)",
      group: "video",
      options: canvasPurpose("Legacy featured video section."),
      deprecated: {
        reason:
          "Legacy field kept only for backward compatibility. Use “Featured Video (upload)” and migrate old values into featuredVideoSection.",
      },
    }),
    defineField({
      name: "about",
      type: "aboutSection",
      group: "about",
      options: canvasPurpose("About section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "stats",
      type: "statsSection",
      group: "stats",
      options: canvasPurpose("Stats section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "services",
      type: "servicesSection",
      group: "services",
      options: canvasPurpose("Services section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "mission",
      type: "missionSection",
      group: "mission",
      options: canvasPurpose("Mission section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "beforeAfter",
      title: "Before / After",
      type: "beforeAfterSection",
      group: "beforeAfter",
      options: canvasPurpose("Before and after gallery."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "expertise",
      type: "expertiseSection",
      group: "expertise",
      options: canvasPurpose("Expertise section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "testimonials",
      type: "testimonialsSection",
      group: "testimonials",
      options: canvasPurpose("Testimonials section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "faq",
      type: "faqSection",
      group: "faq",
      options: canvasPurpose("FAQ section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "articlesTeaser",
      type: "articlesTeaserSection",
      group: "articles",
      options: canvasPurpose("Articles teaser section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "contact",
      type: "contactSection",
      group: "contact",
      options: canvasPurpose("Contact section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "socialShare",
      type: "socialShareSection",
      group: "social",
      options: canvasPurpose("Social sharing section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "serviceAreaMap",
      title: "Service Area Map",
      type: "serviceAreaMap",
      group: "serviceAreaMap",
      options: canvasPurpose("Service area map section."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo URL",
      type: "url",
      options: canvasPurpose("Legacy Vimeo video URL."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "text",
      rows: 3,
      options: canvasPurpose("Legacy home page title copy."),
      deprecated: {
        reason:
          "Legacy homepage field. Manage homepage sections through the sortable Page builder array instead.",
      },
    }),
  ],
  preview: {
    prepare: () => ({ title: "Home page" }),
  },
});
