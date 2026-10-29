import { signIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const { next, error, reset } = await searchParams;
  const notice = reset ? "Your password has been changed. Sign in with the new one." : undefined;
  return <AuthForm mode="login" action={signIn} next={next} initialError={error} notice={notice} />;
}
