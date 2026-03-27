import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {config} from 'dotenv'
import {createClient} from '@sanity/client'
import type {PortableTextBlock} from '@portabletext/types'
import {buildArticleFaqProps} from '../../src/article/buildArticleFaq'
import type {PostDetail} from '../../src/types/article'
import {blocksFromParagraphs} from './blocksFromText'

const studioRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

config({path: resolve(studioRoot, '.env'), quiet: true})
config({path: resolve(studioRoot, '.env.local'), override: true, quiet: true})

const token = process.env.SANITY_API_WRITE_TOKEN?.trim()
if (!token) {
  console.error(
    'Missing SANITY_API_WRITE_TOKEN. Add it to studio-tandra-peters/.env.local or export it in the shell.',
  )
  process.exit(1)
}

const overwrite = process.argv.includes('--overwrite')

const client = createClient({
  projectId: '7irm699i',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

type SanityFaqItem = {
  _key: string
  _type: 'faqItem'
  question: string
  answer: PortableTextBlock[]
}

type PostSeedInput = PostDetail & {
  _id: string
  faq?: {
    items?: Array<{
      _key?: string | null
      question?: string | null
      answer?: PortableTextBlock[] | string | null
    }> | null
  } | null
}

const postsQuery = `
  *[_type == "post" && !(_id in path("drafts.**"))] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    category,
    seoDescription,
    authorName,
    body,
    faq
  }
`

const toBlocks = (value: PortableTextBlock[] | string | null | undefined, keyPrefix: string) => {
  if (Array.isArray(value)) {
    return value
  }

  const text = typeof value === 'string' ? value.trim() : ''
  return text ? blocksFromParagraphs([text], keyPrefix) : undefined
}

const hasAuthoredFaqItems = (post: PostSeedInput) =>
  Array.isArray(post.faq?.items) && post.faq!.items!.some((item) => item?.question?.trim())

const toSanityFaq = (post: PostSeedInput) => {
  const faq = buildArticleFaqProps({...post, faq: undefined})

  const items: SanityFaqItem[] =
    faq.items?.map((item, index) => ({
      _key: `${post._id}-faq-${index}`,
      _type: 'faqItem',
      question: item.question,
      answer: toBlocks(item.answer, `${post._id}-faq-answer-${index}`) ?? [],
    })) ?? []

  return {
    tagline: faq.tagline ?? 'Article FAQ',
    title: faq.title ?? 'Common questions homeowners ask next',
    ...(faq.intro ? {intro: toBlocks(faq.intro, `${post._id}-faq-intro`) ?? []} : {}),
    items,
  }
}

async function main() {
  const posts = await client.fetch<PostSeedInput[]>(postsQuery)
  const targets = posts.filter((post) => overwrite || !hasAuthoredFaqItems(post))

  if (targets.length === 0) {
    console.log(
      overwrite
        ? 'No post documents found to overwrite.'
        : 'All post documents already have authored FAQ items. Use --overwrite to replace them.',
    )
    return
  }

  const tx = client.transaction()

  for (const post of targets) {
    tx.patch(post._id, {
      set: {
        faq: toSanityFaq(post),
      },
    })
  }

  await tx.commit()

  console.log(
    `${overwrite ? 'Overwrote' : 'Seeded'} FAQ content on ${targets.length} post documents.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
