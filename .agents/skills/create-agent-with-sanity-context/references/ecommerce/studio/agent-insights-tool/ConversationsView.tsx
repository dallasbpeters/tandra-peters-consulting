import { EyeOpenIcon, LinkIcon } from "@sanity/icons";
import {
  Badge,
  Box,
  type BoxProps,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import {
  type ComponentProps,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  DEFAULT_STUDIO_CLIENT_OPTIONS,
  useClient,
  useRelativeTime,
} from "sanity";
import { useRouter } from "sanity/router";

import { ViewLayout } from "./ViewLayout";

type BadgeTone = ComponentProps<typeof Badge>["tone"];

interface Conversation {
  _createdAt: string;
  _id: string;
  classification?: {
    successRate?: number;
    agentConfusion?: number;
    userConfusion?: number;
  };
  contentGap?: string;
  firstMessage?: string;
  messages: {
    role: string;
    content: string;
    _key: string;
  }[];
  summary: string;
}

const QUERY = `*[_type == "agent.conversation"] | order(_createdAt desc) {
  _id,
  _createdAt,
  summary,
  "firstMessage": messages[0].content,
  classification,
  messages,
  contentGap
}`;

const COLUMN_WIDTHS = {
  date: 140,
  success: 80,
  confusion: 110,
  action: 72,
} as const;

const RESPONSIVE_DISPLAY: BoxProps["display"] = [
  "none",
  "none",
  "none",
  "none",
  "block",
];

function RelativeDate(props: { date: string }) {
  const relativeTime = useRelativeTime(props.date, {
    minimal: true,
  });
  // Only add "ago" for numeric durations, not for "yesterday", "today", etc.
  const needsAgo = /^\d/.test(relativeTime);
  return <>{needsAgo ? `${relativeTime} ago` : relativeTime}</>;
}

function RateBadge(props: { value: number | undefined; inverted?: boolean }) {
  const { value, inverted } = props;

  let tone: BadgeTone = "default";

  if (!value) {
    tone = "default";
  } else if (inverted) {
    // For metrics where low is good (e.g., confusion)
    if (value <= 20) {
      tone = "positive";
    } else if (value <= 50) {
      tone = "caution";
    } else {
      tone = "critical";
    }
  } else {
    // For metrics where high is good (e.g., success)
    if (value >= 80) {
      tone = "positive";
    } else if (value >= 50) {
      tone = "caution";
    } else {
      tone = "critical";
    }
  }

  return (
    <Flex align="center" justify="center">
      <Badge fontSize={1} padding={2} radius={2} tone={tone}>
        {value ?? 0}%
      </Badge>
    </Flex>
  );
}

export function ConversationsView() {
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS);
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [inspectedConversationId, setInspectedConversationId] = useState<
    string | null
  >(null);

  const dialogId = useId();

  const inspectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation._id === inspectedConversationId
      ),
    [conversations, inspectedConversationId]
  );

  useEffect(() => {
    const getConversations = async () => {
      try {
        const data = await client.fetch<Conversation[]>(QUERY);
        setConversations(data);
        setLoading(false);
      } catch (error) {
        setError(
          error instanceof Error
            ? error
            : new Error("Failed to fetch conversations")
        );
      }
    };

    getConversations();
  }, [client]);

  if (error) {
    return (
      <Flex align="center" height="fill" justify="center" padding={5}>
        <Container width={1}>
          <Card border padding={5} radius={3} tone="critical">
            <Text muted size={1}>
              {error.message}
            </Text>
          </Card>
        </Container>
      </Flex>
    );
  }

  if (loading) {
    return (
      <Flex align="center" height="fill" justify="center" padding={5}>
        <Spinner muted />
      </Flex>
    );
  }

  return (
    <ViewLayout
      border
      description="View all conversations with the agent"
      title="Conversations"
    >
      <Stack height="fill" space={1}>
        {/* Header */}
        <Card borderBottom padding={3}>
          <Flex align="center" gap={4}>
            <Box style={{ width: COLUMN_WIDTHS.date }}>
              <Text muted size={1} textOverflow="ellipsis" weight="semibold">
                Date
              </Text>
            </Box>

            <Box display={RESPONSIVE_DISPLAY} flex={2}>
              <Text muted size={1} textOverflow="ellipsis" weight="semibold">
                Initial question
              </Text>
            </Box>

            <Box flex={2}>
              <Text muted size={1} textOverflow="ellipsis" weight="semibold">
                Summary
              </Text>
            </Box>

            <Box flex={2}>
              <Text muted size={1} textOverflow="ellipsis" weight="semibold">
                Content gap
              </Text>
            </Box>

            <Box
              display={RESPONSIVE_DISPLAY}
              style={{ width: COLUMN_WIDTHS.success }}
            >
              <Text
                align="center"
                muted
                size={1}
                textOverflow="ellipsis"
                weight="semibold"
              >
                Success
              </Text>
            </Box>

            <Box
              display={RESPONSIVE_DISPLAY}
              style={{ width: COLUMN_WIDTHS.confusion }}
            >
              <Text
                align="center"
                muted
                size={1}
                textOverflow="ellipsis"
                weight="semibold"
              >
                Agent confusion
              </Text>
            </Box>

            <Box
              display={RESPONSIVE_DISPLAY}
              style={{ width: COLUMN_WIDTHS.confusion }}
            >
              <Text
                align="center"
                muted
                size={1}
                textOverflow="ellipsis"
                weight="semibold"
              >
                User confusion
              </Text>
            </Box>

            {/* Spacer for link button column */}
            <Box style={{ width: COLUMN_WIDTHS.action }} />
          </Flex>
        </Card>

        {conversations.length === 0 && (
          <Flex align="center" height="fill" justify="center">
            <Card padding={5}>
              <Text align="center" muted size={1}>
                No conversations yet
              </Text>
            </Card>
          </Flex>
        )}

        {/* Rows */}
        {conversations.map((conversation, index, arr) => {
          const isLast = index === arr.length - 1;

          return (
            <Card
              borderBottom={!isLast}
              key={conversation._id}
              padding={3}
              tone="default"
            >
              <Flex align="center" gap={4}>
                <Box style={{ width: COLUMN_WIDTHS.date }}>
                  <Text muted size={1} title={conversation._createdAt}>
                    <RelativeDate date={conversation._createdAt} />
                  </Text>
                </Box>

                <Box display={RESPONSIVE_DISPLAY} flex={2}>
                  <Text muted size={1}>
                    {conversation.firstMessage || "—"}
                  </Text>
                </Box>

                <Box flex={2}>
                  <Text muted size={1}>
                    {conversation.summary || "No summary"}
                  </Text>
                </Box>

                <Box flex={2}>
                  <Text muted size={1}>
                    {conversation.contentGap || "-"}
                  </Text>
                </Box>

                <Box
                  display={RESPONSIVE_DISPLAY}
                  style={{ width: COLUMN_WIDTHS.success }}
                >
                  <RateBadge value={conversation.classification?.successRate} />
                </Box>

                <Box
                  display={RESPONSIVE_DISPLAY}
                  style={{ width: COLUMN_WIDTHS.confusion }}
                >
                  <RateBadge
                    inverted
                    value={conversation.classification?.agentConfusion}
                  />
                </Box>

                <Box
                  display={RESPONSIVE_DISPLAY}
                  style={{ width: COLUMN_WIDTHS.confusion }}
                >
                  <RateBadge
                    inverted
                    value={conversation.classification?.userConfusion}
                  />
                </Box>

                <Flex
                  align="center"
                  gap={2}
                  style={{ width: COLUMN_WIDTHS.action }}
                >
                  <Button
                    fontSize={1}
                    icon={EyeOpenIcon}
                    mode="bleed"
                    onClick={() => setInspectedConversationId(conversation._id)}
                    padding={2}
                  />

                  <Button
                    as="a"
                    fontSize={1}
                    href={router.resolveIntentLink("edit", {
                      id: conversation._id,
                      type: "agent.conversation",
                    })}
                    icon={LinkIcon}
                    mode="bleed"
                    padding={2}
                  />
                </Flex>
              </Flex>
            </Card>
          );
        })}
      </Stack>

      {inspectedConversation && (
        <Dialog
          animate
          header="Conversation"
          id={dialogId}
          onClickOutside={() => setInspectedConversationId(null)}
          onClose={() => setInspectedConversationId(null)}
          width={1}
        >
          <Flex direction="column" gap={4} padding={4}>
            {inspectedConversation.messages.map((message) => {
              const tone = message.role === "user" ? "transparent" : "default";
              const justify =
                message.role === "user" ? "flex-start" : "flex-end";
              const textAlign = message.role === "user" ? "left" : "right";

              return (
                <Flex justify={justify} key={message._key}>
                  <Stack flex={0.75} key={message._key} space={3}>
                    <Text
                      align={textAlign}
                      muted
                      size={1}
                      style={{ textTransform: "capitalize" }}
                      weight="medium"
                    >
                      {message.role}
                    </Text>

                    <Card
                      overflow="auto"
                      padding={3}
                      radius={3}
                      scheme={message.role === "assistant" ? "dark" : "light"}
                      tone={tone}
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <Box padding={2}>
                              <Text size={1}>{children}</Text>
                            </Box>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </Card>
                  </Stack>
                </Flex>
              );
            })}
          </Flex>
        </Dialog>
      )}
    </ViewLayout>
  );
}
