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
  fields: [
    defineField({
      initialValue: [],
      name: "sections",
      of: HOMEPAGE_SECTION_TYPES.map((type) => ({ type })),
      title: "Sections",
      type: "array",
    }),
    defineField({
      description:
        "Remotion-powered intro video copy, thumbnail, and latest Vercel render output. Add a Video section above where this video should appear on the home page.",
      name: "tandraIntroVideo",
      title: "Intro video",
      type: "tandraIntroVideo",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title",
      type: "string",
    }),
    defineField({
      name: "seoDescription",
      rows: 3,
      title: "SEO description",
      type: "text",
    }),
  ],
  name: "homePage",
  title: "Home page",
  type: "object",
});
