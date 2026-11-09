# Millbrook Relay

## UI follow-up before presenting this as a polished campaign

The existing setup wizard reads base tuning in several screens, not the selected
scenario's resolved tuning. It still offers the Whale's lease dates and mezz
choices, although Millbrook Relay fixes delivery at month 30, the outside date
at month 34, LDs as the late remedy, and no mezz. It also shows base power and
insurance estimates instead of this smaller project's numbers. The engine and
in-game action prices use the correct overrides. No UI files were changed here
because the setup screens are being edited on the separate UI track.

The UI track should use scenario-resolved tuning and disable or annotate pinned
lease/capital choices. A passing start-flow test is not a claim those setup
screens are accurate.

## The deal

One 20 MW IT regional relay for the Whale on the old Millbrook rail yard in
Richfield County, Arcadia. This uses the existing fictional county, utility,
commission, and cast, rather than inventing a second jurisdiction that the shared
weather and town-hall cards would contradict. A prepared industrial site costs
$18M; the cheaper farmland alternative still adds pad work and a wetlands permit.

The 40-month campaign sits between the guided 5 MW tutorial and the four-hall
100 MW Whale. There are no coach tips. Three permits, discovery, testimony,
intervenor meetings, long-lead orders, inspection cures, insurance and takeout
all remain real. This is a full project with fewer moving pieces, not a longer
tutorial or a shrunken campus with the same overhead.

## What the player has to learn

- File and defend the docket early. Two intervenors and an eight-month first-vote
  calendar reduce filing work, but not the consequences of leaving it late.
- Start the study and gear orders while construction advances. The 16-month
  transformer and 20-month generation build are separate paths to power.
- Do not mistake bridge capacity for delivered capacity. The 12 MW interim grid
  cannot energize the 20 MW hall; the docket-backed plants still matter.
- Protect the date. Delivery is due in month 30, LDs accrue after it, and month 34
  is the outside date before any relationship-earned extension. A failed first
  vote consumes most of the remaining float.
- Finance and insure a real build. Senior LTC/rate and equity-share choices stay
  live. Mezz is excluded even when a stale wizard choice supplies index 1 or 2:
  the scenario has a single zero-share option and init falls back to it.

Working capital is $65M against $0.6M monthly burn and $0.2M builder's risk;
optional DSU costs $0.3M/month. Hybrid cooling, equipment, liquid readiness,
crews and insured damage amounts are scaled to one hall. Base cost per MW,
rent pricing, permit odds, power-slip odds, interest rates and takeout rules are
unchanged. Easy adds $10M cash and 10 commission/tenant goodwill; hard removes
$5M cash and 10 goodwill. Neither changes the scope or adds mezz.

## Fixed scope without an engine fork

The shared month-24 expansion Ask normally adds two 25 MW halls. An additive
`notFlag:fixedScope` requirement on that card leaves existing scenarios unchanged;
only Millbrook Relay sets that flag, in all three difficulty presets. Other
scripted cards, including the chip refresh and equipment rebate, still fire.
The new tests verify both suppression here and the Whale's unchanged Ask.

## Balance and verification

Normal difficulty, unmodified careful bot, deterministic seeds 1-1000:

| Metric | Result |
| --- | ---: |
| Wins with equity multiple >=1.0x | 79.7% (797/1000) |
| Median priced equity multiple | 1.655x |
| P10 / P90 priced multiple | 1.463x / 1.844x |
| Median first delivery | Month 31 |
| Runs paying some LDs | 34.4% |
| First docket vote failed | 21.0% |
| Losses: all terminated / default / docket dead | 158 / 26 / 19 |

The multiple distribution follows the existing aggregate report: it includes
runs with a priced takeout, not an invented zero multiple for every pre-takeout
loss. Win rate uses all 1000 seeds as its denominator. Greedy normal seeds 1-200
win 28.0%, at a 1.237x median priced multiple and 81.5% paying some LDs. Most
careful losses are schedule losses, not a miniature version of the Whale's
working-capital squeeze.

The new balance guard retains a 70-85% win band, 1.3-2.0x median band, month
29-34 median delivery and nonzero docket/LD pressure. Existing balance tests are
untouched. New Playwright tests cover selection, starting the single-hall map,
and rendering the careful seed-1 priced report card (1.73x). The title, starting
map, and final report were also checked visually.
