import { AgentChatPage, type AgentConfig } from "./AgentChatPage";

const RESPONSE_AGENT_CONFIG: AgentConfig = {
  endpoint: "/api/response-agent",
  agentSlug: "response-agent",
  pageTitle: "Response Agent | Tandra Peters",
  pageDescription: "Draft on-brand Nextdoor replies from a link, screenshot, or pasted thread.",
  eyebrow: "",
  title: "",
  subtitle: "",
  emptyIcon: "",
  emptyTitle: "What would you like to respond to?",
  emptyBody:
    "From your phone: open the Nextdoor thread, take a screenshot, tap + in the chat box, and attach it — or paste the post and comments. You can also drop a nextdoor.com link and I'll try to read it.",
  inputPlaceholder: "Link, pasted thread, or a note about the screenshot…",
  starterPrompts: ["Help me respond without sounding salesy"] as const,
  useArtifacts: true,
  supportsVision: true,
};

export const ResponseAgentPage = () => <AgentChatPage config={RESPONSE_AGENT_CONFIG} />;
