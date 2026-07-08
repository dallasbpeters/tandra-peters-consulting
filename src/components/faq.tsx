import WaDetails from "@awesome.me/webawesome/dist/react/details/index.js";
import { usePostHog } from "@posthog/react";
import { motion } from "motion/react";
import type React from "react";
import { useEffect, useMemo } from "react";

import { plainTextFromRich } from "../portableText/plain-text";
import { RichText } from "../portableText/rich-text";
import { layoutClass } from "../styles/layout-classes";
import { mix, theme } from "../theme";

import "@awesome.me/webawesome/dist/styles/themes/default.css";

import type { FaqItem, FaqProps } from "../types";

const DEFAULT_ITEMS: FaqItem[] = [
  {
    answer:
      "I help you understand what’s really going on with your roof—what the inspection means, whether repair or replacement makes sense, and how to think about materials, scope, and timing. I focus on clear, practical guidance so you can decide with confidence instead of feeling rushed or confused.",
    question: "What does a roofing consultant do?",
  },
  {
    answer:
      "I’m a Birdcreek Roofing consultant—I work for Birdcreek, not as a separate outside advisor. So instead of vetting random crews or piecing together bids on your own, you come in through Birdcreek with someone whose job is to explain your roof, your options, and the paperwork in plain language, and to stay involved with oversight while our team handles installation to Birdcreek standards.",
    question:
      "How is working with you different from hiring a roofer directly?",
  },
  {
    answer:
      "Yes. I help with claim advocacy—walking through carrier questions, reading estimates with you, and pushing for fair coverage when it’s appropriate. Outcomes always depend on your policy and carrier, but you won’t be navigating it alone.",
    question: "Do you help with homeowners insurance claims?",
  },
  {
    answer:
      "I’m based in Austin and work with homeowners and property owners across the region and much of Texas. If you’re not sure your area is covered, message me through the contact form or call—we can confirm.",
    question: "What areas do you serve?",
  },
  {
    answer:
      "I consult on what I see most at home—especially asphalt shingles and metal—as well as commercial projects and storm or hail damage. Every house is different; I tailor how deep we go to your roof type, its age, and what you’re trying to accomplish.",
    question: "What types of roofs do you consult on?",
  },
  {
    answer:
      "Tap Schedule a Free Consultation in the navigation, or scroll to the contact section and send your name, email, what you need, and a short note. You can also call or email me directly—both are on the contact page.",
    question: "How do I schedule a free consultation?",
  },
  {
    answer:
      "Birdcreek Roofing is Austin’s premier roofing firm, and they’re my employer. I consult inside that model, so what I share with you lines up with the same crews, warranties, and quality standards we stand behind from assessment through installation.",
    question: "What is Birdcreek Roofing’s role?",
  },
];

const JSON_LD_ID = "faq-page-json-ld";

export const Faq: React.FC<FaqProps> = ({
  tagline = "Questions & answers",
  title = "Frequently asked questions",
  intro = "Straight answers from me—how I work with homeowners, insurance, Birdcreek Roofing, and how to reach out.",
  items = DEFAULT_ITEMS,
  paddingTop = "3rem",
  backgroundColor,
  sectionId = "faq",
  includeJsonLd = true,
}) => {
  const posthog = usePostHog();

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: plainTextFromRich(item.answer),
        },
        name: item.question,
      })),
    }),
    [items]
  );

  useEffect(() => {
    if (!includeJsonLd) {
      return;
    }

    const script = document.createElement("script");
    script.id = `${JSON_LD_ID}-${sectionId}`;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.append(script);
    return () => {
      script.remove();
    };
  }, [faqJsonLd, includeJsonLd, sectionId]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: backgroundColor ?? theme.colors.paper,
    paddingTop,
  };

  const introStyle: React.CSSProperties = {
    color: mix(theme.colors.everglade, 80),
    fontSize: "1.05rem",
    lineHeight: 1.65,
  };

  return (
    <section
      aria-labelledby={`${sectionId}-heading`}
      className={layoutClass.sectionPadded}
      id={sectionId}
      style={sectionStyle}
    >
      <div className={layoutClass.containerArticle}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5 }}
          viewport={{ margin: "-80px", once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span
            style={{
              color: theme.palette.coral["300"],
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.2em",
              marginBottom: theme.spacing.lg,
              textTransform: "uppercase",
            }}
          >
            {tagline}
          </span>
          <h2
            id={`${sectionId}-heading`}
            style={{
              color: theme.colors.everglade,
              fontFamily: theme.fonts.headline,
              fontSize: "clamp(2rem, 6vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: theme.spacing.xl,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h2>
          <div
            style={{
              marginBottom: theme.spacing.xxxxxxxxl,
              maxWidth: "42rem",
            }}
          >
            <RichText paragraphStyle={introStyle} value={intro} />
          </div>
        </motion.div>

        <div className="faq-details-container">
          {items.map((item: FaqItem, index: number) => (
            <WaDetails
              appearance="outlined"
              className="faq-details"
              key={item._key ?? item.question}
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  posthog?.capture("faq_item_opened", {
                    question: item.question,
                    question_index: index,
                  });
                }
              }}
              summary={item.question}
            >
              <RichText
                linkStyle={{ color: theme.colors.accent }}
                paragraphStyle={{
                  color: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  margin: 0,
                }}
                value={item.answer}
              />
            </WaDetails>
          ))}
        </div>
      </div>
    </section>
  );
};
