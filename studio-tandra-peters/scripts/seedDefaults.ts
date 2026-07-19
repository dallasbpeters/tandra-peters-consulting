/** Default homepage + site settings — text + structure; images are attached in `seed.ts` via asset upload. */

import { homePageArticleReferences } from "./articlePostsSeed";
import { blocksFromParagraphs } from "./blocksFromText";

/** Nav logo source for seed upload (Google profile / brand image). */
export const siteSettingsNavLogoImageUrl =
  "https://lh3.googleusercontent.com/aida/ADBb0ujNxdAxaY1-ObgML2j-2_hQEat6D2y2JOsW0G-Nn8gEMYt8QMH7U-Mp2gVevbXa84NvM7lJlcHVvIjXYcDfZe9_-fp1a7L4EQMVBGE2ktk3dY-MipPdQrQxytiQHnu8Nk_rnwybn1BLOrZj6dHzlyB7eB5gEeCuXGlrZLwUbtJYNj519phafs2-Nn7eLvREdzsUNRz3p161dSRwqxjoy-whIG9170-WCK-SXsooTmYMrlWKh8nKBBZ6g1mLjaCetu1MTSg-G4xiuw";

export const siteSettingsSeed = {
  _id: "siteSettings",
  _type: "siteSettings" as const,
  footerCopyrightText: "© 2026 Tandra Peters. All Rights Reserved.",
  footerDescription: blocksFromParagraphs(
    [
      "Austin roofing consultant for roof assessments, insurance claim support, and end-to-end project oversight—paired with Birdcreek Roofing for trusted installation across Texas.",
    ],
    "footer-desc"
  ),
  footerLegalLinks: [
    { href: "/privacy", name: "Privacy Policy" },
    { href: "/terms", name: "Terms of Service" },
    { href: "/cookies", name: "Cookie Policy" },
  ],
  footerLogoText: "Tandra Peters",
  footerPartnerText: "Birdcreek Roofing",
  footerQuickLinks: [
    { href: "#services", name: "Services" },
    { href: "#about-tandra", name: "About Tandra" },
    { href: "/articles", name: "Articles" },
    { href: "#testimonials", name: "Testimonials" },
    { href: "#faq", name: "FAQ" },
    { href: "#contact", name: "Contact" },
  ],
  footerSocialLinks: [
    { platform: "facebook", url: "https://www.facebook.com/tandra.peters.3" },
    { platform: "email", url: "mailto:tandra@birdcreekroofing.com" },
    { platform: "phone", url: "tel:+15129683965" },
  ],
  navCtaHref: "#contact",
  navCtaText: "Schedule a Free Consultation",
  navItems: [
    { href: "#services", name: "Services" },
    { href: "#about-tandra", name: "About Tandra" },
    { href: "/articles", name: "Articles" },
    { href: "#testimonials", name: "Testimonials" },
    { href: "#faq", name: "FAQ" },
    { href: "#contact", name: "Contact" },
  ],
  navLogoTagline: "Roofing Consultant",
  navLogoText: "Tandra Peters",
  navSecondaryCtaHref: "#services",
  navSecondaryCtaText: "Explore Services",
};

export const articlesPageSeed = {
  _id: "articlesPage",
  _type: "articlesPage" as const,
  intro: blocksFromParagraphs(
    [
      "Practical guides on roof replacement, inspections, insurance, and Texas weather—written from a consultant perspective aligned with Birdcreek Roofing’s homeowner-first process.",
    ],
    "articles-intro"
  ),
  pageTitle: "Articles",
};

