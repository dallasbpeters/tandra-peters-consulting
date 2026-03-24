import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {geminiAIImages} from 'sanity-plugin-gemini-ai-images'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {geminiStudioApiEndpoint} from './geminiStudioConfig'
import {assist} from '@sanity/assist'

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'production' ? 'https://www.tandra.me' : 'http://localhost:3000')

export default defineConfig({
  name: 'default',
  title: 'Tandra Peters',
  basePath: '/studio',

  projectId: '7irm699i',
  dataset: 'production',

  plugins: [
    assist(),
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
