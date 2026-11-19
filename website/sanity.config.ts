import { defineConfig } from "sanity";
import { structureTool, type StructureResolver } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemas";
import { crewApplication } from "./sanity/crew-schemas/crewApplication";
import { legForVoyageTemplate, siteStructure } from "./sanity/structure/siteStructure";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "your-project-id";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
// Applications live in a separate PRIVATE dataset. Studio users read it with
// their own login; the website reads it only server-side with a token.
const crewDataset = process.env.NEXT_PUBLIC_SANITY_CREW_DATASET || "crew";

const STATUS_VIEWS: [string, string][] = [
  ["submitted", "Awaiting review"],
  ["shortlisted", "Shortlisted"],
  ["accepted", "Accepted"],
  ["declined", "Declined"],
  ["interviewing", "Interview in progress"],
  ["draft", "Unfinished drafts"],
  ["withdrawn", "Withdrawn"],
];

const crewStructure: StructureResolver = (S) =>
  S.list()
    .title("Crew applications")
    .items([
      ...STATUS_VIEWS.map(([status, title]) =>
        S.listItem()
          .id(status)
          .title(title)
          .child(
            S.documentList()
              .title(title)
              .schemaType("crewApplication")
              .filter('_type == "crewApplication" && status == $status')
              .params({ status })
              .defaultOrdering([{ field: "createdAt", direction: "desc" }])
          )
      ),
      S.divider(),
      S.documentTypeListItem("crewApplication").title("All applications"),
    ]);

export default defineConfig([
  {
    name: "matariki-studio",
    title: "Matariki III",
    projectId,
    dataset,
    basePath: "/studio",
    plugins: [structureTool({ structure: siteStructure }), visionTool()],
    schema: { types: schemaTypes, templates: (prev) => [...prev, legForVoyageTemplate] },
  },
  {
    name: "crew",
    title: "Crew applications (private)",
    projectId,
    dataset: crewDataset,
    basePath: "/studio/crew",
    plugins: [structureTool({ structure: crewStructure })],
    schema: { types: [crewApplication] },
    document: {
      // Applications are created by the website, never by hand.
      newDocumentOptions: () => [],
      actions: (prev) => prev.filter((a) => !["duplicate"].includes(a.action ?? "")),
    },
  },
]);
