---
name: Canvas mockup workflow
description: How to render a mockup-sandbox component as a live canvas iframe and present it
---

Rendering an isolated UI mockup on the canvas (GroundworkOS redesign explorations):

- Components live in `artifacts/mockup-sandbox/src/components/mockups/<group>/`. A `_group.css` holds tokens/font @imports; each component does `import "./_group.css"` and wraps output in a single root with a matching className (e.g. `gw-root`) so tokens apply. Do NOT edit the sandbox's own `index.css`.
- Preview URL pattern: `https://${REPLIT_DOMAINS}/__mockup/preview/{folder}/{Component}` — NO port number. The `mockup-sandbox` dev server must be running first so the Vite plugin picks up new files.
- The reserved canvas iframe is updated via `applyCanvasActions` (camelCase keys): set `shapeType:"iframe"`, `state` ("building"→"live"), `url`, `componentName`.
- **Present the canvas to the user with `presentArtifact({ artifactId, shapeIds })`.** The artifacts skill abbreviates this callback as `n`, but the real registered name in code_execution is `presentArtifact` — `n` is undefined. Design-canvas artifactId for this repl = the "Canvas" artifact id.

**Why:** Lost a cycle calling `n(...)` (ReferenceError) before using `presentArtifact`. Building once and faithfully deepening the existing GroundworkOS "Technical Survey" theme (rather than inventing a new look) is the right call when a design system already exists.
