#!/usr/bin/env python3
"""Original campus illustrations. One orthographic camera, palette and scale.
Run from repository root. All geometry is authored here; no external assets.
"""
from pathlib import Path
import math
import random
import sys
ONLY_HALLS="--only-halls" in sys.argv
random.seed(17)
OUT=Path('src/assets/campus'); OUT.mkdir(exist_ok=True)
INK='#44535a'; SAND='#e0c99b'; IVORY='#f4edd9'; TEAL='#547d78'; DARK='#35575a'; GOLD='#d8a341'
def p(x,y,z=0): return (160+(x-y)*.866, 126+(x+y)*.5-z)
def pts(v): return ' '.join(f'{x:.1f},{y:.1f}' for x,y in v)
def poly(v,c,stroke=INK,w=.65):return f'<polygon points="{pts(v)}" fill="{c}" stroke="{stroke}" stroke-width="{w}" stroke-linejoin="round"/>'
def line(a,b,c=INK,w=1.5,dash=''):return f'<path d="M{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>'
GRADIENTS={}
def material(c,face):
 key=c.strip('#')+'-'+face
 GRADIENTS[key]=(c,face)
 return f'url(#{key})'
def box(x,y,z,dx,dy,h,top=IVORY,left='#c9c6ae',right='#a7b5a4'):
 return poly([p(x,y+dy,z),p(x+dx,y+dy,z),p(x+dx,y+dy,z+h),p(x,y+dy,z+h)],material(left,'wall'))+poly([p(x+dx,y,z),p(x+dx,y+dy,z),p(x+dx,y+dy,z+h),p(x+dx,y,z+h)],material(right,'shade'))+poly([p(x,y,z+h),p(x+dx,y,z+h),p(x+dx,y+dy,z+h),p(x,y+dy,z+h)],material(top,'roof'))+line(p(x,y,z+h),p(x+dx,y,z+h),'#ffffff',.5)
def dock_box(x,y,z,dx,dy,h,top,left,right):
 # Small fixtures use solid face colors, leaving the shared material registry alone.
 return poly([p(x,y+dy,z),p(x+dx,y+dy,z),p(x+dx,y+dy,z+h),p(x,y+dy,z+h)],left)+poly([p(x+dx,y,z),p(x+dx,y+dy,z),p(x+dx,y+dy,z+h),p(x+dx,y,z+h)],right)+poly([p(x,y,z+h),p(x+dx,y,z+h),p(x+dx,y+dy,z+h),p(x,y+dy,z+h)],top)
def shrub(x,y,z=0,r=7):
 cx,cy=p(x,y,z)
 return f'<ellipse cx="{cx+5}" cy="{cy+4}" rx="{r*1.3}" ry="{r*.45}" fill="#263d33" opacity=".18"/><circle cx="{cx}" cy="{cy-4}" r="{r}" fill="url(#foliage)"/><circle cx="{cx-2}" cy="{cy-7}" r="{r*.45}" fill="#bbcf7b" opacity=".5"/>'
def pane(x,y,z,w=16,h=10):
 return poly([p(x,y,z),p(x+w,y,z),p(x+w,y,z+h),p(x,y,z+h)],'url(#glass)','#506976',.7)+line(p(x+w*.45,y,z),p(x+w*.45,y,z+h),'#8da4ab',.5)
def pad():
 s=box(-77,-57,-3,154,114,4,'#a9b4af','#7f918c','#6a7e78')
 for x in range(-70,78,18):s+=line(p(x,-56,1.2),p(x,56,1.2),'#7e8d87',.35)
 for y in range(-48,57,18):s+=line(p(-76,y,1.2),p(76,y,1.2),'#c3cbc1',.4)
 return s
def plot():return poly([p(-77,-57),p(77,-57),p(77,57),p(-77,57)],'#dcc99f','#ad9c77')
def bollards():
 return ''.join(box(x,y,1,2,2,6,GOLD,'#c08c39','#ae7d31') for x,y in [(-74,-54),(72,-54),(72,52),(-74,52)])
