import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie and guards /app.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;
  const protectedPage = pathname.startsWith("/app") || pathname.startsWith("/admin") || pathname === "/reset-password";
  if (!user && protectedPage) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  // Signed-in visitors skip the auth forms. A website pasted on the landing
  // page goes straight to the campaign form, which starts the analysis.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const target = request.nextUrl.clone();
    target.search = "";
    target.pathname = "/app";
    const website = searchParams.get("website");
    const about = searchParams.get("about");
    if (website) target.searchParams.set("website", website);
    else if (about) target.searchParams.set("about", about);
    const next = searchParams.get("next");
    if (next && (next.startsWith("/app") || next.startsWith("/admin"))) return NextResponse.redirect(new URL(next, request.url));
    return NextResponse.redirect(target);
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/admin", "/login", "/signup", "/reset-password"],
};