export const workflowPageSeed = {
  _id: "workflowPage",
  _type: "workflowPage" as const,
  edges: [
    {
      _key: "wf-edge-1-2",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e1-2",
      label: "Damage found",
      sourceHandle: "right",
      sourceStep: "1",
      targetHandle: "left",
      targetStep: "2",
    },
    {
      _key: "wf-edge-2-3",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e2-3",
      label: "Adjuster scheduled",
      sourceHandle: "bottom",
      sourceStep: "2",
      targetHandle: "top",
      targetStep: "3",
    },
    {
      _key: "wf-edge-3-4",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e3-4",
      label: "Forward estimate",
      sourceHandle: "right",
      sourceStep: "3",
      targetHandle: "left",
      targetStep: "4",
    },
    {
      _key: "wf-edge-4-5",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e4-5",
      label: "Meet on site",
      sourceHandle: "bottom",
      sourceStep: "4",
      targetHandle: "top",
      targetStep: "5",
    },
    {
      _key: "wf-edge-5-6",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e5-6",
      label: "Deductible & deposit",
      sourceHandle: "right",
      sourceStep: "5",
      targetHandle: "left",
      targetStep: "6",
    },
    {
      _key: "wf-edge-6-7",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e6-7",
      label: "Supplement filed",
      sourceHandle: "right",
      sourceStep: "6",
      targetHandle: "left",
      targetStep: "7",
    },
    {
      _key: "wf-edge-7-8",
      _type: "workflowDiagramEdge" as const,
      edgeId: "e7-8",
      label: "Install complete",
      sourceHandle: "bottom",
      sourceStep: "7",
      targetHandle: "top",
      targetStep: "8",
    },
  ],
  layoutColGap: 230,
  layoutFinalRowExtraOffset: 24,
  layoutNodeHeight: 232,
  layoutNodeWidth: 496,
  layoutOriginX: 12,
  layoutOriginY: 12,
  layoutRowGap: 40,
  nodes: [
    {
      _key: "wf-step-1",
      _type: "workflowDiagramNode" as const,
      body: "I'll take a look first. If there's no damage, I'll tell you—you're good to go.",
      stepId: "1",
      title: "Roof Inspection",
      wide: false,
    },
    {
      _key: "wf-step-2",
      _type: "workflowDiagramNode" as const,
      body: "Once you file the claim, let me know when the adjuster will inspect your roof.",
      stepId: "2",
      title: "File the Claim",
      wide: false,
    },
    {
      _key: "wf-step-3",
      _type: "workflowDiagramNode" as const,
      body: "Forward the full estimate to tandra@birdcreekroofing.com.",
      stepId: "3",
      title: "Receive the Estimate Letter & Check",
      wide: false,
    },
    {
      _key: "wf-step-4",
      _type: "workflowDiagramNode" as const,
      body: "Having Birdcreek at the meeting with the adjuster helps ensure all components are accounted for.",
      stepId: "4",
      title: "Adjuster & Birdcreek Roofing Meeting",
      wide: false,
    },
    {
      _key: "wf-step-5",
      _type: "workflowDiagramNode" as const,
      body: "The first insurance check, your deductible, and payment for any upgrades start the installation process.",
      stepId: "5",
      title: "First Insurance Check",
      wide: false,
    },
    {
      _key: "wf-step-6",
      _type: "workflowDiagramNode" as const,
      body: "If insurance left items off the estimate, we'll request they include them.",
      stepId: "6",
      title: "Supplement",
      wide: false,
    },
    {
      _key: "wf-step-7",
      _type: "workflowDiagramNode" as const,
      body: "Once we have your signed contract, initial payment, and approval of any supplement, our production team will call to schedule your new roof.",
      stepId: "7",
      title: "Roof Installation",
      wide: false,
    },
    {
      _key: "wf-step-8",
      _type: "workflowDiagramNode" as const,
      body: "After the job is complete, we'll advise your insurance company and they'll release any recoverable depreciation. Those payments are due to Birdcreek Roofing when you receive them.",
      stepId: "8",
      subsections: [
        {
          _key: "wf-step-8-sub-1",
          _type: "workflowDiagramNodeSubsection" as const,
          body: "If we find additional work that wasn't in the original estimate, with your permission we'll request coverage from the insurance company. They'll send you a separate check (a supplement). That check is due to Birdcreek Roofing when you receive it.",
          title: "Additional Insurance Payments (Supplements)",
        },
      ],
      title: "Work Complete / Payment Due",
      wide: true,
    },
  ],
  pageLede:
    "Here's how I walk homeowners through a storm or insurance claim with Birdcreek Roofing—from the first inspection to the last check.",
  pageTitle: "Insurance Claim Workflow",
  seoDescription:
    "Step-by-step overview of the Birdcreek Roofing insurance claim process—from inspection through installation and final payment.",
  seoTitle: "Insurance Claim Workflow | Tandra Peters",
  viewportAnchorX: 60,
  viewportAnchorY: 60,
  viewportZoom: 0.85,
};

