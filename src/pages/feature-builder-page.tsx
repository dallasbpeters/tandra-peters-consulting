import type { AgentConfig } from "./agent-chat-page";
import { AgentChatPage } from "./agent-chat-page";

const FEATURE_BUILDER_CONFIG: AgentConfig = {
  agentSlug: "feature-builder",
  emptyBody:
    "Ask me to plan a new feature — I'll inspect the live schema and propose schema types, component structure, and a step-by-step implementation checklist.",
  emptyIcon: "🏗️",
  emptyTitle: "What would you like to build?",
  endpoint: "/api/feature-agent",
  eyebrow: "Tandra.me",
  inputPlaceholder: "Describe a feature or ask about the schema…",
  pageDescription:
    "AI-powered feature planning assistant for the tandra.me website.",
  pageTitle: "Feature Builder | Tandra Peters",
  starterPrompts: [
    "Add a Testimonials section",
    "Plan a blog with Sanity posts",
    "Design a before/after gallery schema",
    "Add a service-area landing page",
    "Create a FAQ schema and component",
  ] as const,
  subtitle:
    "Plan new website sections, schema changes, and implementation steps — powered by your live Sanity content model.",
  title: "Feature Builder",
};

export const FeatureBuilderPage = () => (
  <AgentChatPage config={FEATURE_BUILDER_CONFIG} />
);
