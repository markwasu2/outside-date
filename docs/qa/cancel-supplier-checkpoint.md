# Supplier cancellation CHECKPOINT

Personal live play, Millbrook Hard Rail Yard, Y2 M10: two identical transformer cancellation buttons appeared after placing a second order. Both called the same kind-only engine action, which cancels the alternate first.

| Gate | Result |
|---|---|
| Latest-main base | b4f4bd70c6f3deddecdeec3747b7c3d6a8b87861 |
| Narrow fix | One supplier-named cancellation per equipment kind, shared by map and optional desk |
| Behavior | Names second supplier first and states that standard remains; after cancel, standard is named |
| Unit regression | 576 passed, including cancellation target and map/desk equality |
| Browser regression | 120 passed, including both full click journeys and new supplier cancel test |
| Lint / TypeScript / build | Passed; pre-existing bundle-size warning remains |
| Pixels | 1280x720 map popover inspected; supplier and retained-order explanation readable |
| Engine / bots / tuning | Unchanged; no seed grid required |
| Save schema | Unchanged; no migration required |
| Deployment | Verify Pages SHA and replay actual second-source run after merge |

Screenshot: `docs/screenshots/cold2/cancel-second-supplier.png`.
