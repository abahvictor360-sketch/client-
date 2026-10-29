/** The "paste your website" entry point used on the landing page. Submits to signup. */
export function WebsiteForm({ id, buttonLabel = "Start free" }: { id: string; buttonLabel?: string }) {
  return (
    <form action="/signup" className="w-full max-w-xl">
      <label htmlFor={id} className="label">
        Your website
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          name="website"
          required
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder="acme.com…"
          className="input min-h-12 flex-1 text-base"
        />
        <button className="btn-primary min-h-12">{buttonLabel}</button>
      </div>
    </form>
  );
}
