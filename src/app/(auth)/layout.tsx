import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4">
      <header className="mx-auto w-full max-w-6xl py-3"><Logo /></header>
      <main className="flex flex-1 items-start justify-center pb-16 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}