def fans(x,y,z,n=3):
 s=''
 for i in range(n):
  xx=x+i*21
  s+=box(xx,y,z,17,19,8,'#d9e0d3','#a7bbb0','#7c9c91')
  cx,cy=p(xx+8.5,y+9.5,z+8)
  s+=f'<ellipse cx="{cx}" cy="{cy}" rx="6.5" ry="3.7" fill="#203d49" stroke="#d0dcda" stroke-width=".8"/>'
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
  # Concrete pours, recessed service channels and bolted column footings make the
  # completed foundation visibly different from its surveyed dirt outline.
  for x in (-42,0,42):
   s+=poly([p(x-10,-34,4.2),p(x+10,-34,4.2),p(x+10,34,4.2),p(x-10,34,4.2)],'#c9cec4','#b1b9af',.35)
  for y in (-24,24):
   s+=poly([p(-55,y-2,4.3),p(55,y-2,4.3),p(55,y+2,4.3),p(-55,y+2,4.3)],'#697d7b','none')
   s+=line(p(-55,y+2,4.4),p(55,y+2,4.4),'#e4e5d5',.7)
  for x in (-54,-18,18,54):
   for y in (-33,33):
    s+=box(x-4,y-4,4,8,8,2,'#e2dfc9','#a3ada2','#82958d')
    for dx,dy in [(-2,-2),(2,-2),(-2,2),(2,2)]:
     s+=line(p(x+dx,y+dy,6),p(x+dx,y+dy,9),'#526c6b',.8)
  # Short tied rebar cages at the corners, not full-height steel-frame columns.
  for x,y in [(-55,-34),(53,32)]:
   for dx in (0,4):s+=line(p(x+dx,y,5),p(x+dx,y,15),'#637b75',.7)
   for z in (8,12):s+=line(p(x,y,z),p(x+4,y,z),'#9aa596',.65)
  for x in (-54,-18,18,54):s+=line(p(x,-36,5),p(x,36,5),'#dadbcf',1)
  return s+bollards()
 for x in (-58,-20,20,58):
  for y in (-38,38):s+=box(x,y,4,2,2,43,'#8b9b97','#67817e','#466561')
  s+=line(p(x,-38,47),p(x,40,47),TEAL,3)
 s+=line(p(-58,-38,47),p(60,-38,47),TEAL,3)+line(p(-58,40,47),p(60,40,47),TEAL,3)
 if stage=='steel':
  # Open structure stays open: light roof joists and selected braced bays, not
  # opaque wall panels that would imply the next stage is already finished.
  for y in (-20,0,20):
   s+=line(p(-58,y,47),p(60,y,47),'#708d8a',1.8)
   s+=line(p(-58,y,45),p(60,y,45),'#a0b0a5',.6)
   for x in (-40,-20,0,20,40):
    s+=line(p(x,y,45),p(x+9,y,47),'#849c93',.6)
  for x1,x2,y in [(-58,-20,40),(20,58,-38)]:
   s+=line(p(x1,y,7),p(x2,y,43),'#77938c',1.2)
   s+=line(p(x1,y,43),p(x2,y,7),'#77938c',1.2)
  for x in (-58,-20,20,58):
   for y in (-38,38):
    s+=box(x-2,y-2,3,6,6,2,'#aebdb0','#80998e','#5f7d78')
    s+=box(x-.7,y-.7,42,3.4,3.4,3,'#9bb0a6','#718d84','#55756f')
    for z in (43,44):s+=line(p(x+1,y+2.8,z),p(x+1.3,y+2.8,z),'#d0d9c6',.7)
  return s
 s+=box(-60,-40,4,120,80,43,'#a5b5bf','#7d98aa','#38566d')
 s+=box(-61,-41,46,122,82,2,'#d7dfe2','#a6b9c1','#6e899b')
 # Recessed roof membrane, perimeter parapet and ambient-occlusion seams.
 s+=poly([p(-58,-38,48.1),p(58,-38,48.1),p(58,38,48.1),p(-58,38,48.1)],'#647d88','#3c5568',.8)
 s+=poly([p(-58,-38,48.2),p(58,-38,48.2),p(55,-34,48.2),p(-54,-34,48.2)],'#334d5f','none')
 s+=poly([p(55,-34,48.2),p(58,-38,48.2),p(58,38,48.2),p(55,34,48.2)],'#3b5564','none')
 for x in range(-52,55,10):s+=line(p(x,-32,48.3),p(x,32,48.3),'#8b9ca3',.32)
 for y in (-20,-4,12,28):s+=line(p(-53,y,48.4),p(54,y,48.4),'#405d6c',.4)
 for x in range(-54,59,7):s+=line(p(x,40,7),p(x,40,43),'#668286',.45)
 for y in range(-34,39,7):s+=line(p(60,y,7),p(60,y,44),'#536e77',.5)
 for z in (9,12,15,18,21):s+=line(p(60,-34,z),p(60,33,z),'#a5b6b5',.35)
 for x in range(-54,56,18):s+=pane(x,40.2,32,13,7)
 for x in (-48,-8,32):
  s+=box(x,37,2,25,10,2,'#b1b5af','#879c97','#667f7b')
  for z in (9,12,15,18,21):s+=line(p(x+3,40.5,z),p(x+18,40.5,z),'#89a0a0',.55)
 for x in range(-55,58,13):s+=line(p(x,-36,48.2),p(x,36,48.2),'#a6b6b3',.45)
 s+=box(45,-32,48,8,55,1.4,'#e0e6df','#9daea7','#728b88')
 # Corrugated wall cladding and loading bays.
 for x in range(-51,57,9):s+=line(p(x,40,8),p(x,40,43),'#aab5a7',.8)
 # Closed loading doors read as equipment access, never as an open/leased hall.
 # First bay sits behind the entrance pavilion; the two exposed bays get dock seals,
 # ribbed roll-up doors, curb bumpers and short loading aprons in the same camera.
 for x in (-46,-5,36):
  s+=poly([p(x-1,40.2,4),p(x+21,40.2,4),p(x+21,40.2,26),p(x-1,40.2,26)],'#243e49','#b2c3be',.6)
  s+=poly([p(x+1,40.4,5),p(x+19,40.4,5),p(x+19,40.4,24),p(x+1,40.4,24)],'#728b95','#405b69',.5)
  for z in range(7,24,3):
   s+=line(p(x+1,40.5,z),p(x+19,40.5,z),'#aabcb9',.55)
   s+=line(p(x+1,40.6,z-.6),p(x+19,40.6,z-.6),'#4c6874',.35)
  s+=line(p(x+8,40.8,8),p(x+12,40.8,8),'#d5d6bd',.8)
  if x!=-46:
   s+=dock_box(x-1,41,1,22,13,2,'#aeb6ac','#869b92','#5f7b75')
   for xx in (x-2,x+21):
    s+=dock_box(xx,41.2,3,2,2.8,7,'#52685f','#2e4948','#243b3e')
    s+=dock_box(xx,49,3,1.8,1.8,6,GOLD,'#ae833d','#826b3f')
    s+=line(p(xx,49,6),p(xx+1.8,49,6),'#f2d892',.65)
   s+=dock_box(x-2,39.6,26,24,3,2,'#a6b9b7','#6c8791','#405c6c')
   # High-contrast stand-clear stripes stay within the existing concrete pad.
   for xx in (x+2,x+9,x+16):s+=line(p(xx,54,1.2),p(xx+4,57,1.2),'#e0c981',.8)
 # Warm masonry entrance pavilion breaks up the industrial metal facade.
 s+=box(-55,38,3,29,4,27,'#b28d69','#ac785a','#765641')
 for z in range(7,29,3):
  s+=line(p(-54,42.1,z),p(-27,42.1,z),'#dfb08b',.38)
  for x in range(-52+(z%2)*2,-27,6):s+=line(p(x,42.2,z),p(x,42.2,z+3),'#704c3c',.3)
 for x in (-51,-43,-35):s+=pane(x,42.4,7,5,19)
 # Side fire escape, conduit and downpipes.
 for y in (-30,26):s+=line(p(60.5,y,5),p(60.5,y,43),'#b3c4c9',1.2)
 s+=box(60,-10,4,5,24,4,'#8b9b9f','#6c7d84','#3d5869')
 for z in range(11,40,3):s+=line(p(61,3,z),p(61,10,z),'#c8d0cb',.5)
 if stage=='shell':return s
 # Roof service walkway, safety rail and cable trays.
 for y in range(-28,29,10):s+=box(-57,y,48,9,7,2,'#626f74','#59696b','#40575c')
 for x in range(-55,62,14):s+=line(p(x,-40,49),p(x,-40,54),'#758e91',.7)
 s+=line(p(-58,-40,54),p(60,-40,54),'#96aeb0',.7)
 # Equipment plinth shadows fall across the membrane before the machinery.
 for x in (-45,-24,-3,18):s+=poly([p(x+4,-21,48.5),p(x+24,-21,48.5),p(x+24,2,48.5),p(x+4,2,48.5)],'#314e60','none')
 s+=fans(-45,-25,49,4)
 for x in (-42,-20,2,24):
  s+=box(x,-27,49,2,24,1.5,'#d0d8d1','#869d98','#627d7b')
 s+=line(p(-43,-29,50),p(45,-29,50),'#b3c7c4',2)
 s+=line(p(-43,-31,50),p(45,-31,50),'#526f73',.7)
 s+=box(-38,10,49,65,18,8,'#afc4b3','#7c9c91','#688b82')
 if stage in ('rfs','delivered'):
  s+=box(-72,28,1,7,8,13,TEAL,'#456b66',DARK)
  for x in (-35,8,47):s+=box(x,51,1,5,5,2,'#8da97c','#6f8f65','#637d59')
 if stage=='delivered':
  for x in range(-60,50,15):
   s+=line(p(x,50,1.2),p(x+9,50,1.2),'#e7e4ca',.8)
  for x in (-57,57):s+=shrub(x,53,4,5)
  s+=box(-55,43,26,32,9,2,'#dfc299','#9e7e59','#6b5a48')
  for x in (-54,-25):s+=line(p(x,50,1),p(x,50,26),'#c2c9bf',1.1)
  s+=box(-24,40,25,45,6,2,'#aecbd4','#779eae','#3d6478')
  # Rooftop solar strips: small, deep-blue reflective modules.
  for x in (-25,-6,13,32):
   s+=box(x,18,49,16,15,1.7,'#244d6a','#244056','#152e44')
   for xx in (x+5,x+10):s+=line(p(xx,18,51),p(xx,33,51),'#7892a8',.35)
   s+=line(p(x,25.5,51),p(x+16,25.5,51),'#7892a8',.35)
  for x in (-72,68):
   s+=box(x,-53,1,8,9,4,'#91a87e','#7c956b','#6b865d')
   s+=shrub(x+4,52,2,6)
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
 for xx in range(-48,-9,4):s+=box(xx,-31,3,1,42,23,'#9eb5b3','#607d82','#3b5864')
 for y in (-27,0,26):
  s+=box(20,y,1,32,13,22,'#cdd6c8','#91a99a','#708f81')
  s+=line(p(-44,y,51),p(32,y,48),DARK,.7)
  for xx in (-42,28):
   for zz in range(43,53,2):s+=box(xx,y,zz,3,3,.5,'#dbdfd0','#bdc8bc','#8baba0')
 return s

