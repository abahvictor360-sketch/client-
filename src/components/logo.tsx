import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop";
  return (
    <Link href={href} className="flex items-center gap-2 text-xl font-medium tracking-tight">
      <span aria-hidden className="grid grid-cols-2 gap-0.5">
        <span className="h-2 w-2 bg-muted/40" />
        <span className="h-2 w-2 bg-accent" />
        <span className="h-2 w-2 bg-muted/40" />
        <span className="h-2 w-2 bg-muted/40" />
      </span>
      {name.toLowerCase()}
    </Link>
  );
}
