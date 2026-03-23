/** Upsert only the `articlesPage` singleton. Does not touch posts, home, or site settings. `pnpm seed:articles-page` */
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {config} from 'dotenv'
import {createClient} from '@sanity/client'
import {articlesPageSeed} from './seedDefaults'

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

const client = createClient({
  projectId: '7irm699i',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

async function main() {
  await client.createOrReplace(articlesPageSeed)
  console.log('Seeded articlesPage only (_id: articlesPage)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
