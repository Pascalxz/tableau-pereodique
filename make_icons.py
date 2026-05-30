#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère les icônes PNG de l'app (PWA, favicon, apple-touch, image de partage)
sans aucune dépendance : encodeur PNG maison + rendu d'un atome sur dégradé.
Lancer : python3 make_icons.py"""
import math, zlib, struct
from array import array

INK = (12, 17, 24)
# Dégradé diagonal de la marque : jaune -> vert -> bleu
STOPS = [(0.0,(255,210,63)), (0.5,(110,232,122)), (1.0,(94,200,242))]

def grad(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(STOPS)-1):
        p0,c0 = STOPS[i]; p1,c1 = STOPS[i+1]
        if t <= p1:
            lt = (t-p0)/(p1-p0 or 1)
            return tuple(c0[k]+(c1[k]-c0[k])*lt for k in range(3))
    return STOPS[-1][1]

def write_png(path, w, h, buf):
    """buf: array('f') de longueur w*h*3 (valeurs 0..255)."""
    raw = bytearray()
    stride = w*3
    row = bytearray(stride)
    for y in range(h):
        raw.append(0)  # filtre None
        base = y*stride
        for x in range(stride):
            v = buf[base+x]
            row[x] = 0 if v<0 else (255 if v>255 else int(v+0.5))
        raw += row
    def chunk(typ, data):
        return (struct.pack('>I', len(data)) + typ + data +
                struct.pack('>I', zlib.crc32(typ+data) & 0xffffffff))
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w,h,8,2,0,0,0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw),9))
    png += chunk(b'IEND', b'')
    open(path,'wb').write(png)
    print('écrit', path, f'{w}x{h}')

def stamp_disk(ink, w, h, cx, cy, r):
    """Ajoute un disque anticrénelé (coverage max) dans le buffer ink."""
    x0=max(0,int(cx-r-1)); x1=min(w,int(cx+r+2))
    y0=max(0,int(cy-r-1)); y1=min(h,int(cy+r+2))
    for y in range(y0,y1):
        dy=y+0.5-cy
        for x in range(x0,x1):
            dx=x+0.5-cx
            d=math.hypot(dx,dy)-r
            cov=0.5-d
            if cov<=0: continue
            if cov>1: cov=1.0
            i=y*w+x
            if cov>ink[i]: ink[i]=cov

def ring(ink, w, h, cx, cy, a, b, ang, sr, gap=None):
    """Ellipse (orbite) tracée en tamponnant des disques. gap=(t0,t1) pour
    laisser un trou (effet de croisement) — non utilisé ici."""
    n=max(120,int(2*math.pi*(a+b)/max(1,sr)))
    ca,sa=math.cos(ang),math.sin(ang)
    for k in range(n):
        t=2*math.pi*k/n
        ex=a*math.cos(t); ey=b*math.sin(t)
        x=cx+ex*ca-ey*sa; y=cy+ex*sa+ey*ca
        stamp_disk(ink,w,h,x,y,sr)

def render_atom(w, h, scale=1.0, cxr=0.5):
    """Retourne un buffer float RGB : dégradé + atome dessiné en INK."""
    buf=array('f',[0.0])*(w*h*3)
    diag=w+h-2
    for y in range(h):
        for x in range(w):
            r,g,b=grad((x+y)/diag)
            i=(y*w+x)*3
            buf[i]=r; buf[i+1]=g; buf[i+2]=b
    ink=array('f',[0.0])*(w*h)
    cx=w*cxr; cy=h*0.5
    s=min(w,h)*scale
    a=s*0.40; b=s*0.155; sr=s*0.022
    for ang in (0, math.pi/3, 2*math.pi/3):
        ring(ink,w,h,cx,cy,a,b,ang,sr)
    # électrons
    for j,ang in enumerate((0, math.pi/3, 2*math.pi/3)):
        t=math.pi/4 + j*1.4
        ex=a*math.cos(t); ey=b*math.sin(t)
        ca,sa=math.cos(ang),math.sin(ang)
        stamp_disk(ink,w,h,cx+ex*ca-ey*sa,cy+ex*sa+ey*ca,s*0.045)
    # noyau
    stamp_disk(ink,w,h,cx,cy,s*0.075)
    # composer l'atome (INK) par-dessus le dégradé
    for p in range(w*h):
        c=ink[p]
        if c<=0: continue
        i=p*3
        buf[i]   = buf[i]  *(1-c)+INK[0]*c
        buf[i+1] = buf[i+1]*(1-c)+INK[1]*c
        buf[i+2] = buf[i+2]*(1-c)+INK[2]*c
    return buf

def downsample(src, sw, sh, dw, dh):
    """Moyenne d'aire src(sw,sh) -> dst(dw,dh), buffers float RGB."""
    dst=array('f',[0.0])*(dw*dh*3)
    fx=sw/dw; fy=sh/dh
    for dy in range(dh):
        y0=int(dy*fy); y1=max(y0+1,int((dy+1)*fy))
        for dx in range(dw):
            x0=int(dx*fx); x1=max(x0+1,int((dx+1)*fx))
            r=g=b=0.0; n=0
            for y in range(y0,y1):
                rowb=y*sw*3
                for x in range(x0,x1):
                    si=rowb+x*3
                    r+=src[si]; g+=src[si+1]; b+=src[si+2]; n+=1
            di=(dy*dw+dx)*3
            dst[di]=r/n; dst[di+1]=g/n; dst[di+2]=b/n
    return dst

# --- Icône principale 512 (master) + déclinaisons ---
master = render_atom(512,512,scale=1.0)
write_png('icon-512.png',512,512,master)
write_png('icon-192.png',192,192, downsample(master,512,512,192,192))
write_png('apple-touch-icon.png',180,180, downsample(master,512,512,180,180))
write_png('favicon-32.png',32,32, downsample(master,512,512,32,32))

# --- Image de partage Open Graph 1200x630 ---
og = render_atom(1200,630,scale=1.45,cxr=0.5)
write_png('og-image.png',1200,630,og)
print('Terminé.')
