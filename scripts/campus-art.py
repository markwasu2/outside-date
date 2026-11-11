#!/usr/bin/env python3
"""Original campus illustrations. One orthographic camera, palette and scale.
Run from repository root. All geometry is authored here; no external assets.
"""
from pathlib import Path
import math
OUT=Path('src/assets/campus'); OUT.mkdir(exist_ok=True)
INK='#4c554c'; SAND='#e0c99b'; IVORY='#f4edd9'; TEAL='#547d78'; DARK='#35575a'; GOLD='#d8a341'
def p(x,y,z=0): return (160+(x-y)*.866, 126+(x+y)*.5-z)
def pts(v): return ' '.join(f'{x:.1f},{y:.1f}' for x,y in v)
def poly(v,c,stroke=INK,w=1.5):return f'<polygon points="{pts(v)}" fill="{c}" stroke="{stroke}" stroke-width="{w}" stroke-linejoin="round"/>'
def line(a,b,c=INK,w=1.5,dash=''):return f'<path d="M{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>'
def box(x,y,z,dx,dy,h,top=IVORY,left='#c9c6ae',right='#a7b5a4'):
 return poly([p(x,y+dy,z),p(x+dx,y+dy,z),p(x+dx,y+dy,z+h),p(x,y+dy,z+h)],left)+poly([p(x+dx,y,z),p(x+dx,y+dy,z),p(x+dx,y+dy,z+h),p(x+dx,y,z+h)],right)+poly([p(x,y,z+h),p(x+dx,y,z+h),p(x+dx,y+dy,z+h),p(x,y+dy,z+h)],top)
def pad():return box(-77,-57,-3,154,114,4,'#e3d1ad','#c4af88','#bba781')
def plot():return poly([p(-77,-57),p(77,-57),p(77,57),p(-77,57)],'#dcc99f','#ad9c77')
def bollards():
 return ''.join(box(x,y,1,2,2,6,GOLD,'#c08c39','#ae7d31') for x,y in [(-74,-54),(72,-54),(72,52),(-74,52)])
def fans(x,y,z,n=3):
 s=''
 for i in range(n):
  xx=x+i*21
  s+=box(xx,y,z,17,19,8,'#d9e0d3','#a7bbb0','#7c9c91')
  cx,cy=p(xx+8.5,y+9.5,z+8)
  s+=f'<ellipse cx="{cx}" cy="{cy}" rx="6" ry="3.5" fill="{DARK}"/>'
  for a in (0,math.pi*2/3,math.pi*4/3): s+=line((cx,cy),(cx+5*math.cos(a),cy+2.5*math.sin(a)),'#b5d0bc',1)
 return s
def hall(stage):
 s=pad()
 if stage=='not-started':
  s=plot()+bollards()
  for y in (-30,0,30):s+=line(p(-58,y),p(58,y),'#b29e77',1,'4 5')
  return s
 s+=box(-60,-40,1,120,80,3,'#bdbeb0','#9d9c8d','#8b978d')
 if stage=='pad':
  for x in (-54,-18,18,54):s+=line(p(x,-36,5),p(x,36,5),'#dadbcf',1)
  return s+bollards()
 for x in (-58,-20,20,58):
  for y in (-38,38):s+=box(x,y,4,2,2,43,'#8b9b97','#67817e','#466561')
  s+=line(p(x,-38,47),p(x,40,47),TEAL,3)
 s+=line(p(-58,-38,47),p(60,-38,47),TEAL,3)+line(p(-58,40,47),p(60,40,47),TEAL,3)
 if stage=='steel':return s
 s+=box(-60,-40,4,120,80,43,'#e8e3ce','#c8cbbb','#9eafa2')
 # Corrugated wall cladding and loading bays.
 for x in range(-51,57,9):s+=line(p(x,40,8),p(x,40,43),'#aab5a7',.8)
 for x in (-46,-5,36):s+=poly([p(x,40,5),p(x+20,40,5),p(x+20,40,25),p(x,40,25)],DARK)
 if stage=='shell':return s
 s+=fans(-45,-25,47,4)
 s+=box(-38,10,47,65,18,8,'#afc4b3','#7c9c91','#688b82')
 if stage in ('rfs','delivered'):
  s+=box(-72,-46,1,7,8,13,TEAL,'#456b66',DARK)
  for x in (-35,8,47):s+=box(x,-51,1,5,5,2,'#8da97c','#6f8f65','#637d59')
 if stage=='delivered':
  for x in (-72,68):
   s+=box(x,-53,1,8,9,4,'#91a87e','#7c956b','#6b865d')
   cx,cy=p(x+4,-49,18);s+=f'<circle cx="{cx}" cy="{cy}" r="8" fill="#78966b" stroke="{INK}" stroke-width="1.5"/>'
 return s