def plant(online):
 s=pad()+box(-55,-30,1,74,61,32,'#d3d9c8','#a8b9a8','#809d90')
 s+=box(22,-28,1,30,60,21,'#abc0b0','#8ba79b','#698b82')
 for x in (-43,-14):s+=box(x,-18,33,17,17,10,'#e1e4d4','#a8b9a8','#809d90')
 for y in (-18,18):s+=box(34,y,22,7,7,60,IVORY,'#a8b9a8','#809d90')+box(34,y,68,7,7,5,GOLD,'#b28a43','#a07736')
 for yy in range(-25,28,7):
  for zz in range(8,27,4):s+=line(p(19,yy,zz),p(19,yy+4,zz),'#4d6a71',1)
 for xx in range(-50,17,10):s+=pane(xx,31.5,17,7,9)
 for y in (-18,18):
  for z in (30,42,54,66):s+=box(33,y-1,z,9,9,.7,'#b8c6bf','#849c95','#516f72')
 if not online:s+=bollards()+line(p(-68,50,1),p(70,50,1),GOLD,4)
 else:
  for y in (-18,18):
   cx,cy=p(37,y+3,92);s+=f'<path d="M{cx},{cy} q-9,-9 1,-17 q10,-9 0,-18" stroke="#e7e9dd" stroke-width="7" fill="none" stroke-linecap="round"/>'
 return s

