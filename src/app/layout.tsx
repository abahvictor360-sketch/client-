import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/pwa";
import "./globals.css";

const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop";

export const metadata: Metadata = {
  title: { default: `${name} — 24/7 AI agent that books your sales meetings`, template: `%s · ${name}` },
  description:
    "Paste your website. The agent learns what you sell, finds the buyers, writes each a personal email, handles replies and books meetings.",
  applicationName: name,
  appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the installed app draw under the notch; layouts pad with safe-area insets.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141416" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
