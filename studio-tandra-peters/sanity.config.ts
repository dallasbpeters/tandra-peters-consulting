import {
  assist,
  defineAssistFieldAction,
  defineAssistFieldActionGroup,
  defineFieldActionDivider,
  isType,
  useUserInput,
} from "@sanity/assist";
import type { AssistFieldActionProps } from "@sanity/assist";
import type { SanityClient } from "@sanity/client";
import { contextPlugin } from "@sanity/context/studio";
import { StarFilledIcon } from "@sanity/icons";
import { visionTool } from "@sanity/vision";
import { useMemo } from "react";
import { defineConfig } from "sanity";
import type { SchemaType } from "sanity";
import { iconPicker } from "sanity-plugin-icon-picker";
import {
  defineDocuments,
  defineLocations,
  presentationTool,
} from "sanity/presentation";
import { structureTool } from "sanity/structure";

import {
  LazyEmailPreviewTool,
  LazyFalImageStudioTool,
  LazyGaDashboardTool,
  LazyImageManagerTool,
  LazyRemotionVideoTool,
  LazyDeskTool,
} from "./components/lazy-studio-tools";
import { useStudioClient } from "./hooks/useStudioClient";
import { schemaTypes } from "./schemaTypes";
import { structure } from "./structure";
import { studioFlags } from "./studioFlags";

// @sanity/client's TransformTargetDocument omits _type and initialValues from the
// createIfNotExists variant in its TypeScript types, but the Sanity API accepts them.
// Without _type the API cannot create a draft when none exists yet.
interface TransformTargetCreateIfNotExists {
  _id: string;
  _type?: string;
  initialValues?: Record<string, unknown>;
  operation: "createIfNotExists";
}

const configuredPreviewOrigin = process.env.SANITY_STUDIO_PREVIEW_URL?.replace(
  // oxlint-disable-next-line require-unicode-regexp
  /\/$/,
  ""
);
const isLocalPreviewOrigin =
  configuredPreviewOrigin?.startsWith("http://localhost") ||
  configuredPreviewOrigin?.startsWith("http://127.0.0.1");

const previewOrigin =
  process.env.NODE_ENV === "production" && isLocalPreviewOrigin
    ? "https://www.tandra.me"
    : configuredPreviewOrigin ||
      (process.env.NODE_ENV === "production"
        ? "https://www.tandra.me"
        : "http://localhost:3001");

const BRAND_TONE_CONTEXT_ID = "assist-context-brand-tone";
const CUSTOM_AI_CONTEXT_ID = "aiContext";

interface PortableTextChild {
  _type?: string;
  text?: string;
}

interface PortableTextBlockLike {
  _type?: string;
  children?: PortableTextChild[];
}

interface BrandToneContextPayload {
  assistContext?: {
    title?: string;
    context?: PortableTextBlockLike[];
  } | null;
  customContext?: {
    instructions?: string;
    businessPriorities?: string[];
    guardrails?: string[];
    targetKeywords?: string[];
  } | null;
}

