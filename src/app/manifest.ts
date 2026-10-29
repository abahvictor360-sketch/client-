import type { MetadataRoute } from "next";

const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name,
    short_name: name,
    description: "Your AI sales agent: finds buyers, emails them, answers replies and books meetings.",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f4f5",
    theme_color: "#f4f4f5",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Billing", url: "/app/billing", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
