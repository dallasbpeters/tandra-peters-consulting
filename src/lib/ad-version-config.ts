import type { CanvasElement } from "./ad-canvas-doc";
import { ROLE_IDS } from "./ad-canvas-doc";
import type { CreativeState } from "./ad-creative";

const SAVED_CONFIG_VERSION = 2;
const CANVAS_ELEMENT_KINDS = new Set([
  "band",
  "image",
  "logo",
  "qr",
  "rect",
  "text",
]);

interface SavedAdVersionConfig {
  canvasElements: CanvasElement[];
  creative: Omit<CreativeState, "imageFile">;
  version: number;
}

export interface LoadedAdVersionConfig {
  canvasElements: CanvasElement[] | null;
  creative: CreativeState;
}

const extractFirstJsonObject = (value: string): string => {
  const start = value.indexOf("{");
  if (start < 0) {
    throw new SyntaxError("No JSON object in config.");
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (character === "{") {
      depth += 1;
    } else if (character === "}" && --depth === 0) {
      return value.slice(start, index + 1);
    }
  }
  throw new SyntaxError("Unterminated JSON object in config.");
};

const parseConfig = (config: string): Record<string, unknown> => {
  try {
    return JSON.parse(config) as Record<string, unknown>;
  } catch {
    return JSON.parse(extractFirstJsonObject(config)) as Record<
      string,
      unknown
    >;
  }
};

const isCanvasElement = (value: unknown): value is CanvasElement => {
  if (!(value && typeof value === "object")) {
    return false;
  }
  const candidate = value as { id?: unknown; kind?: unknown };
  return (
    typeof candidate.id === "string" &&
    typeof candidate.kind === "string" &&
    CANVAS_ELEMENT_KINDS.has(candidate.kind)
  );
};

const persistentCanvasElements = (
  elements: CanvasElement[],
  persistedImageUrl: string | null
): CanvasElement[] => {
  const persistent: CanvasElement[] = [];
  for (const element of elements) {
    if (element.kind !== "image" || !element.src.startsWith("blob:")) {
      persistent.push(element);
      continue;
    }
    if (element.id === ROLE_IDS.image && persistedImageUrl) {
      persistent.push({ ...element, src: persistedImageUrl });
    }
  }
  return persistent;
};

export const serializeAdVersionConfig = (
  creative: CreativeState,
  canvasElements: CanvasElement[]
): string => {
  const { imageFile: _imageFile, imageUrl, ...creativeWithoutFile } = creative;
  const persistedImageUrl =
    imageUrl && !imageUrl.startsWith("blob:") ? imageUrl : null;
  const savedConfig: SavedAdVersionConfig = {
    canvasElements: persistentCanvasElements(canvasElements, persistedImageUrl),
    creative: { ...creativeWithoutFile, imageUrl: persistedImageUrl },
    version: SAVED_CONFIG_VERSION,
  };
  return JSON.stringify(savedConfig);
};

export const deserializeAdVersionConfig = (
  config: string,
  defaultCreative: CreativeState
): LoadedAdVersionConfig => {
  const parsed = parseConfig(config);
  const hasVersionedCreative =
    parsed.creative !== null && typeof parsed.creative === "object";
  const creative = hasVersionedCreative
    ? (parsed.creative as Partial<CreativeState>)
    : (parsed as Partial<CreativeState>);
  const canvasElements =
    hasVersionedCreative && Array.isArray(parsed.canvasElements)
      ? parsed.canvasElements.filter(isCanvasElement)
      : null;

  return {
    canvasElements,
    creative: { ...defaultCreative, ...creative, imageFile: null },
  };
};
