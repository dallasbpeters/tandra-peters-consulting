import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { SitePageChrome } from "../components/SitePageChrome";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { mix, theme } from "../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type ApiMessage = {
  role: Role;
  content: string;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "calc(60vh - 80px)",
  maxWidth: "52rem",
  margin: "0 auto",
  padding: "10rem 1.25rem 0",
};

const headerStyle: CSSProperties = {
  marginBottom: "1.5rem",
};

const eyebrowStyle: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 800,
  fontSize: "0.6875rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: theme.palette.accent["600"],
  marginBottom: "0.5rem",
};

const titleStyle: CSSProperties = {
  fontFamily: theme.fonts.headlineAlt,
  fontWeight: 400,
  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
  lineHeight: 1.15,
  color: theme.colors.everglade,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  marginTop: "0.5rem",
  fontSize: "0.95rem",
  lineHeight: 1.6,
  color: mix(theme.colors.everglade, 65),
};

const chatWindowStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  paddingBottom: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const emptyStateStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  gap: "1rem",
  paddingTop: "4rem",
  paddingBottom: "4rem",
  textAlign: "center",
};

const emptyIconStyle: CSSProperties = {
  width: "3.5rem",
  height: "3.5rem",
  borderRadius: "1rem",
  backgroundColor: theme.palette.accent["100"],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.75rem",
};

const emptyTitleStyle: CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 700,
  fontSize: "1.05rem",
  color: theme.colors.everglade,
  margin: 0,
};

const emptyBodyStyle: CSSProperties = {
  fontSize: "0.9rem",
  color: mix(theme.colors.everglade, 60),
  maxWidth: "28rem",
  margin: "0 auto",
  lineHeight: 1.65,
};

const suggestionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
  marginTop: "0.5rem",
};

const bubbleBase: CSSProperties = {
  maxWidth: "85%",
  borderRadius: "1rem",
  padding: "0.75rem 1rem",
  fontSize: "0.9375rem",
  lineHeight: 1.65,
};

const userBubbleStyle: CSSProperties = {
  ...bubbleBase,
  alignSelf: "flex-end",
  backgroundColor: theme.palette.everglade["900"],
  color: theme.colors.white,
  borderBottomRightRadius: "0.25rem",
};

const assistantBubbleStyle: CSSProperties = {
  ...bubbleBase,
  alignSelf: "flex-start",
  backgroundColor: theme.colors.white,
  color: theme.colors.everglade,
  border: `1px solid ${mix(theme.colors.everglade, 10)}`,
  borderBottomLeftRadius: "0.25rem",
  boxShadow: `0 2px 12px ${mix(theme.colors.everglade, 5)}`,
};

const thinkingDotStyle = (delay: string): CSSProperties => ({
  width: "0.45rem",
  height: "0.45rem",
  borderRadius: "50%",
  backgroundColor: mix(theme.colors.everglade, 40),
  animationName: "bounce",
  animationDuration: "1.2s",
  animationTimingFunction: "ease-in-out",
  animationIterationCount: "infinite",
  animationDelay: delay,
});

const formBarStyle: CSSProperties = {
  position: "sticky",
  bottom: 0,
  paddingTop: "0.75rem",
  paddingBottom: "1.5rem",
  borderTop: `1px solid ${mix(theme.colors.everglade, 8)}`,
};

