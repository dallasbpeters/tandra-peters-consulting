export type AgentArtifactSegment =
  | {
      type: "markdown";
      content: string;
    }
  | {
      type: "artifact";
      title: string;
      description?: string;
      content: string;
    };

const ARTIFACT_BLOCK_RE =
  /<artifact\s+title=(?:"([^"]*)"|'([^']*)'|([^\s>]+))(?:\s+description=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?\s*>([\s\S]*?)<\/artifact>/gi;

const normalizeSegmentContent = (value: string) => value.trim();

export const parseAgentArtifactText = (
  text: string
): AgentArtifactSegment[] => {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const segments: AgentArtifactSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ARTIFACT_BLOCK_RE.lastIndex = 0;

  match = ARTIFACT_BLOCK_RE.exec(trimmed);
  while (match !== null) {
    const preamble = normalizeSegmentContent(
      trimmed.slice(lastIndex, match.index)
    );
    if (preamble) {
      segments.push({ type: "markdown", content: preamble });
    }

    const title = (
      match[1] ??
      match[2] ??
      match[3] ??
      "Suggested reply"
    ).trim();
    const description = (match[4] ?? match[5] ?? match[6] ?? "").trim();
    const content = normalizeSegmentContent(match[7] ?? "");

    if (content) {
      segments.push({
        type: "artifact",
        title,
        ...(description ? { description } : {}),
        content,
      });
    }

    lastIndex = match.index + match[0].length;
    match = ARTIFACT_BLOCK_RE.exec(trimmed);
  }

  const remainder = normalizeSegmentContent(trimmed.slice(lastIndex));
  if (remainder) {
    segments.push({ type: "markdown", content: remainder });
  }

  if (segments.length === 0) {
    return [{ type: "markdown", content: trimmed }];
  }

  return segments;
};