def wheel(x,y,z=6,r=7):
 cx,cy=p(x,y,z)
 return f'<ellipse cx="{cx}" cy="{cy}" rx="{r*.7}" ry="{r}" fill="#20323b" stroke="#43565d" stroke-width="1"/><ellipse cx="{cx+.5}" cy="{cy-1}" rx="{r*.36}" ry="{r*.58}" fill="#8c9c99"/><ellipse cx="{cx+1}" cy="{cy-1}" rx="{r*.16}" ry="{r*.25}" fill="#364d58"/>'
def vehicle(kind):
 s=''
 if kind=='crane':
  s=box(-35,-20,2,65,35,12,GOLD,'#bf8b3d','#a47132')+box(-5,-12,14,20,22,16,IVORY,'#afb8aa','#78988b')
  s+=line(p(-10,0,28),p(-15,0,112),GOLD,8)+line(p(-40,0,105),p(80,0,119),GOLD,6)+line(p(65,0,117),p(65,0,63),INK,1.5)
  s+='<g class="crane-boom">'
  s+=line(p(-15,0,112),p(80,0,119),'#ffe295',2)+line(p(-30,0,104),p(65,0,113),'#ab7330',1)
  for x in range(-25,75,12):s+=line(p(x,0,106),p(x+9,0,118),'#775e36',.8)
  s+='</g>'
  for z in range(35,103,14):
   s+=line(p(-15,0,z),p(-10,0,z+10),INK,.7)+line(p(-10,0,z),p(-15,0,z+10),'#ffe2a1',.8)
  s+=pane(-2,10,19,14,10)
  for x in (-28,-15,0,15,27):s+=wheel(x,16,6,6)
  s+=line(p(65,0,63),p(65,0,58),INK,2)+line(p(65,0,58),p(69,0,57),INK,2)
  for x,y in [(-39,-21),(35,22),(-39,22),(35,-21)]:s+=box(x,y,0,7,6,3,'#6a7c76','#435654','#2d454b')
 elif kind=='excavator':
  s=box(-35,-20,1,65,36,10,DARK,DARK,DARK)+box(-29,-15,12,50,27,13,GOLD,'#b5863a','#a67831')+box(-20,-12,25,20,24,22,IVORY,'#9bb5aa',TEAL)
  s+=pane(-18,12,28,15,15)
  for x in (-27,-15,-3,9,21):s+=wheel(x,18,7,6)
  for xx in range(-26,20,5):s+=line(p(xx,18,3),p(xx+2,18,12),'#738078',.8)
  s+=line(p(11,0,28),p(47,0,59),GOLD,9)+line(p(47,0,59),p(65,0,16),GOLD,7)+box(60,-12,0,19,25,12,DARK,TEAL,DARK)
 else:
  s=box(-44,-21,10,58,40,24,'#d5d7c7','#aebcae','#8ca597')+box(15,-21,8,28,40,22,GOLD,'#bd8e42','#a77e3b')+box(19,-19,30,21,36,6,IVORY,'#aac3b6',TEAL)
  for x in (-31,-15,29):s+=wheel(x,21,8,8)
  s+=pane(19,19.5,22,19,8)
  s+=poly([p(43,-17,22),p(43,17,22),p(43,17,30),p(43,-17,30)],'url(#glass)','#5b7980',.6)
  s+=line(p(39,21,10),p(39,21,22),'#885e30',.7)+line(p(23,21,18),p(28,21,18),'#334c54',1)
  for xx in range(-40,12,6):s+=line(p(xx,20,13),p(xx,20,32),'#8ea29f',.4)
  for yy in (-16,13):s+=box(43,yy,11,2,4,3,'#fff4bc','#e0c98d','#bfa271')
  s+=line(p(45,-18,9),p(45,18,9),'#596c71',2)
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
  # Standing-seam roof, modest rooftop service unit and rainwater trim.
  s+=box(-60,-32,29,116,66,2,'#dfdec7','#b8c0ac','#8fa99b')
  for x in range(-52,54,12):s+=line(p(x,-30,31.1),p(x,32,31.1),'#b5bca8',.55)
  s+=box(20,-21,31,18,15,7,'#a5b8ad','#7f9d95','#527b7b')
  cx,cy=p(29,-13.5,38)
  s+=f'<ellipse cx="{cx}" cy="{cy}" rx="4.5" ry="2.5" fill="#476971" stroke="#b6c9b8" stroke-width=".6"/>'
  for z in (7,14,21):s+=line(p(-57,32.1,z),p(52,32.1,z),'#b6bca9',.35)
  for x in (-45,-16):s+=pane(x,32.4,12,18,12)
  # Glass entrance, striped awning, two shallow steps and a sheltered notice board.
  s+=poly([p(25,32.3,3),p(42,32.3,3),p(42,32.3,25),p(25,32.3,25)],'#537c82','#d8deca',1)
  s+=line(p(33,32.6,4),p(33,32.6,24),'#b8d0c5',.65)
  s+=line(p(38,32.8,12),p(40,32.8,12),'#e0d7b3',1)
  s+=box(21,32,25,25,10,2,'#bba984','#94876a','#6b7867')
  for x in (23,32,41):s+=poly([p(x,32,27.2),p(x+4,32,27.2),p(x+4,42,27.2),p(x,42,27.2)],'#e4dcc1','none')
  s+=box(23,33,1,22,9,1.2,'#c1c5b5','#a6b09e','#8ca495')
  s+=box(25,39,0,18,7,1,'#d0ceb9','#a7b2a0','#8aa190')
  s+=poly([p(54.2,-20,9),p(54.2,-3,9),p(54.2,-3,22),p(54.2,-20,22)],'#7a6e50','#d2c39c',.8)
  for y,z in [(-17,12),(-9,13)]:s+=poly([p(54.4,y,z),p(54.4,y+5,z),p(54.4,y+5,z+6),p(54.4,y,z+6)],'#e9e2c4','none')
  s+=line(p(-57,32,3),p(-57,32,29),'#8da99b',1.2)
  return s+box(40,-41,0,9,10,16,GOLD,'#b78e49','#a17a3a')
 if kind=='laydown':return pad()+''.join(box(x,y,1,32,22,19,'#d8b779','#b49359','#9a7d4c')+line(p(x+16,y,1),p(x+16,y,20),'#6f7968',2) for x,y in [(-55,-30),(-13,-30),(27,-30),(-34,5),(10,5)])
 if kind=='pond':
  s=poly([p(-75,-38),p(-25,-56),p(57,-30),p(76,20),p(22,51),p(-58,32)],'#b4c1a0','#8e9c7b')
  s+=poly([p(-57,-29),p(-24,-42),p(46,-23),p(59,14),p(21,37),p(-43,25)],'#8db7ae','#6b9690')
  for x,y in [(-25,-11),(12,10),(-8,23)]:s+=line(p(x,y),p(x+22,y),'#c2d8c8',2)
  return s
 return plot()+''.join(line(p(x,-25),p(x+12,-13),'#9aa37d',2) for x in range(-50,51,18))

