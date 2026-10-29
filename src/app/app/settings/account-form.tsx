"use client";

import { useActionState } from "react";
import type { Account } from "@/lib/types";
import { updateAccount } from "../actions";

function Field(props: { name: keyof Account; label: string; hint?: string; type?: string; account: Account; required?: boolean }) {
  const value = props.account[props.name];
  return (
    <div>
      <label className="label" htmlFor={props.name}>{props.label}</label>
      <input
        className="input"
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        defaultValue={value == null ? "" : String(value)}
      />
      {props.hint && <p className="mt-1 text-xs text-muted">{props.hint}</p>}
    </div>
  );
}

export function AccountForm({ account }: { account: Account }) {
  const [state, action, pending] = useActionState(updateAccount, undefined);
  return (
    <form action={action} className="space-y-8">
      <section className="card space-y-4 p-6">
        <h2 className="font-medium">Sender</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field account={account} name="sender_name" label="Your name" required />
          <Field account={account} name="sender_title" label="Your title" />
          <Field account={account} name="company_name" label="Company name" required />
          <Field
            account={account}
            name="sender_email"
            label="Sending address"
            type="email"
            required
            hint="Must be on a domain verified in Resend. Use a separate subdomain (e.g. hello@go.acme.com) to protect your main domain."
          />
        </div>
        <Field
          account={account}
          name="postal_address"
          label="Postal address"
          required
          hint="Added to every email's footer, as anti-spam laws (CAN-SPAM, PECR) require."
        />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-medium">Meetings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field account={account} name="timezone" label="Timezone" hint="IANA name, e.g. Europe/London" />
          <Field account={account} name="meeting_minutes" label="Meeting length (minutes)" type="number" />
          <Field account={account} name="working_hours_start" label="Day starts (hour, 0-23)" type="number" />
          <Field account={account} name="working_hours_end" label="Day ends (hour, 1-24)" type="number" />
        </div>
        <Field
          account={account}
          name="meeting_link"
          label="Video call link"
          hint="Zoom/Meet room added to invites. If set, the agent may also share it as the way to book."
        />
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.message && <p className="text-sm text-accent">{state.message}</p>}
      </div>
    </form>
  );
}
