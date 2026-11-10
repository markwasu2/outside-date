# Second supplier lead quote CHECKPOINT

Personal default Quick start replay encountered a delayed standard switchgear order. The transformer alternative showed a lead estimate; the switchgear alternative showed price only, so the player could not compare timing. Quote the switchgear's sampled lead range using the same market-adjusted bounds as secondSource, without sampling RNG in the UI. Map and Actions use the same quote helper.

| Gate | Result |
|---|---|
| Latest-main base | ac01a7ba09fb29af04492bdf8b5c54d151dadce6 |
| Narrow fix | Second-supplier switchgear quote includes live lead range; map and Actions share price/timing words |
| Engine confirmation | Alternate switchgear draws integer leadMin through leadMax, then leadWithIndex; display quotes the adjusted endpoints without drawing |
| Unit suite | 595 passed; regression covers map/desk parity, state purity, order bounds and equipment index |
| Browser suite | 132 passed across two full shards; screenshot-specific scroll rerun after final test edit |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected after scrolling popup; full switchgear price and 10-18mo range readable before click |
| Engine / bots / tuning | Unchanged; no seed grid required |
| Save schema | Unchanged; no migration required |
| Personal route | 4/4 delivered, Y4 M8 close, 0.67x |
| Deployment | Verify Pages and live asset after merge |

Screenshot: `docs/screenshots/cold2/second-supplier-lead.png`.
