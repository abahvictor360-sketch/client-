import type { Account, Business } from "@/lib/types";


export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

const hours = Array.from({ length: 25 }, (_, h) => h);
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

function timezones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}

/** Timezone, working hours, and (for a campaign) daily limits. */
export function ScheduleFields({ account, business }: { account: Account; business?: Business }) {
  const zones = timezones();
  return (
    <>
      <Field id="timezone" label="Your timezone" hint="Emails go out on weekdays, 8:00–18:00 in this timezone. Meetings are offered in it too.">
        <select id="timezone" name="timezone" className="input" defaultValue={account.timezone}>
          {!zones.includes(account.timezone) && <option value={account.timezone}>{account.timezone}</option>}
          {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
        </select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="working_hours_start" label="You take meetings from">
          <select id="working_hours_start" name="working_hours_start" className="input" defaultValue={account.working_hours_start}>
            {hours.slice(0, 23).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </Field>
        <Field id="working_hours_end" label="Until">
          <select id="working_hours_end" name="working_hours_end" className="input" defaultValue={account.working_hours_end}>
            {hours.slice(2).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </Field>
      </div>
      {business && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="daily_budget" label="Daily budget (USD)" hint="The agent stops for the day when it reaches this.">
            <input className="input tabular-nums" id="daily_budget" name="daily_budget" type="number" min={0} max={10000} step="0.5"
              inputMode="decimal" autoComplete="off" defaultValue={business.daily_budget_cents / 100} />
          </Field>
          <Field id="max_emails_per_day" label="Most emails per day" hint="New domains should start under 50 a day.">
            <input className="input tabular-nums" id="max_emails_per_day" name="max_emails_per_day" type="number" min={0} max={500}
              inputMode="numeric" autoComplete="off" defaultValue={business.max_emails_per_day} />
          </Field>
        </div>
      )}
    </>
  );
}

const FACTS = [
  { key: "pricing", label: "Pricing", hint: "Plans and prices, what each includes, free trials or discounts, billing options.", placeholder: "e.g. Websites from ₦450,000. Monthly IT support from ₦60,000. First month free for new clients." },
  { key: "capabilities", label: "Capabilities and integrations", hint: "What you can and can't do, tools you work with, turnaround times.", placeholder: "e.g. We build on WordPress and Next.js, connect Paystack and Flutterwave, and launch in 3 weeks." },
  { key: "proof", label: "Proof and case studies", hint: "Clients, results and numbers the agent may mention.", placeholder: "e.g. Rebuilt Ade Foods' site; online orders up 40% in two months." },
] as const;

/** What the reply agent may quote when prospects ask questions. */
export function FactsFields({ business }: { business: Business }) {
  return (
    <>
      {FACTS.map((f) => (
        <Field key={f.key} id={`fact-${f.key}`} label={f.label} hint={`${f.hint} The agent only quotes what you write here.`}>
          <textarea id={`fact-${f.key}`} name={f.key} rows={3} maxLength={1000} className="input min-h-24 py-2.5"
            placeholder={f.placeholder} defaultValue={business.facts?.[f.key] ?? ""} />
        </Field>
      ))}
    </>
  );
}

/** Name, title, company and booking link the agent signs with. */
export function SenderFields({ account }: { account: Account }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="sender_name" label="Sender name">
          <input id="sender_name" name="sender_name" className="input" required autoComplete="name" defaultValue={account.sender_name ?? ""} placeholder="Ada Okafor…" />
        </Field>
        <Field id="sender_title" label="Title (optional)">
          <input id="sender_title" name="sender_title" className="input" autoComplete="organization-title" defaultValue={account.sender_title ?? ""} placeholder="Founder…" />
        </Field>
      </div>
      <Field id="company_name" label="Company name">
        <input id="company_name" name="company_name" className="input" required autoComplete="organization" defaultValue={account.company_name ?? ""} />
      </Field>
      <Field id="meeting_link" label="Booking link (optional)" hint="Shared when a prospect wants to pick their own time. Otherwise the agent offers slots in your working hours.">
        <input id="meeting_link" name="meeting_link" type="url" inputMode="url" className="input" defaultValue={account.meeting_link ?? ""} placeholder="https://calendly.com/your-handle/30min" />
      </Field>
    </>
  );
}
