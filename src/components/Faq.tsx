import WaDetails from "@awesome.me/webawesome/dist/react/details/index.js";
import { usePostHog } from "@posthog/react";
import { motion } from "motion/react";
import React, { useEffect, useMemo } from "react";

import { plainTextFromRich } from "../portableText/plainText";
import { RichText } from "../portableText/RichText";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import "@awesome.me/webawesome/dist/styles/webawesome.css";

import { FaqProps } from "../types";

const DEFAULT_ITEMS = [
  {
    question: "What does a roofing consultant do?",
    answer:
      "I help you understand what’s really going on with your roof—what the inspection means, whether repair or replacement makes sense, and how to think about materials, scope, and timing. I focus on clear, practical guidance so you can decide with confidence instead of feeling rushed or confused.",
  },
  {
    question: "How is working with you different from hiring a roofer directly?",
    answer:
      "I’m a Birdcreek Roofing consultant—I work for Birdcreek, not as a separate outside advisor. So instead of vetting random crews or piecing together bids on your own, you come in through Birdcreek with someone whose job is to explain your roof, your options, and the paperwork in plain language, and to stay involved with oversight while our team handles installation to Birdcreek standards.",
  },
  {
    question: "Do you help with homeowners insurance claims?",
    answer:
      "Yes. I help with claim advocacy—walking through carrier questions, reading estimates with you, and pushing for fair coverage when it’s appropriate. Outcomes always depend on your policy and carrier, but you won’t be navigating it alone.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "I’m based in Austin and work with homeowners and property owners across the region and much of Texas. If you’re not sure your area is covered, message me through the contact form or call—we can confirm.",
  },
  {
    question: "What types of roofs do you consult on?",
    answer:
      "I consult on what I see most at home—especially asphalt shingles and metal—as well as commercial projects and storm or hail damage. Every house is different; I tailor how deep we go to your roof type, its age, and what you’re trying to accomplish.",
  },
  {
    question: "How do I schedule a free consultation?",
    answer:
      "Tap Schedule a Free Consultation in the navigation, or scroll to the contact section and send your name, email, what you need, and a short note. You can also call or email me directly—both are on the contact page.",
  },
  {
    question: "What is Birdcreek Roofing’s role?",
    answer:
      "Birdcreek Roofing is Austin’s premier roofing firm, and they’re my employer. I consult inside that model, so what I share with you lines up with the same crews, warranties, and quality standards we stand behind from assessment through installation.",
  },
];

const JSON_LD_ID = "faq-page-json-ld";

export const Faq: React.FC<FaqProps> = ({
  tagline = "Questions & answers",
  title = "Frequently asked questions",
  intro = "Straight answers from me—how I work with homeowners, insurance, Birdcreek Roofing, and how to reach out.",
  items = DEFAULT_ITEMS,
  paddingTop = "3rem",
}) => {
  const posthog = usePostHog();

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: plainTextFromRich(item.answer),
        },
      })),
    }),
    [items],
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [faqJsonLd]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    paddingTop: paddingTop,
  };

  const introStyle: React.CSSProperties = {
    color: mix(theme.colors.everglade, 80),
    lineHeight: 1.65,
    fontSize: "1.05rem",
  };

  return (
    <section
      id="faq"
      className={layoutClass.sectionPadded}
      style={sectionStyle}
      aria-labelledby="faq-heading"
    >
      <div className={layoutClass.containerArticle}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <span
            style={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: theme.palette.coral["300"],
              fontSize: "0.75rem",
              marginBottom: "1rem",
              display: "block",
            }}
          >
            {tagline}
          </span>
          <h2
            id="faq-heading"
            style={{
              fontSize: "clamp(2rem, 6vw, 3rem)",
              lineHeight: 1.1,
              marginBottom: "1.25rem",
              fontFamily: theme.fonts.headline,
              fontWeight: 800,
              textTransform: "uppercase",
              color: theme.colors.everglade,
            }}
          >
            {title}
          </h2>
          <div
            style={{
              marginBottom: "3rem",
              maxWidth: "42rem",
            }}
          >
            <RichText value={intro} paragraphStyle={introStyle} />
          </div>
        </motion.div>

        <style>{`
          .faq-details {
            --spacing: 12px;
            --hide-duration: 200ms;
            --show-duration: 200ms;
          }

          .faq-details-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
        `}</style>

        <div className="faq-details-container">
          {items.map((item, index) => (
            <WaDetails
              appearance="outlined"
              summary={item.question}
              key={item._key ?? item.question}
              className="faq-details"
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  posthog?.capture("faq_item_opened", {
                    question: item.question,
                    question_index: index,
                  });
                }
              }}
            >
              <RichText
                value={item.answer}
                paragraphStyle={{
                  margin: 0,
                  color: "inherit",
                  lineHeight: "inherit",
                  fontSize: "inherit",
                }}
                linkStyle={{ color: theme.colors.accent }}
              />
            </WaDetails>
          ))}
        </div>
      </div>
    </section>
  );
};