def substation(stage):
 s=pad()
 if stage=='planned':return plot()+bollards()+line(p(-50,-30),p(50,30),TEAL,2,'5 5')+line(p(-50,30),p(50,-30),TEAL,2,'5 5')
 s+=box(-50,-30,1,42,40,28,'#b7c5ba','#8ba398','#65877f')
 for x in (-44,-31,-18): s+=box(x,-34,7,3,4,18,TEAL,'#76988c',DARK)
 if stage=='building':return s+bollards()
 for x in (-45,30):
  for y in (-43,40):s+=box(x,y,1,3,3,64,'#b5c7bd','#809e92','#5f7f77')
  s+=line(p(x,-43,65),p(x,43,65),TEAL,3)
 for y in (-27,0,26):
  s+=box(20,y,1,32,13,22,'#cdd6c8','#91a99a','#708f81')
  s+=line(p(-44,y,51),p(32,y,48),DARK,1.3)
 return s

def plant(online):
 s=pad()+box(-55,-30,1,74,61,32,'#d3d9c8','#a8b9a8','#809d90')
 s+=box(22,-28,1,30,60,21,'#abc0b0','#8ba79b','#698b82')
 for x in (-43,-14):s+=box(x,-18,33,17,17,10,'#e1e4d4','#a8b9a8','#809d90')
 for y in (-18,18):s+=box(34,y,22,7,7,60,IVORY,'#a8b9a8','#809d90')+box(34,y,68,7,7,5,GOLD,'#b28a43','#a07736')
 if not online:s+=bollards()+line(p(-68,50,1),p(70,50,1),GOLD,4)
 else:
  for y in (-18,18):
   cx,cy=p(37,y+3,92);s+=f'<path d="M{cx},{cy} q-9,-9 1,-17 q10,-9 0,-18" stroke="#e7e9dd" stroke-width="7" fill="none" stroke-linecap="round"/>'
 return s

def vehicle(kind):
 s=''
 if kind=='crane':
  s=box(-35,-20,2,65,35,12,GOLD,'#bf8b3d','#a47132')+box(-5,-12,14,20,22,16,IVORY,'#afb8aa','#78988b')
  s+=line(p(-10,0,28),p(-15,0,112),GOLD,8)+line(p(-40,0,105),p(80,0,119),GOLD,6)+line(p(65,0,117),p(65,0,63),INK,1.5)
  for z in range(35,103,14):s+=line(p(-15,0,z),p(-10,0,z+10),INK,1)
 elif kind=='excavator':
  s=box(-35,-20,1,65,36,10,DARK,DARK,DARK)+box(-29,-15,12,50,27,13,GOLD,'#b5863a','#a67831')+box(-20,-12,25,20,24,22,IVORY,'#9bb5aa',TEAL)
  s+=line(p(11,0,28),p(47,0,59),GOLD,9)+line(p(47,0,59),p(65,0,16),GOLD,7)+box(60,-12,0,19,25,12,DARK,TEAL,DARK)
 else:
  s=box(-44,-21,10,58,40,24,'#d5d7c7','#aebcae','#8ca597')+box(15,-21,8,28,40,22,GOLD,'#bd8e42','#a77e3b')+box(19,-19,30,21,36,6,IVORY,'#aac3b6',TEAL)
  for x in (-27,27):
   cx,cy=p(x,20,8);s+=f'<ellipse cx="{cx}" cy="{cy}" rx="8" ry="10" fill="{DARK}" stroke="{INK}" stroke-width="1.5"/>'
 return s

def equipment(kind):
 if kind in ('cooling-tower','dry-cooler','hybrid-chiller'):
  h=35 if kind=='cooling-tower' else 12 if kind=='dry-cooler' else 22
  return box(-45,-27,1,90,54,h,'#ccdbcd','#96b3a5','#72958a')+fans(-39,-11,h+1,4)
 if kind=='transformer':
  s=box(-35,-25,1,70,50,35,'#b9ccbf','#8aa79a','#63877d')
  for x in (-28,-8,12):s+=box(x,-12,36,7,7,20,IVORY,'#a7bcae',TEAL)
  return s
 return ''.join(box(x,-23,1,22,46,48,'#cdd8c9','#9cb6a6','#75988a') for x in (-38,-12,14))

