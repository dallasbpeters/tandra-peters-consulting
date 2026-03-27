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

const stripLeadingArticles = (value: string): string =>
  value.replace(/^(?:the|a|an)\s+/i, "").trim();

const cleanTitleTopic = (title: string): string => {
  const cleaned = normalizeSentence(title)
    .split(/\s[:\-–]\s|:\s| - | – /, 1)[0]
    ?.replace(/\([^)]*\)/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return stripLeadingArticles(
    cleaned
      .replace(
        /^(?:what homeowners should know about|what should homeowners know about|what to expect during|what to know about|understanding|navigating|guide to|a practical guide to|a homeowner'?s guide to|how to prepare for|how to handle)\s+/i,
        "",
      )
      .replace(/\s+/g, " ")
      .trim(),
  );
};

const lowerTopic = (value: string): string => {
  const cleaned = stripTrailingPunctuation(normalizeSentence(value));
  return cleaned ? cleaned.toLowerCase() : "this roofing topic";
};

const formatQuestionTopic = (value: string): string => {
  const cleaned = stripTrailingPunctuation(cleanTitleTopic(value));
  return cleaned ? cleaned.toLowerCase() : "this roofing topic";
};

const topicIncludesHomeownerAudience = (questionTopic: string): boolean =>
  /\bhomeowners?\b/i.test(questionTopic);

const stripAudienceFromTopic = (questionTopic: string): string => {
  const cleaned = stripTrailingPunctuation(
    normalizeSentence(
      questionTopic.replace(
        /\b(?:austin|texas|area|local)\s+homeowners?\b|\bhomeowners?\b/gi,
        " ",
      ),
    ),
  );

  return cleaned || "this roofing topic";
};

const audienceAwareQuestion = (
  questionTopic: string,
  defaultTemplate: string,
  audienceInTopicTemplate: (cleanedTopic: string) => string,
): string =>
  topicIncludesHomeownerAudience(questionTopic)
    ? audienceInTopicTemplate(stripAudienceFromTopic(questionTopic))
    : defaultTemplate;

type ArticleFaqPreset = {
  topic: string;
  leadQuestion: string;
  leadAnswer: (summaryLine: string) => string;
  middleItems: FaqItem[];
  closingQuestion: string;
  closingAnswer: string;
};

const ARTICLE_FAQ_PRESETS: Record<string, ArticleFaqPreset> = {
  "asphalt-shingle-vs-metal-roofing-texas": {
    topic: "choosing between asphalt shingles and metal roofing",
    leadQuestion:
      "What should Austin homeowners compare when choosing between asphalt shingles and metal roofing?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} The best comparison is not just material price. Homeowners usually need to compare lifespan, repairability, curb appeal, insurance implications, ventilation needs, and how the roof will perform in Texas weather.`,
    middleItems: [
      {
        question:
          "How do cost, lifespan, and maintenance differ between shingles and metal?",
        answer:
          "Shingles usually cost less upfront and are simpler to repair in isolated areas, while metal often costs more initially but can offer longer service life and different maintenance tradeoffs. The smarter choice depends on how long you plan to stay, your budget, and how much long-term value matters to you.",
      },
      {
        question:
          "Which roofing system usually handles Texas heat, hail, and wind better?",
        answer:
          "Both systems can perform well in Texas when the product choice and installation details are right. What matters most is the exact shingle or panel system, the fastening method, the flashing package, and whether ventilation and underlayment are treated as part of the full roof assembly.",
      },
      {
        question:
          "When does metal roofing make sense despite the higher upfront cost?",
        answer:
          "Metal tends to make more sense when homeowners want longer-term durability, a specific architectural look, or a roof system they do not expect to revisit soon. It is usually worth the premium only when the details, budget, and long-term ownership plans all line up.",
      },
    ],
    closingQuestion:
      "What should you do next if you're comparing shingles and metal roofing for your home in Austin?",
    closingAnswer:
      "Start with a roof-specific comparison instead of choosing from brochures. A good next step is to review your roof shape, ventilation, neighborhood constraints, budget, and expected ownership timeline so the material decision matches your actual property.",
  },
  "homeowners-insurance-roof-damage-claims-guide": {
    topic: "roof damage insurance claims",
    leadQuestion:
      "What should Austin homeowners know before filing a roof damage insurance claim?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} Before filing, it helps to understand what caused the damage, what you can document clearly, and whether the roof condition points to a covered storm event or a wear-and-tear issue that the carrier may challenge.`,
    middleItems: [
      {
        question: "What documentation helps support a roof damage claim?",
        answer:
          "Clear photos, dates, inspection notes, prior repair history, and a written scope comparison all help. The goal is to show what happened, how widespread the damage is, and why the requested repair or replacement scope matches the actual roof condition.",
      },
      {
        question:
          "What should you ask when the adjuster's scope looks too small?",
        answer:
          "Ask how the carrier accounted for all damaged slopes, accessories, flashing, code-related items, and any components needed for a proper system repair. If the line items do not match what was found on site, that is the moment to ask for clarification instead of assuming the estimate is complete.",
      },
      {
        question:
          "When does a roof issue usually fall outside normal homeowners insurance coverage?",
        answer:
          "Coverage often gets harder when the issue looks like long-term wear, deferred maintenance, old-age deterioration, or a problem that cannot be tied to a specific covered event. That is why clear inspection findings and timing matter so much at the start of the process.",
      },
    ],
    closingQuestion:
      "What should you do next if you need help reviewing a roof damage claim in Austin?",
    closingAnswer:
      "Gather the policy documents, photos, inspection notes, and the carrier estimate, then compare them side by side with someone who understands roof scope language. The best next step is a calm review of what was found, what was approved, and what still needs to be questioned.",
  },
  "how-to-choose-roofing-consultant-austin-texas": {
    topic: "choosing a roofing consultant",
    leadQuestion:
      "What should Austin homeowners look for when choosing a roofing consultant?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} The best consultants make the roof easier to understand. Homeowners should look for clear communication, practical education, honest scope guidance, and a process that stays aligned with the actual installation work.`,
    middleItems: [
      {
        question:
          "How is a roofing consultant different from a salesperson or estimator?",
        answer:
          "A strong consultant helps you understand condition, options, tradeoffs, and timing before you are pushed toward a yes-or-no decision. The value is not just price delivery. It is translating roof findings into a plan that makes sense for your house and situation.",
      },
      {
        question:
          "What questions help you judge whether the guidance is trustworthy?",
        answer:
          "Ask what evidence supports the recommendation, what is included in scope, what might be missing, and how the advice connects to warranty, ventilation, flashing, and long-term performance. Good guidance gets more specific when you ask harder questions, not more evasive.",
      },
      {
        question:
          "Why does installer alignment matter when choosing a consultant?",
        answer:
          "Advice is more useful when it lines up with the team that will actually build the roof. Alignment reduces the gap between what was promised, what was approved, and what gets installed once the project moves from conversation to execution.",
      },
    ],
    closingQuestion:
      "What should you do next if you're comparing roofing consultants in Austin?",
    closingAnswer:
      "Compare how each person explains the roof, not just how quickly they offer a quote. The right next step is usually a conversation where you can test clarity, ask detailed questions, and see whether the guidance feels specific to your home rather than scripted.",
  },
  "maintaining-your-roof-after-installation": {
    topic: "roof maintenance after installation",
    leadQuestion:
      "What should homeowners focus on first after a new roof is installed?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} Right after installation, the biggest priorities are protecting drainage, keeping debris off the roof, and catching small changes before they turn into leaks or warranty headaches.`,
    middleItems: [
      {
        question: "How often should a newer roof be checked in Texas?",
        answer:
          "A newer roof still deserves periodic attention, especially after hail, high wind, or heavy debris events. Most homeowners should at least do a visual perimeter check after major weather and consider a professional review when the roof starts moving out of its early-life window.",
      },
      {
        question:
          "What kinds of small maintenance issues turn into expensive problems?",
        answer:
          "Clogged gutters, branch abrasion, loose metal details, sealant failures at penetrations, and minor storm movement are the common ones. They seem manageable at first, but they can turn into deck damage or interior staining if no one catches them early.",
      },
      {
        question:
          "When should you call a professional instead of just monitoring it?",
        answer:
          "Call when you see active leaking, displaced materials, repeated debris buildup in the same areas, suspicious ceiling spots, or any condition that seems to be getting worse between checks. Monitoring is fine for stable conditions, not for visible progression.",
      },
    ],
    closingQuestion:
      "What should you do next if you want a maintenance plan for your roof in Austin?",
    closingAnswer:
      "Create a simple plan around storm checks, gutter care, tree clearance, and a periodic professional review. If you want more confidence, the next step is a roof-specific maintenance conversation based on your roof age, material, and recent weather exposure.",
  },
  "storm-damage-repair-vs-roof-replacement": {
    topic: "repair-versus-replacement decisions after storm damage",
    leadQuestion:
      "How do you tell when storm damage can be repaired and when replacement is smarter?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} The decision usually comes down to how widespread the damage is, how old the roof already was, and whether a repair would restore reliable performance or only buy a little time.`,
    middleItems: [
      {
        question:
          "What roof conditions usually push the decision toward replacement?",
        answer:
          "Replacement becomes more likely when damage is spread across multiple slopes, the shingles are already aging out, repairs would be highly visible or repetitive, or the underlying roof system shows signs of larger failure. The pattern matters just as much as the severity.",
      },
      {
        question:
          "How does insurance affect a repair-versus-replacement decision?",
        answer:
          "Insurance can shape the conversation, but it should not replace the actual roof analysis. The policy, adjuster findings, and approved scope all matter, yet homeowners still need to understand whether the roof will truly perform well after the proposed work is done.",
      },
      {
        question: "What should you ask after a storm inspection?",
        answer:
          "Ask what damage is cosmetic, what is functional, how widespread the issues are, and what the likely next weather event could do if you wait. Those questions usually make the repair-versus-replacement path much clearer.",
      },
    ],
    closingQuestion:
      "What should you do next if you're weighing roof repair versus replacement in Austin?",
    closingAnswer:
      "Get the inspection findings and the recommended scope into plain language, then compare the short-term fix against the long-term outcome. A good next step is a review that explains what each option actually buys you in performance, timing, and cost.",
  },
  "texas-weather-roof-lifespan-warning-signs": {
    topic: "roof lifespan and warning signs in Texas",
    leadQuestion:
      "What warning signs usually mean a Texas roof needs a closer look?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} In Texas, the biggest warning signs are usually material aging, visible movement, repeated interior clues, and anything that suggests the roof is no longer shedding heat or water the way it should.`,
    middleItems: [
      {
        question: "How do heat, UV, hail, and wind shorten roof life in Texas?",
        answer:
          "Texas weather stresses roofs from multiple directions at once. Heat and UV accelerate aging, hail bruises and weakens materials, and wind can loosen or crease components that were already vulnerable. Over time, those forces shorten the margin for small problems.",
      },
      {
        question:
          "When do aging signs point to replacement instead of maintenance?",
        answer:
          "Maintenance still helps when the issues are localized and the roof has meaningful life left. Replacement becomes the better conversation when deterioration is widespread, repeated fixes are stacking up, or the roof is showing multiple signs that the system is nearing the end of reliable service.",
      },
      {
        question:
          "How often should Texas homeowners schedule a roof check as the roof ages?",
        answer:
          "The older the roof gets, the less sense it makes to wait for obvious interior damage. As roofs move into higher-risk years, periodic checks after major weather and occasional professional inspections help homeowners plan before the next storm makes the decision for them.",
      },
    ],
    closingQuestion:
      "What should you do next if you're seeing warning signs on your roof in Austin?",
    closingAnswer:
      "Do not rely on guesswork if the roof is already showing symptoms. The next step is a closer evaluation that helps you separate cosmetic aging from issues that could lead to leaks, insurance problems, or a time-sensitive replacement decision.",
  },
  "texas-roof-replacement-process-homeowners-guide": {
    topic: "the roof replacement process",
    leadQuestion:
      "What should homeowners expect first in the roof replacement process?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} Most projects start with understanding the actual roof condition, the likely scope, and whether insurance or financing conversations need to happen before scheduling work.`,
    middleItems: [
      {
        question:
          "How do inspection, insurance, scheduling, and installation usually unfold?",
        answer:
          "A well-run replacement usually moves from inspection to scope review, then into any insurance coordination that is needed, followed by scheduling, installation, and closeout documentation. The smoother that sequence is, the less stressful the project tends to feel for the homeowner.",
      },
      {
        question:
          "What delays or surprises most often affect a roof replacement timeline?",
        answer:
          "Weather, hidden decking issues, incomplete insurance scopes, material availability, and communication gaps are the most common ones. Good prep does not remove every surprise, but it does make them easier to manage when they come up.",
      },
      {
        question:
          "What should you review before work starts on replacement day?",
        answer:
          "Review the approved scope, material selections, ventilation details, flashing plan, cleanup expectations, and any contingencies for hidden damage. That conversation helps make sure everyone is aligned before tear-off begins.",
      },
    ],
    closingQuestion:
      "What should you do next if you want help planning a roof replacement in Austin?",
    closingAnswer:
      "Start with a roof-specific review of the findings, scope, and likely project steps. The best next move is a planning conversation that helps you understand timing, options, and what needs to be resolved before installation is scheduled.",
  },
  "what-to-expect-professional-roof-inspection": {
    topic: "a professional roof inspection",
    leadQuestion: "What does a professional roof inspection actually cover?",
    leadAnswer: (summaryLine) =>
      `${summaryLine} A useful inspection looks beyond obvious shingle damage and explains how the roof system is performing as a whole, including flashings, penetrations, ventilation, and signs of moisture or wear.`,
    middleItems: [
      {
        question:
          "What problems are easiest to miss without a full inspection?",
        answer:
          "Flashing failures, subtle hail or wind damage, ventilation imbalance, deteriorating seals at penetrations, and early moisture clues in the attic are all easy to miss without a closer look. Those details often determine whether the next step is monitoring, repair, or replacement.",
      },
      {
        question:
          "How often should homeowners schedule a roof inspection in Texas?",
        answer:
          "Most homeowners should think about inspections after major storms, when leaks appear, when buying or selling, or as the roof ages into a higher-risk period. The right timing depends on the roof material, age, nearby tree cover, and recent weather exposure.",
      },
      {
        question: "What should you ask for after the inspection is finished?",
        answer:
          "Ask for clear photos, a plain-language summary, and an explanation of what is urgent, what can wait, and what needs to be monitored. A good inspection is only valuable if it leaves you with a decision framework you can actually use.",
      },
    ],
    closingQuestion:
      "What should you do next if you need a professional roof inspection in Austin?",
    closingAnswer:
      "Schedule the inspection with a clear goal in mind, whether that is post-storm documentation, leak troubleshooting, or planning for future replacement. The next step is making sure the findings turn into a practical plan rather than a vague list of concerns.",
  },
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
      return formatQuestionTopic(post.title);
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
          answer: `That usually comes down to how widespread the damage is, how old the roof system is, and whether the weak spots are isolated or repeated across multiple slopes. With roof replacement decisions, you want to compare repair scope against the likely life you would actually get back.`,
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
          question: audienceAwareQuestion(
            questionTopic,
            `How should homeowners evaluate ${questionTopic}?`,
            (cleanedTopic) => `How should you evaluate ${cleanedTopic}?`,
          ),
          answer: `Start by understanding the roof condition, the likely cause, and whether the issue is isolated or systemic. For ${categoryLabel.toLowerCase()} questions, the best next step is usually a clear on-site assessment before making a repair or replacement decision.`,
        },
        {
          question: `What makes ${questionTopic} more urgent?`,
          answer:
            "Urgency goes up when active leaks, storm damage, visible material movement, repeated repairs, or interior signs show the roof is no longer performing reliably. Those are the moments when waiting tends to cost more.",
        },
        {
          question: audienceAwareQuestion(
            questionTopic,
            `What should homeowners do next after learning about ${questionTopic}?`,
            (cleanedTopic) =>
              `What should you do next after learning about ${cleanedTopic}?`,
          ),
          answer:
            "Use the article to narrow the questions you need answered, then get a roof-specific evaluation of your property so the next step is tied to your actual conditions and not just general online guidance.",
        },
      ];
  }
};

