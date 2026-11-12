import {describe,it,expect} from 'vitest';
import {simpleHallCaption} from '../../src/ui/board/simpleWords';
describe('compact simple building captions',()=>{
 it('keeps stages and percentages without repeated work verbs',()=>{expect(simpleHallCaption('Shell - building',.83)).toBe('Walls & roof: 83%');expect(simpleHallCaption('Commissioning - testing',.25)).toBe('Final testing: 25%');expect(simpleHallCaption('Pad - building',0)).toBe('Foundation: 0%');});
 it('keeps the final testing power blocker short and specific',()=>{expect(simpleHallCaption('Commissioning - waiting on power hookup',null)).toBe('Final testing needs power');expect(simpleHallCaption('Fit-out - waiting on water permit',null)).toBe('Interiors - waiting on water permit');});
 it('retains paused and failed states instead of claiming work is happening',()=>{expect(simpleHallCaption('Paused - not enough building funds',.34)).toBe('Paused - not enough building funds (34%)');expect(simpleHallCaption('Stopped - failed inspection',.5)).toBe('Stopped - failed inspection (50%)');expect(simpleHallCaption('Delivered',null)).toBe('Open for rent');});
});
