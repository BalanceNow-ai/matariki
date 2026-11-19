import { crewPagePublic } from "@/lib/crew/visibility";
import { CrewBrief } from "./CrewBrief";

export default function CrewBriefPage() {
  return <CrewBrief showApplyLink={crewPagePublic()} />;
}
