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
      segments.push({ content: preamble, type: "markdown" });
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
        title,
        type: "artifact",
        ...(description ? { description } : {}),
        content,
      });
    }

    lastIndex = match.index + match[0].length;
    match = ARTIFACT_BLOCK_RE.exec(trimmed);
  }

  const remainder = normalizeSegmentContent(trimmed.slice(lastIndex));
  if (remainder) {
    segments.push({ content: remainder, type: "markdown" });
  }

  if (segments.length === 0) {
    return [{ content: trimmed, type: "markdown" }];
  }

  return segments;
};
