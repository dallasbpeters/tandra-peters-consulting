import { defineField, defineType } from "sanity";

const HOMEPAGE_SECTION_TYPES = [
  "heroSection",
  "marqueeSection",
  "birdcreekVideoBannerSection",
  "videoSection",
  "aboutSection",
  "statsSection",
  "servicesSection",
  "serviceAreaMap",
  "missionSection",
  "beforeAfterSection",
  "expertiseSection",
  "contactBannerSection",
  "testimonialsSection",
  "faqSection",
  "articlesTeaserSection",
  "certificationsSection",
  "contactSection",
  "socialShareSection",
] as const;

export const homePageType = defineType({
  name: "homePage",
  title: "Home page",
  type: "object",
  fields: [
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      initialValue: [],
      of: HOMEPAGE_SECTION_TYPES.map((type) => ({ type })),
    }),
    defineField({
      name: "tandraIntroVideo",
      type: "tandraIntroVideo",
      title: "Intro video",
      description:
        "Remotion-powered intro video copy, thumbnail, and latest Vercel render output. Add a Video section above where this video should appear on the home page.",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description",
      type: "text",
      rows: 3,
    }),
  ],
});
