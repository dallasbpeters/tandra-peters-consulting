import { AgentChatPage, type AgentConfig } from "./AgentChatPage";

const FEATURE_BUILDER_CONFIG: AgentConfig = {
  endpoint: "/api/feature-agent",
  agentSlug: "feature-builder",
  pageTitle: "Feature Builder | Tandra Peters",
  pageDescription: "AI-powered feature planning assistant for the tandra.me website.",
  eyebrow: "Tandra.me",
  title: "Feature Builder",
  subtitle:
    "Plan new website sections, schema changes, and implementation steps — powered by your live Sanity content model.",
  emptyIcon: "🏗️",
  emptyTitle: "What would you like to build?",
  emptyBody:
    "Ask me to plan a new feature — I'll inspect the live schema and propose schema types, component structure, and a step-by-step implementation checklist.",
  inputPlaceholder: "Describe a feature or ask about the schema…",
  starterPrompts: [
    "Add a Testimonials section",
    "Plan a blog with Sanity posts",
    "Design a before/after gallery schema",
    "Add a service-area landing page",
    "Create a FAQ schema and component",
  ] as const,
};

export const FeatureBuilderPage = () => <AgentChatPage config={FEATURE_BUILDER_CONFIG} />;
