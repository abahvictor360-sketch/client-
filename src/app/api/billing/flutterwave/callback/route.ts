import { NextResponse } from "next/server";
import { settleFlutterwaveTransaction } from "@/lib/flutterwave";

// Flutterwave sends the customer back here after checkout. The payment is
// verified server-side before any credits are added.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const transactionId = url.searchParams.get("transaction_id");
  const back = (result: string) => NextResponse.redirect(new URL(`/app/billing?payment=${result}`, url.origin));

  if (status === "cancelled") return back("cancelled");
  if (!transactionId) return back("error");
  try {
    const result = await settleFlutterwaveTransaction(transactionId);
    return back(result.ok ? "success" : "failed");
  } catch (err) {
    console.error("Flutterwave verification failed", err);
    return back("pending");
  }
}
