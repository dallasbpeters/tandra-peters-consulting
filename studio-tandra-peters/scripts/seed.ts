/** Upsert `siteSettings` + `homePage`, upload public images, sync home article refs. `pnpm seed` */
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {config} from 'dotenv'
import {createClient} from '@sanity/client'
import {patchHomePageArticleRefs} from './articlePostsSeed'
import {
  articlesPageSeed,
  homePageSeed,
  siteSettingsNavLogoImageUrl,
  siteSettingsSeed,
} from './seedDefaults'
import {
  uploadImageFromFile,
  uploadImageFromUrl,
  type SanityImageValue,
} from './uploadSanityImages'

type ServiceRow = (typeof homePageSeed.services.services)[number] & {
  image?: SanityImageValue
}
type MissionRow = (typeof homePageSeed.mission.values)[number] & {
  image?: SanityImageValue
}
type ExpertiseRow = (typeof homePageSeed.expertise.items)[number] & {
  image: SanityImageValue
}

type HomePageSeedWithImages = typeof homePageSeed & {
  hero: typeof homePageSeed.hero & {backgroundImage: SanityImageValue}
  about: typeof homePageSeed.about & {image: SanityImageValue}
  services: Omit<typeof homePageSeed.services, 'services'> & {
    services: ServiceRow[]
  }
  mission: Omit<typeof homePageSeed.mission, 'values'> & {values: MissionRow[]}
  expertise: Omit<typeof homePageSeed.expertise, 'items'> & {items: ExpertiseRow[]}
}

const studioRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(studioRoot, '..')
const publicDir = resolve(repoRoot, 'public')

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

const pub = (filename: string) => resolve(publicDir, filename)

async function main() {
  const navLogoImage = await uploadImageFromUrl(
    client,
    siteSettingsNavLogoImageUrl,
    'nav-logo.jpg',
  )

  const sitePayload = {
    ...siteSettingsSeed,
    navLogoImage,
  }

  const homePayload = structuredClone(homePageSeed) as HomePageSeedWithImages

  homePayload.hero.backgroundImage = await uploadImageFromFile(
    client,
    pub('roof.png'),
    'roof.png',
  )
  homePayload.about.image = await uploadImageFromFile(client, pub('tandra.png'), 'tandra.png')

  const s0 = homePayload.services.services[0]
  if (s0) {
    s0.image = await uploadImageFromFile(client, pub('roof-2.jpg'), 'roof-2.jpg')
  }

  const missionFiles = [
    'Image-1774131541900.jpg',
    'Image-1774131578178.jpg',
    'Image-1774131587458.jpg',
  ] as const
  for (let i = 0; i < missionFiles.length; i++) {
    const row = homePayload.mission.values[i]
    const file = missionFiles[i]
    if (row && file) {
      row.image = await uploadImageFromFile(client, pub(file), file)
    }
  }

  const expertiseFiles = ['shingles.jpg', 'metal-roof.jpg', 'commercial.jpg', 'hail-storm.jpg'] as const
  for (let i = 0; i < expertiseFiles.length; i++) {
    const row = homePayload.expertise.items[i]
    const file = expertiseFiles[i]
    if (row && file) {
      row.image = await uploadImageFromFile(client, pub(file), file)
    }
  }

  await client
    .transaction()
    .createOrReplace(sitePayload)
    .createOrReplace(homePayload)
    .createOrReplace(articlesPageSeed)
    .commit()
  console.log('Seeded siteSettings + homePage + articlesPage (with image assets)')
  await patchHomePageArticleRefs(client)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
