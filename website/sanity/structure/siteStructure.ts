/**
 * Desk structure for the site workspace (/studio). Everything is as Sanity's
 * default, except Voyages: opening a voyage shows its details and a list of
 * its legs in order, where new legs come pre-linked to the voyage.
 */
import type { StructureResolver } from "sanity/structure";
import type { Template } from "sanity";

export const LEG_FOR_VOYAGE_TEMPLATE = "passage-for-voyage";

/** "New leg" from a voyage's leg list: voyage reference pre-filled. */
export const legForVoyageTemplate: Template = {
  id: LEG_FOR_VOYAGE_TEMPLATE,
  title: "Leg for this voyage",
  schemaType: "passage",
  parameters: [{ name: "voyageId", type: "string" }],
  value: ({ voyageId }: { voyageId: string }) => ({
    voyage: { _type: "reference", _ref: voyageId },
  }),
};

/** Legs of one voyage, in order: `order` first, then planned start. */
export const LEGS_OF_VOYAGE_FILTER = '_type == "passage" && voyage._ref == $voyageId';

export const siteStructure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .id("voyages")
        .title("Voyages")
        .schemaType("voyage")
        .child(
          S.documentTypeList("voyage")
            .title("Voyages")
            .child((voyageId) =>
              S.list()
                .id(`voyage-${voyageId}`)
                .title("Voyage")
                .items([
                  S.listItem()
                    .id("details")
                    .title("Voyage details")
                    .child(S.document().schemaType("voyage").documentId(voyageId)),
                  S.listItem()
                    .id("legs")
                    .title("Legs, in order")
                    .schemaType("passage")
                    .child(
                      S.documentList()
                        .id(`legs-${voyageId}`)
                        .title("Legs")
                        .schemaType("passage")
                        .filter(LEGS_OF_VOYAGE_FILTER)
                        .params({ voyageId })
                        .defaultOrdering([
                          { field: "order", direction: "asc" },
                          { field: "plannedStart", direction: "asc" },
                        ])
                        .initialValueTemplates([S.initialValueTemplateItem(LEG_FOR_VOYAGE_TEMPLATE, { voyageId })])
                    ),
                ])
            )
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => item.getId() !== "voyage"),
    ]);
