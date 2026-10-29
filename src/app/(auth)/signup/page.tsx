import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ website?: string }> }) {
  const { website } = await searchParams;
  return <AuthForm mode="signup" action={signUp} website={website} />;
}
