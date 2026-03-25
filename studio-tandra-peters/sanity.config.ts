import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {geminiAIImages} from 'sanity-plugin-gemini-ai-images'
import {agentContextPlugin} from '@sanity/agent-context/studio'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {geminiStudioApiEndpoint} from './geminiStudioConfig'
import {
  assist,
  defineAssistFieldAction,
  defineAssistFieldActionGroup,
  defineFieldActionDivider,
  isType,
  useUserInput,
  type AssistFieldActionProps,
} from '@sanity/assist'
import {useMemo} from 'react'
import {useClient, type SchemaType} from 'sanity'

// @sanity/client's TransformTargetDocument omits _type and initialValues from the
// createIfNotExists variant in its TypeScript types, but the Sanity API accepts them.
// Without _type the API cannot create a draft when none exists yet.
type TransformTargetCreateIfNotExists = {
  operation: 'createIfNotExists'
  _id: string
  _type?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialValues?: Record<string, any>
}

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'production' ? 'https://www.tandra.me' : 'http://localhost:3000')

const BRAND_TONE_CONTEXT_ID = 'assist-context-brand-tone'
const CUSTOM_AI_CONTEXT_ID = 'aiContext'

type PortableTextChild = {
  _type?: string
  text?: string
}

type PortableTextBlockLike = {
  _type?: string
  children?: PortableTextChild[]
}

type BrandToneContextPayload = {
  assistContext?: {
    title?: string
    context?: PortableTextBlockLike[]
  } | null
  customContext?: {
    instructions?: string
    businessPriorities?: string[]
    guardrails?: string[]
    targetKeywords?: string[]
  } | null
}