const inputRowStyle: CSSProperties = {
  display: "flex",
  gap: "0.625rem",
  alignItems: "flex-end",
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 15)}`,
  borderRadius: "0.875rem",
  padding: "0.5rem 0.5rem 0.5rem 1rem",
  boxShadow: `0 2px 12px ${mix(theme.colors.everglade, 6)}`,
  transition: "border-color 0.2s ease",
};

const textareaStyle: CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  resize: "none",
  backgroundColor: "transparent",
  fontFamily: theme.fonts.body,
  fontSize: "0.9375rem",
  lineHeight: 1.55,
  color: theme.colors.everglade,
  minHeight: "2.4rem",
  maxHeight: "10rem",
  overflowY: "auto",
};

const sendButtonStyle = (disabled: boolean): CSSProperties => ({
  flexShrink: 0,
  width: "2.25rem",
  height: "2.25rem",
  borderRadius: "0.625rem",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  backgroundColor: disabled
    ? mix(theme.colors.everglade, 15)
    : theme.palette.everglade["900"],
  color: disabled ? mix(theme.colors.everglade, 40) : theme.colors.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.2s ease",
});

const suggestionButtonStyle: CSSProperties = {
  fontFamily: theme.fonts.body,
  fontSize: "0.8125rem",
  color: mix(theme.colors.everglade, 80),
  backgroundColor: theme.colors.white,
  border: `1px solid ${mix(theme.colors.everglade, 12)}`,
  borderRadius: "2rem",
  padding: "0.375rem 0.875rem",
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
};

// ─── Suggestions ──────────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  "What new homepage section would most improve conversions?",
  "Plan a Before & After project gallery feature",
  "How should I add a service area map to the site?",
  "Design a Testimonials schema with video support",
  "What's the best way to add a promotional banner to siteSettings?",
];

// ─── Markdown styles injected globally ───────────────────────────────────────

const markdownId = "agent-md-styles";

const injectMarkdownStyles = () => {
  if (document.getElementById(markdownId)) return;
  const style = document.createElement("style");
  style.id = markdownId;
  style.textContent = `
    .agent-md h1, .agent-md h2, .agent-md h3 {
      font-family: ${theme.fonts.headline};
      font-weight: 700;
      color: ${theme.colors.everglade};
      margin: 1em 0 0.4em;
      line-height: 1.25;
    }
    .agent-md h1 { font-size: 1.2rem; }
    .agent-md h2 { font-size: 1.05rem; }
    .agent-md h3 { font-size: 0.95rem; }
    .agent-md p  { margin: 0.5em 0; }
    .agent-md ul, .agent-md ol { padding-left: 1.4em; margin: 0.5em 0; }
    .agent-md li { margin: 0.2em 0; }
    .agent-md code {
      font-size: 0.82em;
      background: ${mix(theme.colors.everglade, 7)};
      border-radius: 0.25rem;
      padding: 0.1em 0.35em;
      font-family: "Menlo", "Consolas", monospace;
    }
    .agent-md pre {
      background: ${theme.palette.everglade["950"]};
      color: ${theme.palette.accent["200"]};
      border-radius: 0.625rem;
      padding: 1rem;
      overflow-x: auto;
      margin: 0.75em 0;
      font-size: 0.8rem;
      line-height: 1.6;
    }
    .agent-md pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }
    .agent-md hr {
      border: none;
      border-top: 1px solid ${mix(theme.colors.everglade, 10)};
      margin: 1em 0;
    }
    .agent-md strong { font-weight: 700; }
    .agent-md a { color: ${theme.palette.accent["700"]}; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
      40%            { transform: scale(1);   opacity: 1; }
    }
  `;
  document.head.appendChild(style);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ThinkingIndicator = () => (
  <div
    style={{
      ...assistantBubbleStyle,
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      padding: "0.85rem 1rem",
    }}
    aria-label="Agent is thinking"
  >
    <span style={thinkingDotStyle("0s")} />
    <span style={thinkingDotStyle("0.2s")} />
    <span style={thinkingDotStyle("0.4s")} />
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AgentChatPage = () => {
  usePageMetadata({
    title: "Feature Builder | Tandra Peters",
    description:
      "AI-powered feature planning assistant for the tandra.me website.",
  });

  useEffect(injectMarkdownStyles, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, loading, scrollToBottom]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }, 0);

      const history: ApiMessage[] = [...messages, userMsg].map(
        ({ role, content }) => ({
          role,
          content,
        }),
      );

      try {
        const res = await fetch("/api/feature-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const data = (await res.json()) as {
          response?: string;
          error?: string;
        };

        if (!res.ok || data.error) {
          throw new Error(data.error ?? `Server error ${res.status}`);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response ?? "",
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [messages, loading],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleSend(input);
    },
    [input, handleSend],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [input, handleSend],
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      handleSend(prompt);
    },
    [handleSend],
  );

  const isEmpty = messages.length === 0 && !loading;

  return (
    <SitePageChrome>
      <div style={shellStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Tandra.me</p>
          <h1 style={titleStyle}>Feature Builder</h1>
          <p style={subtitleStyle}>
            Plan new website sections, schema changes, and implementation steps
            — powered by your live Sanity content model.
          </p>
        </header>

        {/* Chat window */}
        <div
          style={chatWindowStyle}
          role="log"
          aria-live="polite"
          aria-label="Chat conversation"
        >
          {isEmpty ? (
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle} aria-hidden="true">
                🏗️
              </div>
              <p style={emptyTitleStyle}>What would you like to build?</p>
              <p style={emptyBodyStyle}>
                Ask me to plan a new feature — I'll inspect the live schema and
                propose schema types, component structure, and a step-by-step
                implementation checklist.
              </p>
              <div style={suggestionsStyle} role="list">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    role="listitem"
                    style={suggestionButtonStyle}
                    onClick={() => handleSuggestion(prompt)}
                    aria-label={`Start with: ${prompt}`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={
                  msg.role === "user" ? userBubbleStyle : assistantBubbleStyle
                }
                role="article"
                aria-label={`${msg.role === "user" ? "You" : "Assistant"}: ${msg.content.slice(0, 60)}`}
              >
                {msg.role === "assistant" ? (
                  <div className="agent-md">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))
          )}

          {loading && <ThinkingIndicator />}

          {error && (
            <div
              role="alert"
              style={{
                alignSelf: "flex-start",
                backgroundColor: theme.palette.coral["50"],
                border: `1px solid ${theme.palette.coral["200"]}`,
                borderRadius: "0.75rem",
                color: theme.palette.coral["800"],
                fontSize: "0.875rem",
                padding: "0.625rem 0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} aria-hidden="true" />
        </div>

        {/* Input bar — sticky at bottom */}
        <form
          onSubmit={handleSubmit}
          style={formBarStyle}
          aria-label="Chat input"
        >
          <div style={inputRowStyle}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe a feature you want to build…"
              rows={1}
              style={textareaStyle}
              aria-label="Chat input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={sendButtonStyle(loading || !input.trim())}
              aria-label="Send message"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 1L13 7M13 7L7 13M13 7H1"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: mix(theme.colors.everglade, 40),
              textAlign: "center",
            }}
          >
            Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
          </p>
        </form>
      </div>
    </SitePageChrome>
  );
};
