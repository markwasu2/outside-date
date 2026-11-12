# Delivery truck structure

The cladding-delivery truck now has a chassis rail, angular fenders and hub hardware instead of bare wheel discs against two boxes. Cab access, mirrors, windscreen division and wipers, a recessed grille and a bumper give the front a clearer silhouette. The cargo box, wheel sizes, camera and map placement are unchanged.

## Verification

- 761 unit, 260 browser and 27 built-app cases pass, plus lint/build.
- Source checks require the chassis, cab and front detail groups exactly once.
- Real built expansion journey fetches and decodes the truck art during cladding deliveries, checks all three detail groups, captures day/night pixels and continues to six halls and sale.
- Inspected enlarged art and actual built day/night map. Corrected a first-render step overlap with the front wheel; the final step sits behind the axle.
- Only vehicle-truck.svg changes among the 34 generated assets. All 34 regenerate byte-identically.
- Evidence in `../screenshots/delivery-truck-structure/`.
- No game rules, costs, timing or save changes.
