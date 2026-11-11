import type {GameState} from '../../engine/types';
import {formatDollars} from '../../engine/format';

/** Diff only the committed choice, before the world's bills and construction tick. */
export function choiceImpact(before:GameState,chosen:GameState):string[]{
 const changes:string[]=[];
 const cash=chosen.cash-before.cash;
 if(cash)changes.push(`Cash ${cash<0?'-':'+'}${formatDollars(Math.abs(cash))}`);
 for(const group of ['town','tenant','commission','utility'] as const){
  const delta=chosen.goodwill[group]-before.goodwill[group];
  if(delta)changes.push(`${group[0]!.toUpperCase()+group.slice(1)} trust ${delta>0?'+':''}${delta}`);
 }
 const owed=(s:GameState)=>typeof s.flags.apOwedNextMonth==='number'?s.flags.apOwedNextMonth:0;
 const ap=owed(chosen)-owed(before);
 if(ap)changes.push(`${ap>0?'-':'+'}${Math.abs(ap)} action point${Math.abs(ap)===1?'':'s'} next month`);
 const training=chosen.flags.hiringFairUntil;
 if(typeof training==='number'&&training!==before.flags.hiringFairUntil&&training>chosen.month)changes.push(`Crew training active until month ${training+1}`);
 return changes;
}
