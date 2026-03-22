import React from 'react'
import {defineField} from 'sanity'
import {ImageObjectInput} from 'sanity-plugin-gemini-ai-images'
import {geminiStudioApiEndpoint} from '../geminiStudioConfig'

/** Plugin typings target older Sanity `ImageInputProps`; Studio v5 passes compatible `ObjectInputProps`. */
const GeminiImageInput = (props: Record<string, unknown>) => (
  <ImageObjectInput
    {...(props as unknown as React.ComponentProps<typeof ImageObjectInput>)}
    enableAIGeneration
    apiEndpoint={geminiStudioApiEndpoint}
  />
)

type GeminiImageOpts = {
  name: string
  title?: string
  description?: string
  /** Use Sanity image rules, e.g. `(rule) => rule.required()` */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validation?: (rule: any) => any
}

export const defineGeminiImage = (opts: GeminiImageOpts) =>
  defineField({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    type: 'image',
    options: {hotspot: true},
    validation: opts.validation,
    components: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: GeminiImageInput as any,
    },
  })
