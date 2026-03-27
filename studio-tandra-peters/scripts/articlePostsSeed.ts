/** Demo `post` documents + helpers to sync them onto the home page article list. */
import type {SanityClient} from '@sanity/client'
import {blocksFromParagraphs} from './blocksFromText'

type ArticleSeed = {
  _id: string
  _type: 'post'
  title: string
  slug: {_type: 'slug'; current: string}
  publishedAt: string
  category:
    | 'roof-replacement'
    | 'insurance-claims'
    | 'inspections'
    | 'maintenance'
    | 'texas-homeowners'
  excerpt: string
  seoDescription: string
  authorName: string
  body: ReturnType<typeof blocksFromParagraphs>
}

const bp = (paragraphs: string[], prefix: string) => blocksFromParagraphs(paragraphs, prefix)

export const articlePostsSeed: ArticleSeed[] = [
  {
    _id: 'post-texas-roof-replacement-process',
    _type: 'post',
    title: 'The Texas Roof Replacement Process: What Homeowners Should Expect',
    slug: {_type: 'slug', current: 'texas-roof-replacement-process-homeowners-guide'},
    publishedAt: '2025-11-18T15:00:00.000Z',
    category: 'roof-replacement',
    excerpt:
      'From inspection through insurance coordination and final documentation, here is how a professional roof replacement typically unfolds when you work with an experienced Texas roofing team.',
    seoDescription:
      'Step-by-step guide to the roof replacement process in Texas: inspections, insurance adjusters, scopes of work, and project closeout with Birdcreek-style clarity.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'Replacing a roof is one of the largest maintenance decisions most homeowners make. The process is easier when you know the sequence: inspection, scope definition, installation, and closeout—especially when insurance is involved.',
        'Trusted Texas contractors such as Birdcreek Roofing emphasize making replacement straightforward: start with a thorough inspection so you understand decking, flashing, ventilation, and drainage—not only the shingles you see from the street.',
        'When a claim is involved, it helps to have someone on your side when the adjuster visits. The goal is alignment between what the field inspection shows and what the carrier’s estimate covers, including line-by-line review of the settlement so nothing critical is left off the scope.',
        'During installation, clear communication and site visits keep the project aligned with what you approved. After completion, final invoicing and certificates of completion submitted to the carrier (when applicable) close the loop so your documentation matches the work performed.',
        'As a Birdcreek Roofing consultant, I help homeowners interpret findings, understand options, and stay oriented through each phase—so education, advocacy, and professional installation stay connected.',
      ],
      'art-tx-replace',
    ),
  },
  {
    _id: 'post-professional-roof-inspection',
    _type: 'post',
    title: 'What to Expect During a Professional Roof Inspection',
    slug: {_type: 'slug', current: 'what-to-expect-professional-roof-inspection'},
    publishedAt: '2025-11-05T15:00:00.000Z',
    category: 'inspections',
    excerpt:
      'A quality inspection looks at the whole roof system—not just missing shingles—so you can prioritize repairs, plan replacement, or support an insurance scope with clear documentation.',
    seoDescription:
      'Learn what a professional roof inspection covers: attic signs, flashing, penetrations, ventilation, and photo documentation for Texas homeowners.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'A professional inspection is more than a quick look from the curb. It evaluates how water moves across the assembly, how heat exits the attic, and how details at penetrations and transitions are holding up.',
        'On the roof, common focus areas include shingle seal integrity, flashing at walls and chimneys, boot seals around plumbing vents, and edge metal. On steep or complex roofs, close-up photos help you see what matters without climbing.',
        'Inside the attic, inspectors look for moisture staining, compressed insulation, daylight through the deck, and whether intake and exhaust ventilation are balanced enough for our Texas heat.',
        'You should leave with plain-language notes on what is urgent, what can be monitored, and what to discuss with insurers or contractors. Good documentation makes the next step—repair, replacement, or claim support—much clearer.',
      ],
      'art-insp',
    ),
  },
  {
    _id: 'post-insurance-roof-claims',
    _type: 'post',
    title: 'Homeowners Insurance and Roof Damage: A Practical Guide',
    slug: {_type: 'slug', current: 'homeowners-insurance-roof-damage-claims-guide'},
    publishedAt: '2025-10-22T15:00:00.000Z',
    category: 'insurance-claims',
    excerpt:
      'Understanding timelines, documentation, and how carrier estimates relate to real-world scopes can reduce stress after hail, wind, or leak-related damage.',
    seoDescription:
      'Practical insurance tips for roof damage: documentation, adjuster visits, estimate review, and working with a Texas roofing consultant.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'After storm damage or a sudden leak, speed and clarity matter. Start with photos and notes on when you first noticed the issue, and avoid removing evidence before your carrier documents the loss if you plan to file a claim.',
        'When an adjuster visits, the goal is a scope that reflects the full repair or replacement needed—not a minimal patch that fails the next time it rains. Compare line items to what your contractor or consultant identified in the field.',
        'Policies and outcomes vary by carrier and coverage; no article can guarantee a result. What you can control is organization: dates, photos, estimates, and a written understanding of what was approved or denied.',
        'As a consultant working within the Birdcreek Roofing model, I help homeowners read estimates, ask better questions, and advocate for fair scopes when appropriate—without promising outcomes your policy cannot support.',
      ],
      'art-ins',
    ),
  },
  {
    _id: 'post-shingle-vs-metal',
    _type: 'post',
    title: 'Asphalt Shingle vs. Metal Roofing: Planning a Replacement in Texas',
    slug: {_type: 'slug', current: 'asphalt-shingle-vs-metal-roofing-texas'},
    publishedAt: '2025-10-08T15:00:00.000Z',
    category: 'roof-replacement',
    excerpt:
      'Both systems can perform well in Texas when designed and installed correctly. Here is how to compare cost, longevity, wind performance, and aesthetics before you commit.',
    seoDescription:
      'Compare asphalt shingles and metal roofing for Texas homes: performance in heat and hail, warranties, and how to plan replacement with confidence.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'Asphalt shingles remain popular for their balance of cost, color choice, and proven performance when ventilation and installation details are right. In hail-prone seasons, impact-rated options and proper underlayment matter.',
        'Metal roofing—especially quality standing seam systems—can offer excellent wind resistance and long service life, but details like clip systems, panel gauge, and coating longevity should match your goals and budget.',
        'Texas sun and attic temperatures punish under-ventilated assemblies regardless of surface material. If you are investing in a new roof, treat ventilation and flashing upgrades as part of the system—not an afterthought.',
        'Your best choice depends on architecture, HOA rules, insurance considerations, and how long you plan to stay. A consultant-led review helps you compare realistic lifecycle costs instead of brochure promises.',
      ],
      'art-shingle-metal',
    ),
  },
  {
    _id: 'post-storm-repair-vs-replace',
    _type: 'post',
    title: 'Storm Damage: When to Repair vs. When to Replace the Roof',
    slug: {_type: 'slug', current: 'storm-damage-repair-vs-roof-replacement'},
    publishedAt: '2025-09-20T15:00:00.000Z',
    category: 'texas-homeowners',
    excerpt:
      'Not every bruised shingle means full replacement—but widespread damage, aged materials, or hidden deck issues can tip the scale. Here is how to think it through.',
    seoDescription:
      'Deciding between roof repair and replacement after Texas storms: damage patterns, roof age, and how professionals document what insurers need.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'Localized damage on an otherwise young roof may be repairable if flashing and underlayment are sound. Widespread hail impacts, creased shingles, or granule loss across slopes often point toward replacement—especially if the roof is near end of life.',
        'Hidden issues like saturated deck sections or repeated leak paths may not be obvious from the ground. That is why inspections after major weather events focus on both exterior signs and attic evidence.',
        'Insurance decisions hinge on policy language and adjuster findings. Clear photos, dated notes, and a defensible scope from your contractor help carriers evaluate the loss fairly.',
        'If you are unsure, start with an inspection and a written explanation of options. You can always phase repairs, but you should never guess about structural or moisture risk.',
      ],
      'art-storm',
    ),
  },
  {
    _id: 'post-choose-consultant-austin',
    _type: 'post',
    title: 'How to Choose a Roofing Consultant in Austin (and Across Texas)',
    slug: {_type: 'slug', current: 'how-to-choose-roofing-consultant-austin-texas'},
    publishedAt: '2025-09-01T15:00:00.000Z',
    category: 'texas-homeowners',
    excerpt:
      'Look for clear communication, alignment with a reputable installer, and a process that educates you instead of rushing a signature.',
    seoDescription:
      'Tips for choosing a roofing consultant in Austin: credentials, transparency, insurance literacy, and why installer alignment matters.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'A strong consultant explains what they see, what it means for durability and warranty coverage, and what reasonable next steps look like—without pressure tactics or vague jargon.',
        'Ask how recommendations connect to installation. In my work with Birdcreek Roofing, advice maps to the same crews and quality standards that perform the work, which reduces gaps between “what we discussed” and “what was built.”',
        'Experience with Texas weather patterns, insurance documentation, and multi-story or complex roof geometry matters. Look for specifics in past projects, not generic promises.',
        'Trust your instincts on communication. If you do not understand the plan, keep asking questions until you do. A good consultant welcomes that.',
      ],
      'art-consultant',
    ),
  },
  {
    _id: 'post-maintain-new-roof',
    _type: 'post',
    title: 'Maintaining Your Roof After Installation',
    slug: {_type: 'slug', current: 'maintaining-your-roof-after-installation'},
    publishedAt: '2025-08-15T15:00:00.000Z',
    category: 'maintenance',
    excerpt:
      'Simple habits—gutter care, tree clearance, and occasional visual checks—protect the investment you just made in a new roof system.',
    seoDescription:
      'Post-installation roof maintenance tips for Texas homeowners: gutters, trees, ventilation, and when to schedule follow-up inspections.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'After installation, keep gutters and downspouts flowing so water is directed away from foundations and fascia. Clogs back water up under edge metal and can damage starter courses over time.',
        'Trim branches that scrape or drop debris onto the roof. Mechanical wear and trapped moisture shorten shingle life and encourage algae or moss in shaded areas.',
        'Walk the perimeter after major storms and look for displaced metal, lifted tabs, or new interior ceiling spots. Early catches are almost always cheaper than late leaks.',
        'Consider a professional check-in before hail season if your roof is mid-life. Maintenance is about extending performance—not waiting for an emergency.',
      ],
      'art-maintain',
    ),
  },
  {
    _id: 'post-texas-weather-lifespan',
    _type: 'post',
    title: 'Texas Weather and Your Roof: Lifespan and Warning Signs',
    slug: {_type: 'slug', current: 'texas-weather-roof-lifespan-warning-signs'},
    publishedAt: '2025-08-01T15:00:00.000Z',
    category: 'texas-homeowners',
    excerpt:
      'Heat, UV, wind, and hail all age roofs faster than mild climates. Learn the warning signs that suggest it is time for a closer look.',
    seoDescription:
      'How Texas heat and storms affect roof lifespan: curling shingles, granule loss, flashing fatigue, and when to call a professional.',
    authorName: 'Tandra Peters',
    body: bp(
      [
        'Central Texas roofs work hard: intense UV, thermal cycling, occasional hail, and strong straight-line winds stress shingles, sealant strips, and metal details.',
        'Warning signs include widespread granule loss, brittle or cupping shingles, rusted flashings, daylight in the attic, or recurring nail pops. Any one of these warrants a closer inspection.',
        'Attic ventilation imbalances can cook shingles from underneath even when the exterior looks “fine.” If upstairs rooms run hot or your ridge looks weathered unevenly, ask about airflow.',
        'Proactive inspections help you plan replacement on your timeline instead of reacting to interior damage. That is usually better for budget and insurance conversations alike.',
      ],
      'art-weather',
    ),
  },
]

/** Reference list for `homePage.articlesTeaser.articles` (seed order). */
export const homePageArticleReferences = () =>
  articlePostsSeed.map((p) => ({
    _key: p._id,
    _type: 'reference' as const,
    _ref: p._id,
  }))

const HOME_PAGE_IDS = ['homePage', 'drafts.homePage'] as const

/** Patch `homePage` + `drafts.homePage` so Studio and the API see the same article list. */
export const patchHomePageArticleRefs = async (client: SanityClient) => {
  const refs = homePageArticleReferences()
  const updated: string[] = []
  for (const id of HOME_PAGE_IDS) {
    try {
      const exists = await client.fetch<boolean>(`count(*[_id == $id]) > 0`, {id})
      if (!exists) {
        continue
      }
      await client.patch(id).set({'articlesTeaser.articles': refs}).commit()
      updated.push(id)
    } catch (e) {
      console.warn(`patchHomePageArticleRefs: ${id}`, e)
    }
  }
  if (updated.length > 0) {
    console.log(`Synced home article list (${refs.length} refs): ${updated.join(', ')}`)
  }
}
