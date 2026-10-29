import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4">
      <div className="py-8"><Logo /></div>
      <div className="flex w-full flex-1 items-start justify-center pt-8">{children}</div>
    </div>
  );
}
