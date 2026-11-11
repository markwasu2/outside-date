# Downloaded save history

The downloaded-save path constructed a separate snapshot and omitted the current-month order history that autosave now retains. A real export/import replay reproduced the gap: the game position survived, but the next report forgot those orders.

Export and autosave now use the same complete snapshot. Downloading or importing never replays an order or charges its cost again. Existing save compatibility and optional-history storage fallback remain unchanged.

Verified 720 unit tests, 184 browser cases, seven built-app checks and lint/build. The real-control journey downloads a save, checks its state and current orders match autosave, imports it through the title-screen file input and finishes the month. The report retains all three decisions and Land + Foundation. Inspected the actual built imported result.
