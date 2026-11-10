import {it,expect} from 'vitest';
import {logDetailWords} from '../../src/ui/board/logWords';
it('formats saved and new outside-date notices on the player campaign clock',()=>{
 expect(logDetailWords('Outside date: month 62. Fix by delivering, or ask the tenant to extend.')).toBe('Tenant deadline: Y6 M3. Fix by delivering, or ask the tenant to extend.');
 expect(logDetailWords('Outside date: month 0.')).toBe('Tenant deadline: Y1 M1.');
 expect(logDetailWords('Remaining DSU cover: 2 month(s).')).toBe('Remaining DSU cover: 2 month(s).');
 expect(logDetailWords(undefined)).toBeUndefined();
});
