import { plainTextFromRich } from "../portableText/plainText";
import type { FaqItem, FaqProps } from "../types";
import type { PostDetail } from "../types/article";
import { postCategoryLabel } from "./categoryLabels";
import { mapFaqProps } from "../sanity/mapSanityHome";

const trim = (value: string | null | undefined): string => value?.trim() ?? "";

const normalizeSentence = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const stripTrailingPunctuation = (value: string): string =>
  value.replace(/[.?!:;,\s]+$/g, "").trim();

const lowerTopic = (value: string): string => {
  const cleaned = stripTrailingPunctuation(normalizeSentence(value));
  return cleaned ? cleaned.toLowerCase() : "this roofing topic";
};

const getQuestionTopic = (post: PostDetail): string => {
  switch (trim(post.category)) {
    case "roof-replacement":
      return "roof replacement";
    case "insurance-claims":
      return "a roof insurance claim";
    case "inspections":
      return "a roof inspection";
    case "maintenance":
      return "roof maintenance";
    case "texas-homeowners":
      return "Texas roofing concerns";
    default:
      return lowerTopic(post.title);
  }
};

const firstSentence = (value: string): string => {
  const cleaned = normalizeSentence(value);
  if (!cleaned) {
    return "";
  }

  const match = cleaned.match(/.+?[.?!](?=\s|$)/);
  return match ? match[0].trim() : cleaned;
};

const getSummaryLine = (post: PostDetail): string => {
  const fromExcerpt = firstSentence(trim(post.excerpt));
  if (fromExcerpt) {
    return fromExcerpt;
  }

  const fromBody = firstSentence(plainTextFromRich(post.body));
  if (fromBody) {
    return fromBody;
  }

  return "The right answer depends on the roof system, how widespread the issue is, and what the inspection actually shows on site.";
};

