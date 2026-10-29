import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ website?: string; about?: string }> }) {
  const { website, about } = await searchParams;
  return <AuthForm mode="signup" action={signUp} website={website} about={about} />;
}
