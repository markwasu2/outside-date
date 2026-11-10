# Testimony cap clarity CHECKPOINT

In a personal Quarry Ridge replay at Y2 M5, Prepare testimony still claimed to raise vote odds after the testimony bonus had reached its 24% cap. Spending 2 focus added no chance. The engine also permits consecutive-month preparation to lower commission goodwill.

The UI now states the remaining bonus gain, or explains that capped testimony spends focus without adding vote chance. It names the consecutive-month cost when applicable. Capped testimony joins the existing contextual "Already underway or not needed" fold. The action remains available inside that fold and in the desk; engine legality is unchanged.

| Gate | Result |
|---|---|
| Latest-main base | 93877bc30d70a0672604c9dbe74d725ec4247e43 |
| Narrow fix | Testimony help and contextual folding only |
| Engine confirmation | prepTestimony caps bonus at tuning.docket.testimonyCap; consecutive preparation lowers commission goodwill by 1 |
| Unit suite | 606 passed; partial remaining gain, cap, consecutive cost, folding and purity covered |
| Browser suite | 137 passed across two full shards; cap folded initially, expands with explicit waste and goodwill warning |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected; expanded contextual action, warning and sticky Close readable |
| Engine / bots / tuning | Unchanged; no seed grids required |
| Save schema | Unchanged; no migration required |
| Personal route | Quarry Ridge / hybrid / dry / cost-plus / abatement; ongoing at Y2 M6 |
| Deployment | Verify Pages and live asset after merge |

Screenshot: `docs/screenshots/cold2/testimony-cap.png`.
