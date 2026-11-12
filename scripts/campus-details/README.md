# Supplementary campus geometry

These authored SVG groups add the detailed utility service faces, energized cabinets office-entry rails and steel-frame bracing. `campus-art.py` includes them when it generates the matching assets. Keep edits here rather than patching generated files alone.

The office entry belongs inside its scene's shadow group. Utility details are appended after that group, preserving their existing treatment. The generator's hall-only option leaves all non-hall assets untouched.

After editing, run `python scripts/campus-art.py`. A clean regeneration without source edits must leave every campus asset byte-for-byte unchanged. `npm test` also checks each source fragment is present exactly once in its matching asset.
