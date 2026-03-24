import type {StructureResolver} from 'sanity/structure'

const SINGLETONS = new Set(['homePage', 'siteSettings', 'articlesPage', 'aiContext', 'seoDashboardInsights'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Home page')
        .child(S.document().schemaType('homePage').documentId('homePage').title('Home page')),
      S.listItem()
        .title('Site settings')
        .child(
          S.document().schemaType('siteSettings').documentId('siteSettings').title('Site settings'),
        ),
      S.listItem()
        .title('AI context')
        .child(S.document().schemaType('aiContext').documentId('aiContext').title('AI context')),
      S.listItem()
        .title('SEO dashboard')
        .child(
          S.document()
            .schemaType('seoDashboardInsights')
            .documentId('seoDashboardInsights')
            .title('SEO dashboard'),
        ),
      S.listItem()
        .title('Articles')
        .id('desk-articles-section')
        .child(
          S.list()
            .id('articles-hub')
            .title('Articles')
            .items([
              S.listItem()
                .title('Articles page')
                .id('desk-articles-page')
                .child(
                  S.document()
                    .schemaType('articlesPage')
                    .documentId('articlesPage')
                    .title('Articles page'),
                ),
              // Static `documentTypeList` child (not `documentTypeListItem`): the list-item’s lazy
              // resolver depends on `parent.items.find(id)` and often fails when nested under
              // another list, which produced an empty pane.
              S.listItem()
                .title('Posts')
                .id('desk-articles-posts')
                .child(
                  S.documentTypeList('post')
                    .id('articles-post-documents')
                    .title('Posts')
                    .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
                ),
            ]),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() || ''
        return !SINGLETONS.has(id) && id !== 'post'
      }),
    ])
