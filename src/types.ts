import React from "react";

export interface NavItem {
  name: string;
  href: string;
}

export interface NavProps {
  logoText?: string;
  logoTagline?: string;
  navItems?: NavItem[];
  ctaText?: string;
  ctaHref?: string;
  imageSrc?: string;
}

export interface HeroProps {
  title?: React.ReactNode;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundImage?: string;
}

export interface Partner {
  name: string;
  icon: React.ElementType;
}

export interface PartnersProps {
  title?: string;
  partners?: Partner[];
}

export interface AboutProps {
  badgeText?: string;
  badgeSubtext?: string;
  imageSrc?: string;
  tagline?: string;
  title?: React.ReactNode;
  paragraphs?: string[];
  linkText?: string;
  linkHref?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  image?: string;
}
export interface Mission {
  id: string;
  title: string;
  description: string;
  icon?: React.ElementType;
  image?: string;
}

export interface MissionProps {
  tagline?: string;
  title?: React.ReactNode;
  description?: string;
  services?: Mission[];
}

export interface ServicesProps {
  tagline?: string;
  title?: React.ReactNode;
  description?: string;
  services?: Service[];
}

export interface ExpertiseItem {
  id: string;
  title: string;
  desc: string;
  /** Path under `/public`, e.g. `/roof-2.jpg` */
  image: string;
}

export interface ExpertiseProps {
  tagline?: string;
  title?: string;
  items?: ExpertiseItem[];
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  image: string;
}

export interface TestimonialsProps {
  tagline?: string;
  title?: string;
  testimonials?: Testimonial[];
}

export interface ContactInfo {
  icon: React.ElementType;
  label: string;
  value: string;
}

export interface ContactServiceOption {
  value: string;
  label: string;
}

export interface ContactProps {
  tagline?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  /** Defaults to shared roofing options from `contactServiceOptions.ts` */
  serviceOptions?: readonly ContactServiceOption[];
  contactInfo?: ContactInfo[];
  formLabels?: {
    name?: string;
    email?: string;
    service?: string;
    property?: string;
    message?: string;
    button?: string;
  };
}

export interface FooterProps {
  logoText?: string;
  description?: string;
  socialLinks?: { icon: React.ElementType; href: string }[];
  quickLinks?: NavItem[];
  legalLinks?: NavItem[];
  newsletterTitle?: string;
  newsletterDesc?: string;
  copyrightText?: string;
  partnerText?: string;
}

export interface SocialShareBarProps {
  heading?: string;
  /** Line used in Twitter intent and email subject/body context */
  shareText?: string;
}

export interface FaqItem {
  question: string;
  /** Plain text for visible copy and FAQPage JSON-LD */
  answer: string;
}

export interface FaqProps {
  tagline?: string;
  title?: string;
  intro?: string;
  items?: FaqItem[];
}
