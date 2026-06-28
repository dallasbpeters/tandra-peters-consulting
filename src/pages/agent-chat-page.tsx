import { usePostHog } from "@posthog/react";
import type { FileUIPart } from "ai";
import { Check, Copy, Download, Globe } from "iconoir-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AgentArtifactMessage } from "../components/ai-elements/agent-artifact-message";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "../components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "../components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "../components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../components/ai-elements/reasoning";
import { Suggestion, Suggestions } from "../components/ai-elements/suggestion";
import { SitePageChrome } from "../components/site-page-chrome";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import {
  buildApiMessages,
  filePartsToImages,
  type StoredChatImage,
} from "../lib/build-agent-api-messages";
import { mix, theme } from "../theme";

import "../styles/agent-chat.css";

export interface AgentConfig {
  agentSlug: string;
  emptyBody: string;
  emptyIcon: string;
  emptyTitle: string;
  endpoint: string;
  eyebrow?: string;
  inputPlaceholder: string;
  pageDescription: string;
  pageTitle: string;
  starterPrompts: readonly string[];
  subtitle: string;
  /** When true, image attachments are sent to the API (screenshot workflow). */
  supportsVision?: boolean;
  title: string;
  /** When true, assistant text is parsed for <artifact> blocks and rendered with Artifact UI. */
  useArtifacts?: boolean;
}

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

interface ChatMessage {
  content: string;
  id: string;
  images?: StoredChatImage[];
  parts: ChatPart[];
  role: Role;
}

interface Props {
  config: AgentConfig;
}

const CHAT_STORAGE_PREFIX = "agent-chat:v1";

