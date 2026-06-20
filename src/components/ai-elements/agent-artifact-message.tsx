"use client";

import { Check, Copy } from "iconoir-react";
import { useCallback, useState } from "react";

import { parseAgentArtifactText } from "../../lib/parse-agent-artifact";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "./artifact";
import { MessageResponse } from "./message";

interface Props {
  text: string;
}

export const AgentArtifactMessage = ({ text }: Props) => {
  const segments = parseAgentArtifactText(text);
  const fallbackSegments = text.trim()
    ? [{ content: text.trim(), type: "markdown" as const }]
    : [];
  const displaySegments = segments.length > 0 ? segments : fallbackSegments;

  if (displaySegments.length === 0) {
    return null;
  }

  return (
    <>
      {displaySegments.map((segment, index) => {
        const segmentKey = `${segment.type}-${segment.content.slice(0, 32)}-${index}`;
        if (segment.type === "markdown") {
          return (
            <MessageResponse
              className="agent-chat__message-body"
              key={segmentKey}
            >
              {segment.content}
            </MessageResponse>
          );
        }

        return (
          <Artifact className="agent-chat__artifact" key={segmentKey}>
            <ArtifactHeader>
              <div className="min-w-0 flex-1">
                <ArtifactTitle>{segment.title}</ArtifactTitle>
                {segment.description ? (
                  <ArtifactDescription>
                    {segment.description}
                  </ArtifactDescription>
                ) : null}
              </div>
              <ArtifactActions>
                <ArtifactCopyAction text={segment.content} />
              </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent>
              <MessageResponse className="agent-chat__message-body">
                {segment.content}
              </MessageResponse>
            </ArtifactContent>
          </Artifact>
        );
      })}
    </>
  );
};

const ArtifactCopyAction = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.warn("[artifact-copy] clipboard failed", error);
    }
  }, [text]);

  return (
    <ArtifactAction
      aria-label={copied ? "Copied" : "Copy response"}
      label={copied ? "Copied" : "Copy response"}
      onClick={handleCopy}
      tooltip={copied ? "Copied" : "Copy response"}
    >
      {copied ? (
        <Check height={16} width={16} />
      ) : (
        <Copy height={16} width={16} />
      )}
    </ArtifactAction>
  );
};
