/** Build Sanity Portable Text blocks for `pnpm seed` (matches `blockContent` schema). */

export const paragraphBlock = (_key: string, text: string) => ({
  _type: 'block' as const,
  _key,
  style: 'normal' as const,
  markDefs: [] as {_key: string; _type: string; href?: string}[],
  children: [
    {
      _type: 'span' as const,
      _key: `${_key}-span`,
      marks: [] as string[],
      text,
    },
  ],
})

/**
 * @param keyPrefix Unique prefix per field (e.g. `hero-subtitle`, `svc-card-01`) so block
 * `_key`s are not duplicated across the document — Sanity Studio can error on collisions.
 */
export const blocksFromParagraphs = (paragraphs: string[], keyPrefix = 'blk') =>
  paragraphs.map((text, i) => paragraphBlock(`${keyPrefix}-${i}`, text))
