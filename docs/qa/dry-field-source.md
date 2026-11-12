# Preserve dry-field source

The authored dry-field asset has its complete editable source in `scripts/campus-templates/tile-dry-field.svg`. The generator copies matching full templates byte-for-byte before using procedural geometry. Partial detail fragments keep their existing path. The unit source test requires the dry-field template to equal the shipped asset.

Verification: 747 unit checks, lint and build pass. A clean temporary full generation now reproduces all 33 generated campus assets byte-for-byte. No shipped game assets changed, and no visual or gameplay behavior changed. The original dry-field built and live visual checks remain applicable.
