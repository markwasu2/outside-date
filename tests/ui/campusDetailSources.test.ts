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
 it('keeps every supplementary detail in its generated asset exactly once',()=>{
  expect(fieldTemplate).toBe(field);
  for(const [source,asset] of [[frameDetail,frame],[coolingDetail,cooling],[backupDetail,backup],[cabinetDetail,cabinet],[officeDetail,office]]){const detail=source!.trim();expect(detail.startsWith('<g')).toBe(true);expect(detail.endsWith('</g>')).toBe(true);expect(asset!.split(detail)).toHaveLength(2);}
 });
});
