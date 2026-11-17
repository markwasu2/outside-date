# One ruler: world-view scale pass

Art direction (chosen by the build agent; Mark's grant covers design calls): the world view
uses one measured ruler. A standing person is 18 world units (1.8 m, 1 unit = 10 cm) and
every upright object is sized against it - car 44x18x15, van 56x22x22, service truck
60x20x24, freight 100x25x34, power pole 90 tall, perimeter trees 68-80, paved road 44
(two lanes). People stay slightly large for legibility; the ruler keeps each object's size
and contact shadow consistent with its neighbours.

Before this pass the road vehicles were drawn at roughly half person scale (a 24-unit car,
a 50-unit semi), poles stood shorter than the trees beside them and had no contact shadow,
and the parking pad sat too close to the widened road.

Changes: RoadVehicle bodies rebuilt on the ruler (shared by road, parked and service
vehicles), roads widened to two real lanes with matching lane offsets, parking pad moved
south and respaced, power poles raised to 90 units with a contact shadow. No game rules,
layout anchors or object positions changed beyond the parking pad.

Verified at 1280 and 1024: land, foundation, delivered six-hall campus, night. Pixel
inspection before/after. `world-one-ruler.spec.ts` guards the person-relative ratios.
