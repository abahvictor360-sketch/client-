import { verifyUnsubscribeToken } from "@/lib/email";

export const metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const valid = verifyUnsubscribeToken(token) !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
      {!valid ? (
        <p className="text-muted">This unsubscribe link isn&apos;t valid. Use the link from the most recent email.</p>
      ) : done ? (
        <>
          <h1 className="text-3xl">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-muted">You won&apos;t receive any more emails from us.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl">Unsubscribe?</h1>
          <p className="mt-2 text-muted">Confirm and we&apos;ll stop emailing this address.</p>
          <form action={`/api/unsubscribe/${token}`} method="post" className="mt-6">
            <button className="btn-primary">Unsubscribe</button>
          </form>
        </>
      )}
    </main>
  );
}
