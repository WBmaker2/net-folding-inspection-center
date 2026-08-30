# Education Web App Redesign Asset Record

## Review date and policy

- Review date: 2026-08-29
- Source: `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center`
- Safety reference: `/Users/kimhongnyeon/.codex/skills/education-webapp-redesign/references/asset-safety.md`
- `imagegen`: not run. No new or replacement image is required for the redesign.

## Inventory

| Original path | Screen and role | Claim carried by asset | Decision | New file | Accessibility | Rollback |
|---|---|---|---|---|---|---|
| `public/favicon.svg` | browser tab and app identity | app mark/brand identity | automatic replacement prohibited; retain | none | document icon has title/description; no student-facing meaning | restore the existing `index.html` favicon reference if future work changes it |
| `src/components/net2d/FaceTile.tsx` inline SVG symbols | every 2D net, learning evidence | face number and geometric symbol used to distinguish six faces | retain; this is instructional geometry, not decoration | none | SVG is `aria-hidden`; button `aria-label` carries face number and position | revert only CSS classes; keep the inline SVG geometry unchanged |
| `src/components/net3d/FoldScene.tsx` Three.js meshes | folding screen | computed face relationship visualization | retain; generated from domain scene model, not an image file | none | Canvas remains `aria-hidden`; relation table/live region provides text equivalent | restore prior viewer CSS/props without changing domain calculation |

## Search result

No `img`, `srcset`, CSS `url()`, raster file, photo, chart, map, logo import, or preload image was found beyond the favicon and inline/mesh geometry listed above. The redesign changes surfaces and layout only, so there is no asset path or fixture to update.

## Review status

Asset audit complete. No generated asset exists, no source asset was overwritten, and no human source/licence approval is pending. The current instructional symbols and 3D model remain the source of truth for geometry; CSS decoration must not add labels or numbers that could be mistaken for data.
