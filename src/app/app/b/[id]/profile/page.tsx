import { updateProfile } from "../../../actions";
import { ActionForm } from "../action-form";
import { CompetitorsEditor } from "../competitors";
import { DeleteCampaignButton } from "../controls";
import { businessLabel, getBusiness } from "../data";
import { FactsFields, Field } from "../fields";
import { PageHeader } from "../page-header";

export const metadata = { title: "Business profile" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getBusiness(id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Business profile"
        description="What the agent knows about your business. It writes every email and reply from this, so keep it accurate."
      />
      <section aria-labelledby="pitch-title" className="panel p-5 sm:p-6">
        <h2 id="pitch-title" className="mb-5 text-lg">What you sell</h2>
        <ActionForm action={updateProfile.bind(null, id)} submitLabel="Save profile">
          <Field id="name" label="Business name">
            <input id="name" name="name" className="input" required maxLength={120} defaultValue={business.name ?? ""} />
          </Field>
          <Field id="summary" label="What you do">
            <textarea id="summary" name="summary" rows={3} required maxLength={600} className="input min-h-24 py-2.5" defaultValue={business.summary ?? ""} />
          </Field>
          <Field id="offer" label="Your offer" hint="What the agent invites people to: a call, a free audit, a trial…">
            <textarea id="offer" name="offer" rows={2} maxLength={600} className="input min-h-20 py-2.5" defaultValue={business.offer ?? ""} />
          </Field>
          <Field id="value_props" label="Why customers choose you" hint="One reason per line.">
            <textarea id="value_props" name="value_props" rows={4} className="input min-h-28 py-2.5" defaultValue={business.value_props.join("\n")} />
          </Field>
          <div className="border-t border-line pt-5">
            <h3 className="text-base font-semibold">Facts for replies</h3>
            <p className="mt-1 text-sm text-muted">When prospects ask, the agent answers from these instead of guessing.</p>
          </div>
          <FactsFields business={business} />
        </ActionForm>
      </section>
      <section aria-label="Competitors" className="panel p-5 sm:p-6">
        <CompetitorsEditor id={id} competitors={business.competitors} />
      </section>
      <section aria-labelledby="danger-title" className="panel flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div>
          <h2 id="danger-title" className="text-lg">Delete this business</h2>
          <p className="mt-1 text-sm text-muted">Removes its buyer types, people and conversations permanently.</p>
        </div>
        <DeleteCampaignButton id={id} name={businessLabel(business)} />
      </section>
    </div>
  );
}
