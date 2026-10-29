"use client";

import { useEffect } from "react";

/**
 * Landing page motion helpers: reveals [data-reveal] elements as they scroll
 * into view, and flags the page as scrolled (the header styles off it).
 */
export function PageMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => root.toggleAttribute("data-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-in");
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      targets.forEach((el) => observer!.observe(el));
    } else {
      targets.forEach((el) => el.classList.add("is-in"));
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      root.removeAttribute("data-scrolled");
    };
  }, []);
  return null;
}
