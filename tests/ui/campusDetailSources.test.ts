import entranceShell from '../../src/assets/campus/hall-shell.svg?raw';
import entranceReady from '../../src/assets/campus/hall-delivered.svg?raw';
import crane from '../../src/assets/campus/vehicle-crane.svg?raw';
import excavator from '../../src/assets/campus/vehicle-excavator.svg?raw';
import substationConstruction from '../../src/assets/campus/substation-building.svg?raw';
import substationReady from '../../src/assets/campus/substation-done.svg?raw';
import construction from '../../src/assets/campus/plant-building.svg?raw';
import online from '../../src/assets/campus/plant-online.svg?raw';
import {describe,it,expect} from 'vitest';
import frameDetail from '../../scripts/campus-details/hall-steel.svg?raw';
import frame from '../../src/assets/campus/hall-steel.svg?raw';
import fieldTemplate from '../../scripts/campus-templates/tile-dry-field.svg?raw';
import field from '../../src/assets/campus/tile-dry-field.svg?raw';
import coolingDetail from '../../scripts/campus-details/compound-cooling.svg?raw';
import backupDetail from '../../scripts/campus-details/compound-backup.svg?raw';
import cabinetDetail from '../../scripts/campus-details/substation-done.svg?raw';
import officeDetail from '../../scripts/campus-details/tile-site-office.svg?raw';
import cooling from '../../src/assets/campus/compound-cooling.svg?raw';
import backup from '../../src/assets/campus/compound-backup.svg?raw';
import cabinet from '../../src/assets/campus/substation-done.svg?raw';
import office from '../../src/assets/campus/tile-site-office.svg?raw';
describe('authored campus detail sources',()=>{
 it('gives enclosed halls one projecting entrance pavilion with a covered porch',()=>{for(const art of [entranceShell,entranceReady]){expect(art.split('hall-entrance-pavilion')).toHaveLength(2);expect(art).toContain('fill="url(#glass)"');}expect(frame).not.toContain('hall-entrance-pavilion');});
 it('draws a paired crane mast and jib with stabilizers and hoist hardware',()=>{for(const marker of ['crane-lattice-mast','crane-lattice-jib','crane-cab-and-stabilizers','crane-hoist-hardware'])expect(crane.split(marker)).toHaveLength(2);});
 it('draws continuous excavator tracks, hydraulic cylinders and an open toothed bucket',()=>{for(const marker of ['excavator-tracked-undercarriage','excavator-cab-and-hydraulics','excavator-digging-bucket'])expect(excavator.split(marker)).toHaveLength(2);});
 it('keeps unfinished supports and staging out of the finished power connection',()=>{expect(substationConstruction).toContain('substation-erection-detail');expect(substationConstruction).toContain('substation-support-frame');expect(substationReady).not.toContain('substation-erection-detail');expect(substationReady).not.toContain('substation-support-frame');});
 it('shows plant erection only before the plant is online',()=>{expect(construction).toContain('plant-construction-frame');expect(construction).toContain('plant-construction-lifting');expect(online).not.toContain('plant-construction-frame');expect(online).not.toContain('plant-construction-lifting');});
 it('keeps every supplementary detail in its generated asset exactly once',()=>{
  expect(fieldTemplate).toBe(field);
  for(const [source,asset] of [[frameDetail,frame],[coolingDetail,cooling],[backupDetail,backup],[cabinetDetail,cabinet],[officeDetail,office]]){const detail=source!.trim();expect(detail.startsWith('<g')).toBe(true);expect(detail.endsWith('</g>')).toBe(true);expect(asset!.split(detail)).toHaveLength(2);}
 });
});
