import { redirect } from "next/navigation";
import { updateSchedule } from "../../../actions";
import { ActionForm } from "../action-form";
import { getAccount, getBusiness } from "../data";
import { ScheduleFields } from "../fields";
import { PageHeader } from "../page-header";

export const metadata = { title: "Sending schedule" };

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [business, account] = await Promise.all([getBusiness(id), getAccount()]);
  if (!account) redirect("/app");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Sending schedule"
        description="When the agent sends and how much it may spend. Timezone and meeting hours apply to all your businesses; the limits apply to this one."
      />
      <section className="panel p-5 sm:p-6">
        <ActionForm action={updateSchedule.bind(null, id)} submitLabel="Save schedule">
          <ScheduleFields account={account} business={business} />
        </ActionForm>
      </section>
    </div>
  );
}
