# One clock for simple financing

Simple-mode action costs now translate finance closing dates through the same plain-language formatter as the campus. A quote saying cash arrives in month 2 matches the actual pending-funds receipt. Detailed-mode year/month labels, engine dates, fees and proceeds are unchanged.

Verification:
- 731 unit tests across 84 files pass, including four cost-label cases for year boundaries, fees and construction costs.
- 194 distinct browser cases pass. Concurrent independent runners initially exhausted their timeouts; sequential shards with three workers pass. The long month-review journey was rerun separately after its shard hit the command limit; all 49 shard-two cases were reconciled against its full list.
- Eleven built-app journeys pass, including a real bridge quote, actual order, unchanged bank cash, pending receipt and undo.
- Lint and production build pass. Existing large-chunk advisory remains.
- Quote and pending-receipt pixels inspected at 1280x720. Both use month 2, with Next month and the bank balance visible.

No engine, spending, timeline or repository-visibility changes.
