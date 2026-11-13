import {useEffect,useState} from 'react';
import woodland from '../../assets/campus/campus-woodland.svg';

/** Inline owned woodland art so tree bodies can use the measured live camera.
 * Roads and ground shadows keep their flat projection; roots never move.
 * The terrain floor stays a cached bitmap, not a live SVG filter pipeline.
 * The full map image remains the failure fallback until woodland loads. */
export function TerrainLayer({groundImage}:{groundImage:string}){
 const [source,setSource]=useState<string|null>(null);
 useEffect(()=>{const controller=new AbortController();fetch(woodland,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Terrain unavailable');return r.text();}).then(svg=>{if(!controller.signal.aborted)setSource(svg);}).catch(()=>{});return()=>controller.abort();},[]);
 return <div data-testid="live-terrain" aria-hidden="true" style={{position:'absolute',inset:0,zIndex:-1,pointerEvents:'none',overflow:'hidden',background:source?`url("${groundImage}") center / 100% 100%`:undefined}}>
  {source?<div style={{position:'absolute',inset:0}} dangerouslySetInnerHTML={{__html:source}}/>:null}
  <style>{`
   [data-testid="live-terrain"] svg {width:100%;height:100%;display:block;}
   [data-testid="live-terrain"] [data-tree] {transform:none;}
   [data-testid="live-terrain"] [data-testid="upright-perimeter-tree"] {transform:translate(var(--tree-x),var(--tree-y)) scaleY(calc(var(--scene-vertical-correction,1.5) * var(--tree-edge-scale,1))) translate(var(--tree-minus-x),var(--tree-minus-y));transform-origin:0px 0px;}
  `}</style>
 </div>;
}
