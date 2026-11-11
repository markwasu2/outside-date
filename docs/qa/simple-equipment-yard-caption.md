# Simple equipment-yard caption

The actual simple Whale replay exposed equipment rows painted behind the cooling-yard landscaping. The same problem reproduced in a one-hall fixture at 1280x720 and 1440x900. The old yard occupied most of the right-hand column, behind the compound art.

The simple map now has one compact deliveries caption in the upper strip, showing its occupied slots and next delivery month. Due-now, past-due and all-arrived cases have separate labels. The full inventory remains in the equipment-deliveries panel, opened by clicking the caption. The detailed map retains its crate rows and delivery-truck animation. No engine rules changed.

Inspected screenshots:
- ../screenshots/equipment-yard/real-whale-transformer.png: actual simple four-hall campaign, month 41, transformer due month 42. Clicked the caption and checked that the panel retains month 42, then completed the real month-50 sale.
- ../screenshots/equipment-yard/single-hall-1440.png: mixed pending and arrived orders. The caption clears the trees and its foreground layer keeps the fence from crossing the letters.

Local checks: 747 unit tests, 217 desktop browser tests, all 25 built-app journeys, lint and build pass. The layout regression failed before the fix at both desktop sizes. The actual built four-hall replay clicks the new caption and checks the transformer date before finishing the sale. Production replay follows deployment.