const getCategoryItems = (
  questionTopic: string,
  category: string,
  categoryLabel: string,
): FaqItem[] => {
  switch (category) {
    case "roof-replacement":
      return [
        {
          question: `How do you know when ${questionTopic} points to replacement instead of repair?`,
          answer:
            `That usually comes down to how widespread the damage is, how old the roof system is, and whether the weak spots are isolated or repeated across multiple slopes. With roof replacement decisions, you want to compare repair scope against the likely life you would actually get back.`,
        },
        {
          question: `What affects the cost and timing of ${questionTopic} in Austin?`,
          answer:
            "Material choice, roof complexity, ventilation details, decking condition, and weather all affect both budget and timing. In Austin, storm volume and contractor availability can also change how quickly a project can be scheduled.",
        },
        {
          question: `What should homeowners ask before approving ${questionTopic}?`,
          answer:
            "Ask what is driving the recommendation, what is included in scope, whether hidden substrate repairs are likely, and how ventilation, flashing, and warranty details will be handled. Those questions usually reveal whether the proposal is complete or just a surface price.",
        },
      ];
    case "insurance-claims":
      return [
        {
          question: `Can homeowners insurance help with ${questionTopic} in Texas?`,
          answer:
            "Sometimes, but it depends on the cause of loss, the age and condition of the roof, and the details of the policy. Storm-related damage may be covered, while wear, deferred maintenance, or old-age issues often are not.",
        },
        {
          question: `What documentation helps with ${questionTopic}?`,
          answer:
            "Photos, inspection notes, dated damage observations, prior repair history, and a clear scope comparison all help. The goal is to show what happened, how widespread it is, and why the requested scope matches the actual condition of the roof.",
        },
        {
          question: `When should you get help with ${questionTopic} before talking to the adjuster?`,
          answer:
            "It helps to get clarity early, especially if the roof condition is complicated or the estimate language is confusing. A good review before the adjuster meeting can help you ask better questions and avoid agreeing to an incomplete scope.",
        },
      ];
    case "inspections":
      return [
        {
          question: `What problems usually show up during ${questionTopic}?`,
          answer:
            "Common findings include missing or damaged shingles, flashing failures, ventilation issues, hail or wind impacts, exposed fasteners, and wear around penetrations or transitions. The important part is how those findings connect to the bigger performance of the roof system.",
        },
        {
          question: `How often should homeowners schedule ${questionTopic}?`,
          answer:
            "Most homeowners should think about inspections after major storms, when buying or selling, when leaks appear, or when the roof is aging into a higher-risk window. The right cadence depends on roof age, material, tree coverage, and recent weather exposure.",
        },
        {
          question: `What should happen after ${questionTopic} is complete?`,
          answer:
            "You should leave with a clear understanding of what is cosmetic, what is urgent, what can wait, and whether repair, monitoring, or replacement is the smarter next move. The inspection only helps if it turns into a useful decision framework.",
        },
      ];
    case "maintenance":
      return [
        {
          question: `How often should homeowners think about ${questionTopic}?`,
          answer:
            "Maintenance timing depends on roof age, nearby trees, previous storm exposure, and whether there have been drainage or ventilation problems. Preventive maintenance matters most before small issues become interior leaks or insurance headaches.",
        },
        {
          question: `What maintenance steps matter most around ${questionTopic}?`,
          answer:
            "The highest-value steps usually involve clearing drainage paths, checking sealants and flashing, watching penetrations, and catching minor damage early. The best maintenance plans focus on the parts of the roof most likely to fail first.",
        },
        {
          question: `Can good maintenance reduce bigger roofing costs later?`,
          answer:
            "Often, yes. Maintenance will not stop every replacement, but it can help homeowners catch localized issues before they spread into decking damage, interior staining, or larger storm-related repair scopes.",
        },
      ];
    case "texas-homeowners":
      return [
        {
          question: `How does Texas weather affect ${questionTopic}?`,
          answer:
            "Heat, hail, wind, UV exposure, and fast-moving storm cycles all change how roofs age in Texas. That means homeowners need to think about this topic with local weather stress in mind, not just generic national advice.",
        },
        {
          question: `What should Austin homeowners watch for around ${questionTopic}?`,
          answer:
            "Austin homeowners should pay attention to storm patterns, visible shingle or flashing movement, interior stains, granule loss, and any change that suggests the roof system is not shedding water the way it should.",
        },
        {
          question: `When should a Texas homeowner act on ${questionTopic}?`,
          answer:
            "The best time is before the next heavy weather event turns a manageable issue into a broader claim or replacement problem. If the roof is already showing visible symptoms, waiting usually narrows your options instead of improving them.",
        },
      ];
    default:
      return [
        {
          question: `How should homeowners evaluate ${questionTopic}?`,
          answer:
            `Start by understanding the roof condition, the likely cause, and whether the issue is isolated or systemic. For ${categoryLabel.toLowerCase()} questions, the best next step is usually a clear on-site assessment before making a repair or replacement decision.`,
        },
        {
          question: `What makes ${questionTopic} more urgent?`,
          answer:
            "Urgency goes up when active leaks, storm damage, visible material movement, repeated repairs, or interior signs show the roof is no longer performing reliably. Those are the moments when waiting tends to cost more.",
        },
        {
          question: `What should homeowners do next after learning about ${questionTopic}?`,
          answer:
            "Use the article to narrow the questions you need answered, then get a roof-specific evaluation of your property so the next step is tied to your actual conditions and not just general online guidance.",
        },
      ];
  }
};

export const buildArticleFaqProps = (post: PostDetail): FaqProps => {
  const authoredFaq = mapFaqProps(post.faq as Record<string, unknown> | null | undefined);
  if (authoredFaq.items && authoredFaq.items.length > 0) {
    return {
      tagline: authoredFaq.tagline ?? "Article FAQ",
      title: authoredFaq.title ?? "Common questions homeowners ask next",
      intro:
        authoredFaq.intro ??
        "A few practical follow-up questions homeowners usually ask after reading this article.",
      items: authoredFaq.items,
    };
  }

  const questionTopic = getQuestionTopic(post);
  const category = trim(post.category);
  const categoryLabel = postCategoryLabel(post.category);
  const summaryLine = getSummaryLine(post);

  const items: FaqItem[] = [
    {
      question: `What should Austin homeowners know about ${questionTopic}?`,
      answer:
        `${summaryLine} In practice, homeowners usually need to understand how the issue shows up on the actual roof, whether it is isolated or widespread, and what the next weather event is likely to do to it.`,
    },
    ...getCategoryItems(questionTopic, category, categoryLabel),
    {
      question: `What should you do next if you need help with ${questionTopic} in Austin?`,
      answer:
        "The best next step is a real roof-specific conversation, not another generic checklist. If you are seeing signs that this article describes, schedule a consultation so you can compare inspection findings, options, and timing against your actual property.",
    },
  ].slice(0, 5);

  return {
    tagline: "Article FAQ",
    title: "Common questions homeowners ask next",
    intro: "A few practical follow-up questions homeowners usually ask after reading this article.",
    items,
  };
};