const cardStyle: CSSProperties = {
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 10)}`,
  borderRadius: theme.radius.xlarge,
  boxShadow: `0 16px 40px ${mix(theme.colors.everglade, 7)}`,
  display: "grid",
  minHeight: "80vh",
  padding: theme.spacing.xl,
  placeItems: "center",
};

interface PersistedConversation {
  messages: ChatMessage[];
  threadId: string;
  updatedAt: number;
}

const isChatPart = (value: unknown): value is ChatPart =>
  Boolean(
    value &&
    typeof value === "object" &&
    ("type" in value && (value as { type?: unknown }).type === "text"
      ? typeof (value as { text?: unknown }).text === "string"
      : "type" in value &&
        (value as { type?: unknown }).type === "reasoning" &&
        typeof (value as { text?: unknown }).text === "string")
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
    (value as { parts: unknown[] }).parts.every(isChatPart)
  );

const getStorageKey = (agentSlug: string) =>
  `${CHAT_STORAGE_PREFIX}:${agentSlug}`;

const PromptInputSubmitGuard = ({
  loading,
  input,
}: {
  loading: boolean;
  input: string;
}) => {
  const attachments = usePromptInputAttachments();
  const hasContent = input.trim().length > 0 || attachments.files.length > 0;

  return (
    <PromptInputSubmit
      disabled={!(loading || hasContent)}
      status={loading ? "streaming" : "ready"}
      variant="ghost"
    />
  );
};

const PromptInputAttachmentsHeader = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <PromptInputHeader>
      <Attachments variant="inline">
        {attachments.files.map((attachment) => (
          <Attachment
            data={attachment}
            key={attachment.id}
            onRemove={() => attachments.remove(attachment.id)}
          >
            <AttachmentPreview />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
};

const MessageParts = ({
  message,
  isLastMessage,
  isStreaming,
  useArtifacts,
}: {
  message: ChatMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  useArtifacts: boolean;
}) => {
  const reasoningParts = message.parts.filter(
    (part): part is Extract<ChatPart, { type: "reasoning" }> =>
      part.type === "reasoning"
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  return (
    <>
      {hasReasoning && (
        <Reasoning
          className="agent-chat__reasoning"
          isStreaming={isReasoningStreaming}
        >
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}
      {message.parts.map((part) => {
        if (part.type === "text") {
          if (
            useArtifacts &&
            message.role === "assistant" &&
            part.text.includes("<artifact")
          ) {
            return (
              <AgentArtifactMessage
                key={`${message.id}-${part.type}`}
                text={part.text}
              />
            );
          }

          return (
            <MessageResponse key={`${message.id}-${part.type}`}>
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

  usePageMetadata({
    description: config.pageDescription,
    title: config.pageTitle,
  });

  const models = [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3" },
  ];

  const threadIdRef = useRef<string>(crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hasHydratedConversation, setHasHydratedConversation] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [model, setModel] = useState<string>("gpt-4o");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const auth = useGoogleDashboardAuth();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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
    if (typeof window === "undefined") {
      return;
    }
    if (!hasHydratedConversation) {
      return;
    }

    const payload: PersistedConversation = {
      messages: messages.map((message) =>
        message.images?.length ? { ...message, images: undefined } : message
      ),
      threadId: threadIdRef.current,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(
      getStorageKey(config.agentSlug),
      JSON.stringify(payload)
    );
  }, [config.agentSlug, hasHydratedConversation, messages]);

  const handleSend = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
    async (text: string, files: FileUIPart[] = []) => {
      const trimmed = text.trim();
      const attachedImages = config.supportsVision
        ? filePartsToImages(files)
        : [];

      if (!trimmed && attachedImages.length === 0) {
        return;
      }
      if (loading || !auth.token) {
        return;
      }

      const displayContent =
        trimmed ||
        (attachedImages.length > 0 ? "Screenshot of Nextdoor thread" : "");

      const userMsg: ChatMessage = {
        content: displayContent,
        id: crypto.randomUUID(),
        parts: [{ text: displayContent, type: "text" }],
        role: "user",
        ...(attachedImages.length > 0 ? { images: attachedImages } : {}),
      };

      posthog?.capture("agent_message_sent", {
        agent: config.agentSlug,
        attachment_count: attachedImages.length,
        message_length: displayContent.length,
        total_messages_in_session: messages.length + 1,
      });

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      const history = buildApiMessages([...messages, userMsg]);

      try {
        const response = await fetch(config.endpoint, {
          body: JSON.stringify({
            messages: history,
            threadId: threadIdRef.current,
          }),
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
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
            content: data.response ?? "",
            id: crypto.randomUUID(),
            parts: [{ text: data.response ?? "", type: "text" }],
            role: "assistant",
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [auth.token, config, loading, messages, posthog]
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      posthog?.capture("agent_suggestion_clicked", {
        agent: config.agentSlug,
        suggestion_text: prompt,
      });
      handleSend(prompt);
    },
    [config.agentSlug, handleSend, posthog]
  );

  const isEmpty = messages.length === 0 && !loading;

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    if (!message.content.trim()) {
      return;
    }

    const markCopied = () => {
      setCopiedMessageId(message.id);
      setTimeout(() => {
        setCopiedMessageId((current) =>
          current === message.id ? null : current
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
      if (!message.content.trim()) {
        return;
      }
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
    [config.agentSlug]
  );

  useEffect(() => {
    if (!error) {
      return;
    }
    posthog?.capture("agent_message_error", {
      agent: config.agentSlug,
      error_message: error,
    });
  }, [config.agentSlug, error, posthog]);

  useEffect(() => {
    if (statusCode === 401 || statusCode === 403) {
      auth.signOut(
        "Your Google session expired or this account is not allowed."
      );
    }
  }, [auth, statusCode]);

  return (
    <SitePageChrome>
      {auth.clientId && !auth.token ? (
        <section style={cardStyle}>
          <div
            style={{
              display: "grid",
              gap: theme.spacing.lg,
              justifyItems: "start",
            }}
          >
            <div>
              <h2
                style={{
                  color: theme.colors.everglade,
                  fontSize: "1.2rem",
                  marginBottom: theme.spacing.sm,
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
                server-side allowlist. The public site stays untouched; only the
                dashboard API is gated.
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
            {auth.ready ? null : (
              <p style={{ color: mix(theme.colors.everglade, 60) }}>
                Loading Google sign-in…
              </p>
            )}
          </div>
        </section>
      ) : null}

      {auth.token ? (
        <div className="agent-chat agent-chat__main">
          <header className="agent-chat__header">
            <p className="agent-chat__eyebrow">
              {config.eyebrow ?? "Tandra.me"}
            </p>
            <h1 className="agent-chat__title">{config.title}</h1>
            <p className="agent-chat__subtitle">{config.subtitle}</p>
          </header>

          <TooltipProvider delayDuration={200}>
            <section className="agent-chat__panel">
              <div className="agent-chat__conversation-wrap">
                <Conversation className="agent-chat__conversation">
                  <ConversationContent className="agent-chat__conversation-content">
                    {isEmpty ? (
                      <ConversationEmptyState
                        description={config.emptyBody}
                        icon={
                          <div
                            aria-hidden="true"
                            className="agent-chat__empty-icon"
                          >
                            {config.emptyIcon}
                          </div>
                        }
                        title={config.emptyTitle}
                      >
                        <div className="agent-chat__empty-body">
                          <div className="agent-chat__empty-copy">
                            <p className="agent-chat__empty-title">
                              {config.emptyTitle}
                            </p>
                            <p className="agent-chat__empty-description">
                              {config.emptyBody}
                            </p>
                          </div>
                          <Suggestions>
                            {config.starterPrompts.map((prompt) => (
                              <Suggestion
                                aria-label={`Start with: ${prompt}`}
                                className="agent-chat__suggestion"
                                key={prompt}
                                onClick={() => handleSuggestion(prompt)}
                                suggestion={prompt}
                              >
                                {prompt}
                              </Suggestion>
                            ))}
                          </Suggestions>
                        </div>
                      </ConversationEmptyState>
                    ) : (
                      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex orchestration logic
                      messages.map((message, index) => (
                        <Message
                          className="agent-chat__message-row"
                          from={message.role}
                          key={message.id}
                        >
                          <MessageContent
                            className={
                              message.role === "user"
                                ? "agent-chat__message-content agent-chat__message-content--user"
                                : "agent-chat__message-content agent-chat__message-content--assistant"
                            }
                          >
                            {message.role === "assistant" ? (
                              <MessageParts
                                isLastMessage={index === messages.length - 1}
                                isStreaming={loading}
                                message={message}
                                useArtifacts={config.useArtifacts ?? false}
                              />
                            ) : (
                              <div className="agent-chat__user-attachments">
                                {message.images?.map((image) => (
                                  // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
                                  <img
                                    alt={
                                      image.filename
                                        ? `Attached screenshot: ${image.filename}`
                                        : "Attached screenshot of Nextdoor thread"
                                    }
                                    className="agent-chat__user-screenshot"
                                    key={image.url}
                                    src={image.url}
                                  />
                                ))}
                                {message.content ? (
                                  <p className="agent-chat__user-text">
                                    {message.content}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </MessageContent>
                          {message.role === "user" &&
                            (auth.user?.picture ? (
                              // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
                              <img
                                alt=""
                                className="agent-chat__avatar"
                                src={auth.user.picture}
                              />
                            ) : null)}
                          {message.role === "assistant" && (
                            <MessageActions>
                              <MessageAction
                                aria-label="Copy message"
                                onClick={() => handleCopyMessage(message)}
                                tooltip={
                                  copiedMessageId === message.id
                                    ? "Copied"
                                    : "Copy answer"
                                }
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="agent-chat__icon" />
                                ) : (
                                  <Copy className="agent-chat__icon" />
                                )}
                              </MessageAction>
                              <MessageAction
                                aria-label="Download message"
                                onClick={() => handleDownloadMessage(message)}
                                tooltip="Download as .md"
                              >
                                <Download className="agent-chat__icon" />
                              </MessageAction>
                            </MessageActions>
                          )}
                        </Message>
                      ))
                    )}

                    {loading && (
                      <Message from="assistant">
                        <MessageContent className="agent-chat__message-content agent-chat__message-content--loading">
                          <div className="agent-chat__loading">
                            <Spinner />
                            <span>Thinking…</span>
                          </div>
                        </MessageContent>
                      </Message>
                    )}

                    {error && (
                      <Message from="assistant">
                        <MessageContent
                          className="agent-chat__message-content agent-chat__message-content--error"
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

              <div className="agent-chat__composer-dock">
                <PromptInput
                  aria-label="Chat input"
                  className="agent-chat__prompt"
                  globalDrop
                  multiple
                  onSubmit={({ text, files }) => handleSend(text, files)}
                >
                  <PromptInputAttachmentsHeader />
                  <PromptInputBody>
                    <PromptInputTextarea
                      className="agent-chat__textarea"
                      disabled={loading}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={config.inputPlaceholder}
                      value={input}
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger />
                        <PromptInputActionMenuContent>
                          <PromptInputActionAddAttachments />
                          <PromptInputActionAddScreenshot />
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                      <PromptInputButton
                        aria-pressed={useWebSearch}
                        onClick={() => setUseWebSearch(!useWebSearch)}
                        tooltip={{ content: "Search the web", shortcut: "⌘K" }}
                        variant="ghost"
                      >
                        <Globe className="agent-chat__icon" />
                        <span>Search</span>
                      </PromptInputButton>
                      <PromptInputSelect
                        onValueChange={(value) => {
                          setModel(value);
                        }}
                        value={model}
                      >
                        <PromptInputSelectTrigger aria-label="Model">
                          <PromptInputSelectValue />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                          {models.map((model) => (
                            <PromptInputSelectItem
                              key={model.id}
                              value={model.id}
                            >
                              {model.name}
                            </PromptInputSelectItem>
                          ))}
                        </PromptInputSelectContent>
                      </PromptInputSelect>
                    </PromptInputTools>
                    <PromptInputSubmitGuard input={input} loading={loading} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </section>
          </TooltipProvider>
        </div>
      ) : null}
    </SitePageChrome>
  );
};
