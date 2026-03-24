/** Default homepage + site settings — text + structure; images are attached in `seed.ts` via asset upload. */

import {homePageArticleReferences} from './articlePostsSeed'
import {blocksFromParagraphs} from './blocksFromText'

/** Nav logo source for seed upload (Google profile / brand image). */
export const siteSettingsNavLogoImageUrl =
  'https://lh3.googleusercontent.com/aida/ADBb0ujNxdAxaY1-ObgML2j-2_hQEat6D2y2JOsW0G-Nn8gEMYt8QMH7U-Mp2gVevbXa84NvM7lJlcHVvIjXYcDfZe9_-fp1a7L4EQMVBGE2ktk3dY-MipPdQrQxytiQHnu8Nk_rnwybn1BLOrZj6dHzlyB7eB5gEeCuXGlrZLwUbtJYNj519phafs2-Nn7eLvREdzsUNRz3p161dSRwqxjoy-whIG9170-WCK-SXsooTmYMrlWKh8nKBBZ6g1mLjaCetu1MTSg-G4xiuw'

export const siteSettingsSeed = {
  _id: 'siteSettings',
  _type: 'siteSettings' as const,
  navLogoText: 'Tandra Peters',
  navLogoTagline: 'Roofing Consultant',
  navItems: [
    {name: 'Services', href: '#services'},
    {name: 'About Tandra', href: '#about-tandra'},
    {name: 'Articles', href: '/articles'},
    {name: 'Testimonials', href: '#testimonials'},
    {name: 'FAQ', href: '#faq'},
    {name: 'Contact', href: '#contact'},
  ],
  navCtaText: 'Schedule a Free Consultation',
  navCtaHref: '#contact',
  footerLogoText: 'Tandra Peters',
  footerDescription: blocksFromParagraphs(
    [
      'Austin roofing consultant for roof assessments, insurance claim support, and end-to-end project oversight—paired with BirdCreek Roofing for trusted installation across Texas.',
    ],
    'footer-desc',
  ),
  footerQuickLinks: [
    {name: 'Services', href: '#services'},
    {name: 'About Tandra', href: '#about-tandra'},
    {name: 'Articles', href: '/articles'},
    {name: 'Testimonials', href: '#testimonials'},
    {name: 'FAQ', href: '#faq'},
    {name: 'Contact', href: '#contact'},
  ],
  footerLegalLinks: [
    {name: 'Privacy Policy', href: '/privacy'},
    {name: 'Terms of Service', href: '/terms'},
    {name: 'Cookie Policy', href: '/cookies'},
  ],
  footerSocialLinks: [
    {platform: 'instagram', url: 'https://www.instagram.com/tandra/'},
    {platform: 'linkedin', url: 'https://www.linkedin.com/in/tandra-peters-b8b38026/'},
    {platform: 'facebook', url: 'https://www.facebook.com/tandra.peters.3'},
  ],
  footerCopyrightText: '© 2026 Tandra Peters. All Rights Reserved.',
  footerPartnerText: 'BirdCreek Roofing',
}

export const articlesPageSeed = {
  _id: 'articlesPage',
  _type: 'articlesPage' as const,
  pageTitle: 'Articles',
  intro: blocksFromParagraphs(
    [
      'Practical guides on roof replacement, inspections, insurance, and Texas weather—written from a consultant perspective aligned with BirdCreek Roofing’s homeowner-first process.',
    ],
    'articles-intro',
  ),
}

