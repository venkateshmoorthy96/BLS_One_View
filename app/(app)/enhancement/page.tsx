import { PageHeader } from "@/components/ui";
import RoadmapClient from "./RoadmapClient";
import { getStore } from "@/lib/data/store";
export default async function Page() {
  const S = getStore();
  const features = S.roadmap.map((r) => ({ id: r.feature_id, title: r.title, description: r.description, category: r.category, status: r.status, quarter: r.target_quarter, priority: r.priority, votes: r.seed_votes }));
  return (<><PageHeader title="Enhancement" sub="Concept: a place for users to see and prioritise proposed improvements to the platform." /><RoadmapClient features={features} /></>);
}
