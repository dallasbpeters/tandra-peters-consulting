import type { PortableTextBlock } from "@portabletext/types";

import type { FaqItem } from "../types";

const faqAnswer = (...paragraphs: string[]): PortableTextBlock[] =>
  paragraphs.map((text, index) => ({
    _key: `wf-faq-p-${index}`,
    _type: "block" as const,
    children: [
      { _key: `wf-faq-s-${index}`, _type: "span" as const, marks: [], text },
    ],
    markDefs: [],
    style: "normal" as const,
  }));

const faqQuote = (text: string): PortableTextBlock[] => [
  {
    _key: "wf-faq-quote",
    _type: "block" as const,
    children: [
      { _key: "wf-faq-quote-span", _type: "span" as const, marks: [], text },
    ],
    markDefs: [],
    style: "blockquote" as const,
  },
];

/** Insurance-claim FAQs for `/insurance-faqs`. */
export const INSURANCE_FAQ_ITEMS: FaqItem[] = [
  {
    _key: "wf-faq-1",
    answer: faqAnswer(
      "Once your claim is approved, your insurance company sends their estimate—a loss sheet that lists everything they included in the claim. Share a copy with me and any other contractor you're considering.",
      "Reviewing the loss sheet helps make sure your adjuster didn't miss damage or necessary roof components, and that any estimate you receive matches the claim. Your insurance company's loss sheet sets the price of the work—not your contractor—so you shouldn't pay more out of pocket than your policy requires. For most homeowners, that means your deductible is the main out-of-pocket cost; the rest should come from your carrier."
    ),
    question: "What do I do once my claim is approved?",
  },
  {
    _key: "wf-faq-2",
    answer: faqAnswer(
      "No. Sharing your loss sheet doesn't hurt you. It doesn't obligate you to hire a specific contractor, and it doesn't let us speak with your insurance company on your behalf.",
      "It only helps make sure your carrier covers the damage they're required to cover—and that you don't pay more out of pocket than you have to."
    ),
    question:
      "Does providing a contractor with my loss sheet harm me in any way?",
  },
  {
    _key: "wf-faq-3",
    answer: faqAnswer(
      "This is normal. Most carriers pay claims in two parts. The first check is usually the Actual Cash Value (ACV) of your roof—and any other damaged property—minus your deductible. That's often called the Net Claim.",
      "Most policies also include Recoverable Depreciation: the difference between what your property is worth new and what it's worth in its current damaged condition. After the work is completed, your insurance company releases that recoverable depreciation in a final check.",
      "If you have Recoverable Depreciation, the carrier only releases it for work you actually complete—they withhold depreciation on anything you skip.",
      "If Birdcreek completes all the work approved on your claim, your first check (Net Claim) plus your deductible plus any recoverable depreciation still to be released should equal your contract price with Birdcreek Roofing. (Net Claim + Deductible + Recoverable Depreciation = Birdcreek contract price.) That means your total out-of-pocket should be no more than your deductible; everything else should come from insurance."
    ),
    question:
      "Why is the check my insurance company sent me for less money than the total of the claim?",
  },
  {
    _key: "wf-faq-4",
    answer: faqAnswer(
      "Sometimes a claim lists Non-Recoverable Depreciation. That means you won't receive depreciation payments after the work is done—and you're responsible for both your deductible and the depreciation amount.",
      "I know that's a real financial burden. When I see non-recoverable depreciation on a loss sheet, I look for legal, ethical ways to save you money where we can. It isn't always possible, but share your loss sheet with me so I can review it."
    ),
    question: "What if I have Non-Recoverable Depreciation on my claim?",
  },
  {
    _key: "wf-faq-5",
    answer: [
      ...faqAnswer(
        "No. We're required by law to collect deductible payments.",
        "HB 2102 (Enforcement of Insurance Deductible Payments) states:"
      ),
      ...faqQuote(
        "Texas law requires a person insured under a property insurance policy to pay any deductible applicable to a claim made under the policy. It is a violation of Texas law for a seller of goods or services who reasonably expects to be paid wholly or partly from the proceeds of a property insurance claim to knowingly allow the insured person to fail to pay, or assist the insured person's failure to pay, the applicable insurance deductible."
      ),
      ...faqAnswer(
        "Waiving a deductible is insurance fraud. I know a deductible can be a burden—if you're struggling to come up with it, tell me. We may be able to work with you on legal, ethical options."
      ),
    ],
    question: "Can Birdcreek waive my deductible for me?",
  },
  {
    _key: "wf-faq-6",
    answer: faqAnswer(
      "Once all work Birdcreek was contracted to do is finished, we send your carrier a Certificate of Completion. It breaks down what we completed and, if applicable, work on your loss sheet we didn't do.",
      "Your carrier only releases depreciation for completed work. If Birdcreek didn't do some items, they'll withhold that portion—but if another company or you completed that work yourself, send photos to your carrier and they can release what they withheld. You're entitled to recoverable depreciation for work that's done, even if Birdcreek didn't do it."
    ),
    question:
      "When does my insurance company send me the Recoverable Depreciation payment?",
  },
  {
    _key: "wf-faq-7",
    answer: faqAnswer(
      "Sometimes adjusters miss damage during their inspection. Once you've contracted with us, we supplement those missing items with your carrier—photos of the damage plus an estimate for the missed repairs.",
      "Your adjuster reviews that information and decides. If they approve the supplement, they add the items and issue another payment. If they deny it, we can submit additional information to try again.",
      "If it's still not approved and you want the work done, a Public Adjuster may be the next step—I can recommend someone if it comes to that."
    ),
    question: "What if my claim is missing something?",
  },
  {
    _key: "wf-faq-8",
    answer: faqAnswer(
      "We can send damage photos and ask your carrier to send an adjuster for a second inspection.",
      "If they still deny the claim after that, we can wait for another storm and try again, or you can hire a Public Adjuster to work with your insurance company on your behalf."
    ),
    question: "What if my claim is denied?",
  },
  {
    _key: "wf-faq-9",
    answer: faqAnswer(
      "Nothing. Birdcreek doesn't charge homeowners for help navigating the claims process. Until you sign a contract with us, we don't take a penny from you.",
      "That includes a roof inspection, helping you file a claim, being present at your adjuster appointment, reviewing your loss sheet, or requesting a second inspection on a denied claim—and none of that obligates you to choose Birdcreek as your contractor.",
      "I'd love to earn your business, but my job first is to help you as best I can—even if you choose another company."
    ),
    question: "How much does all this claim help cost?",
  },
  {
    _key: "wf-faq-10",
    answer: faqAnswer(
      "No. We follow a payment schedule tied to what you receive from your insurance company.",
      "At contract signing (no later than two weeks before your scheduled installation date), Birdcreek collects the first insurance check you've received—we only collect the amount allocated on that check for the work we're completing. Your deductible is due on install day.",
      "Your final Recoverable Depreciation check is due when you receive it from your carrier, once work should be complete. Any insurance checks for approved supplements are due when you receive those as well."
    ),
    question: "Do I have to pay the total to Birdcreek up front?",
  },
];