export const homePageSeed = {
  _id: 'homePage',
  _type: 'homePage' as const,
  hero: {
    _type: 'heroSection' as const,
    badge: 'BirdCreek Roofing consultant · Austin, TX',
    titleLine1: 'Your Roof.',
    titleLine2: 'Our Expertise.',
    subtitle: blocksFromParagraphs(
      [
        'Work with an Austin-based roofing consultant for roof assessments, insurance guidance, and careful project oversight—backed by BirdCreek Roofing, one of Central Texas’s most trusted installation teams. Voted Best Roofer in Central Texas 7 years in a row.',
      ],
      'hero-subtitle',
    ),
    ctaText: 'Schedule a Free Consultation',
    ctaHref: '#contact',
    secondaryCtaText: 'Explore Services',
    secondaryCtaHref: '#services',
  },
  marquee: {
    _type: 'marqueeSection' as const,
    text: 'Amarillo - Canyon - Lubbock - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin - Surrounding Areas - San Antonio - Kerrville - Belton - Temple - Waco - Fort Worth - Austin & Surrounding Areas -',
    direction: 'right',
    velocity: 80,
  },
  about: {
    _type: 'aboutSection' as const,
    badgeText: '5+ YEARS',
    badgeSubtext: 'Industry Expertise',
    titleLine1: 'Precision.',
    titleLine2: 'Integrity.',
    body: blocksFromParagraphs(
      [
        'Tandra Peters is an Austin, Texas roofing consultant who translates complex roof science into decisions homeowners can trust. She focuses on what matters for durability, warranty coverage, and long-term value—not quick sales pitches.',
        'As a BirdCreek Roofing consultant, her recommendations sit inside the same company that performs the work—so there is a straight line from advice to professional installation and project management. Her Architectural Advisor approach treats every roof as both a structural system and a major financial asset you will live with for decades.',
      ],
      'about-body',
    ),
  },
  stats: {
    _type: 'statsSection' as const,
    title: 'BirdCreek Roofing in Austin',
    items: [
      {
        _type: 'statRow' as const,
        _key: 'st1',
        name: 'Customers',
        value: '24,999',
        icon: 'homeUser',
      },
      {
        _type: 'statRow' as const,
        _key: 'st2',
        name: 'Re-Roofs',
        value: '18,137',
        icon: 'badgeCheck',
      },
      {
        _type: 'statRow' as const,
        _key: 'st3',
        name: 'Repairs',
        value: '6,862',
        icon: 'badgeCheck',
      },
    ],
  },
  services: {
    _type: 'servicesSection' as const,
    tagline: 'Roofing consulting services',
    titleLines: ['Consultation.', 'Precision.', 'Execution.'],
    description: blocksFromParagraphs(
      [
        'From detailed roof inspections and documentation to insurance claim advocacy and on-site project oversight, you get a BirdCreek Roofing consultant who speaks both homeowner and crew—so education, advocacy, and installation stay under one trusted roof.',
      ],
      'services-section-desc',
    ),
    services: [
      {
        _type: 'serviceCard' as const,
        _key: 's1',
        id: '01',
        title: 'Comprehensive Roof Assessment',
        description: blocksFromParagraphs(
          [
            'On-site and photo-based review of your roof system: decking, flashing, ventilation, and drainage—documented so you understand what is urgent, what can wait, and what to discuss with insurers or contractors.',
          ],
          'svc-card-01-desc',
        ),
        icon: 'search',
      },
      {
        _type: 'serviceCard' as const,
        _key: 's2',
        id: '02',
        title: 'Insurance Claim Advocacy',
        description: blocksFromParagraphs(
          [
            'Help organizing claim paperwork, interpreting adjuster estimates, and advocating for scopes that match real damage—so you are not left under-covered on a major asset.',
          ],
          'svc-card-02-desc',
        ),
        icon: 'page',
      },
      {
        _type: 'serviceCard' as const,
        _key: 's3',
        id: '03',
        title: 'Project Oversight',
        description: blocksFromParagraphs(
          [
            'Site visits, quality checkpoints, and clear communication from tear-off through final walkthrough, aligned with BirdCreek Roofing crews so the roof you approved is the roof you receive.',
          ],
          'svc-card-03-desc',
        ),
        icon: 'shieldCheck',
      },
    ],
    birdcreekAdvantage: {
      _type: 'birdcreekAdvantageCard' as const,
      title: 'The BirdCreek Advantage',
      description: blocksFromParagraphs(
        [
          "Direct access to Austin's premier roofing firm, combining Tandra's consultation with BirdCreek's legendary execution.",
        ],
        'services-birdcreek-advantage-desc',
      ),
      ctaLabel: 'Learn More',
      ctaHref: 'https://birdcreekroofing.com',
    },
  },
  mission: {
    _type: 'missionSection' as const,
    tagline: 'Our Mission',
    title: blocksFromParagraphs(
      ['The vision we set out with has now impacted over 20,000 homeowners.'],
      'mission-title',
    ),
    description: blocksFromParagraphs(
      [
        'BirdCreek Roofing’s consultant team has earned national recognition for customer care and consistent workmanship. That same service mindset guides every homeowner interaction—whether you are in Austin, elsewhere in Texas, or coordinating a complex project from out of state.',
      ],
      'mission-desc',
    ),
    values: [
      {
        _type: 'missionValue' as const,
        _key: 'm1',
        id: '01',
        title: 'Generous',
        description: blocksFromParagraphs(
          [
            'We choose to be generous with the time we invest with our customers, and their homes. We are generous with our team members, in the communities we call home.',
          ],
          'mission-val-m1-desc',
        ),
      },
      {
        _type: 'missionValue' as const,
        _key: 'm2',
        id: '02',
        title: 'Optimistic',
        description: blocksFromParagraphs(
          [
            'We choose to be optimistic in how we see every interaction and opportunity. We choose to believe the best in others.',
          ],
          'mission-val-m2-desc',
        ),
      },
      {
        _type: 'missionValue' as const,
        _key: 'm3',
        id: '03',
        title: 'Driven',
        description: blocksFromParagraphs(
          [
            'We are driven each year to help more Texas homeowners with unparalleled customer service. We are committed to an experience and service that you will want to tell others about.',
          ],
          'mission-val-m3-desc',
        ),
      },
    ],
  },
  expertise: {
    _type: 'expertiseSection' as const,
    tagline: 'Roof types & scenarios',
    title: 'Consulting expertise by system.',
    items: [
      {
        _type: 'expertiseItem' as const,
        _key: 'e1',
        id: '01',
        title: 'Asphalt shingle roofs',
        desc: blocksFromParagraphs(
          [
            'Guidance on shingle grades, ventilation, flashing details, and when repair versus full replacement is the smarter investment—especially before you file an insurance claim.',
          ],
          'exp-e1-desc',
        ),
      },
      {
        _type: 'expertiseItem' as const,
        _key: 'e2',
        id: '02',
        title: 'Metal roofing',
        desc: blocksFromParagraphs(
          [
            'Help comparing standing seam versus exposed-fastener systems, coating longevity, wind ratings, and how metal performs in Texas heat and hail-prone seasons.',
          ],
          'exp-e2-desc',
        ),
      },
      {
        _type: 'expertiseItem' as const,
        _key: 'e3',
        id: '03',
        title: 'Commercial roofing',
        desc: blocksFromParagraphs(
          [
            'Coordination support for low-slope assemblies, maintenance planning, capital budgets, and contractor scope reviews on larger buildings—not just residential tear-offs.',
          ],
          'exp-e3-desc',
        ),
      },
      {
        _type: 'expertiseItem' as const,
        _key: 'e4',
        id: '04',
        title: 'Hail & storm damage',
        desc: blocksFromParagraphs(
          [
            'Document storm impact, interpret adjuster findings, and build a clear scope of work so repairs restore weather-tight performance—not just cosmetic patches.',
          ],
          'exp-e4-desc',
        ),
      },
    ],
  },
  testimonials: {
    _type: 'testimonialsSection' as const,
    elfsightWidgetId: '',
  },
  faq: {
    _type: 'faqSection' as const,
    tagline: 'Questions & answers',
    title: 'Frequently asked questions',
    intro: blocksFromParagraphs(
      [
        'Straight answers from me—how I work with homeowners, insurance, BirdCreek Roofing, and how to reach out.',
      ],
      'faq-intro',
    ),
    items: [
      {
        _type: 'faqItem' as const,
        _key: 'f1',
        question: 'What does a roofing consultant do?',
        answer: blocksFromParagraphs(
          [
            'I help you understand what’s really going on with your roof—what the inspection means, whether repair or replacement makes sense, and how to think about materials, scope, and timing. I focus on clear, architecture-minded guidance so you can decide with confidence instead of feeling rushed or confused.',
          ],
          'faq-f1-ans',
        ),
      },
      {
        _type: 'faqItem' as const,
        _key: 'f2',
        question: 'How is working with you different from hiring a roofer directly?',
        answer: blocksFromParagraphs(
          [
            'I’m a BirdCreek Roofing consultant—I work for BirdCreek, not as a separate outside advisor. So instead of vetting random crews or piecing together bids on your own, you come in through BirdCreek with someone whose job is to explain your roof, your options, and the paperwork in plain language, and to stay involved with oversight while our team handles installation to BirdCreek standards.',
          ],
          'faq-f2-ans',
        ),
      },
      {
        _type: 'faqItem' as const,
        _key: 'f3',
        question: 'Do you help with homeowners insurance claims?',
        answer: blocksFromParagraphs(
          [
            'Yes. I help with claim advocacy—walking through carrier questions, reading estimates with you, and pushing for fair coverage when it’s appropriate. Outcomes always depend on your policy and carrier, but you won’t be navigating it alone.',
          ],
          'faq-f3-ans',
        ),
      },
      {
        _type: 'faqItem' as const,
        _key: 'f4',
        question: 'What areas do you serve?',
        answer: blocksFromParagraphs(
          [
            'I’m based in Austin and work with homeowners and property owners across the region and much of Texas. If you’re not sure your area is covered, message me through the contact form or call—we can confirm.',
          ],
          'faq-f4-ans',
        ),
      },
      {
        _type: 'faqItem' as const,
        _key: 'f5',
        question: 'What types of roofs do you consult on?',
        answer: blocksFromParagraphs(
          [
            'I consult on what I see most at home—especially asphalt shingles and metal—as well as commercial projects and storm or hail damage. Every house is different; I tailor how deep we go to your roof type, its age, and what you’re trying to accomplish.',
          ],
          'faq-f5-ans',
        ),
      },
      {
        _type: 'faqItem' as const,
        _key: 'f6',
        question: 'How do I schedule a free consultation?',
        answer: blocksFromParagraphs(
          [
            'Tap Schedule a Free Consultation in the navigation, or scroll to the contact section and send your name, email, what you need, and a short note. You can also call or email me directly—both are on the contact page.',
          ],
          'faq-f6-ans',
        ),
      },
      {
        _type: 'faqItem' as const,
        _key: 'f7',
        question: 'What is BirdCreek Roofing’s role?',
        answer: blocksFromParagraphs(
          [
            'BirdCreek Roofing is Austin’s premier roofing firm, and they’re my employer. I consult inside that model, so what I share with you lines up with the same crews, warranties, and quality standards we stand behind from assessment through installation.',
          ],
          'faq-f7-ans',
        ),
      },
    ],
  },
  articlesTeaser: {
    _type: 'articlesTeaserSection' as const,
    eyebrow: 'Guides & insights',
    title: 'Roofing articles',
    intro: blocksFromParagraphs(
      [
        'Latest guides on replacement, insurance, and caring for your Texas roof.',
      ],
      'articles-intro',
    ),
    viewAllLabel: 'View all articles',
    articles: homePageArticleReferences(),
    maxPosts: 8,
  },
  contact: {
    _type: 'contactSection' as const,
    tagline: 'Contact the consultant',
    title: 'Request a free roofing consultation in Austin or statewide.',
    email: 'tandra@birdcreekroofing.com',
    phone: '(512) 968-3965',
    location: 'Austin, Texas',
  },
  socialShare: {
    _type: 'socialShareSection' as const,
    heading: 'Know someone who needs roofing help?',
    shareText: blocksFromParagraphs(
      [
        'Tandra Peters | BirdCreek Roofing consultant in Austin — assessments, insurance help, trusted installation',
      ],
      'social-share-text',
    ),
  },
}
