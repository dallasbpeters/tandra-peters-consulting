import React, { useCallback } from 'react'
import { defineField, set, type ImageInputProps } from 'sanity'
import { ImageObjectInput } from 'sanity-plugin-gemini-ai-images'
import { geminiStudioApiEndpoint } from '../geminiStudioConfig'

/**
 * `sanity-plugin-gemini-ai-images` calls `onChange` with a plain `{ _type: 'image', asset: { _ref } }`
 * object. Sanity v5 expects form patches — use `set()` or the form throws and shows "Failed to save image".
 */
type GeminiImageValue = {
  _type: 'image'
  asset: {
    _type: 'reference'
    _ref: string
  }
}

const isGeminiImageObject = (v: unknown): v is GeminiImageValue => {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const o = v as Record<string, unknown>
  if (o._type !== 'image' || typeof o.asset !== 'object' || o.asset === null) {
    return false
  }
  const asset = o.asset as Record<string, unknown>
  return asset._type === 'reference' && typeof asset._ref === 'string'
}

const GeminiImageInput = (props: ImageInputProps) => {
  const { onChange, ...rest } = props

  const handleChange = useCallback<ImageInputProps['onChange']>(
    (event) => {
      if (isGeminiImageObject(event)) {
        onChange(set(event))
        return
      }
      onChange(event)
    },
    [onChange],
  )

  return (
    <ImageObjectInput
      {...rest}
      onChange={handleChange}
      enableAIGeneration
      apiEndpoint={geminiStudioApiEndpoint}
    />
  )
}

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