const blocksToPlainText = (blocks: PortableTextBlockLike[] | undefined): string => {
  if (!Array.isArray(blocks)) {
    return ''
  }
  return blocks
    .map((block) =>
      Array.isArray(block.children)
        ? block.children
            .filter((child) => child?._type === 'span' && typeof child.text === 'string')
            .map((child) => child.text?.trim())
            .filter(Boolean)
            .join('')
        : '',
    )
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

const isPortableTextField = (schemaType: SchemaType): boolean => {
  if (!isType(schemaType, 'array')) {
    return false
  }
  const members = 'of' in schemaType ? schemaType.of : undefined
  return Array.isArray(members) && members.some((member) => isType(member, 'block'))
}

const isRewriteableField = (schemaType: SchemaType): boolean => {
  if (
    isType(schemaType, 'boolean') ||
    isType(schemaType, 'number') ||
    isType(schemaType, 'date') ||
    isType(schemaType, 'datetime') ||
    isType(schemaType, 'url') ||
    isType(schemaType, 'email') ||
    isType(schemaType, 'slug') ||
    isType(schemaType, 'reference') ||
    isType(schemaType, 'crossDatasetReference') ||
    isType(schemaType, 'image') ||
    isType(schemaType, 'file') ||
    isType(schemaType, 'geopoint')
  ) {
    return false
  }

  return (
    isType(schemaType, 'string') ||
    isType(schemaType, 'text') ||
    isPortableTextField(schemaType) ||
    isType(schemaType, 'object') ||
    isType(schemaType, 'array')
  )
}

const buildDocumentRewriteInstruction = (goal: string) => `
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
`.trim()

const loadBrandToneContext = async (client: ReturnType<typeof useClient>): Promise<string> => {
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
    },
  )

  const assistText = blocksToPlainText(data?.assistContext?.context)
  const custom = data?.customContext
  const customParts = [
    custom?.instructions ? `Core direction:\n${custom.instructions}` : '',
    custom?.businessPriorities?.length
      ? `Business priorities:\n- ${custom.businessPriorities.join('\n- ')}`
      : '',
    custom?.guardrails?.length ? `Guardrails:\n- ${custom.guardrails.join('\n- ')}` : '',
    custom?.targetKeywords?.length
      ? `Important phrases to use naturally when relevant:\n- ${custom.targetKeywords.join('\n- ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return [assistText, customParts].filter(Boolean).join('\n\n').trim()
}

const buildRewriteInstruction = (goal: string) => `
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
`.trim()

const createBrandVoiceAction = (
  title: string,
  goal: string,
  props: AssistFieldActionProps,
  client: ReturnType<typeof useClient>,
) =>
  defineAssistFieldAction({
    title,
    onAction: async () => {
      const brandContext = await loadBrandToneContext(client)
      await client.agent.action.transform({
        schemaId: props.schemaId,
        documentId: props.documentIdForAction,
        targetDocument: {
          operation: 'createIfNotExists',
          _id: props.documentIdForAction,
          _type: props.documentSchemaType.name,
          initialValues: props.getDocumentValue(),
        } as TransformTargetCreateIfNotExists as never,
        instruction: buildRewriteInstruction(goal),
        instructionParams: {
          brandContext,
          field: {type: 'field', path: props.path},
        },
        target: props.path.length ? {path: props.path} : undefined,
        conditionalPaths: {
          paths: props.getConditionalPaths(),
        },
      })
    },
  })

const createDocumentBrandVoiceAction = (
  title: string,
  goal: string,
  props: AssistFieldActionProps,
  client: ReturnType<typeof useClient>,
) =>
  defineAssistFieldAction({
    title,
    onAction: async () => {
      const brandContext = await loadBrandToneContext(client)
      await client.agent.action.transform({
        schemaId: props.schemaId,
        documentId: props.documentIdForAction,
        targetDocument: {
          operation: 'createIfNotExists',
          _id: props.documentIdForAction,
          _type: props.documentSchemaType.name,
          initialValues: props.getDocumentValue(),
        } as TransformTargetCreateIfNotExists as never,
        instruction: buildDocumentRewriteInstruction(goal),
        instructionParams: {
          brandContext,
        },
        conditionalPaths: {
          paths: props.getConditionalPaths(),
        },
      })
    },
  })

const brandVoiceFieldActions = {
  title: 'Brand voice rewrites',
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
    } = props
    const client = useClient({apiVersion: 'vX'})
    const getUserInput = useUserInput()
    const pathKey = JSON.stringify(path)

    return useMemo(() => {
      if (actionType === 'field' && !isRewriteableField(schemaType)) {
        return []
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
      }

      if (actionType === 'document') {
        return [
          defineAssistFieldActionGroup({
            title: 'Brand voice rewrites',
            children: [
              createDocumentBrandVoiceAction(
                'Rewrite document in brand voice',
                'Rewrite the document so it sounds unmistakably like the Tandra/Birdcreek brand voice while preserving the original meaning of each text-bearing field.',
                actionProps,
                client,
              ),
              createDocumentBrandVoiceAction(
                'Warm up document tone',
                'Make the document warmer, more human, and more conversational without sounding salesy or over-polished.',
                actionProps,
                client,
              ),
              createDocumentBrandVoiceAction(
                'Tighten document for clarity',
                'Make the document clearer and tighter. Remove fluff, sharpen the language, and keep it practical and easy to trust.',
                actionProps,
                client,
              ),
              defineFieldActionDivider(),
              defineAssistFieldAction({
                title: 'Custom document rewrite...',
                onAction: async () => {
                  const input = await getUserInput({
                    title: 'Custom rewrite goal',
                    inputs: [
                      {
                        id: 'goal',
                        title: 'Rewrite goal',
                        description:
                          'Describe what should change across the document, such as warmer, shorter, clearer, or more local.',
                      },
                    ],
                  })
                  const goal = input?.[0]?.result?.trim()
                  if (!goal) {
                    return
                  }
                  const brandContext = await loadBrandToneContext(client)
                  await client.agent.action.transform({
                    schemaId,
                    documentId: documentIdForAction,
                    targetDocument: {
                      operation: 'createIfNotExists',
                      _id: documentIdForAction,
                      _type: documentSchemaType.name,
                      initialValues: getDocumentValue(),
                    } as TransformTargetCreateIfNotExists as never,
                    instruction: buildDocumentRewriteInstruction(goal),
                    instructionParams: {
                      brandContext,
                    },
                    conditionalPaths: {
                      paths: getConditionalPaths(),
                    },
                  })
                },
              }),
            ],
          }),
        ]
      }

      return [
        defineAssistFieldActionGroup({
          title: 'Brand voice rewrites',
          children: [
            createBrandVoiceAction(
              'Rewrite in brand voice',
              'Rewrite this content so it sounds unmistakably like the Tandra/Birdcreek brand voice while preserving the original meaning.',
              actionProps,
              client,
            ),
            createBrandVoiceAction(
              'Warm up the tone',
              'Make this content warmer, more human, and more conversational without sounding salesy or over-polished.',
              actionProps,
              client,
            ),
            createBrandVoiceAction(
              'Tighten for clarity',
              'Make this content clearer and tighter. Remove fluff, sharpen the language, and keep it practical and easy to trust.',
              actionProps,
              client,
            ),
            createBrandVoiceAction(
              'Strengthen trust',
              'Rewrite this content to feel more reassuring, credible, and confidence-building for homeowners while staying grounded in the original facts.',
              actionProps,
              client,
            ),
            defineFieldActionDivider(),
            defineAssistFieldAction({
              title: 'Custom rewrite...',
              onAction: async () => {
                const input = await getUserInput({
                  title: 'Custom rewrite goal',
                  inputs: [
                    {
                      id: 'goal',
                      title: 'Rewrite goal',
                      description:
                        'Describe what should change, such as shorter, clearer, more local, or more homeowner-friendly.',
                    },
                  ],
                })
                const goal = input?.[0]?.result?.trim()
                if (!goal) {
                  return
                }
                const brandContext = await loadBrandToneContext(client)
                await client.agent.action.transform({
                  schemaId,
                  documentId: documentIdForAction,
                  targetDocument: {
                    operation: 'createIfNotExists',
                    _id: documentIdForAction,
                    _type: documentSchemaType.name,
                    initialValues: getDocumentValue(),
                  } as TransformTargetCreateIfNotExists as never,
                  instruction: buildRewriteInstruction(goal),
                  instructionParams: {
                    brandContext,
                    field: {type: 'field', path},
                  },
                  target: path.length ? {path} : undefined,
                  conditionalPaths: {
                    paths: getConditionalPaths(),
                  },
                })
              },
            }),
          ],
        }),
      ]
    }, [
      actionType,
      client,
      documentIdForAction,
      documentSchemaType,
      getConditionalPaths,
      getDocumentValue,
      getUserInput,
      path,
      pathKey,
      schemaId,
      schemaType,
    ])
  },
}

export default defineConfig({
  name: 'default',
  title: 'Tandra Peters',
  basePath: '/studio',

  projectId: '7irm699i',
  dataset: 'production',

  plugins: [
    agentContextPlugin(),
    assist({
      fieldActions: brandVoiceFieldActions,
    }),
    geminiAIImages({
      apiEndpoint: geminiStudioApiEndpoint,
      enableStandaloneTool: true,
    }),
    structureTool({structure}),
    presentationTool({
      previewUrl: {
        initial: previewOrigin,
      },
      allowOrigins: [
        'http://localhost:*',
        'http://127.0.0.1:*',
        'https://www.tandra.me',
        'https://tandra.me',
      ],
      resolve: {
        mainDocuments: defineDocuments([
          {route: '/', filter: `_type == "homePage"`},
          {route: '/articles', filter: `_id == "articlesPage"`},
          {
            route: '/articles/:slug',
            resolve: ({params}) => {
              const slug = params.slug?.trim()
              if (!slug) {
                return undefined
              }
              return {
                filter: `_type == "post" && slug.current == $slug`,
                params: {slug},
              }
            },
          },
          {route: '/privacy', filter: `_type == "siteSettings"`},
          {route: '/terms', filter: `_type == "siteSettings"`},
          {route: '/cookies', filter: `_type == "siteSettings"`},
        ]),
        locations: {
          homePage: defineLocations({
            select: {id: '_id'},
            resolve: () => ({
              locations: [{title: 'Home', href: '/'}],
            }),
          }),
          siteSettings: defineLocations({
            select: {id: '_id'},
            resolve: () => ({
              locations: [
                {title: 'Home', href: '/'},
                {title: 'Privacy', href: '/privacy'},
                {title: 'Terms', href: '/terms'},
                {title: 'Cookies', href: '/cookies'},
              ],
            }),
          }),
          articlesPage: defineLocations({
            select: {id: '_id'},
            resolve: () => ({
              locations: [{title: 'Articles', href: '/articles'}],
            }),
          }),
          post: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => {
              const slug =
                typeof doc?.slug === 'string' ? doc.slug.trim() : ''
              const title =
                typeof doc?.title === 'string' && doc.title.trim()
                  ? doc.title.trim()
                  : 'Article'
              if (!slug) {
                return {locations: [{title, href: '/articles'}]}
              }
              return {
                locations: [{title, href: `/articles/${slug}`}],
              }
            },
          }),
        },
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