def construction_yard(kind):
 s=pad()
 if kind=='steel':
  for x,y,n in [(-55,-27,5),(-21,-27,4),(15,-27,3)]:
   for z in range(n):
    s+=box(x,y,2+z*4,20,66,3,'#9db1af','#6d888a','#3c5e69')
    s+=line(p(x+3,y+3,5+z*4),p(x+3,y+62,5+z*4),'#c5d0bf',.8)
   for yy in (-13,17):s+=line(p(x,yy,2),p(x+20,yy,2+n*4),'#d9b66d',1.6)
  for x in (-59,52):s+=box(x,41,1,8,8,6,GOLD,'#ad7836','#8c622f')
 else:
  for x,y in [(-56,-30),(-11,-30),(34,-30)]:
   s+=box(x,y,1,33,58,8,'#8b9c98','#6a817d','#526d6b')
   for xx in range(x,x+32,5):s+=box(xx,y,10,3,58,18,'#cad4ca','#8ea6a2','#5a7e85')
   for yy in (-17,12):s+=line(p(x,yy,10),p(x+33,yy,28),'#d6b571',1.5)
  s+=box(-53,37,1,60,12,5,'#d7c29a','#bba172','#8b815e')
 return s

def people():
 s=box(-55,-26,-2,110,52,3,'#ded0af','#c1b18c','#ac9f80')
 for x,y,col in [(-30,0,TEAL),(0,6,GOLD),(30,0,TEAL)]:
  s+=line(p(x-5,y,1),p(x-4,y,24),DARK,6)+line(p(x+5,y,1),p(x+4,y,24),DARK,6)
  s+=box(x-8,y-6,23,16,12,24,col,col,DARK)
  cx,cy=p(x,y,55);s+=f'<circle cx="{cx}" cy="{cy}" r="7" fill="#d8ad7c" stroke="{INK}" stroke-width="1.5"/><path d="M{cx-9},{cy-2} q0,-12 18,0z" fill="{GOLD}" stroke="{INK}" stroke-width="1.5"/>'
 return s

