import type {StructureResolver} from 'sanity/structure'

const SINGLETONS = new Set(['homePage', 'siteSettings'])

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
      S.divider(),
      ...S.documentTypeListItems().filter((item) => !SINGLETONS.has(item.getId() || '')),
    ])
