from pathlib import Path
import random
random.seed(29)
parts=['''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none"><defs>
<linearGradient id="grass" x2=".6" y2="1"><stop stop-color="#9fa773"/><stop offset=".45" stop-color="#a9ad7b"/><stop offset="1" stop-color="#768d68"/></linearGradient>
<linearGradient id="soil" x2=".3" y2="1"><stop stop-color="#d2c39d"/><stop offset="1" stop-color="#bba77e"/></linearGradient>
<linearGradient id="asphalt" x2="0" y2="1"><stop stop-color="#65716e"/><stop offset="1" stop-color="#465955"/></linearGradient>
<radialGradient id="tree" cx="30%" cy="20%"><stop stop-color="#bccf8c"/><stop offset=".4" stop-color="#73915a"/><stop offset="1" stop-color="#365c44"/></radialGradient>
<filter id="grain"><feTurbulence baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".13"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
<filter id="blur"><feGaussianBlur stdDeviation="2"/></filter>
</defs><path fill="url(#grass)" d="M0 0h1200v800H0z"/>
<path d="M175 114H1028V699H175z" fill="#72805c" opacity=".25"/>
<path d="M185 121H1019V690H185z" fill="url(#soil)"/>
<g opacity=".15" stroke="#f6e8c7" fill="none"><path d="M205 160H990M205 168H990M205 176H990M205 184H990M205 628H990M205 636H990"/><path d="M218 132V680M224 132V680M230 132V680"/></g>
<path d="M0 52H1200" stroke="#354c44" stroke-opacity=".2" stroke-width="75"/><path d="M0 50H1200" stroke="#c1c3a9" stroke-width="66"/><path d="M0 50H1200" stroke="#4b605c" stroke-width="54"/>
<path d="M0 30H1200M0 70H1200" stroke="#bfc3ae" stroke-width="1"/><path d="M0 50H1200" stroke="#ece5ba" stroke-width="2" stroke-dasharray="25 22"/>
<path d="M138 85V732H1090V105" fill="none" stroke="#54634d" stroke-opacity=".2" stroke-width="30"/>
<path d="M136 85V730H1088V105" fill="none" stroke="#c5c6ac" stroke-width="24"/>
<path d="M136 85V730H1088V105" fill="none" stroke="#8b9585" stroke-width="17"/>
<path d="M137 103V710M159 730H1069M1088 117V710" fill="none" stroke="#c5cbb3" stroke-width="1" stroke-dasharray="8 13"/>
<path fill="#697b69" d="M900 550h145v145H900z"/><path fill="#798775" d="M904 554h137v137H904z"/>
<g stroke="#d2d5b9" stroke-width="1.3">''']
for y in range(564,687,20):parts.append(f'<path d="M907 {y}h36m63 0h32"/>')
parts.append('</g>')
for i in range(400):
 x=random.randrange(1200);y=random.randrange(800)
 if 20<y<82 or 176<x<1029 and 112<y<700:continue
 c=random.choice(['#d4d3a0','#536e48','#bdc38d']);parts.append(f'<path d="M{x} {y}l3 -2m-1 2l3 0" stroke="{c}" opacity=".27" stroke-width="1"/>')
# Mixed woodland lies outside the circulation loop and construction boundary.
# Hand-set positions keep the office, power connection and clickable labels clear.
parts.append('<g id="perimeter-woodland">')
locations=[(35,y) for y in range(140,730,96)]+[(1163,y) for y in range(130,760,78)]+[(x,776) for x in range(185,1100,89)]
for i,(x,y) in enumerate(locations):
 species=i%4
 height=32+(i*7)%15
 spread=16+(i*3)%7
 # Quiet planting beds, trunk, ground shadow and a smaller companion shrub.
 parts.append(f'<ellipse cx="{x+4}" cy="{y+3}" rx="{spread+12}" ry="13" fill="#75815d" opacity=".3"/><ellipse cx="{x+15}" cy="{y+9}" rx="{spread+7}" ry="10" fill="#284b3b" opacity=".22" filter="url(#blur)"/><path d="M{x} {y}v-{height}" stroke="#726e4d" stroke-width="3.2"/>')
 if species==0:
  # Layered spruce, darker below and lit from the upper left.
  for dz,w in [(14,spread),(25,spread-3),(35,spread-8)]:
   parts.append(f'<path d="M{x} {y-dz-14}Q{x-w/2} {y-dz-3} {x-w} {y-dz+7}Q{x} {y-dz+13} {x+w} {y-dz+7}Q{x+w/2} {y-dz-3} {x} {y-dz-14}Z" fill="{["#456b50","#5c7d56","#839b68"][(dz-14)//10]}"/><path d="M{x-2} {y-dz-10}l{-w+5} 16" stroke="#a1b47b" stroke-width="1" opacity=".35"/>')
 elif species==1:
  # Branching broadleaf canopy, not a single repeated circle.
  parts.append(f'<path d="M{x} {y-9}l-9 -15m9 15 10-21" stroke="#6e6f4d" stroke-width="2"/>')
  for dx,dy,r,c in [(-8,-28,spread-4,'#648654'),(9,-29,spread-3,'#52794f'),(0,-42,spread-2,'url(#tree)'),(-9,-40,spread-7,'#a1b576')]:
   parts.append(f'<circle cx="{x+dx}" cy="{y+dy}" r="{r}" fill="{c}"/>')
 elif species==2:
  # Slender pale-trunk trees and a light, open crown.
  parts.append(f'<path d="M{x-2} {y}l-2 -43m4 37 7 -29" stroke="#c0b997" stroke-width="2.8"/>')
  for dx,dy,rx,ry in [(-7,-32,12,16),(6,-38,13,18),(-2,-49,10,13)]:
   parts.append(f'<ellipse cx="{x+dx}" cy="{y+dy}" rx="{rx}" ry="{ry}" fill="url(#tree)"/><path d="M{x+dx-5} {y+dy-6}l5 -2" stroke="#c0cc8d" stroke-width="2" opacity=".45"/>')
 else:
  # Low, spreading oak: a different profile between taller specimens.
  for dx,dy,r,c in [(-12,-24,13,'#58744e'),(9,-23,16,'#486c4c'),(-1,-33,18,'url(#tree)'),(-11,-35,9,'#a0b174')]:
   parts.append(f'<circle cx="{x+dx}" cy="{y+dy}" r="{r}" fill="{c}"/>')
 for dx,dy,r in [(-19,2,7),(15,-1,6),(23,4,4)]:
  parts.append(f'<ellipse cx="{x+dx+3}" cy="{y+dy+2}" rx="{r+2}" ry="3" fill="#284b3b" opacity=".2"/><ellipse cx="{x+dx}" cy="{y+dy-2}" rx="{r}" ry="{r*.65}" fill="{["#829566","#687f55","#a0aa74"][i%3]}"/>')
