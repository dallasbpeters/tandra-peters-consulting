"use client";

import { Check, Copy } from "iconoir-react";
import { useCallback, useState } from "react";

import { parseAgentArtifactText } from "../../lib/parseAgentArtifact";
import {
  Artifact,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "./artifact";
import { MessageResponse } from "./message";

type Props = {
  text: string;
};

export const AgentArtifactMessage = ({ text }: Props) => {
  const segments = parseAgentArtifactText(text);
  const displaySegments =
    segments.length > 0
      ? segments
      : text.trim()
        ? [{ type: "markdown" as const, content: text.trim() }]
        : [];

  if (displaySegments.length === 0) {
    return null;
  }

  return (
    <>
      {displaySegments.map((segment, index) => {
        if (segment.type === "markdown") {
          return (
            <MessageResponse className="agent-chat__message-body" key={`md-${index}`}>
              {segment.content}
            </MessageResponse>
          );
        }

        return (
          <Artifact className="agent-chat__artifact" key={`artifact-${index}`}>
            <ArtifactHeader>
              <div className="min-w-0 flex-1">
                <ArtifactTitle>{segment.title}</ArtifactTitle>
                {segment.description ? (
                  <ArtifactDescription>{segment.description}</ArtifactDescription>
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
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.warn("[artifact-copy] clipboard failed", err);
    }
  }, [text]);

  return (
    <ArtifactAction
      aria-label={copied ? "Copied" : "Copy response"}
      label={copied ? "Copied" : "Copy response"}
      onClick={handleCopy}
      tooltip={copied ? "Copied" : "Copy response"}
    >
      {copied ? <Check height={16} width={16} /> : <Copy height={16} width={16} />}
    </ArtifactAction>
  );
};
