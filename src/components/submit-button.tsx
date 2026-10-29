"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself and says what's happening while the form posts. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