export const homePageSeed = {
  _id: "homePage",
  _type: "homePage" as const,
  about: {
    _type: "aboutSection" as const,
    badgeSubtext: "Industry Expertise",
    badgeText: "5+ YEARS",
    body: blocksFromParagraphs(
      [
        "Tandra Peters is an Austin, Texas roofing consultant who translates complex roof science into decisions homeowners can trust. She focuses on what matters for durability, warranty coverage, and long-term value—not quick sales pitches.",
        "As a Birdcreek Roofing consultant, her recommendations sit inside the same company that performs the work—so there is a straight line from advice to professional installation and project management. Her approach is personal and practical, helping homeowners understand what matters now, what can wait, and what will protect their home for the long haul.",
      ],
      "about-body"
    ),
    titleLine1: "Precision.",
    titleLine2: "Integrity.",
  },
  articlesTeaser: {
    _type: "articlesTeaserSection" as const,
    articles: homePageArticleReferences(),
    eyebrow: "Guides & insights",
    intro: blocksFromParagraphs(
      [
        "Latest guides on replacement, insurance, and caring for your Texas roof.",
      ],
      "articles-intro"
    ),
    maxPosts: 8,
    title: "Roofing articles",
    viewAllLabel: "View all articles",
  },
  contact: {
    _type: "contactSection" as const,
    email: "tandra@birdcreekroofing.com",
    emailInfoLabel: "Email",
    location: "Austin, Texas",
    locationInfoLabel: "Location",
    phone: "(512) 968-3965",
    phoneInfoLabel: "Phone",
    tagline: "Contact the consultant",
    title: "Request a free roofing consultation in Austin or statewide.",
  },
  expertise: {
    _type: "expertiseSection" as const,
    items: [
      {
        _key: "e1",
        _type: "expertiseItem" as const,
        desc: blocksFromParagraphs(
          [
            "Guidance on shingle grades, ventilation, flashing details, and when repair versus full replacement is the smarter investment—especially before you file an insurance claim.",
          ],
          "exp-e1-desc"
        ),
        id: "01",
        title: "Asphalt shingle roofs",
      },
      {
        _key: "e2",
        _type: "expertiseItem" as const,
        desc: blocksFromParagraphs(
          [
            "Help comparing standing seam versus exposed-fastener systems, coating longevity, wind ratings, and how metal performs in Texas heat and hail-prone seasons.",
          ],
          "exp-e2-desc"
        ),
        id: "02",
        title: "Metal roofing",
      },
      {
        _key: "e3",
        _type: "expertiseItem" as const,
        desc: blocksFromParagraphs(
          [
            "Coordination support for low-slope assemblies, maintenance planning, capital budgets, and contractor scope reviews on larger buildings—not just residential tear-offs.",
          ],
          "exp-e3-desc"
        ),
        id: "03",
        title: "Commercial roofing",
      },
      {
        _key: "e4",
        _type: "expertiseItem" as const,
        desc: blocksFromParagraphs(
          [
            "Document storm impact, interpret adjuster findings, and build a clear scope of work so repairs restore weather-tight performance—not just cosmetic patches.",
          ],
          "exp-e4-desc"
        ),
        id: "04",
        title: "Hail & storm damage",
      },
    ],
    tagline: "Roof types & scenarios",
    title: "Consulting expertise by system.",
  },
  faq: {
    _type: "faqSection" as const,
    intro: blocksFromParagraphs(
      [
        "Straight answers from me—how I work with homeowners, insurance, Birdcreek Roofing, and how to reach out.",
      ],
      "faq-intro"
    ),
    items: [
      {
        _key: "f1",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "I help you understand what’s really going on with your roof—what the inspection means, whether repair or replacement makes sense, and how to think about materials, scope, and timing. I focus on clear, practical guidance so you can decide with confidence instead of feeling rushed or confused.",
          ],
          "faq-f1-ans"
        ),
        question: "What does a roofing consultant do?",
      },
      {
        _key: "f2",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "I’m a Birdcreek Roofing consultant—I work for Birdcreek, not as a separate outside advisor. So instead of vetting random crews or piecing together bids on your own, you come in through Birdcreek with someone whose job is to explain your roof, your options, and the paperwork in plain language, and to stay involved with oversight while our team handles installation to Birdcreek standards.",
          ],
          "faq-f2-ans"
        ),
        question:
          "How is working with you different from hiring a roofer directly?",
      },
      {
        _key: "f3",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "Yes. I help with claim advocacy—walking through carrier questions, reading estimates with you, and pushing for fair coverage when it’s appropriate. Outcomes always depend on your policy and carrier, but you won’t be navigating it alone.",
          ],
          "faq-f3-ans"
        ),
        question: "Do you help with homeowners insurance claims?",
      },
      {
        _key: "f4",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "I’m based in Austin and work with homeowners and property owners across the region and much of Texas. If you’re not sure your area is covered, message me through the contact form or call—we can confirm.",
          ],
          "faq-f4-ans"
        ),
        question: "What areas do you serve?",
      },
      {
        _key: "f5",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "I consult on what I see most at home—especially asphalt shingles and metal—as well as commercial projects and storm or hail damage. Every house is different; I tailor how deep we go to your roof type, its age, and what you’re trying to accomplish.",
          ],
          "faq-f5-ans"
        ),
        question: "What types of roofs do you consult on?",
      },
      {
        _key: "f6",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "Tap Schedule a Free Consultation in the navigation, or scroll to the contact section and send your name, email, what you need, and a short note. You can also call or email me directly—both are on the contact page.",
          ],
          "faq-f6-ans"
        ),
        question: "How do I schedule a free consultation?",
      },
      {
        _key: "f7",
        _type: "faqItem" as const,
        answer: blocksFromParagraphs(
          [
            "Birdcreek Roofing is Austin’s premier roofing firm, and they’re my employer. I consult inside that model, so what I share with you lines up with the same crews, warranties, and quality standards we stand behind from assessment through installation.",
          ],
          "faq-f7-ans"
        ),
        question: "What is Birdcreek Roofing’s role?",
      },
    ],
    tagline: "Questions & answers",
    title: "Frequently asked questions",
  },
  hero: {
    _type: "heroSection" as const,
    badge: "Birdcreek Roofing consultant · Austin, TX",
    ctaHref: "#contact",
    ctaText: "Schedule a Free Consultation",
    secondaryCtaHref: "#services",
    secondaryCtaText: "Explore Services",
    subtitle: blocksFromParagraphs(
      [
        "Work with an Austin-based roofing consultant for roof assessments, insurance guidance, and careful project oversight—backed by Birdcreek Roofing, one of Central Texas’s most trusted installation teams. Voted Best Roofer in Central Texas 7 years in a row.",
      ],
      "hero-subtitle"
    ),
    titleLine1: "Your Roof.",
    titleLine2: "Our Expertise.",
  },
  marquee: {
    _type: "marqueeSection" as const,
    direction: "right",
    text: "Amarillo - Canyon - Lubbock - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin - Surrounding Areas - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin & Surrounding Areas -",
    velocity: 80,
  },
  mission: {
    _type: "missionSection" as const,
    description: blocksFromParagraphs(
      [
        "Birdcreek Roofing’s consultant team has earned national recognition for customer care and consistent workmanship. That same service mindset guides every homeowner interaction—whether you are in Austin, elsewhere in Texas, or coordinating a complex project from out of state.",
      ],
      "mission-desc"
    ),
    tagline: "Our Mission",
    title: blocksFromParagraphs(
      ["The vision we set out with has now impacted over 20,000 homeowners."],
      "mission-title"
    ),
    values: [
      {
        _key: "m1",
        _type: "missionValue" as const,
        description: blocksFromParagraphs(
          [
            "We choose to be generous with the time we invest with our customers, and their homes. We are generous with our team members, in the communities we call home.",
          ],
          "mission-val-m1-desc"
        ),
        id: "01",
        title: "Generous",
      },
      {
        _key: "m2",
        _type: "missionValue" as const,
        description: blocksFromParagraphs(
          [
            "We choose to be optimistic in how we see every interaction and opportunity. We choose to believe the best in others.",
          ],
          "mission-val-m2-desc"
        ),
        id: "02",
        title: "Optimistic",
      },
      {
        _key: "m3",
        _type: "missionValue" as const,
        description: blocksFromParagraphs(
          [
            "We are driven each year to help more Texas homeowners with unparalleled customer service. We are committed to an experience and service that you will want to tell others about.",
          ],
          "mission-val-m3-desc"
        ),
        id: "03",
        title: "Driven",
      },
    ],
  },
  services: {
    _type: "servicesSection" as const,
    birdcreekAdvantage: {
      _type: "birdcreekAdvantageCard" as const,
      ctaHref: "https://birdcreekroofing.com",
      ctaLabel: "Learn More",
      description: blocksFromParagraphs(
        [
          "Direct access to Austin's premier roofing firm, combining Tandra's consultation with Birdcreek's legendary execution.",
        ],
        "services-birdcreek-advantage-desc"
      ),
      title: "The Birdcreek Advantage",
    },
    description: blocksFromParagraphs(
      [
        "From detailed roof inspections and documentation to insurance claim advocacy and on-site project oversight, you get a Birdcreek Roofing consultant who speaks both homeowner and crew—so education, advocacy, and installation stay under one trusted roof.",
      ],
      "services-section-desc"
    ),
    services: [
      {
        _key: "s1",
        _type: "serviceCard" as const,
        description: blocksFromParagraphs(
          [
            "On-site and photo-based review of your roof system: decking, flashing, ventilation, and drainage—documented so you understand what is urgent, what can wait, and what to discuss with insurers or contractors.",
          ],
          "svc-card-01-desc"
        ),
        icon: "search",
        id: "01",
        title: "Comprehensive Roof Assessment",
      },
      {
        _key: "s2",
        _type: "serviceCard" as const,
        description: blocksFromParagraphs(
          [
            "Help organizing claim paperwork, interpreting adjuster estimates, and advocating for scopes that match real damage—so you are not left under-covered on a major asset.",
          ],
          "svc-card-02-desc"
        ),
        icon: "page",
        id: "02",
        title: "Insurance Claim Advocacy",
      },
      {
        _key: "s3",
        _type: "serviceCard" as const,
        description: blocksFromParagraphs(
          [
            "Site visits, quality checkpoints, and clear communication from tear-off through final walkthrough, aligned with Birdcreek Roofing crews so the roof you approved is the roof you receive.",
          ],
          "svc-card-03-desc"
        ),
        icon: "shieldCheck",
        id: "03",
        title: "Project Oversight",
      },
    ],
    tagline: "Roofing consulting services",
    titleLines: ["Consultation.", "Precision.", "Execution."],
    typographicArt: {
      _type: "object",
    },
  },
  socialShare: {
    _type: "socialShareSection" as const,
    heading: "Know someone who needs roofing help?",
    shareText: blocksFromParagraphs(
      [
        "Tandra Peters | Birdcreek Roofing consultant in Austin — assessments, insurance help, trusted installation",
      ],
      "social-share-text"
    ),
  },
  stats: {
    _type: "statsSection" as const,
    items: [
      {
        _key: "st1",
        _type: "statRow" as const,
        icon: "homeUser",
        name: "Customers",
        value: "24,999",
      },
      {
        _key: "st2",
        _type: "statRow" as const,
        icon: "badgeCheck",
        name: "Re-Roofs",
        value: "18,137",
      },
      {
        _key: "st3",
        _type: "statRow" as const,
        icon: "badgeCheck",
        name: "Repairs",
        value: "6,862",
      },
    ],
    title: "Birdcreek Roofing in Austin",
  },
  testimonials: {
    _type: "testimonialsSection" as const,
    elfsightWidgetId: "",
  },
};

