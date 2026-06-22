---
name: GroundworkOS design system
description: "Technical Survey" light mode aesthetic — palette, fonts, key conventions for all future UI work
---

# GroundworkOS Design System — "Technical Survey"

**Why:** Client requested a whole new UI using the frontend-design skill. Previous design was dark SaaS-minimal (black bg, yellow accent, Barlow). New design is grounded in civil engineering — warm concrete, surveying instruments, site drawings.

## Palette (CSS variables in index.css)
- `--bg: #f0ede8` — warm concrete white (main background)
- `--surface: #fafaf8` — panel/card surface
- `--surface-2: #eeeae4` — hover / secondary surface
- `--border: #d9d4ce` — borders
- `--ink: #181410` — primary text (warm near-black)
- `--muted: #7a7469` — secondary text
- `--muted-2: #a8a099` — tertiary text
- `--accent: #1b5e78` — Survey Blue (active nav, datum headers, primary buttons)
- `--accent-bg: #e8f3f7` — accent tint background
- `--success: #2a6e45`
- `--warning: #b56918`
- `--danger: #c13a2a`

## Typography
- Display/UI labels/buttons: **Space Grotesk** (wght 400–700) — geometric, precise
- Body: **Inter** (wght 400–500)
- Data/job numbers/codes: **JetBrains Mono** (wght 400–500)
- All loaded via Google Fonts in index.css

## Signature element
"Datum line" panel/section headers: uppercase Space Grotesk 600, `color: #1b5e78`, `letter-spacing: 0.1em` — references datum elevation markers on site drawings.

## Key component conventions
- **Sidebar active state**: 3px left bar in `#1b5e78` + `backgroundColor: #e8f3f7`
- **Panel.tsx** title: datum line style (Survey Blue uppercase)
- **StatCard.tsx** left border: `3px solid #1b5e78` (accent) or `3px solid #c13a2a` (danger)
- **Btn.tsx** primary: `backgroundColor: #1b5e78, color: #ffffff`
- **Badge.tsx**: light-mode rgba backgrounds (0.08–0.12 opacity), matching semantic text colors
- Selected row indicator: `2px solid #1b5e78` (accent blue, not ink)
- Tab underline active: `2px solid #1b5e78`

## How to apply
Any new page or component must use these tokens. Never introduce `#0a0a0a`, `#111111`, `#1a1a1a`, `#e2e2e2`, `#5a5a5a` (those are the old dark-mode values — they're gone). Use inline styles or CSS vars from the token list above.
