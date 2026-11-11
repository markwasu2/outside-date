# Preserve authored detail through regeneration

Full campus regeneration previously removed supplementary office-entry rails, energized substation cabinets and utility service faces because those groups existed only in the output SVGs. Their authored groups now live under scripts/campus-details, and the generator includes each in its matching asset with its existing shadow placement.

Verification:
- Full generation was compared against the pre-change SHA-256 of every campus SVG. Zero byte changes.
- 736 unit tests across 86 files pass. New test checks each supplementary source is included exactly once in the matching asset.
- Lint and production build pass. Existing large-chunk advisory remains.
- No runtime code or shipped asset changes. The identical assets were already verified through the PR213 fourteen-journey production replay and inspected day/night pixels.

This change protects future edits. It does not change current art, game behavior, money, timeline or repository visibility.