const blocksToPlainText = (
  blocks: PortableTextBlockLike[] | undefined
): string => {
  if (!Array.isArray(blocks)) {
    return "";
  }
  return blocks
    .map((block) =>
      Array.isArray(block.children)
        ? block.children
            .filter(
              (child) =>
                child?._type === "span" && typeof child.text === "string"
            )
            .map((child) => child.text?.trim())
            .filter(Boolean)
            .join("")
        : ""
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
};

const isPortableTextField = (schemaType: SchemaType): boolean => {
  if (!isType(schemaType, "array")) {
    return false;
  }
  const members = "of" in schemaType ? schemaType.of : undefined;
  return (
    Array.isArray(members) && members.some((member) => isType(member, "block"))
  );
};

const isRewriteableField = (schemaType: SchemaType): boolean => {
  if (
    isType(schemaType, "boolean") ||
    isType(schemaType, "number") ||
    isType(schemaType, "date") ||
    isType(schemaType, "datetime") ||
    isType(schemaType, "url") ||
    isType(schemaType, "email") ||
    isType(schemaType, "slug") ||
    isType(schemaType, "reference") ||
    isType(schemaType, "crossDatasetReference") ||
    isType(schemaType, "image") ||
    isType(schemaType, "file") ||
    isType(schemaType, "geopoint")
  ) {
    return false;
  }

  return (
    isType(schemaType, "string") ||
    isType(schemaType, "text") ||
    isPortableTextField(schemaType) ||
    isType(schemaType, "object") ||
    isType(schemaType, "array")
  );
};

const buildDocumentRewriteInstruction = (goal: string) =>
  `
Rewrite the targeted document or field using the Brand Tone of Voice context below as the highest-priority style guide.

Brand Tone of Voice context:
$brandContext

Rewrite goal:
${goal}

Rules:
- Preserve the factual meaning of the source content.
- Do not invent metrics, warranties, service areas, or promises.
- Keep proper nouns, product names, and links intact unless a rewrite clearly improves clarity.
- Prefer warm, practical, homeowner-friendly language over generic marketing copy.
- Avoid cold, corporate, or overly mechanical positioning. Do not use phrases like "Architectural Advisor" unless the editor explicitly asks for them.
- Use the most natural point of view for the content. Do not force first-person, third-person, or any other perspective if it makes the copy feel unnatural.
- If the target includes multiple fields, rewrite only the text-bearing parts and leave structural data intact.
`.trim();

const loadBrandToneContext = async (client: SanityClient): Promise<string> => {
  const data = await client.fetch<BrandToneContextPayload>(
    `{
      "assistContext": *[_id == $assistId][0]{
        title,
        context
      },
      "customContext": *[_id == $customId][0]{
        instructions,
        businessPriorities,
        guardrails,
        targetKeywords
      }
    }`,
    {
      assistId: BRAND_TONE_CONTEXT_ID,
      customId: CUSTOM_AI_CONTEXT_ID,
    }
  );

  const assistText = blocksToPlainText(data?.assistContext?.context);
  const custom = data?.customContext;
  const customParts = [
    custom?.instructions ? `Core direction:\n${custom.instructions}` : "",
    custom?.businessPriorities?.length
      ? `Business priorities:\n- ${custom.businessPriorities.join("\n- ")}`
      : "",
    custom?.guardrails?.length
      ? `Guardrails:\n- ${custom.guardrails.join("\n- ")}`
      : "",
    custom?.targetKeywords?.length
      ? `Important phrases to use naturally when relevant:\n- ${custom.targetKeywords.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [assistText, customParts].filter(Boolean).join("\n\n").trim();
};

const buildRewriteInstruction = (goal: string) =>
  `
Rewrite the targeted field using the Brand Tone of Voice context below as the highest-priority style guide.

Brand Tone of Voice context:
$brandContext

Rewrite goal:
${goal}

Rules:
- Preserve factual meaning and any claims already supported by the source field.
- Do not invent metrics, warranties, service areas, or promises.
- Keep proper nouns, product names, and links intact unless the rewrite clearly improves grammar.
- Prefer warm, practical, homeowner-friendly language over generic marketing copy.
- Avoid cold, corporate, or overly mechanical positioning. Do not use phrases like "Architectural Advisor" unless the editor explicitly asks for them.
- Use the most natural point of view for the field. Do not force first-person, third-person, or any other perspective if it makes the copy feel unnatural.
- Return only the rewritten field in the same language as the source.

Current field value:
$field
`.trim();

const createBrandVoiceAction = (
  title: string,
  goal: string,
  props: AssistFieldActionProps,
  client: SanityClient
) =>
  defineAssistFieldAction({
    onAction: async () => {
      const brandContext = await loadBrandToneContext(client);
      await client.agent.action.transform({
        conditionalPaths: {
          paths: props.getConditionalPaths(),
        },
        documentId: props.documentIdForAction,
        instruction: buildRewriteInstruction(goal),
        instructionParams: {
          brandContext,
          field: { path: props.path, type: "field" },
        },
        schemaId: props.schemaId,
        target: props.path.length ? { path: props.path } : undefined,
        targetDocument: {
          _id: props.documentIdForAction,
          _type: props.documentSchemaType.name,
          initialValues: props.getDocumentValue(),
          operation: "createIfNotExists",
        } as TransformTargetCreateIfNotExists as never,
      });
    },
    title,
  });

const createDocumentBrandVoiceAction = (
  title: string,
  goal: string,
  props: AssistFieldActionProps,
  client: SanityClient
) =>
  defineAssistFieldAction({
    onAction: async () => {
      const brandContext = await loadBrandToneContext(client);
      await client.agent.action.transform({
        conditionalPaths: {
          paths: props.getConditionalPaths(),
        },
        documentId: props.documentIdForAction,
        instruction: buildDocumentRewriteInstruction(goal),
        instructionParams: {
          brandContext,
        },
        schemaId: props.schemaId,
        targetDocument: {
          _id: props.documentIdForAction,
          _type: props.documentSchemaType.name,
          initialValues: props.getDocumentValue(),
          operation: "createIfNotExists",
        } as TransformTargetCreateIfNotExists as never,
      });
    },
    title,
  });

const brandVoiceFieldActions = {
  title: "Brand voice rewrites",
  useFieldActions: (props: AssistFieldActionProps) => {
    const {
      actionType,
      documentIdForAction,
      documentSchemaType,
      getConditionalPaths,
      getDocumentValue,
      path,
      schemaId,
      schemaType,
    } = props;
    const client = useStudioClient({ apiVersion: "vX" });
    const getUserInput = useUserInput();

    return useMemo(() => {
      if (actionType === "field" && !isRewriteableField(schemaType)) {
        return [];
      }

      const actionProps: AssistFieldActionProps = {
        actionType,
        documentIdForAction,
        documentSchemaType,
        getConditionalPaths,
        getDocumentValue,
        path,
        schemaId,
        schemaType,
      };

      if (actionType === "document") {
        return [
          defineAssistFieldActionGroup({
            children: [
              createDocumentBrandVoiceAction(
                "Rewrite document in brand voice",
                "Rewrite the document so it sounds unmistakably like the Tandra/Birdcreek brand voice while preserving the original meaning of each text-bearing field.",
                actionProps,
                client
              ),
              createDocumentBrandVoiceAction(
                "Warm up document tone",
                "Make the document warmer, more human, and more conversational without sounding salesy or over-polished.",
                actionProps,
                client
              ),
              createDocumentBrandVoiceAction(
                "Tighten document for clarity",
                "Make the document clearer and tighter. Remove fluff, sharpen the language, and keep it practical and easy to trust.",
                actionProps,
                client
              ),
              defineFieldActionDivider(),
              defineAssistFieldAction({
                onAction: async () => {
                  const input = await getUserInput({
                    inputs: [
                      {
                        description:
                          "Describe what should change across the document, such as warmer, shorter, clearer, or more local.",
                        id: "goal",
                        title: "Rewrite goal",
                      },
                    ],
                    title: "Custom rewrite goal",
                  });
                  const goal = input?.[0]?.result?.trim();
                  if (!goal) {
                    return;
                  }
                  const brandContext = await loadBrandToneContext(client);
                  await client.agent.action.transform({
                    conditionalPaths: {
                      paths: getConditionalPaths(),
                    },
                    documentId: documentIdForAction,
                    instruction: buildDocumentRewriteInstruction(goal),
                    instructionParams: {
                      brandContext,
                    },
                    schemaId,
                    targetDocument: {
                      _id: documentIdForAction,
                      _type: documentSchemaType.name,
                      initialValues: getDocumentValue(),
                      operation: "createIfNotExists",
                    } as TransformTargetCreateIfNotExists as never,
                  });
                },
                title: "Custom document rewrite...",
              }),
            ],
            title: "Brand voice rewrites",
          }),
        ];
      }

      return [
        defineAssistFieldActionGroup({
          children: [
            createBrandVoiceAction(
              "Rewrite in brand voice",
              "Rewrite this content so it sounds unmistakably like the Tandra/Birdcreek brand voice while preserving the original meaning.",
              actionProps,
              client
            ),
            createBrandVoiceAction(
              "Warm up the tone",
              "Make this content warmer, more human, and more conversational without sounding salesy or over-polished.",
              actionProps,
              client
            ),
            createBrandVoiceAction(
              "Tighten for clarity",
              "Make this content clearer and tighter. Remove fluff, sharpen the language, and keep it practical and easy to trust.",
              actionProps,
              client
            ),
            createBrandVoiceAction(
              "Strengthen trust",
              "Rewrite this content to feel more reassuring, credible, and confidence-building for homeowners while staying grounded in the original facts.",
              actionProps,
              client
            ),
            defineFieldActionDivider(),
            defineAssistFieldAction({
              onAction: async () => {
                const input = await getUserInput({
                  inputs: [
                    {
                      description:
                        "Describe what should change, such as shorter, clearer, more local, or more homeowner-friendly.",
                      id: "goal",
                      title: "Rewrite goal",
                    },
                  ],
                  title: "Custom rewrite goal",
                });
                const goal = input?.[0]?.result?.trim();
                if (!goal) {
                  return;
                }
                const brandContext = await loadBrandToneContext(client);
                await client.agent.action.transform({
                  conditionalPaths: {
                    paths: getConditionalPaths(),
                  },
                  documentId: documentIdForAction,
                  instruction: buildRewriteInstruction(goal),
                  instructionParams: {
                    brandContext,
                    field: { path, type: "field" },
                  },
                  schemaId,
                  target: path.length ? { path } : undefined,
                  targetDocument: {
                    _id: documentIdForAction,
                    _type: documentSchemaType.name,
                    initialValues: getDocumentValue(),
                    operation: "createIfNotExists",
                  } as TransformTargetCreateIfNotExists as never,
                });
              },
              title: "Custom rewrite...",
            }),
          ],
          title: "Brand voice rewrites",
        }),
      ];
    }, [
      actionType,
      client,
      documentIdForAction,
      documentSchemaType,
      getConditionalPaths,
      getDocumentValue,
      getUserInput,
      path,
      schemaId,
      schemaType,
    ]);
  },
};

// oxlint-disable-next-line sort-keys
export default defineConfig({
  name: "default",
  title: "Tandra Peters",
  basePath: "/studio",
  icon: StarFilledIcon,
  projectId: "7irm699i",
  dataset: "production",
  appId: "on6anif3y43e3t03oiwrgp30",
  tools: (prev) => [
    ...prev,
    {
      component: LazyDeskTool,
      name: "desk",
      title: "Desk",
    },
    {
      component: LazyImageManagerTool,
      name: "image-manager",
      title: "Image Manager",
    },
    {
      component: LazyFalImageStudioTool,
      name: "fal-image-studio",
      title: "AI Image Studio",
    },
    {
      component: LazyEmailPreviewTool,
      name: "email-preview",
      title: "Email Preview",
    },
    {
      component: LazyRemotionVideoTool,
      name: "videos",
      title: "Videos",
    },
    {
      component: LazyGaDashboardTool,
      name: "analytics",
      title: "Analytics",
    },
  ],

  // AI Assist: open any document → ✨ in the document header → “Manage instructions” → “Enable AI assistance”
  // once per project (creates the “Sanity AI” token). Growth plan+ required. Custom fieldActions need this enabled.
  plugins: [
    contextPlugin(),
    assist({
      fieldActions: brandVoiceFieldActions,
    }),
    structureTool({ structure }),
    iconPicker(),
    ...(studioFlags.presentation
      ? [
          presentationTool({
            allowOrigins: [
              "http://localhost:*",
              "http://127.0.0.1:*",
              "https://www.tandra.me",
              "https://tandra.me",
            ],
            previewUrl: {
              initial: previewOrigin,
            },
            resolve: {
              locations: {
                articlesPage: defineLocations({
                  resolve: () => ({
                    locations: [{ href: "/articles", title: "Articles" }],
                  }),
                  select: { id: "_id" },
                }),
                homePage: defineLocations({
                  resolve: () => ({
                    locations: [{ href: "/", title: "Home" }],
                  }),
                  select: { id: "_id" },
                }),
                insuranceFaqsPage: defineLocations({
                  resolve: () => ({
                    locations: [
                      { href: "/insurance-faqs", title: "Insurance FAQs" },
                    ],
                  }),
                  select: { id: "_id" },
                }),
                post: defineLocations({
                  resolve: (doc) => {
                    const slug =
                      typeof doc?.slug === "string" ? doc.slug.trim() : "";
                    const title =
                      typeof doc?.title === "string" && doc.title.trim()
                        ? doc.title.trim()
                        : "Article";
                    if (!slug) {
                      return { locations: [{ href: "/articles", title }] };
                    }
                    return {
                      locations: [{ href: `/articles/${slug}`, title }],
                    };
                  },
                  select: { slug: "slug.current", title: "title" },
                }),
                roofInspectionsPage: defineLocations({
                  resolve: () => ({
                    locations: [
                      { href: "/roof-inspections", title: "Roof inspections" },
                    ],
                  }),
                  select: { id: "_id" },
                }),
                siteSettings: defineLocations({
                  resolve: () => ({
                    locations: [
                      { href: "/", title: "Home" },
                      { href: "/desk", title: "Desk" },
                      { href: "/privacy", title: "Privacy" },
                      { href: "/terms", title: "Terms" },
                      { href: "/cookies", title: "Cookies" },
                    ],
                  }),
                  select: { id: "_id" },
                }),
                workflowPage: defineLocations({
                  resolve: () => ({
                    locations: [
                      { href: "/workflow", title: "Insurance workflow" },
                    ],
                  }),
                  select: { id: "_id" },
                }),
              },
              mainDocuments: defineDocuments([
                { filter: `_type == "homePage"`, route: "/" },
                {
                  filter: `_id == "roofInspectionsPage"`,
                  route: "/roof-inspections",
                },
                { filter: `_id == "articlesPage"`, route: "/articles" },
                { filter: `_id == "workflowPage"`, route: "/workflow" },
                {
                  filter: `_id == "insuranceFaqsPage"`,
                  route: "/insurance-faqs",
                },
                {
                  resolve: ({ params }) => {
                    const slug = params.slug?.trim();
                    if (!slug) {
                      return;
                    }
                    return {
                      filter: `_type == "post" && slug.current == $slug`,
                      params: { slug },
                    };
                  },
                  route: "/articles/:slug",
                },
                { filter: `_type == "siteSettings"`, route: "/privacy" },
                { filter: `_type == "siteSettings"`, route: "/desk" },
                { filter: `_type == "siteSettings"`, route: "/terms" },
                { filter: `_type == "siteSettings"`, route: "/cookies" },
              ]),
            },
          }),
        ]
      : []),
    ...(studioFlags.vision ? [visionTool()] : []),
  ],

  schema: {
    types: schemaTypes,
  },
});
