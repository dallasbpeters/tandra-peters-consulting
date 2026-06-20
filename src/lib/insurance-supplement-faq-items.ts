import type { PortableTextBlock } from "@portabletext/types";

import type { FaqItem } from "../types";

const faqAnswer = (...paragraphs: string[]): PortableTextBlock[] =>
  paragraphs.map((text, index) => ({
    _key: `supp-faq-p-${index}`,
    _type: "block" as const,
    children: [
      { _key: `supp-faq-s-${index}`, _type: "span" as const, marks: [], text },
    ],
    markDefs: [],
    style: "normal" as const,
  }));

/** Insurance supplement FAQs for `/insurance-faqs` (second section). */
export const INSURANCE_SUPPLEMENT_FAQ_ITEMS: FaqItem[] = [
  {
    _key: "supp-faq-1",
    answer: faqAnswer(
      "It's not uncommon for adjusters to miss damage—or specific roof components—when they approve a claim. It's also not uncommon for a carrier to approve work but not put enough money on the claim to actually get it done.",
      "When that happens, we submit documentation to the insurance company: what was missed, or where the numbers don't line up. That submission is called a supplement. The goal is to add missing items or fix cost adjustments so your carrier covers what they're required to cover and your property is restored to its pre-loss condition."
    ),
    question: "What is a supplement?",
  },
  {
    _key: "supp-faq-2",
    answer: faqAnswer(
      "Usually it means that when I reviewed your claim paperwork—or once we were on the roof installing—we found something the adjuster missed or a gap in what the carrier allocated versus what the work actually costs.",
      "If you want the specifics on what's in your supplement, reach out to me. I can walk you through every line."
    ),
    question: "Why do I need one?",
  },
  {
    _key: "supp-faq-3",
    answer: faqAnswer(
      "A preinstall supplement goes to your insurance company before we finish work on your home. These come up most often when important roof components are missing from the claim—items Birdcreek needs in place before we can install your new roof.",
      "You might also need one when the carrier undervalued a line item. Say they gave you $1,500 for interior repairs but the real cost is $2,100—we'd supplement for the difference before that work starts. That way you can make an informed call on what you want done and what you'd rather skip."
    ),
    question: "What is a preinstall supplement?",
  },
  {
    _key: "supp-faq-4",
    answer: faqAnswer(
      "A postinstall supplement goes to your carrier after the work on your home is complete. These usually come up when we couldn't know the full extent of damage—or what's under your existing roof—until tear-off.",
      "For example, our crew might find an extra layer of underlayment that has to come off. That's additional labor for Birdcreek. Instead of billing you for it, we send photo documentation to your insurance company and ask them to pay for the extra work."
    ),
    question: "What is a postinstall supplement?",
  },
  {
    _key: "supp-faq-5",
    answer: faqAnswer(
      "There's no fixed timeline. Some supplements are reviewed and approved in days; others take months.",
      "A lot of factors affect that—how many open claims your adjuster is juggling, how many supplements Birdcreek has in the queue, whether the carrier wants more photos or paperwork, and so on. We push the process as fast as we can, but honestly, how quickly a carrier moves is often outside our control."
    ),
    question: "How long does the supplement process take?",
  },
  {
    _key: "supp-faq-6",
    answer: faqAnswer(
      "Most of the time Birdcreek can handle supplements start to finish. When a carrier is slow or unresponsive, it can help speed things up if you call and ask for a status update.",
      "Sometimes a carrier won't talk to Birdcreek even when you've given us permission—they'll contact you instead. You're within your rights to ask your adjuster to route supplement questions to us rather than putting that on you."
    ),
    question: "Is there anything I need to do during the supplement process?",
  },
  {
    _key: "supp-faq-7",
    answer: faqAnswer(
      "It can. If a supplement is still pending, we may hold off on related work because we don't want you on the hook for something your insurance company hasn't agreed to pay for yet.",
      "I know waiting is frustrating. It's still usually in your favor—we'd rather get approval first than leave you with surprise out-of-pocket costs."
    ),
    question: "Will a supplement delay work on my home?",
  },
  {
    _key: "supp-faq-8",
    answer: faqAnswer(
      "Approval means your carrier agrees to pay for what we supplemented. They'll typically send you another check and a revised loss sheet.",
      "Send us that revised loss sheet so we can compare what they approved against what we requested and adjust our totals. Sometimes they approve less than we asked for—same as with your original loss sheet, we align our price with what the carrier approved so you're not paying more out of pocket than your policy requires.",
      "If you move forward with the approved work, the additional insurance funds would be due to Birdcreek Roofing."
    ),
    question: "What happens when a supplement is approved?",
  },
  {
    _key: "supp-faq-9",
    answer: faqAnswer(
      "This is your project. If there's approved work you'd rather not do, you don't have to do it.",
      "If we've already started that work or ordered materials with return or restocking fees, you may still owe some of that cost.",
      "Keep in mind: if you skip work the carrier already paid for, they may not cover that same item again on a future claim. Say gutter replacement was approved and you pass on it—if another storm damages those gutters later, the carrier may expect you to use the money from the first claim rather than paying for replacement again."
    ),
    question: "What if I decide I don't want to do work that was approved?",
  },
  {
    _key: "supp-faq-10",
    answer: faqAnswer(
      "If a supplement is denied, we can often send more information and try again. If it's still denied, Birdcreek may not be able to complete the work as originally contracted. You can hire a Public Adjuster to advocate with your carrier, or choose not to do the denied work.",
      "Partial approvals are common—some line items get yes, others get no. Depending on the supplement, we may be able to submit more documentation for the denied pieces. If we can't get them approved, we may not be able to finish everything as scoped; sometimes enough is approved that we can still move forward.",
      "Every claim plays out differently, so I'll keep you updated as we go. Like with a full denial, you can bring in a Public Adjuster or forgo the work that wasn't approved."
    ),
    question:
      "What happens if a supplement is denied or only partially approved?",
  },
  {
    _key: "supp-faq-11",
    answer: faqAnswer(
      "A Public Adjuster is a licensed professional you hire to represent your interests in a homeowners insurance claim. They assess damage, review your policy, and build a detailed claim aimed at a fair settlement—getting your home back to pre-storm condition.",
      "Unlike the adjuster who works for the insurance company, a Public Adjuster works only for you—negotiating repairs, replacements, and additional living expenses when they apply. That expertise can save time and stress on a complicated claim, but approval still isn't guaranteed even with one involved."
    ),
    question: "When is it time to hire a Public Adjuster?",
  },
];
