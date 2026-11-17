"""Spaghetti frittata: thinner than a tortilla, strands of spaghetti visible on
top and poking from the edge, cut to show tangled pasta in egg, garnished with
diced tomato, herbs and Parmesan."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, RoundDish, smooth_path, GRAPHITE

sk = Sketch(seed=23)
sk.plate()
dish = RoundDish(sk, h=48, a1=46, a2=112)
dish.shadow()
dish.paint(top="#dc9d42", side="#b8742c", face="#efcb6c", top_brown="#94501a", browning=38)


def strand(x, y, length, angle, wiggle=9, segs=6):
    """Points along one wavy strand of spaghetti."""
    pts = []
    for i in range(segs + 1):
        s = length * (i / segs - 0.5)
        off = wiggle * math.sin(i * random.uniform(1.0, 1.8) + random.uniform(0, 3))
        pts.append((x + s * math.cos(angle) - off * math.sin(angle) * 0.6,
                    y + s * math.sin(angle) * 0.45 + off * math.cos(angle) * 0.45))
    return pts


dish.outline()
dish.side_hatching(marks=200)

# Strands poking out of the edge: little curls that cross the silhouette.
for _ in range(8):
    t = random.uniform(0.05, math.pi - 0.05)
    if dish.a1 - 0.1 < t < dish.a2 + 0.1:
        continue
    x, y = dish.E(t, dish.h * random.uniform(0.15, 0.8), 1.0)
    pts = strand(x, y, random.uniform(30, 50), random.uniform(-0.4, 0.4), wiggle=7, segs=4)
    sk.add(f'<path d="{smooth_path(pts)}" fill="none" stroke="#e7bf74" stroke-width="6" stroke-linecap="round" opacity="0.9"/>')
    sk.pencil(pts, w=0.9, op=0.55, passes=1, j=0.4)

# Cut faces: tangled spaghetti in set egg — cut ends as little ovals, short
# wavy strands lying along the face, onion bits and green herb flecks.
for t, d in dish.faces():
    sk.clip(d)
    for _ in range(26):
        f, depth = random.uniform(0.02, 1.0), random.uniform(0.12, 0.88)
        x, y = dish.face_point(t, f, depth)
        sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{random.uniform(3.5, 5.5):.1f}" ry="{random.uniform(3, 4.5):.1f}" fill="#fbe9bd" opacity="0.95"/>')
        sk.bubble(x, y, random.uniform(4, 5.5), op=0.65)
    for _ in range(14):
        f0, depth = random.uniform(0.0, 0.85), random.uniform(0.15, 0.85)
        f1 = min(1.05, f0 + random.uniform(0.12, 0.3))
        pa, pb = dish.face_point(t, f0, depth), dish.face_point(t, f1, depth + random.uniform(-0.15, 0.15))
        mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + random.uniform(-5, 5))
        sk.add(f'<path d="{smooth_path([pa, mid, pb])}" fill="none" stroke="#f3d48e" stroke-width="4" stroke-linecap="round" opacity="0.85"/>')
        sk.pencil([pa, mid, pb], w=0.8, op=0.45, passes=1, j=0.4)
    for _ in range(4):
        x, y = dish.face_point(t, random.uniform(0.1, 0.9), random.uniform(0.25, 0.75))
        sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{random.uniform(2.5, 4):.1f}" ry="{random.uniform(1.5, 2.5):.1f}" fill="#6f8f45" opacity="0.7" transform="rotate({random.uniform(0, 180):.0f} {x:.1f} {y:.1f})"/>')
    sk.end_clip()

# Top: strands of spaghetti set into the surface. Each follows a loose arc
# around a point near the middle (like twirled pasta), drawn in perspective on
# the top: a soft shadow, a pale body, a highlight and a light pencil edge.
def surface_strand():
    ox, oy = random.uniform(-0.25, 0.25), random.uniform(-0.25, 0.25)
    r0 = random.uniform(0.15, 0.8)
    th0 = random.uniform(0, 2 * math.pi)
    span = random.uniform(0.6, 1.5) * random.choice([-1, 1])
    amp, freq = random.uniform(0.01, 0.04), random.uniform(2, 4)
    pts = []
    for i in range(14):
        u = i / 13
        th = th0 + span * u
        r = r0 + amp * math.sin(freq * u * math.pi)
        x, y = ox + r * math.cos(th), oy + r * math.sin(th)
        if math.hypot(x, y) > 0.96:
            break
        pts.append((dish.cx + dish.rx * x, dish.cy + dish.ry * y))
    return pts

sk.clip(dish.top())
strands = [st for st in (surface_strand() for _ in range(90)) if len(st) > 4]
for st in strands:
    d = smooth_path([(x, y + 2.5) for x, y in st])
    sk.add(f'<path d="{d}" fill="none" stroke="#9a5a1c" stroke-width="6.5" stroke-linecap="round" opacity="0.22"/>')
for st in strands:
    sk.add(f'<path d="{smooth_path(st)}" fill="none" stroke="#efcd88" stroke-width="5.5" stroke-linecap="round" opacity="0.85"/>')
    sk.add(f'<path d="{smooth_path([(x, y - 1.3) for x, y in st])}" fill="none" stroke="#fff3d2" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>')
    if random.random() < 0.6:
        sk.pencil([(x, y + 2.2) for x, y in st], w=0.8, op=random.uniform(0.3, 0.5), passes=1, j=0.4)
# Egg and browning settle over parts of the pasta so it reads as set into the frittata.
for _ in range(22):
    x, y = dish.random_top_point(0.95)
    sk.blot(x, y, random.uniform(20, 50), random.uniform(8, 18), random.choice(["#dc9d42", "#b8692a"]), random.uniform(0.25, 0.45))
sk.end_clip()
dish.top_hatching(marks=18)

# Grated Parmesan: tiny pale flecks.
for _ in range(90):
    x, y = dish.random_top_point(0.9, avoid_wedge=True)
    sk.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{random.uniform(2, 4):.1f}" height="{random.uniform(1.2, 2.2):.1f}" fill="#fff6dc" opacity="0.85" transform="rotate({random.uniform(0, 90):.0f} {x:.1f} {y:.1f})"/>')

# Diced tomato: small rounded cubes in a red wash with a light top face and a pencil edge.
for _ in range(16):
    x, y = dish.random_top_point(0.75, avoid_wedge=True)
    s = random.uniform(9, 14)
    rot = random.uniform(-20, 20)
    sk.add(f'<g transform="rotate({rot:.0f} {x:.1f} {y:.1f})">'
           f'<rect x="{x - s:.1f}" y="{y - s * 0.55:.1f}" width="{2 * s:.1f}" height="{1.3 * s:.1f}" rx="3" fill="#c4442c" opacity="0.88" filter="url(#wash)"/>'
           f'<rect x="{x - s * 0.8:.1f}" y="{y - s * 0.55:.1f}" width="{1.6 * s:.1f}" height="{0.5 * s:.1f}" rx="2" fill="#e57a5c" opacity="0.7"/>'
           f'</g>')
    sk.pencil([(x - s, y + s * 0.7), (x + s, y + s * 0.7)], w=0.8, op=0.4, passes=1, j=0.5)

# Parsley and basil.
for _ in range(22):
    x, y = dish.random_top_point(0.85, avoid_wedge=True)
    sk.herb_fleck(x, y, random.choice(["#6f8f45", "#5d8240", "#7b9a4c"]))

sk.save(sys.argv[1] if len(sys.argv) > 1 else "spaghetti-frittata.svg")