def tile(kind):
 if kind=='site-office':
  s=pad()+box(-58,-30,2,112,62,28,IVORY,'#cfceba','#9fb3a2')
  for x in (-45,-16,13):s+=poly([p(x,32,11),p(x+18,32,11),p(x+18,32,23),p(x,32,23)],TEAL)
  return s+box(40,-41,0,9,10,16,GOLD,'#b78e49','#a17a3a')
 if kind=='laydown':return pad()+''.join(box(x,y,1,32,22,19,'#d8b779','#b49359','#9a7d4c')+line(p(x+16,y,1),p(x+16,y,20),'#6f7968',2) for x,y in [(-55,-30),(-13,-30),(27,-30),(-34,5),(10,5)])
 if kind=='pond':
  s=poly([p(-75,-38),p(-25,-56),p(57,-30),p(76,20),p(22,51),p(-58,32)],'#b4c1a0','#8e9c7b')
  s+=poly([p(-57,-29),p(-24,-42),p(46,-23),p(59,14),p(21,37),p(-43,25)],'#8db7ae','#6b9690')
  for x,y in [(-25,-11),(12,10),(-8,23)]:s+=line(p(x,y),p(x+22,y),'#c2d8c8',2)
  return s
 return plot()+''.join(line(p(x,-25),p(x+12,-13),'#9aa37d',2) for x in range(-50,51,18))

def people():
 s=box(-55,-26,-2,110,52,3,'#ded0af','#c1b18c','#ac9f80')
 for x,y,col in [(-30,0,TEAL),(0,6,GOLD),(30,0,TEAL)]:
  s+=line(p(x-5,y,1),p(x-4,y,24),DARK,6)+line(p(x+5,y,1),p(x+4,y,24),DARK,6)
  s+=box(x-8,y-6,23,16,12,24,col,col,DARK)
  cx,cy=p(x,y,55);s+=f'<circle cx="{cx}" cy="{cy}" r="7" fill="#d8ad7c" stroke="{INK}" stroke-width="1.5"/><path d="M{cx-9},{cy-2} q0,-12 18,0z" fill="{GOLD}" stroke="{INK}" stroke-width="1.5"/>'
 return s

def save(name,body):
 (OUT/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="25 0 270 215">'+body+'</svg>\n')
for stage in ('not-started','pad','steel','shell','fitout','rfs','delivered'):save('hall-'+stage,hall(stage))
for stage in ('planned','building','done'):save('substation-'+stage,substation(stage))
for online in (False,True):save('plant-'+('online' if online else 'building'),plant(online))
for kind in ('crane','excavator','truck'):save('vehicle-'+kind,vehicle(kind))
for kind in ('cooling-tower','dry-cooler','hybrid-chiller','transformer','switchgear'):save('equip-'+kind,equipment(kind))
for kind in ('site-office','laydown','pond','dry-field'):save('tile-'+kind,tile(kind))
save('campus-people',people())
# Low-noise surveyed site. Transparent field lets each scenario's soil color remain visible.
ground='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none"><defs><pattern id="soil" width="56" height="44" patternUnits="userSpaceOnUse"><path d="M4 8h4m28 20h3" stroke="#968761" stroke-opacity=".16" stroke-width="2"/></pattern></defs><path fill="url(#soil)" d="M0 0h1200v800H0z"/><path d="M0 52H1200" stroke="#d5c5a0" stroke-width="56"/><path d="M0 52H1200" stroke="#737c71" stroke-width="40"/><path d="M0 52H1200" stroke="#ddd8b9" stroke-width="2" stroke-dasharray="24 18"/><path d="M190 110V680H1010M190 400H1010" fill="none" stroke="#f3e5c7" stroke-opacity=".4" stroke-width="18"/><path d="M32 112V740H1168V112" fill="none" stroke="#9d9472" stroke-opacity=".35" stroke-dasharray="4 8"/></svg>'
(OUT/'campus-ground.svg').write_text(ground+'\n')
print(f'Wrote {len(list(OUT.glob("*.svg")))} original campus assets')
