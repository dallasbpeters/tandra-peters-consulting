import {postType} from './postType'
import {blockContentType} from './objects/blockContent'
import {navLinkType} from './objects/navLink'
import {socialLinkType} from './objects/socialLink'
import {serviceCardType} from './objects/serviceCard'
import {missionValueType} from './objects/missionValue'
import {expertiseItemType} from './objects/expertiseItem'
import {faqItemType} from './objects/faqItem'
import {statRowType} from './objects/statRow'
import {
  heroSectionType,
  marqueeSectionType,
  aboutSectionType,
  statsSectionType,
  servicesSectionType,
  missionSectionType,
  expertiseSectionType,
  testimonialsSectionType,
  faqSectionType,
  contactSectionType,
  socialShareSectionType,
  articlesTeaserSectionType,
} from './homePageSections'
import {siteSettingsType} from './documents/siteSettings'
import {homePageType} from './documents/homePage'
import {articlesPageType} from './documents/articlesPage'

export const schemaTypes = [
  blockContentType,
  navLinkType,
  socialLinkType,
  serviceCardType,
  missionValueType,
  expertiseItemType,
  faqItemType,
  statRowType,
  heroSectionType,
  marqueeSectionType,
  aboutSectionType,
  statsSectionType,
  servicesSectionType,
  missionSectionType,
  expertiseSectionType,
  testimonialsSectionType,
  faqSectionType,
  contactSectionType,
  socialShareSectionType,
  articlesTeaserSectionType,
  siteSettingsType,
  homePageType,
  articlesPageType,
  postType,
]
