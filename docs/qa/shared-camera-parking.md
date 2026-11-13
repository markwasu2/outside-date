# Shared-camera parked vehicles

Replace the flat rotated parking symbols with the same physical passenger-car body used on the road. Roofs follow the ground axes while wheels, body height and glazing stay upright. Three paint colors, grounded shadows, door seams, handles, grille, headlamps and rear lamps. No simulation or action changes.

Verification: 775 unit tests, 10 focused source-browser camera/traffic cases, all 37 compiled-app cases, lint/build pass. Existing PR289 full 288-case source regression remains the previous baseline, not a claim of a fresh full source suite for this small pass.

New checks compare parked and moving body dimensions, screen transform axis ratio, detailed body/wheels, day/night1024/1280 and undo of land ownership. Actual compiled1024day/1280night pixels inspected. Detail crop inspected too. Screenshots under docs/screenshots/world-parking. Production replay follows deployment.
