# Order history across reloads

Cold replay found that cash, points and active work survived a reload, but the next monthly result forgot orders placed before it. Buying land and ordering the foundation then showed just the event decision and omitted the land milestone.

Saves now retain an optional current-month audit: the state before the first order and the orders already charged. Loading does not replay those orders or add them to the new undo scope. New orders can still be undone without changing the restored history. The audit clears when the month ends, an event resolves, a sale commits or a new game begins. The finished report stays frozen across later reloads.

Old saves remain usable without invented history. If browser storage is full, optional report history is dropped so the core game can still save, matching the existing fallback policy.

Verified 717 unit tests, 182 browser cases, six built-app checks and lint/build. A real-control journey reloads during an active order, a pending event and the next month's report, checking cash and points stay unchanged and the three decisions plus Land + Foundation milestones remain. Unit checks cover successive reloads, new orders/undo, stale month history and storage fallback. Inspected the built resumed-work and monthly-result scenes.
