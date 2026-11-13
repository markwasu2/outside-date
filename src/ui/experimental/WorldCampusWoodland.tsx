import { useMemo } from 'react';
import woodland from '../../assets/campus/campus-woodland.svg?raw';
/** Reuse owned tree art without the old stretched-ground camera. */
export function WorldCampusWoodland({
  width,
  height,
  points,
}: {
  width: number;
  height: number;
  points?: { x: number; y: number }[];
}) {
  const art = useMemo(() => {
    const doc = new DOMParser().parseFromString(woodland, 'image/svg+xml');
    return {
      defs: doc.querySelector('defs')?.innerHTML ?? '',
      trees: [...doc.querySelectorAll('[data-tree]')].map((el) => {
        const style = el.getAttribute('style') ?? '';
        return {
          x: Number(style.match(/--tree-x:([\d.]+)px/)?.[1]),
          y: Number(style.match(/--tree-y:([\d.]+)px/)?.[1]),
          body: el.innerHTML,
        };
      }),
    };
  }, []);
  const positions = points ?? [
    ...Array.from({ length: Math.floor((width - 200) / 75) }, (_, i) => ({
      x: 110 + i * 75,
      y: height - 15,
    })),
    ...Array.from({ length: Math.floor((height - 450) / 90) }, (_, i) => ({
      x: 45,
      y: 350 + i * 90,
    })),
    ...Array.from({ length: Math.floor((height - 270) / 85) }, (_, i) => ({
      x: width - 25,
      y: 270 + i * 85,
    })),
  ];
  return (
    <g data-testid="world-woodland">
      <defs dangerouslySetInnerHTML={{ __html: art.defs }} />
      {positions.map(({ x, y }, i) => {
        const tree = art.trees[i % art.trees.length];
        return tree ? (
          <g
            key={i}
            transform={`translate(${x - tree.x} ${y - tree.y})`}
            dangerouslySetInnerHTML={{ __html: tree.body }}
          />
        ) : null;
      })}
    </g>
  );
}
