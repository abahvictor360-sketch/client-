"use client";

import { useActionState } from "react";
import type { Account } from "@/lib/types";
import { updateAccount } from "../actions";

type FieldProps = {
  account: Account;
  name: keyof Account;
  label: string;
  hint?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
};

function Field({ account, name, label, hint, type = "text", required, autoComplete = "off", inputMode, placeholder }: FieldProps) {
  const value = account[name];
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-muted"> (required)</span>}
      </label>
      <input
        className="input"
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        spellCheck={type === "email" ? false : undefined}
        aria-describedby={hintId}
        defaultValue={value == null ? "" : String(value)}
      />
      {hint && <p id={hintId} className="hint">{hint}</p>}
    </div>
  );
}

export function AccountForm({ account }: { account: Account }) {
  const [state, action, pending] = useActionState(updateAccount, undefined);
  return (
    <form action={action} className="space-y-6">
      <fieldset className="panel space-y-5 p-6">
        <legend className="sr-only">Sender</legend>
        <div>
          <h2 className="text-xl">Who the emails come from</h2>
          <p className="mt-1 text-sm text-muted">The agent signs every email with these details.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field account={account} name="sender_name" label="Your name" required autoComplete="name" />
          <Field account={account} name="sender_title" label="Your title" autoComplete="organization-title" />
          <Field account={account} name="company_name" label="Company name" required autoComplete="organization" />
          <Field
            account={account}
            name="sender_email"
            label="Sending address"
            type="email"
            required
            autoComplete="email"
            placeholder="alex@go.acme.com…"
            hint="Must be on a domain verified in Resend. A subdomain keeps your main domain's reputation safe."
          />
        </div>
        <Field
          account={account}
          name="postal_address"
          label="Postal address"
          required
          autoComplete="street-address"
          hint="Shown in every email footer, as anti-spam laws require."
        />
      </fieldset>

      <fieldset className="panel space-y-5 p-6">
        <legend className="sr-only">Meetings</legend>
        <div>
          <h2 className="text-xl">When you take meetings</h2>
          <p className="mt-1 text-sm text-muted">The agent only offers times inside these hours, on weekdays.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field account={account} name="timezone" label="Timezone" placeholder="Europe/London…" hint="IANA name, like America/New_York." />
          <Field account={account} name="meeting_minutes" label="Meeting length in minutes" type="number" inputMode="numeric" />
          <Field account={account} name="working_hours_start" label="Day starts at (hour)" type="number" inputMode="numeric" hint="0–23" />
          <Field account={account} name="working_hours_end" label="Day ends at (hour)" type="number" inputMode="numeric" hint="1–24" />
        </div>
        <Field
          account={account}
          name="meeting_link"
          label="Video call link"
          type="url"
          inputMode="url"
          placeholder="https://meet.google.com/…"
          hint="Added to every invite."
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
        <p aria-live="polite" className="text-sm">
          {state?.error && <span className="text-danger">{state.error}</span>}
          {state?.message && <span className="text-success">Settings saved</span>}
        </p>
      </div>
    </form>
  );
}
