import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {useStore} from '../../src/ui/store';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
const endMonth=useStore.getState().endMonth;
beforeEach(()=>{vi.useFakeTimers();useStore.setState({muted:true});useStore.getState().newGame('first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);});
afterEach(()=>{useStore.setState({simRunning:false,endMonth});vi.clearAllTimers();vi.useRealTimers();});
describe('simulation timer ownership',()=>{
 it('rapid pause and resume cannot inherit the old run clock',()=>{const advance=vi.fn();useStore.setState({endMonth:advance});useStore.getState().toggleSim();vi.advanceTimersByTime(100);useStore.getState().toggleSim();vi.advanceTimersByTime(50);useStore.getState().toggleSim();vi.advanceTimersByTime(100);expect(advance).not.toHaveBeenCalled();vi.advanceTimersByTime(150);expect(advance).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(800);expect(advance).toHaveBeenCalledTimes(2);});
 it('a new game resumed before an old callback cannot inherit that clock',()=>{const advance=vi.fn();useStore.setState({endMonth:advance});useStore.getState().toggleSim();vi.advanceTimersByTime(100);useStore.getState().newGame('first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,7);vi.advanceTimersByTime(50);useStore.getState().toggleSim();vi.advanceTimersByTime(100);expect(advance).not.toHaveBeenCalled();vi.advanceTimersByTime(150);expect(advance).toHaveBeenCalledTimes(1);});
});
