import type { AgentConfig } from "./agent-chat-page";
import { AgentChatPage } from "./agent-chat-page";

const RESPONSE_AGENT_CONFIG: AgentConfig = {
  agentSlug: "response-agent",
  emptyBody:
    "From your phone: open the Nextdoor thread, take a screenshot, tap + in the chat box, and attach it — or paste the post and comments. You can also drop a nextdoor.com link and I'll try to read it.",
  emptyIcon: "",
  emptyTitle: "What would you like to respond to?",
  endpoint: "/api/response-agent",
  eyebrow: "",
  inputPlaceholder: "Link, pasted thread, or a note about the screenshot…",
  pageDescription:
    "Draft on-brand Nextdoor replies from a link, screenshot, or pasted thread.",
  pageTitle: "Response Agent | Tandra Peters",
  starterPrompts: ["Help me respond without sounding salesy"] as const,
  subtitle: "",
  supportsVision: true,
  title: "",
  useArtifacts: true,
};

export const ResponseAgentPage = () => (
  <AgentChatPage config={RESPONSE_AGENT_CONFIG} />
);
