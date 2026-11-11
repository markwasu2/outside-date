import {describe,it,expect,vi,afterEach} from 'vitest';
import {loadContent} from '../../src/content/load';import {createGame} from '../../src/engine/init';import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';import {migrateSave,saveGame,SAVE_VERSION} from '../../src/ui/save';
const state=createGame(loadContent(),'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
const base={version:SAVE_VERSION,state,lastNegotiation:DEFAULT_NEGOTIATION,lastDifficultyId:'normal' as const,dismissedCoachTips:[],financialSnapshots:[]};
afterEach(()=>vi.unstubAllGlobals());
describe('optional result history in saves',()=>{
 it('keeps original version-eight saves usable without invented history',()=>{expect(migrateSave(base)).toBe(base);expect(migrateSave(base)?.monthReview).toBeUndefined();});
 it('writes the immutable last result when available',()=>{const setItem=vi.fn();vi.stubGlobal('localStorage',{setItem});const review={before:state,after:state,actions:[],eventChoices:[{cardId:'starter_neighbors',label:'Hold the open house',impact:['Cash -$100K']}]};saveGame({...base,monthReview:review});const saved=JSON.parse(setItem.mock.calls[0]![1]);expect(saved.monthReview.eventChoices[0].impact).toEqual(['Cash -$100K']);});
 it('retries the core game without optional history if the larger save exceeds storage quota',()=>{const setItem=vi.fn().mockImplementationOnce(()=>{throw new Error('quota');});vi.stubGlobal('localStorage',{setItem});saveGame({...base,monthReview:{before:state,after:state,actions:[]}});expect(setItem).toHaveBeenCalledTimes(2);const saved=JSON.parse(setItem.mock.calls[1]![1]);expect(saved.state.scenarioId).toBe('first-campus');expect(saved.monthReview).toBeUndefined();});
 it('does not throw when storage is unavailable even for a core save',()=>{vi.stubGlobal('localStorage',{setItem:()=>{throw new Error('disabled');}});expect(()=>saveGame({...base,monthReview:{before:state,after:state,actions:[]}})).not.toThrow();});
});
