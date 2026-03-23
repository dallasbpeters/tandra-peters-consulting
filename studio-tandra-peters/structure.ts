import type {StructureResolver} from 'sanity/structure'

const SINGLETONS = new Set(['homePage', 'siteSettings', 'articlesPage'])

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
              // Use Sanity’s built-in type list item so the lazy child resolver gets a correct
              // parent context (a plain documentList under a nested list often renders empty).
              S.documentTypeListItem('post').title('Posts'),
            ]),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() || ''
        return !SINGLETONS.has(id) && id !== 'post'
      }),
    ])