/** /roof-inspections singleton — mirrors homePage.roofInspection hotspot coords. */
export const roofInspectionsPageSeed = {
  _id: "roofInspectionsPage",
  _type: "roofInspectionsPage" as const,
  roofInspection: {
    _type: "roofInspectionSection" as const,
    hotspots: [
      {
        _key: "ri-ridge",
        _type: "roofInspectionHotspot" as const,
        calloutBody:
          "The peak. Caps are heavier than field shingles — wind hits hardest here and the ridge is the last line of defence. The slot underneath is the ridge vent: that's how your attic breathes out in summer.",
        calloutTitle: "Ridge cap & vent",
        direction: "right",
        label: "Ridge & ridge vent",
        norm3dX: -0.316228,
        norm3dY: 0,
        norm3dZ: 0.948683,
        pos3dX: 5.211335,
        pos3dY: 4.013102,
        pos3dZ: -3.949578,
        watchFor:
          "Lifted or buckling caps after a windstorm. A vent that was painted shut during the last re-roof.",
      },
      {
        _key: "ri-field",
        _type: "roofInspectionHotspot" as const,
        calloutBody:
          "The main course. Most Texas roofs are architectural asphalt — heavier than three-tab, rated 110+ mph when nailed correctly. What you're looking at is the granular surface that takes the UV hit every summer.",
        calloutTitle: "Field shingles",
        direction: "left",
        label: "Field shingles",
        norm3dX: -0.316228,
        norm3dY: 0,
        norm3dZ: 0.948683,
        pos3dX: 4.136282,
        pos3dY: 3.654751,
        pos3dZ: -3.125723,
        watchFor:
          "Bare patches where granules washed into the gutters. Sun age, not always storm damage.",
      },
      {
        _key: "ri-underlayment",
        _type: "roofInspectionHotspot" as const,
        calloutBody:
          "The layer between shingles and decking — only visible at the cut face or during a tear-off. Synthetic beats old #15 felt: tougher, lighter, won't shred if wind catches it mid-install.",
        calloutTitle: "Underlayment",
        direction: "right",
        label: "Underlayment",
        norm3dX: 0,
        norm3dY: 1,
        norm3dZ: 0,
        pos3dX: 4.002597,
        pos3dY: 3.622813,
        pos3dZ: -4.374255,
        watchFor:
          "Whether your installer is using the manufacturer's matched underlayment system. Mix brands and the warranty thins fast.",
      },
      {
        _key: "ri-sheathing",
        _type: "roofInspectionHotspot" as const,
        calloutBody:
          "Plywood or OSB nailed to the rafters. You only see it during a tear-off — and that's the moment to check for soft boards. A soft board telegraphs right through the new roof within a year.",
        calloutTitle: "Sheathing",
        direction: "left",
        label: "Sheathing",
        norm3dX: -0.416228,
        norm3dY: 0,
        norm3dZ: 0.948683,
        pos3dX: 4.215053,
        pos3dY: 3.735961,
        pos3dZ: -2.873327,
        watchFor:
          'A contract that includes decking replacement at cost per sheet, not a vague "as needed" line that turns into a surprise.',
      },
      {
        _key: "ri-drip",
        _type: "roofInspectionHotspot" as const,
        calloutBody:
          "The metal that runs along the eave and rakes, kicking water away from the fascia into the gutter. Code in Texas. Skipped on more cheap re-roofs than I'd like to count.",
        calloutTitle: "Drip edge",
        direction: "top",
        label: "Drip edge",
        norm3dX: -0.936229,
        norm3dY: 0,
        norm3dZ: -0.35139,
        pos3dX: 2.676776,
        pos3dY: 3.153818,
        pos3dZ: -3.459617,
        watchFor:
          "Stain lines on the fascia board below — water's been running where it shouldn't.",
      },
      {
        _key: "ri-soffit",
        _type: "roofInspectionHotspot" as const,
        calloutBody:
          "The boards you see from the driveway — fascia in front, soffit underneath. Soffit vents are how cool air enters the attic; without them the ridge vent has nothing to pull through.",
        calloutTitle: "Soffit & fascia",
        direction: "left",
        label: "Soffit & fascia",
        norm3dX: -1,
        norm3dY: 0,
        norm3dZ: 0,
        pos3dX: 2.786666,
        pos3dY: 3.137488,
        pos3dZ: -4.41213,
        watchFor:
          "Painted-over soffit vents, wasp nests at the corners, or wood that gives under a fingernail.",
      },
    ],
    kicker: "Roof Basics",
    lede: "You don't need to be a roofer to know what you're looking at — just someone who'll point out the seven places that matter. Hover any number on the photo.",
    subtitle: "Seven things I check on every roof.",
    titleLine1: "The",
    titleLine2: "Inspection.",
  },
  seoDescription:
    "Walk through the seven places I check on every residential roof — ridge, field shingles, underlayment, sheathing, drip edge, and soffit & fascia.",
  seoTitle: "Roof Inspection | Tandra Peters",
};
