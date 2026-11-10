# Cancellation refund quote CHECKPOINT

Personal Millbrook Normal Depot Flats / liquid replay: the transformer slipped to Y3 M10. Canceling it to spot-buy a replacement showed "$0" before the click, then credited $3.2M in the cash preview. The generic deposit-minus-fee help did not give enough information to plan that recovery before queueing it.

Cancellation rows now name the immediate cash refund, amount already paid, fee kept and loss of the supplier's delivery slot. A second-source race still identifies the alternate supplier and says the standard order stays. Map and desk use the same rows. Refund math matches the existing resolved engine rule, including spot orders that were paid in full.

| Gate | Result |
|---|---|
| Latest-main base | be59073a84d6664e6bca235b31a3c2a4eb64711a |
| Unit suite | 612 passed; standard/alternate/spot quotes match engine cash delta, pure; existing race coverage preserved |
| Browser suite | 140 passed, both full shards; exact refund/fee and correct supplier cancellation covered |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected; full refund, fee and supplier preservation readable; Close and End month clear |
| Engine / bots / tuning | Unchanged; grids not applicable |
| Save schema | Unchanged; no migration required |
| Personal route | 1/1, Y3 M11, 1.24x, $562.3M campus, $70.7M equity after spot-buy/bridge/mezz/equity recovery |
| Deployment | Verify Pages and live quote after merge |

Screenshot: `docs/screenshots/cold2/cancellation-refund-quote.png`.
