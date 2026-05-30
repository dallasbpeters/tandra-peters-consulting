import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePostHog } from "@posthog/react";
import { Spinner } from "@/components/ui/spinner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../components/ai-elements/conversation";
import {
  MessageAction,
  MessageActions,
  Message,
  MessageContent,
  MessageResponse,
} from "../components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../components/ai-elements/reasoning";
import { Suggestion, Suggestions } from "../components/ai-elements/suggestion";
import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { mix, theme } from "../theme";
import { Check, Copy, Download } from "iconoir-react";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";

export type AgentConfig = {
  endpoint: string;
  agentSlug: string;
  pageTitle: string;
  pageDescription: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyBody: string;
  inputPlaceholder: string;
  starterPrompts: readonly string[];
};

type Role = "user" | "assistant";

type ChatPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "reasoning";
      text: string;
    };

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  parts: ChatPart[];
};

type ApiMessage = {
  role: Role;
  content: string;
};

type Props = {
  config: AgentConfig;
};

const CHAT_STORAGE_PREFIX = "agent-chat:v1";

const cardStyle: CSSProperties = {
  borderRadius: "1.25rem",
  padding: "1.25rem",
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 10)}`,
  boxShadow: `0 16px 40px ${mix(theme.colors.everglade, 7)}`,
  minHeight: "80vh",
  display: "grid",
  placeItems: "center",
};

type PersistedConversation = {
  threadId: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const isChatPart = (value: unknown): value is ChatPart =>
  Boolean(
    value &&
    typeof value === "object" &&
    ("type" in value && (value as { type?: unknown }).type === "text"
      ? typeof (value as { text?: unknown }).text === "string"
      : "type" in value &&
        (value as { type?: unknown }).type === "reasoning" &&
        typeof (value as { text?: unknown }).text === "string"),
  );

const isChatMessage = (value: unknown): value is ChatMessage =>
  Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string" &&
    ((value as { role?: unknown }).role === "user" ||
      (value as { role?: unknown }).role === "assistant") &&
    typeof (value as { content?: unknown }).content === "string" &&
    Array.isArray((value as { parts?: unknown }).parts) &&
    (value as { parts: unknown[] }).parts.every(isChatPart),
  );

const getStorageKey = (agentSlug: string) =>
  `${CHAT_STORAGE_PREFIX}:${agentSlug}`;

const MessageParts = ({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: ChatMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) => {
  const reasoningParts = message.parts.filter(
    (part): part is Extract<ChatPart, { type: "reasoning" }> =>
      part.type === "reasoning",
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  return (
    <>
      {hasReasoning && (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <MessageResponse key={`${message.id}-${i}`}>
              {part.text}
            </MessageResponse>
          );
        }
        return null;
      })}
    </>
  );
};

export const AgentChatPage = ({ config }: Props) => {
  const posthog = usePostHog();
  const auth = useGoogleDashboardAuth();

  usePageMetadata({
    title: config.pageTitle,
    description: config.pageDescription,
  });

  const threadIdRef = useRef<string>(crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hasHydratedConversation, setHasHydratedConversation] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(getStorageKey(config.agentSlug));
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedConversation>;
      if (typeof parsed.threadId === "string") {
        threadIdRef.current = parsed.threadId;
      }
      if (Array.isArray(parsed.messages)) {
        const restored = parsed.messages.filter(isChatMessage);
        setMessages(restored);
      }
    } catch {
      // Ignore malformed local conversation payloads.
    } finally {
      setHasHydratedConversation(true);
    }
  }, [config.agentSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasHydratedConversation) return;

    const payload: PersistedConversation = {
      threadId: threadIdRef.current,
      messages,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(
      getStorageKey(config.agentSlug),
      JSON.stringify(payload),
    );
  }, [config.agentSlug, hasHydratedConversation, messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || !auth.token) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        parts: [{ type: "text", text: trimmed }],
      };

      posthog?.capture("agent_message_sent", {
        agent: config.agentSlug,
        message_length: trimmed.length,
        total_messages_in_session: messages.length + 1,
      });

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      const history: ApiMessage[] = [...messages, userMsg].map(
        ({ role, content }) => ({ role, content }),
      );

      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            messages: history,
            threadId: threadIdRef.current,
          }),
        });

        const data = (await response.json()) as {
          response?: string;
          error?: string;
        };

        if (!response.ok || data.error) {
          setStatusCode(response.status);
          throw new Error(data.error ?? `Server error ${response.status}`);
        }

        setStatusCode(response.status);

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.response ?? "",
            parts: [{ type: "text", text: data.response ?? "" }],
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [auth.token, config, loading, messages, posthog],
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      posthog?.capture("agent_suggestion_clicked", {
        agent: config.agentSlug,
        suggestion_text: prompt,
      });
      handleSend(prompt);
    },
    [config.agentSlug, handleSend, posthog],
  );

  const isEmpty = messages.length === 0 && !loading;

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    if (!message.content.trim()) return;

    const markCopied = () => {
      setCopiedMessageId(message.id);
      setTimeout(() => {
        setCopiedMessageId((current) =>
          current === message.id ? null : current,
        );
      }, 1200);
    };

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(message.content);
        markCopied();
        return;
      } catch (err) {
        console.warn("[copy] clipboard API failed, falling back", err);
      }
    }

    // Fallback for non-secure contexts or browsers that block the API.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = message.content;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      markCopied();
    } catch (err) {
      console.error("[copy] fallback failed", err);
    }
  }, []);

  const handleDownloadMessage = useCallback(
    (message: ChatMessage) => {
      if (!message.content.trim()) return;
      try {
        const blob = new Blob([message.content], {
          type: "text/markdown;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        anchor.href = url;
        anchor.download = `${config.agentSlug}-${stamp}.md`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("[download] failed", err);
      }
    },
    [config.agentSlug],
  );

  useEffect(() => {
    if (!error) return;
    posthog?.capture("agent_message_error", {
      agent: config.agentSlug,
      error_message: error,
    });
  }, [config.agentSlug, error, posthog]);

  useEffect(() => {
    if (statusCode === 401 || statusCode === 403) {
      auth.signOut(
        "Your Google session expired or this account is not allowed.",
      );
    }
  }, [auth, statusCode]);

  return (
    <SitePageChrome>
      {auth.clientId && !auth.token ? (
            <section style={cardStyle}>
              <div
                style={{ display: "grid", gap: "1rem", justifyItems: "start" }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "1.2rem",
                      color: theme.colors.everglade,
                      marginBottom: "0.45rem",
                    }}
                  >
                    Sign in to the dashboard
                  </h2>
                  <p
                    style={{
                      color: mix(theme.colors.everglade, 72),
                      lineHeight: 1.7,
                      maxWidth: "36rem",
                    }}
                  >
                    This route is protected with Google Identity Services and a
                    server-side allowlist. The public site stays untouched; only
                    the dashboard API is gated.
                  </p>
                </div>
                <div ref={auth.buttonRef} />
                {auth.authError ? (
                  <p
                    style={{
                      color: theme.palette.coral["800"],
                      lineHeight: 1.6,
                    }}
                  >
                    {auth.authError}
                  </p>
                ) : null}
                {!auth.ready ? (
                  <p style={{ color: mix(theme.colors.everglade, 60) }}>
                    Loading Google sign-in…
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

{auth.token ? (
      <main className="mx-auto w-full px-3 pb-5 py-28 sm:px-4 sm:py-32 lg:py-36">
        <header className="mx-auto mb-6 max-w-3xl text-center">
          <p
            className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]"
            style={{ color: theme.palette.accent["600"] }}
          >
            {config.eyebrow ?? "Tandra.me"}
          </p>
          <h1
            className="m-0 text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.15]"
            style={{
              color: theme.colors.everglade,
              fontFamily: theme.fonts.headlineAlt,
              fontWeight: 400,
            }}
          >
            {config.title}
          </h1>
          <p
            className="mt-2 text-[0.95rem] leading-7"
            style={{ color: mix(theme.colors.everglade, 65) }}
          >
            {config.subtitle}
          </p>
        </header>

        <section
          className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-3xl border bg-white/85 shadow-[0_18px_60px_-28px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          style={{ borderColor: mix(theme.colors.everglade, 12) }}
        >
          <div className="flex-1 px-2 pt-2 sm:px-4 sm:pt-4">
            <Conversation className="h-full min-h-96">
              <ConversationContent className="gap-5 px-0 pb-8">
                {isEmpty ? (
                  <ConversationEmptyState
                    title={config.emptyTitle}
                    description={config.emptyBody}
                    icon={
                      <div className="text-3xl" aria-hidden="true">
                        {config.emptyIcon}
                      </div>
                    }
                  >
                    <div className="flex w-full max-w-2xl flex-col items-center gap-4 px-2">
                      <div className="text-center">
                        <p className="font-semibold text-base text-foreground">
                          {config.emptyTitle}
                        </p>
                        <p className="mt-1 text-muted-foreground text-sm leading-6">
                          {config.emptyBody}
                        </p>
                      </div>
                      <Suggestions>
                        {config.starterPrompts.map((prompt) => (
                          <Suggestion
                            key={prompt}
                            suggestion={prompt}
                            onClick={() => handleSuggestion(prompt)}
                            aria-label={`Start with: ${prompt}`}
                          >
                            {prompt}
                          </Suggestion>
                        ))}
                      </Suggestions>
                    </div>
                  </ConversationEmptyState>
                ) : (
                  messages.map((message, index) => (
                    <Message key={message.id} from={message.role}>
                      <MessageContent
                        className={
                          message.role === "user"
                            ? "max-w-[90%] rounded-2xl border px-4 py-3"
                            : "max-w-[92%] rounded-2xl px-4 py-3"
                        }
                        style={{
                          borderColor:
                            message.role === "user"
                              ? theme.palette.everglade["900"]
                              : mix(theme.colors.everglade, 12),
                          backgroundColor:
                            message.role === "user"
                              ? theme.palette.everglade["900"]
                              : theme.colors.white,
                          color:
                            message.role === "user"
                              ? theme.colors.white
                              : theme.colors.everglade,
                        }}
                      >
                        {message.role === "assistant" ? (
                          <MessageParts
                            message={message}
                            isLastMessage={index === messages.length - 1}
                            isStreaming={loading}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </MessageContent>
                      {message.role === "assistant" && (
                        <MessageActions>
                          <MessageAction
                            aria-label="Copy message"
                            tooltip={
                              copiedMessageId === message.id
                                ? "Copied"
                                : "Copy answer"
                            }
                            onClick={() => handleCopyMessage(message)}
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="size-4" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </MessageAction>
                          <MessageAction
                            aria-label="Download message"
                            tooltip="Download as .md"
                            onClick={() => handleDownloadMessage(message)}
                          >
                            <Download className="size-4" />
                          </MessageAction>
                        </MessageActions>
                      )}
                    </Message>
                  ))
                )}

                {loading && (
                  <Message from="assistant">
                    <MessageContent className="max-w-[92%] rounded-2xl border bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Spinner />
                        <span>Thinking…</span>
                      </div>
                    </MessageContent>
                  </Message>
                )}

                {error && (
                  <Message from="assistant">
                    <MessageContent
                      className="max-w-[92%] rounded-2xl border px-4 py-3 text-sm"
                      style={{
                        borderColor: theme.palette.coral["200"],
                        backgroundColor: theme.palette.coral["50"],
                        color: theme.palette.coral["800"],
                      }}
                      role="alert"
                    >
                      {error}
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>

          <div className="sticky bottom-0 border-t bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3">
            <PromptInput
              className="w-full"
              onSubmit={({ text }) => handleSend(text)}
              aria-label="Chat input"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={config.inputPlaceholder}
                  disabled={loading}
                  className="min-h-14"
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools />
                <PromptInputSubmit
                  status={loading ? "streaming" : "ready"}
                  disabled={!loading && input.trim().length === 0}
                />
              </PromptInputFooter>
            </PromptInput>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new
              line
            </p>
          </div>
        </section>
      </main>
) : null}
    </SitePageChrome>
  );
};