def compound(kind):
 s=box(-95,-68,-3,190,136,4,'#98a9a4','#6e8480','#526f6c')
 for x in range(-88,90,15):s+=line(p(x,-66,1),p(x,66,1),'#c5cfbf',.45)
 for y in range(-60,66,15):s+=line(p(-94,y,1),p(94,y,1),'#657d76',.4)
 # Chain-link perimeter, service gate and perimeter fixtures.
 for x in range(-92,94,16):
  s+=line(p(x,-65,1),p(x,-65,16),'#a9b6af',1.1)
  s+=line(p(x,-65,16),p(min(x+16,94),-65,1),'#b0bdb1',.35)
 s+=line(p(-92,-65,16),p(92,-65,16),'#c8d2c1',.7)
 for y in range(-62,66,16):
  s+=line(p(94,y,1),p(94,y,16),'#9eb0aa',1.1)+line(p(94,y,16),p(94,min(y+16,66),1),'#b4c2b6',.35)
 s+=line(p(94,-64,16),p(94,66,16),'#b6c8be',.8)
 if kind=='cooling':
  for x in (-78,-24,30):
   s+=box(x,-42,3,40,52,22,'#c3d6cf','#819d99','#4e7278')
   s+=fans(x+2,-32,25,2)
   for y in range(-36,7,5):s+=line(p(x+40,y,5),p(x+40,y,22),'#294f5d',.6)
  for x in (-75,-20,35):s+=box(x,25,2,30,17,12,'#9db8af','#6e9790','#3d6972')
  for y in (16,21):s+=line(p(-82,y,8),p(80,y,8),'#adc8c3',3)
  s+=box(-85,50,1,31,12,16,'#c9d4c5','#8fa9a0','#5b817e')
 else:
  for x in (-78,-20,38):
   s+=box(x,-41,2,42,71,23,'#d3d2b7','#9ba896','#68847c')
   for y in range(-35,22,5):s+=line(p(x+42,y,7),p(x+42,y,20),'#3b6065',1)
   s+=box(x+5,-30,25,9,9,22,'#bac9be','#8ba49c','#496f75')
   s+=box(x+4,-31,47,11,11,2,'#536d70','#435d60','#304e56')
   s+=poly([p(x+6,30,10),p(x+30,30,10),p(x+30,30,17),p(x+6,30,17)],'#b7c99e','#718876',.4)
  s+=box(-81,44,1,53,15,16,'#b0c4bb','#739892','#416e77')
  for x in (-74,-60,-46):s+=line(p(x,59,4),p(x,59,15),'#456973',.8)
 for x in (-90,84):
  s+=line(p(x,56,1),p(x,56,46),'#6b8782',2)+line(p(x,56,46),p(x+10,56,46),'#718c87',1.5)
  s+=box(x+7,54,45,6,5,2,'#e4e4cb','#b5c8b3','#8ba59c')
 return s

