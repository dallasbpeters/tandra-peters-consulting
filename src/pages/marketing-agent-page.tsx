import type { AgentConfig } from "./agent-chat-page";
import { AgentChatPage } from "./agent-chat-page";

const MARKETING_AGENT_CONFIG: AgentConfig = {
  agentSlug: "marketing-agent",
  emptyBody:
    "Ask me about local SEO, keyword opportunities, content gaps, or how to improve a specific page. I'll inspect your live Sanity content first so every recommendation is specific to tandra.me.",
  emptyIcon: "📈",
  emptyTitle: "Let's grow Tandra's reach.",
  endpoint: "/api/marketing-agent",
  eyebrow: "Tandra.me",
  inputPlaceholder: "Ask about SEO, content, keywords, or a specific page…",
  pageDescription:
    "AI marketing strategist for tandra.me — content strategy, local SEO, and keyword opportunities for Central Texas roofing.",
  pageTitle: "Marketing Agent | Tandra Peters",
  starterPrompts: [
    "Audit my existing blog posts for SEO gaps",
    "What keywords should I target in Pflugerville?",
    "How can I optimise my Google Business Profile?",
    "Suggest 5 new FAQ topics for hail damage claims",
    "Review my service page copy and suggest improvements",
  ] as const,
  subtitle:
    "Grow Tandra's online visibility with content strategy, local SEO advice, keyword opportunities, and service page optimisation — all grounded in the live site content.",
  title: "Marketing Agent",
};

export const MarketingAgentPage = () => (
  <AgentChatPage config={MARKETING_AGENT_CONFIG} />
);