parts.append('</g>')
# Whole ground texture stays low contrast so interface remains quiet.
parts.append('<path fill="#9ca088" opacity=".08" filter="url(#grain)" d="M0 0h1200v800H0z"/><path d="M68 110V752H1133V110" fill="none" stroke="#c6ccaf" stroke-opacity=".65" stroke-dasharray="3 4"/></svg>')
base=''.join(parts)+'\n'
Path('src/assets/campus/campus-ground.svg').write_text(base)
# Keep circulation and build coordinates identical. Terrain outside the access
# loop carries the site's character; it is scenery, never buildable capacity.
for theme in ('meadow','quarry','depot'):
 ground=base
 if theme=='meadow':
  ground=ground.replace('#9fa773','#86a575').replace('#a9ad7b','#a6bd84').replace('#768d68','#60875c').replace('#d2c39d','#c4bd91').replace('#bba77e','#aaab7a')
  detail='<g id="meadow-field-rows" fill="none" stroke-linecap="round">'
  for y in (749,761,773,785,797):
   detail+=f'<path d="M210 {y}H1067" stroke="#456d47" stroke-width="4" opacity=".42"/><path d="M211 {y-2}H1065" stroke="#c7d4a0" stroke-width="1.5" opacity=".65"/>'
  for x in range(230,1060,47):
   detail+=f'<path d="M{x} 754l-3 -6m3 6 4-5m43 23-3-6m3 6 4-5" stroke="#74935f" stroke-width="1.6"/>'
  detail+='</g>'
 elif theme=='quarry':
  ground=ground.replace('#9fa773','#9f9e89').replace('#a9ad7b','#b5ad96').replace('#768d68','#858d75').replace('#d2c39d','#c4b9a3').replace('#bba77e','#a89e8b')
  detail='<g id="quarry-rock-ledges" stroke-linejoin="round">'
  for x,y,w in [(265,770,69),(448,776,91),(670,765,83),(872,779,74),(1129,252,30),(1138,488,32)]:
   detail+=f'<path d="M{x-w} {y+15}l8 -24 25-15 {w} 4 20 16-8 24z" fill="#6d796e" opacity=".23"/><path d="M{x-w} {y+7}l8 -24 25-15 {w} 4 20 16-8 15z" fill="#8d9484" stroke="#747d71" stroke-width="1"/><path d="M{x-w+8} {y-17}l25 -15 {w} 4 20 16-42 -1-31 8z" fill="#bdbea6"/><path d="M{x-w+5} {y-4}l37 -5 34 3m-33 5 37-2" fill="none" stroke="#d4cfb6" stroke-width="1.5" opacity=".75"/>'
  detail+='</g>'
 else:
  ground=ground.replace('#9fa773','#a3a17a').replace('#a9ad7b','#b4ae87').replace('#768d68','#7c8c6d').replace('#d2c39d','#d3c5a5').replace('#bba77e','#b8a98a')
  detail='<g id="depot-old-siding"><path d="M209 775H1063" stroke="#515f58" stroke-width="27" opacity=".2"/><path d="M209 772H1063" stroke="#9b9d8d" stroke-width="23"/>'
  for x in range(217,1060,13):
   detail+=f'<path d="M{x} 760v25" stroke="#756e5a" stroke-width="4"/><path d="M{x+1} 762v21" stroke="#aaa086" stroke-width="1"/>'
  for y in (765,779):
   detail+=f'<path d="M209 {y+1}H1063" stroke="#555f58" stroke-width="3"/><path d="M209 {y}H1063" stroke="#bec3b0" stroke-width="1.5"/>'
  detail+='<path d="M247 753v36m-4-36h8m-8 36h8" stroke="#826c4e" stroke-width="3"/></g>'
 # Insert under the existing woodland, keeping its trunks and shadows in front.
 ground=ground.replace('<g id="perimeter-woodland">',detail+'<g id="perimeter-woodland">')
 Path('src/assets/campus/campus-ground-'+theme+'.svg').write_text(ground)
