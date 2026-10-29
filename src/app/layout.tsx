import type { Metadata, Viewport } from "next";
import "./globals.css";

const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop";

export const metadata: Metadata = {
  title: { default: `${name} — 24/7 AI agent that books your sales meetings`, template: `%s · ${name}` },
  description:
    "Paste your website. The agent learns what you sell, finds the buyers, writes each a personal email, handles replies and books meetings.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1222" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