def save(name,body):
 if ONLY_HALLS and not name.startswith("hall-"):return
 defs='<defs><radialGradient id="foliage" cx="30%" cy="25%"><stop stop-color="#c6d58b"/><stop offset=".4" stop-color="#729558"/><stop offset="1" stop-color="#355d47"/></radialGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#b4d8dc"/><stop offset=".45" stop-color="#4f7d8a"/><stop offset=".5" stop-color="#b3cace"/><stop offset="1" stop-color="#355461"/></linearGradient><filter id="shadow" x="-35%" y="-35%" width="180%" height="190%"><feDropShadow dx="7" dy="10" stdDeviation="4" flood-color="#223c3c" flood-opacity=".32"/></filter>'
 for key,(c,face) in GRADIENTS.items():
  if f'url(#{key})' not in body:continue
  rgb=[int(c[i:i+2],16) for i in (1,3,5)]
  def tint(f):return '#'+''.join(f'{max(0,min(255,round(v*f))):02x}' for v in rgb)
  defs+=f'<linearGradient id="{key}" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="{tint(1.12)}"/><stop offset=".52" stop-color="{c}"/><stop offset="1" stop-color="{tint(.88)}"/></linearGradient>'
 defs+='</defs><style>.crane-boom{transform-origin:147px 21px;animation:sway 7s ease-in-out infinite alternate}@keyframes sway{to{transform:rotate(2deg)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style>'
 detail_path=Path('scripts/campus-details')/(name+'.svg')
 detail=detail_path.read_text().strip() if detail_path.exists() else ''
 # Detail groups belong inside the scene shadow only for the office entry rails.
 if name=='tile-site-office':body+=detail;detail=''
 (OUT/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 -12 300 242">'+defs+'<g filter="url(#shadow)">'+body+'</g>'+detail+'</svg>\n')
for stage in ('not-started','pad','steel','shell','fitout','rfs','delivered'):save('hall-'+stage,hall(stage))
for stage in ('planned','building','done'):save('substation-'+stage,substation(stage))
for online in (False,True):save('plant-'+('online' if online else 'building'),plant(online))
for kind in ('crane','excavator','truck'):save('vehicle-'+kind,vehicle(kind))
for kind in ('cooling-tower','dry-cooler','hybrid-chiller','transformer','switchgear'):save('equip-'+kind,equipment(kind))
for kind in ('site-office','laydown','pond','dry-field'):save('tile-'+kind,tile(kind))
save('campus-people',people())
for kind in ('steel','panels'):save('yard-'+kind,construction_yard(kind))
for kind in ('cooling','backup'):save('compound-'+kind,compound(kind))
# Ground has its own deterministic landscape generator.
if not ONLY_HALLS:exec(Path('scripts/campus-ground.py').read_text())
print(f'Wrote {len(list(OUT.glob("*.svg")))} original campus assets')
