import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getBusiness } from "../../data";
import { PageHeader } from "../../page-header";
import { NewSegmentForm } from "../campaign-ui";

export const maxDuration = 300;
export const metadata = { title: "New buyer type" };

export default async function NewSegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getBusiness(id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/app/b/${id}/targeting`} className="btn-quiet -ml-3">
        <ChevronLeft size={16} aria-hidden="true" /> Targeting
      </Link>
      <PageHeader title="New buyer type" description="Add another kind of business for the agent to reach. It runs alongside your other buyer types and shares the same budget." />
      <section className="panel p-5 sm:p-6">
        <NewSegmentForm businessId={id} />
      </section>
    </div>
  );
}
