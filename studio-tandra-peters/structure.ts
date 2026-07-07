import type { StructureResolver } from "sanity/structure";

const SINGLETONS = new Set([
  "homePage",
  "siteSettings",
  "roofInspectionsPage",
  "articlesPage",
  "workflowPage",
  "insuranceFaqsPage",
  "estimatorPage",
  "aiContext",
  "seoDashboardInsights",
  "clientEmail",
  "emailSignature",
  "roofSceneSettings",
  "stormSpotSettings",
  "roofValueSettings",
  "customSlotsSettings",
  "helpingTexasHomeownersSettings",
  "tandraIntroSettings",
]);

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Home page")
        .child(
          S.document()
            .schemaType("homePage")
            .documentId("homePage")
            .title("Home page")
        ),
      S.listItem()
        .title("Site settings")
        .child(
          S.document()
            .schemaType("siteSettings")
            .documentId("siteSettings")
            .title("Site settings")
        ),
      S.listItem()
        .title("Roof inspections page")
        .child(
          S.document()
            .schemaType("roofInspectionsPage")
            .documentId("roofInspectionsPage")
            .title("Roof inspections page")
        ),
      S.listItem()
        .title("AI context")
        .child(
          S.document()
            .schemaType("aiContext")
            .documentId("aiContext")
            .title("AI context")
        ),
      S.listItem()
        .title("SEO dashboard")
        .child(
          S.document()
            .schemaType("seoDashboardInsights")
            .documentId("seoDashboardInsights")
            .title("SEO dashboard")
        ),
      S.listItem()
        .title("Desk leads")
        .id("desk-leads-section")
        .child(
          S.documentTypeList("deskLead")
            .id("desk-leads-documents")
            .title("Desk leads")
            .defaultOrdering([{ direction: "desc", field: "capturedAt" }])
        ),
      S.listItem()
        .title("Canvassing targets")
        .id("desk-canvass-targets-section")
        .child(
          S.documentTypeList("deskCanvassTarget")
            .id("desk-canvass-targets-documents")
            .title("Canvassing targets")
            .defaultOrdering([{ direction: "desc", field: "updatedAt" }])
        ),
      S.listItem()
        .title("Insurance workflow")
        .child(
          S.document()
            .schemaType("workflowPage")
            .documentId("workflowPage")
            .title("Insurance claim workflow")
        ),
      S.listItem()
        .title("Insurance FAQs")
        .child(
          S.document()
            .schemaType("insuranceFaqsPage")
            .documentId("insuranceFaqsPage")
            .title("Insurance FAQs page")
        ),
      S.listItem()
        .title("Estimator page")
        .child(
          S.document()
            .schemaType("estimatorPage")
            .documentId("estimatorPage")
            .title("Estimator page")
        ),
      S.listItem()
        .title("Articles")
        .id("desk-articles-section")
        .child(
          S.list()
            .id("articles-hub")
            .title("Articles")
            .items([
              S.listItem()
                .title("Articles page")
                .id("desk-articles-page")
                .child(
                  S.document()
                    .schemaType("articlesPage")
                    .documentId("articlesPage")
                    .title("Articles page")
                ),
              // Static `documentTypeList` child (not `documentTypeListItem`): the list-item’s lazy
              // resolver depends on `parent.items.find(id)` and often fails when nested under
              // another list, which produced an empty pane.
              S.listItem()
                .title("Posts")
                .id("desk-articles-posts")
                .child(
                  S.documentTypeList("post")
                    .id("articles-post-documents")
                    .title("Posts")
                    .defaultOrdering([
                      { direction: "desc", field: "publishedAt" },
                    ])
                ),
            ])
        ),
      S.listItem()
        .title("Emails")
        .id("desk-emails-section")
        .child(
          S.list()
            .id("emails-hub")
            .title("Emails")
            .items([
              S.listItem()
                .title("Client email")
                .id("desk-client-email")
                .child(
                  S.document()
                    .schemaType("clientEmail")
                    .documentId("clientEmail")
                    .title("Client email")
                ),
              S.listItem()
                .title("Email signature")
                .id("desk-email-signature")
                .child(
                  S.document()
                    .schemaType("emailSignature")
                    .documentId("emailSignature")
                    .title("Email signature")
                ),
              S.listItem()
                .title("Contacts")
                .id("desk-email-contacts")
                .child(
                  S.documentTypeList("emailContact")
                    .id("email-contacts-documents")
                    .title("Contacts")
                    .defaultOrdering([
                      { direction: "desc", field: "lastContactedAt" },
                    ])
                ),
            ])
        ),
      S.listItem()
        .title("Video ad settings")
        .id("desk-video-ads-section")
        .child(
          S.list()
            .id("video-ads-hub")
            .title("Video ad settings")
            .items([
              S.listItem()
                .title("3D Roof Scene")
                .id("desk-roof-scene")
                .child(
                  S.document()
                    .schemaType("roofSceneSettings")
                    .documentId("roofSceneSettings")
                    .title("3D Roof Scene")
                ),
              S.listItem()
                .title("Storm Spot Ad")
                .id("desk-storm-spot")
                .child(
                  S.document()
                    .schemaType("stormSpotSettings")
                    .documentId("stormSpotSettings")
                    .title("Storm Spot Ad")
                ),
              S.listItem()
                .title("Roof Value Ad")
                .id("desk-roof-value")
                .child(
                  S.document()
                    .schemaType("roofValueSettings")
                    .documentId("roofValueSettings")
                    .title("Roof Value Ad")
                ),
              S.listItem()
                .title("Custom Slots Ad")
                .id("desk-custom-slots")
                .child(
                  S.document()
                    .schemaType("customSlotsSettings")
                    .documentId("customSlotsSettings")
                    .title("Custom Slots Ad")
                ),
              S.listItem()
                .title("Tandra Intro Video")
                .id("desk-tandra-intro")
                .child(
                  S.document()
                    .schemaType("tandraIntroSettings")
                    .documentId("tandraIntroSettings")
                    .title("Tandra Intro Video")
                ),
              S.listItem()
                .title("Helping Texas Homeowners Ad")
                .id("desk-helping-texas")
                .child(
                  S.document()
                    .schemaType("helpingTexasHomeownersSettings")
                    .documentId("helpingTexasHomeownersSettings")
                    .title("Helping Texas Homeowners Ad")
                ),
            ])
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() || "";
        // `emailContact` is placed under the Emails hub above.
        return (
          !SINGLETONS.has(id) &&
          id !== "post" &&
          id !== "emailContact" &&
          id !== "deskLead" &&
          id !== "deskCanvassTarget"
        );
      }),
    ]);
