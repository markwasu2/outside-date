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
for x,y in [(35,y)for y in range(140,730,96)]+[(1163,y)for y in range(130,760,78)]+[(x,776)for x in range(185,1100,89)]:
 parts.append(f'<ellipse cx="{x+12}" cy="{y+9}" rx="22" ry="11" fill="#304c3e" opacity=".23" filter="url(#blur)"/><path d="M{x} {y}v-20" stroke="#6f7150" stroke-width="4"/><circle cx="{x}" cy="{y-25}" r="19" fill="url(#tree)"/><circle cx="{x-8}" cy="{y-27}" r="11" fill="#95ae70" opacity=".55"/>')
# Whole ground texture stays low contrast so interface remains quiet.
parts.append('<path fill="#9ca088" opacity=".08" filter="url(#grain)" d="M0 0h1200v800H0z"/><path d="M68 110V752H1133V110" fill="none" stroke="#c6ccaf" stroke-opacity=".65" stroke-dasharray="3 4"/></svg>')
Path('src/assets/campus/campus-ground.svg').write_text(''.join(parts)+'\n')