export const buildArticleFaqProps = (post: PostDetail): FaqProps => {
  const authoredFaq = mapFaqProps(
    post.faq as Record<string, unknown> | null | undefined,
  );
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
  const preset = post.slug ? ARTICLE_FAQ_PRESETS[post.slug] : undefined;

  if (preset) {
    return {
      tagline: "Article FAQ",
      title: "Common questions homeowners ask next",
      intro:
        "A few practical follow-up questions homeowners usually ask after reading this article.",
      items: [
        {
          question: preset.leadQuestion,
          answer: preset.leadAnswer(summaryLine),
        },
        ...preset.middleItems,
        {
          question: preset.closingQuestion,
          answer: preset.closingAnswer,
        },
      ],
    };
  }

  const items: FaqItem[] = [
    {
      question: audienceAwareQuestion(
        questionTopic,
        `What should Austin homeowners know about ${questionTopic}?`,
        (cleanedTopic) =>
          `What should Austin homeowners know about ${cleanedTopic}?`,
      ),
      answer: `${summaryLine} In practice, homeowners usually need to understand how the issue shows up on the actual roof, whether it is isolated or widespread, and what the next weather event is likely to do to it.`,
    },
    ...getCategoryItems(questionTopic, category, categoryLabel),
    {
      question: audienceAwareQuestion(
        questionTopic,
        `What should you do next if you need help with ${questionTopic} in Austin?`,
        (cleanedTopic) =>
          `What should you do next if you need help with ${cleanedTopic} in Austin?`,
      ),
      answer:
        "The best next step is a real roof-specific conversation, not another generic checklist. If you are seeing signs that this article describes, schedule a consultation so you can compare inspection findings, options, and timing against your actual property.",
    },
  ].slice(0, 5);

  return {
    tagline: "Article FAQ",
    title: "Common questions homeowners ask next",
    intro:
      "A few practical follow-up questions homeowners usually ask after reading this article.",
    items,
  };
};
