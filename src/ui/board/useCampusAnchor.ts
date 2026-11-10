import { useLayoutEffect, useRef, useState } from 'react';

/** Position within the scene, leaving header and commit footer clear. Re-measure on resize. */
export function useCampusAnchor(objectId: string | null, revision: unknown) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{left:number;top:number;ring:{left:number;top:number;width:number;height:number}} | null>(null);
  useLayoutEffect(() => {
    function measure() {
      const object = objectId ? document.querySelector<HTMLElement>(`[data-campus-object="${CSS.escape(objectId)}"]`) : null;
      const map = document.querySelector<HTMLElement>('[data-testid="map-root"]');
      const card = cardRef.current;
      if (!object || !map || !card) { setPosition(null); return; }
      const r = object.getBoundingClientRect(), scene = map.getBoundingClientRect();
      const width = card.offsetWidth, height = card.offsetHeight;
      const left = Math.max(scene.left + 8, Math.min(r.left + r.width / 2 > scene.left + scene.width / 2 ? r.left - width - 12 : r.right + 12, scene.right - width - 8));
      const top = Math.max(scene.top + 8, Math.min(r.top + r.height / 2 - height / 2, scene.bottom - height - 8));
      setPosition({left,top,ring:{left:r.left,top:r.top,width:r.width,height:r.height}});
    }
    measure(); window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [objectId, revision]);
  return {cardRef,position};
}
