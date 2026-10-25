import { PageHeader } from "@/components/ui";
import FeedbackClient from "./FeedbackClient";
import { getStore } from "@/lib/data/store";
export default async function Page() {
  const S = getStore();
  return (<><PageHeader title="Feedback" sub="Concept: how users would send comments about the dashboard." /><FeedbackClient samples={S.feedback.map((f) => ({ id: f.feedback_id, category: f.category, rating: f.rating, comment: f.comment, role: f.role_label, date: f.submitted_date }))} /></>);
}
