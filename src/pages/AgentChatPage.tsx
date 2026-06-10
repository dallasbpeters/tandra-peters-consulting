import type { FileUIPart } from "ai";

import { usePostHog } from "@posthog/react";
import { Check, Copy, Download, Globe } from "iconoir-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

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
  MessageAction,
  MessageActions,
  Message,
  MessageContent,
  MessageResponse,
} from "../components/ai-elements/message";
import {
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddScreenshot,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputButton,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  PromptInputHeader,
} from "../components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../components/ai-elements/reasoning";
import { Suggestion, Suggestions } from "../components/ai-elements/suggestion";
import { SitePageChrome } from "../components/SitePageChrome";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import { usePageMetadata } from "../hooks/usePageMetadata";
import {
  buildApiMessages,
  filePartsToImages,
  type StoredChatImage,
} from "../lib/buildAgentApiMessages";
import { mix, theme } from "../theme";
import "../styles/agent-chat.css";

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
  /** When true, assistant text is parsed for <artifact> blocks and rendered with Artifact UI. */
  useArtifacts?: boolean;
  /** When true, image attachments are sent to the API (screenshot workflow). */
  supportsVision?: boolean;
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
  images?: StoredChatImage[];
};

type Props = {
  config: AgentConfig;
};

const CHAT_STORAGE_PREFIX = "agent-chat:v1";

const cardStyle: CSSProperties = {
  borderRadius: theme.radius.xlarge,
  padding: theme.spacing.xl,
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

const getStorageKey = (agentSlug: string) => `${CHAT_STORAGE_PREFIX}:${agentSlug}`;

const PromptInputSubmitGuard = ({ loading, input }: { loading: boolean; input: string }) => {
  const attachments = usePromptInputAttachments();
  const hasContent = input.trim().length > 0 || attachments.files.length > 0;

  return (
    <PromptInputSubmit
      status={loading ? "streaming" : "ready"}
      disabled={!loading && !hasContent}
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
    (part): part is Extract<ChatPart, { type: "reasoning" }> => part.type === "reasoning",
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming = isLastMessage && isStreaming && lastPart?.type === "reasoning";

  return (
    <>
      {hasReasoning && (
        <Reasoning className="agent-chat__reasoning" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (useArtifacts && message.role === "assistant" && part.text.includes("<artifact")) {
            return <AgentArtifactMessage key={`${message.id}-${i}`} text={part.text} />;
          }

          return <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>;
        }
        return null;
      })}
    </>
  );
};

export const AgentChatPage = ({ config }: Props) => {
  const posthog = usePostHog();

  usePageMetadata({
    title: config.pageTitle,
    description: config.pageDescription,
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
      messages: messages.map((message) =>
        message.images?.length ? { ...message, images: undefined } : message,
      ),
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(getStorageKey(config.agentSlug), JSON.stringify(payload));
  }, [config.agentSlug, hasHydratedConversation, messages]);

  const handleSend = useCallback(
    async (text: string, files: FileUIPart[] = []) => {
      const trimmed = text.trim();
      const attachedImages = config.supportsVision ? filePartsToImages(files) : [];

      if (!trimmed && attachedImages.length === 0) return;
      if (loading || !auth.token) return;

      const displayContent =
        trimmed || (attachedImages.length > 0 ? "Screenshot of Nextdoor thread" : "");

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent,
        parts: [{ type: "text", text: displayContent }],
        ...(attachedImages.length > 0 ? { images: attachedImages } : {}),
      };

      posthog?.capture("agent_message_sent", {
        agent: config.agentSlug,
        message_length: displayContent.length,
        attachment_count: attachedImages.length,
        total_messages_in_session: messages.length + 1,
      });

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      const history = buildApiMessages([...messages, userMsg]);

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
        setCopiedMessageId((current) => (current === message.id ? null : current));
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
      auth.signOut("Your Google session expired or this account is not allowed.");
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
                  fontSize: "1.2rem",
                  color: theme.colors.everglade,
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
                This route is protected with Google Identity Services and a server-side allowlist.
                The public site stays untouched; only the dashboard API is gated.
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
              <p style={{ color: mix(theme.colors.everglade, 60) }}>Loading Google sign-in…</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {auth.token ? (
        <main className="agent-chat agent-chat__main">
          <header className="agent-chat__header">
            <p className="agent-chat__eyebrow">{config.eyebrow ?? "Tandra.me"}</p>
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
                        title={config.emptyTitle}
                        description={config.emptyBody}
                        icon={
                          <div className="agent-chat__empty-icon" aria-hidden="true">
                            {config.emptyIcon}
                          </div>
                        }
                      >
                        <div className="agent-chat__empty-body">
                          <div className="agent-chat__empty-copy">
                            <p className="agent-chat__empty-title">{config.emptyTitle}</p>
                            <p className="agent-chat__empty-description">{config.emptyBody}</p>
                          </div>
                          <Suggestions>
                            {config.starterPrompts.map((prompt) => (
                              <Suggestion
                                key={prompt}
                                suggestion={prompt}
                                className="agent-chat__suggestion"
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
                        <Message
                          key={message.id}
                          from={message.role}
                          className="agent-chat__message-row"
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
                                message={message}
                                isLastMessage={index === messages.length - 1}
                                isStreaming={loading}
                                useArtifacts={config.useArtifacts ?? false}
                              />
                            ) : (
                              <div className="agent-chat__user-attachments">
                                {message.images?.map((image) => (
                                  <img
                                    key={image.url}
                                    src={image.url}
                                    alt={
                                      image.filename
                                        ? `Attached screenshot: ${image.filename}`
                                        : "Attached screenshot of Nextdoor thread"
                                    }
                                    className="agent-chat__user-screenshot"
                                  />
                                ))}
                                {message.content ? (
                                  <p className="agent-chat__user-text">{message.content}</p>
                                ) : null}
                              </div>
                            )}
                          </MessageContent>
                          {message.role === "user" ? (
                            <>
                              {auth.user?.picture ? (
                                <img
                                  src={auth.user.picture}
                                  alt=""
                                  className="agent-chat__avatar"
                                />
                              ) : null}
                            </>
                          ) : null}
                          {message.role === "assistant" && (
                            <MessageActions>
                              <MessageAction
                                aria-label="Copy message"
                                tooltip={copiedMessageId === message.id ? "Copied" : "Copy answer"}
                                onClick={() => handleCopyMessage(message)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="agent-chat__icon" />
                                ) : (
                                  <Copy className="agent-chat__icon" />
                                )}
                              </MessageAction>
                              <MessageAction
                                aria-label="Download message"
                                tooltip="Download as .md"
                                onClick={() => handleDownloadMessage(message)}
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
                  className="agent-chat__prompt"
                  onSubmit={({ text, files }) => handleSend(text, files)}
                  aria-label="Chat input"
                  globalDrop
                  multiple
                >
                  <PromptInputAttachmentsHeader />
                  <PromptInputBody>
                    <PromptInputTextarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={config.inputPlaceholder}
                      disabled={loading}
                      className="agent-chat__textarea"
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
                        <PromptInputSelectTrigger>
                          <PromptInputSelectValue />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                          {models.map((model) => (
                            <PromptInputSelectItem key={model.id} value={model.id}>
                              {model.name}
                            </PromptInputSelectItem>
                          ))}
                        </PromptInputSelectContent>
                      </PromptInputSelect>
                    </PromptInputTools>
                    <PromptInputSubmitGuard loading={loading} input={input} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </section>
          </TooltipProvider>
        </main>
      ) : null}
    </SitePageChrome>
  );
};
