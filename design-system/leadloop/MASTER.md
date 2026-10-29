# Leadloop design system

The source of truth for UI decisions. Page-specific overrides go in `pages/<page>.md`.

## Idea

Leadloop is an agent that works the night shift. The memorable element is **the overnight log**:
a timestamped record of what the agent did while you slept, ending in a booked meeting at dawn.
Everything else stays quiet so that log carries the page.

## Color (semantic tokens in `src/app/globals.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#F6F7F9` | `#0E1222` | Page background (cool, never cream) |
| `surface` | `#FFFFFF` | `#151A2E` | Panels, inputs |
| `ink` | `#141A2E` | `#E8ECF5` | Text, primary buttons |
| `muted` | `#586178` | `#9AA3BC` | Secondary text (≥4.5:1 on paper) |
| `night` | `#1B2550` | `#0A0E1C` | The overnight log and agent surfaces |
| `dawn` | `#F2A93B` | `#F2B24D` | Only for "meeting booked" moments and the live indicator |

Status uses text + dot, never color alone.

## Type

- **Bricolage Grotesque** (variable): headings and the hero; tight leading, weight 600.
- **Public Sans** (variable): body and UI; 16px base, 1.55 line height.
- Numbers in tables, prices and timestamps use `tabular-nums`, not a monospace face.
- Sentence case everywhere. No ALL-CAPS labels, no single accented word in headlines, no arrows in button text.

## Layout

- Max width 72rem, 16px side gutter on mobile. Content is left aligned; only short closing CTAs center.
- Radius by hierarchy: panels 20px, controls 10px, pills fully rounded.
- Sections are separated by space and a timeline, not stacks of identical cards.

## Motion

One orchestrated moment: overnight log entries reveal in sequence on load (disabled under
`prefers-reduced-motion`). Everything else is instant or answers a user action.

## Quality floor

Visible `:focus-visible` rings, skip link, labelled inputs with `autocomplete`, 44px touch targets,
URL-reflected tabs, empty states that tell you what to do next, `color-scheme` and `theme-color` set.
