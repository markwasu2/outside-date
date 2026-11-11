import {describe,it,expect} from 'vitest';
import {siteTerrain} from '../../src/ui/board/siteTerrain';
import meadow from '../../src/assets/campus/campus-ground-meadow.svg?raw';
import quarry from '../../src/assets/campus/campus-ground-quarry.svg?raw';
import depot from '../../src/assets/campus/campus-ground-depot.svg?raw';
describe('visible site terrain',()=>{
 it('selects distinct authored terrain from the existing site themes',()=>{
  const themes=[{ground:'#d7ccc8',pond:false,poles:2},{ground:'#c5e1a5',pond:true,poles:0},{ground:'#bcaaa4',pond:false,poles:4},{ground:'#e0d2b0',pond:false,poles:3}];
  expect(themes.map(t=>siteTerrain(t).id)).toEqual(['campus','meadow','quarry','depot']);
  expect(new Set(themes.map(t=>siteTerrain(t).image)).size).toBe(4);
  expect(siteTerrain({ground:'#fff',pond:false,poles:0}).id).toBe('campus');
 });
 it('keeps the same roads and build area with different scenery beyond them',()=>{
  for(const svg of [meadow,quarry,depot]){expect(svg).toContain('M185 121H1019V690H185z');expect(svg).toContain('M136 85V730H1088V105');expect(svg).toContain('viewBox="0 0 1200 800"');}
  expect(meadow).toContain('meadow-field-rows');expect(quarry).toContain('quarry-rock-ledges');expect(depot).toContain('depot-old-siding');
 });
});
