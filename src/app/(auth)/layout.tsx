import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh p-3">
      <div className="frame flex flex-col">
        <header className="flex justify-center px-3 pt-6">
          <div className="rounded-2xl bg-surface px-4 py-0.5 shadow-[var(--shadow-float)] ring-1 ring-line">
            <Logo />
          </div>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10 sm:pt-16">{children}</main>
      </div>
    </div>
  );
}
