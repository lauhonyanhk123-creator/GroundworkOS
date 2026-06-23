---
name: GroundworkOS preview screenshot clipping
description: Why app_preview screenshots show right-edge clipping that is NOT a real CSS overflow bug
---

# Preview screenshots crop a fixed-width render

The `app_preview` screenshot of the GroundworkOS web artifact shows content (and even the
non-scrolling top header bar with Search/bell) clipped at the right edge with the `p-6`
right padding missing.

**This is a screenshot/preview-render artifact, not a CSS horizontal-overflow bug.**

**Why:** The preview iframe renders the page at a fixed logical width (~1500px) regardless
of the `viewport_size` passed to the screenshot tool, then crops to the requested frame.
Decisive proof: the clip position is *pixel-identical* at viewport widths 1100, 1280, and
1440. Real row/flex overflow would clip dramatically more at 1100 (narrower content area)
than at 1440 — instead it does not change at all.

**How to apply:** Do not "fix" this by adding `overflow-x-hidden` hacks or collapsing the
layout — the layout uses proper `min-w-0` + responsive flex with no fixed widths and is
correct. If reviewing via screenshot, judge layout from the left/center; the right-edge
crop is not representative. An architect reasoning purely from source (no runtime) may flag
this as a real overflow — runtime viewport-comparison evidence overrides that.
