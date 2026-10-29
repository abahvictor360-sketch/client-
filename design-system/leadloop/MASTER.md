# Leadloop design system

The source of truth for UI decisions. Page-specific overrides go in `pages/<page>.md`.

## Style

Based on the reference the client supplied (a soft, light SaaS look):
- A light gray page with the site sitting in one large framed canvas (32px radius, 6px white edge,
  faint vertical guide lines at the content edges).
- A floating pill navigation bar.
- A centered hero: an announcement chip, a tight headline with one phrase set in a teal glass pill,
  a teal gradient primary button and a white secondary button.
- Three slightly tilted glass cards, each with a small product mock and a caption (small caps
  label + mixed bold and muted text).

## Color (semantic tokens in `src/app/globals.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#E9EAEC` | `#0C0C0E` | Area outside the frame |
| `canvas` | `#F4F4F5` | `#141416` | Inside the frame |
| `surface` | `#FFFFFF` | `#1C1C1F` | Cards, nav, inputs |
| `ink` | `#18181B` | `#F2F2F4` | Text |
| `muted` | `#64646C` | `#A1A1AA` | Secondary text |
| `teal` / `teal-strong` | `#2A8C7B` / `#237F6F` | `#5CC4B2` / `#3AA391` | Primary actions, highlights |
| `teal-soft` / `teal-ink` | `#DCF1EC` / `#1D6B5E` | `#13302B` / `#8FDCCD` | Highlight pill, positive status |

Status always shows a word next to its dot.

## Type

Inter Tight (variable) everywhere. Headlines are semibold with tight tracking (-0.035em to -0.045em).
Numbers use `tabular-nums`.

## Shape and depth

Radius by hierarchy: frame 32px, glass cards 28px, panels 24px, controls 12px, chips fully round.
One soft float shadow (`--shadow-float`) plus a 1px ring for every raised surface.

## Motion

Hero elements rise in once on load (disabled under `prefers-reduced-motion`). Nothing else animates
unless the user acts.
