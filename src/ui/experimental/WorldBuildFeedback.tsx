import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { simpleActionName } from '../board/simpleWords';
import { formatDollars } from '../../engine/format';
/** Screen-space acknowledgement stays readable without changing any physical object scale. */
export function WorldBuildFeedback() {
  const draft = useStore((s) => s.draft),
    plan = useStore((s) => s.plan),
    last = plan.at(-1),
    previous = useRef(0),
    cash = useRef(draft.cash);
  const [receipt, setReceipt] = useState<{ label: string; cash: number; id: number } | null>(null);
  useEffect(() => {
    if (plan.length === 0 || plan.length < previous.current) setReceipt(null);
    if (plan.length > previous.current && last) {
      const name = simpleActionName(last, draft) || 'Order placed',
        hall = last.params?.hallId;
      setReceipt({
        label: typeof hall === 'string' ? `${hall}: ${name}` : name,
        cash: Math.max(0, cash.current - draft.cash),
        id: Date.now(),
      });
    }
    previous.current = plan.length;
    cash.current = draft.cash;
  }, [plan.length, last, draft]);
  useEffect(() => {
    if (!receipt) return;
    const id = window.setTimeout(() => setReceipt(null), 2500);
    return () => clearTimeout(id);
  }, [receipt]);
  return (
    receipt && (
      <div
        key={receipt.id}
        data-testid="build-receipt"
        role="status"
        style={{
          position: 'absolute',
          right: 12,
          top: 4,
          zIndex: 12,
          maxWidth: '65%',
          padding: '6px 10px',
          borderRadius: 6,
          background: '#f5ffe8f2',
          boxShadow: '0 3px 12px #284b3426',
          border: '1px solid #8dad75',
          fontSize: 12,
          color: '#36583d',
          fontWeight: 700,
          pointerEvents: 'none',
        }}
      >
        {receipt.label} ✓
        {receipt.cash > 0 && (
          <small style={{ marginLeft: 8, color: '#966543' }}>
            Cash -{formatDollars(receipt.cash)}
          </small>
        )}
      </div>
    )
  );
}
