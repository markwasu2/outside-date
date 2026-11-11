# Queued orders must not imply active construction

Reproduced through real desktop clicks: buy land, apply for a permit, build the foundation, let the permit finish, then order the power study and electrical equipment without starting the frame. The footer claimed crews would work when time advances even though no building stage was active.

The footer now keeps the actual idle-building or blocker instruction visible after unrelated orders. It claims active crews only when the shared construction-work predicate is true. An already-open campus gets rent/lender wording instead. The no-order headline is not shown after paid orders.

Targeted real-click checks pass for utility-only idle work, starting the frame, a queued order during an inspection freeze and an ordinary optional visit during active work. Eight built-app journeys and lint/build pass. Screenshots inspected at 1280x720. Full regression passes: 721 unit tests and 189 browser cases across four shards (48 + 47 + 47 + 47).

The generous-choice replay also now waits for the contact choices to render and asserts at least two completed visits. Without that wait, production could open and close the panel before its buttons rendered. A strengthened production replay on PR205 completed seven visits and sold in month 12; all eight production journeys passed.

No engine, costs, timing, permissions or visibility changes.
