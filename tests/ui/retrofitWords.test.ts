import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {retrofitCashWords} from '../../src/ui/board/retrofitWords';
it('shows total and direct cash balance, excluding delivered and terminated halls',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);s.cash=20000000;
 s.halls[0]!.delivered=true;s.halls[1]!.terminated=true;
 const before=JSON.stringify(s),words=retrofitCashWords(s);
 expect(words).toContain('2 undelivered halls');expect(words).toContain('$30.0M total');
 expect(words).toContain('after retrofit -$10.0M');expect(words).toContain('risks immediate default');expect(JSON.stringify(s)).toBe(before);
});
it('liquid matches the lower charge and warns when the cash is exactly used up',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);s.setup.hallTier='liquid';s.cash=16000000;
 expect(retrofitCashWords(s)).toContain('$16.0M total');expect(retrofitCashWords(s)).toContain('uses all your cash');
 s.cash=20000000;expect(retrofitCashWords(s)).toContain('after retrofit $4.0M');expect(retrofitCashWords(s)).not.toContain('risks');
});
