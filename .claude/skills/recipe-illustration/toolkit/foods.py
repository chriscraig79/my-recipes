"""
Ingredient helpers for sketchkit: small, reusable pieces of food drawn in the
pencil-and-watercolour style (chunks of meat or veg, rice, herbs, garnish).
Each takes the Sketch first, then a position. Keep sizes in canvas px (the
canvas is 1600 x 1000 and the food is seen from about 30°, so things are
squashed vertically by roughly 0.45).
"""
import math
import random
from sketchkit import smooth_path, GRAPHITE


def _blob_pts(x, y, rx, ry, n=8, jitter=0.25, rot=0.0):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n + rot
        k = 1 + random.uniform(-jitter, jitter)
        pts.append((x + rx * k * math.cos(a), y + ry * k * math.sin(a)))
    return pts + [pts[0]]


def chunk(sk, x, y, size, color, top=None, shade="#7a3f12", sauce=None, outline=0.45):
    """
    An irregular chunk (chicken, lamb, potato, sweet potato) sitting in sauce:
    a washed body, a lighter top where the light hits, a darker lower side,
    and sauce lapping round its base.
    """
    rx, ry = size, size * random.uniform(0.6, 0.78)
    pts = _blob_pts(x, y, rx, ry, n=random.randint(6, 8), jitter=0.3, rot=random.uniform(0, 1))
    d = smooth_path(pts) + " Z"
    sk.add(f'<path d="{d}" fill="{color}" opacity="0.92"/>')
    sk.clip(d)
    sk.blot(x - rx * 0.25, y - ry * 0.35, rx * 0.6, ry * 0.45, top or "#ffffff", 0.45)
    sk.blot(x + rx * 0.35, y + ry * 0.45, rx * 0.7, ry * 0.5, shade, 0.35)
    if sauce:
        sk.blot(x + rx * 0.1, y + ry * 0.55, rx * 0.9, ry * 0.45, sauce, 0.55)
    for _ in range(random.randint(1, 3)):
        sk.blot(x + random.uniform(-rx, rx) * 0.5, y + random.uniform(-ry, ry) * 0.4, rx * 0.25, ry * 0.2, shade, 0.4)
    for _ in range(random.randint(2, 4)):
        sk.mark(x + random.uniform(-rx, rx) * 0.5, y + random.uniform(-ry, ry) * 0.3, random.uniform(5, 10), random.uniform(-30, 30), op=0.3, w=0.8)
    sk.end_clip()
    if sauce:
        # sauce lapping round the base, so the chunk sits in it rather than on it
        sk.blot(x, y + ry * 0.75, rx * 0.95, ry * 0.32, sauce, 0.75)
    seg = pts[random.randint(0, 2):]
    sk.pencil(seg[: max(3, len(seg) - random.randint(1, 3))], w=1.0, op=outline, passes=1, j=0.6)


def rice_mound(sk, x, y, rx, ry, height, grain="#fbf6e9", shade="#cfc6b3", dark=False, count=260):
    """A mound of rice: a pale dome of tiny grains, shaded to the right and underneath."""
    base = [(x + rx * math.cos(a), y + ry * math.sin(a)) for a in [i * math.pi / 20 for i in range(21)]]
    dome = [(x + rx * math.cos(a) * (0.98 - 0.12 * math.sin(a)), y - height * math.sin(a) ** 0.8) for a in [math.pi - i * math.pi / 30 for i in range(31)]]
    d = smooth_path(base + dome) + " Z"
    sk.add(f'<path d="{d}" fill="{grain}" opacity="0.97"/>')
    sk.clip(d)
    sk.blot(x + rx * 0.45, y + ry * 0.2, rx * 0.6, height * 0.7, shade, 0.55 if not dark else 0.35)
    sk.blot(x - rx * 0.3, y - height * 0.55, rx * 0.4, height * 0.3, "#ffffff", 0.35 if not dark else 0.12)
    for _ in range(count):
        # grains: tiny ovals, denser toward the shaded right and the base
        u, v = random.uniform(-1, 1), random.random()
        gx = x + rx * u * 0.97
        top = y - height * (1 - abs(u) ** 1.6) ** 0.9
        gy = top + (y + ry * 0.7 - top) * v ** 0.8
        rot = random.uniform(0, 180)
        fill = grain if not dark else "#4b3646"
        op = random.uniform(0.18, 0.4) + (0.12 if u > 0.2 else 0)
        sk.add(f'<ellipse cx="{gx:.1f}" cy="{gy:.1f}" rx="{random.uniform(3.2, 4.6):.1f}" ry="{random.uniform(1.4, 2.0):.1f}" fill="{fill}" '
               f'stroke="{GRAPHITE}" stroke-width="0.6" stroke-opacity="{op:.2f}" transform="rotate({rot:.0f} {gx:.1f} {gy:.1f})"/>')
    sk.end_clip()
    sk.broken(dome, w=1.0, op=0.4, passes=1)


def leaf(sk, x, y, size=12, color="#5f8a3c", kind="coriander"):
    """A single herb leaf. kind: 'coriander' (three soft lobes), 'curry' (long, glossy), 'mint' (oval, veined)."""
    rot = random.uniform(0, 360)
    tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
    s = size
    if kind == "coriander":
        # a rounded, lobed leaf: a soft fan of three or four bumps
        pts = []
        lobes = random.choice([3, 4])
        for i in range(lobes * 4 + 1):
            a = math.pi * (1.05 + 0.9 * i / (lobes * 4))
            bump = 1 + 0.22 * math.cos(i * math.pi / 2)
            pts.append((x + s * bump * math.cos(a), y + s * 0.8 * bump * math.sin(a)))
        pts.append((x, y + s * 0.15))
        d = smooth_path(pts) + " Z"
    elif kind == "curry":
        d = f"M{x - s:.1f},{y:.1f} q{s:.1f},{-s * 0.55:.1f} {2 * s:.1f},0 q{-s:.1f},{s * 0.55:.1f} {-2 * s:.1f},0 z"
    else:  # mint
        d = f"M{x - s * 0.8:.1f},{y:.1f} q{s * 0.8:.1f},{-s * 0.75:.1f} {1.6 * s:.1f},0 q{-s * 0.8:.1f},{s * 0.75:.1f} {-1.6 * s:.1f},0 z"
    sk.add(f'<path d="{d}" fill="{color}" opacity="0.88" {tr}/>')
    if kind == "coriander":
        sk.add(f'<path d="M{x:.1f},{y + s * 0.1:.1f} L{x:.1f},{y - s * 0.75:.1f} M{x:.1f},{y:.1f} L{x - s * 0.55:.1f},{y - s * 0.5:.1f} M{x:.1f},{y:.1f} L{x + s * 0.55:.1f},{y - s * 0.5:.1f}" '
               f'stroke="#3d5f28" stroke-width="0.8" opacity="0.55" {tr}/>')
        sk.add(f'<path d="{d}" fill="none" stroke="{GRAPHITE}" stroke-width="0.7" opacity="0.35" {tr}/>')
    else:
        sk.add(f'<path d="M{x - s * 0.7:.1f},{y:.1f} L{x + s * 0.7:.1f},{y:.1f}" stroke="{GRAPHITE}" stroke-width="0.7" opacity="0.4" {tr}/>')


def chilli_ring(sk, x, y, size=9, skin="#c8341f", flesh="#f2b49a"):
    rot = random.uniform(0, 180)
    sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{size:.1f}" ry="{size * 0.55:.1f}" fill="{skin}" opacity="0.9" transform="rotate({rot:.0f} {x:.1f} {y:.1f})"/>')
    sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{size * 0.6:.1f}" ry="{size * 0.3:.1f}" fill="{flesh}" opacity="0.85" transform="rotate({rot:.0f} {x:.1f} {y:.1f})"/>')
    for _ in range(3):
        sk.add(f'<circle cx="{x + random.uniform(-size * 0.3, size * 0.3):.1f}" cy="{y + random.uniform(-1.5, 1.5):.1f}" r="1.2" fill="#fff4dc" opacity="0.9"/>')


def swirl(sk, x, y, rx, ry, color="#fffaf0", width=5, turns=1.6, opacity=0.9):
    """A swirl of cream, yoghurt or coconut milk across the surface."""
    pts = []
    n = 40
    for i in range(n + 1):
        u = i / n
        a = u * turns * 2 * math.pi
        r = 0.15 + 0.85 * u
        pts.append((x + rx * r * math.cos(a), y + ry * r * math.sin(a)))
    d = smooth_path(pts)
    sk.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" opacity="{opacity}" filter="url(#wash)"/>')


def peanut(sk, x, y, size=8):
    rot = random.uniform(0, 180)
    tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
    sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{size:.1f}" ry="{size * 0.62:.1f}" fill="#c98f52" opacity="0.92" {tr}/>')
    sk.add(f'<ellipse cx="{x - size * 0.25:.1f}" cy="{y - size * 0.2:.1f}" rx="{size * 0.4:.1f}" ry="{size * 0.22:.1f}" fill="#ecc893" opacity="0.7" {tr}/>')
    sk.add(f'<path d="M{x:.1f},{y - size * 0.55:.1f} L{x:.1f},{y + size * 0.55:.1f}" stroke="{GRAPHITE}" stroke-width="0.8" opacity="0.45" {tr}/>')


def sliver(sk, x, y, size=10, color="#f3e2bf"):
    """A thin flake (flaked almonds, shaved cheese)."""
    rot = random.uniform(0, 180)
    tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
    sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{size:.1f}" ry="{size * 0.32:.1f}" fill="{color}" opacity="0.95" {tr}/>')
    sk.add(f'<path d="M{x - size * 0.8:.1f},{y + size * 0.15:.1f} q{size * 0.8:.1f},{size * 0.25:.1f} {size * 1.6:.1f},0" fill="none" stroke="{GRAPHITE}" stroke-width="0.7" opacity="0.45" {tr}/>')


def lime_wedge(sk, x, y, size=46, rot=-15):
    tr = f'transform="rotate({rot} {x:.1f} {y:.1f})"'
    s = size
    sk.add(f'<path d="M{x - s:.1f},{y:.1f} A{s},{s * 0.62} 0 0 0 {x + s:.1f},{y:.1f} Z" fill="#6f9b35" opacity="0.92" filter="url(#wash)" {tr}/>')
    sk.add(f'<path d="M{x - s * 0.88:.1f},{y:.1f} A{s * 0.88},{s * 0.52} 0 0 0 {x + s * 0.88:.1f},{y:.1f} Z" fill="#e3ec9c" opacity="0.95" {tr}/>')
    for i in range(1, 5):
        a = math.pi * i / 5
        sk.add(f'<path d="M{x:.1f},{y + 2:.1f} L{x + s * 0.82 * math.cos(a):.1f},{y + s * 0.48 * math.sin(a):.1f}" stroke="#c9d47a" stroke-width="1.2" opacity="0.8" {tr}/>')
    sk.add(f'<path d="M{x - s:.1f},{y:.1f} A{s},{s * 0.62} 0 0 0 {x + s:.1f},{y:.1f}" fill="none" stroke="{GRAPHITE}" stroke-width="1" opacity="0.45" {tr}/>')


def dumpling(sk, x, y, size=34, color="#f3e6c8"):
    """A plump, pleated dumpling half sunk in broth: a domed body, a pleated crest, a soft shadow."""
    s = size
    rot = random.uniform(-20, 20)
    tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
    body = (f"M{x - s:.1f},{y + s * 0.2:.1f} C{x - s * 0.95:.1f},{y - s * 0.55:.1f} {x - s * 0.35:.1f},{y - s * 0.8:.1f} {x:.1f},{y - s * 0.78:.1f} "
            f"C{x + s * 0.35:.1f},{y - s * 0.8:.1f} {x + s * 0.95:.1f},{y - s * 0.55:.1f} {x + s:.1f},{y + s * 0.2:.1f} "
            f"Q{x:.1f},{y + s * 0.42:.1f} {x - s:.1f},{y + s * 0.2:.1f} Z")
    sk.add(f'<ellipse cx="{x + 4:.1f}" cy="{y + s * 0.28:.1f}" rx="{s * 1.05:.1f}" ry="{s * 0.2:.1f}" fill="#7a3f12" opacity="0.25" filter="url(#softwash)" {tr}/>')
    sk.add(f'<path d="{body}" fill="{color}" opacity="0.97" {tr}/>')
    sk.clip(body)
    sk.blot(x + s * 0.45, y + s * 0.05, s * 0.6, s * 0.4, "#c9a56e", 0.45)
    sk.blot(x - s * 0.35, y - s * 0.45, s * 0.35, s * 0.18, "#ffffff", 0.6)
    sk.end_clip()
    # pleated crest along the top
    for i in range(6):
        u = -0.62 + i * 0.25
        top = y - s * (0.78 - abs(u) * 0.5)
        sk.add(f'<path d="M{x + s * u:.1f},{top:.1f} q{s * 0.07:.1f},{s * 0.2:.1f} {-s * 0.02:.1f},{s * 0.38:.1f}" '
               f'fill="none" stroke="{GRAPHITE}" stroke-width="0.9" opacity="0.5" {tr}/>')
    sk.add(f'<path d="{body}" fill="none" stroke="{GRAPHITE}" stroke-width="1" opacity="0.4" {tr}/>')


def oil_drizzle(sk, x, y, length=120, color="#c2361c"):
    """Chilli oil: a broken line of glossy red droplets."""
    for i in range(10):
        u = i / 9
        px = x + length * (u - 0.5) + random.uniform(-6, 6)
        py = y + 10 * math.sin(u * 5) + random.uniform(-4, 4)
        r = random.uniform(3, 8)
        sk.add(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{r:.1f}" ry="{r * 0.55:.1f}" fill="{color}" opacity="0.8" filter="url(#wash)"/>')


def bean(sk, x, y, size=9, color="#f6efe0"):
    rot = random.uniform(0, 180)
    tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
    sk.add(f'<path d="M{x - size:.1f},{y:.1f} q{size * 0.2:.1f},{-size * 0.7:.1f} {size:.1f},{-size * 0.5:.1f} q{size * 0.9:.1f},{size * 0.1:.1f} {size:.1f},{size * 0.5:.1f} '
           f'q{-size * 0.2:.1f},{size * 0.6:.1f} {-size:.1f},{size * 0.45:.1f} q{-size * 0.4:.1f},{-size * 0.2:.1f} {-size:.1f},{-size * 0.45:.1f} z" fill="{color}" opacity="0.95" {tr}/>')
    sk.add(f'<path d="M{x - size * 0.6:.1f},{y + size * 0.3:.1f} q{size * 0.6:.1f},{size * 0.25:.1f} {size * 1.2:.1f},0" fill="none" stroke="{GRAPHITE}" stroke-width="0.7" opacity="0.4" {tr}/>')


def strip(sk, x, y, length=26, width=7, color="#c8341f"):
    """A strip of pepper or onion."""
    rot = random.uniform(0, 180)
    tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
    sk.add(f'<path d="M{x - length / 2:.1f},{y:.1f} q{length / 2:.1f},{-width:.1f} {length:.1f},0" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" opacity="0.9" {tr}/>')
    sk.add(f'<path d="M{x - length / 2:.1f},{y + width * 0.4:.1f} q{length / 2:.1f},{-width:.1f} {length:.1f},0" fill="none" stroke="{GRAPHITE}" stroke-width="0.7" opacity="0.4" {tr}/>')


def sauce(sk, bowl, color, deep=None, light=None, sheen=True):
    """Fill a bowl's food surface with a sauce wash, darker at the back edge, with a soft sheen."""
    sk.add(f'<path d="{bowl.surface()}" fill="{color}" opacity="0.55"/>')
    sk.wash(bowl.surface(), color, 0.9)
    sk.clip(bowl.surface())
    if deep:
        sk.blot(bowl.fx + bowl.frx * 0.35, bowl.fy - bowl.fry * 0.6, bowl.frx * 0.9, bowl.fry * 0.5, deep, 0.45)
        sk.blot(bowl.fx + bowl.frx * 0.7, bowl.fy + bowl.fry * 0.4, bowl.frx * 0.4, bowl.fry * 0.5, deep, 0.35)
    if light:
        for _ in range(6):
            x, y = bowl.random_surface_point(0.8)
            sk.blot(x, y, random.uniform(30, 70), random.uniform(10, 22), light, random.uniform(0.25, 0.45))
    if sheen:
        sk.blot(bowl.fx - bowl.frx * 0.35, bowl.fy - bowl.fry * 0.15, bowl.frx * 0.35, bowl.fry * 0.18, "#ffffff", 0.3)
    # pigment pooling where the sauce meets the bowl
    sk.add(f'<ellipse cx="{bowl.fx}" cy="{bowl.fy}" rx="{bowl.frx - 4}" ry="{bowl.fry - 3}" fill="none" stroke="{deep or color}" '
           f'stroke-width="16" opacity="0.4" filter="url(#softwash)"/>')
    sk.end_clip()


def rice_bed(sk, bowl, grain="#fbf5e6", shade="#cfc4ad", dark=False, count=1300, k=1.0):
    """Rice spread across a ShallowBowl's well: a pale, gently domed bed of grains."""
    d = bowl.well(k)
    sk.add(f'<path d="{d}" fill="{grain}" opacity="0.97"/>')
    sk.clip(d)
    sk.blot(bowl.cx + bowl.wrx * 0.55, bowl.wcy + bowl.wry * 0.2, bowl.wrx * 0.5, bowl.wry * 0.7, shade, 0.5 if not dark else 0.35)
    sk.blot(bowl.cx - bowl.wrx * 0.3, bowl.wcy - bowl.wry * 0.4, bowl.wrx * 0.4, bowl.wry * 0.3, "#ffffff", 0.3 if not dark else 0.1)
    fill = grain if not dark else "#4b3646"
    for _ in range(count):
        gx, gy = bowl.random_well_point(1.0 * k)
        rot = random.uniform(0, 180)
        op = random.uniform(0.25, 0.5) + (0.12 if gx > bowl.cx + bowl.wrx * 0.2 else 0)
        sk.add(f'<ellipse cx="{gx:.1f}" cy="{gy:.1f}" rx="{random.uniform(3.6, 5.0):.1f}" ry="{random.uniform(1.5, 2.1):.1f}" fill="{fill}" '
               f'stroke="{GRAPHITE}" stroke-width="0.6" stroke-opacity="{op:.2f}" transform="rotate({rot:.0f} {gx:.1f} {gy:.1f})"/>')
    sk.end_clip()


def curry_pool(sk, x, y, rx, ry, color, deep, light=None, edge=None):
    """
    A thick curry ladled onto rice: an irregular pool, darker and thicker at its
    edge where it meets the rice, with a glossy highlight. Returns the outline
    path so chunks and garnish can be kept inside it.
    """
    pts = _blob_pts(x, y, rx, ry, n=14, jitter=0.07, rot=random.uniform(0, 1))
    d = smooth_path(pts) + " Z"
    sk.add(f'<path d="{d}" fill="{color}" opacity="0.6"/>')
    sk.wash(d, color, 0.92)
    sk.clip(d)
    sk.blot(x + rx * 0.35, y - ry * 0.35, rx * 0.7, ry * 0.5, deep, 0.4)
    if light:
        for _ in range(4):
            sk.blot(x + random.uniform(-rx, rx) * 0.5, y + random.uniform(-ry, ry) * 0.5, rx * 0.25, ry * 0.2, light, 0.35)
    sk.blot(x - rx * 0.3, y - ry * 0.2, rx * 0.3, ry * 0.15, "#ffffff", 0.3)
    sk.add(f'<path d="{d}" fill="none" stroke="{edge or deep}" stroke-width="14" opacity="0.45" filter="url(#softwash)"/>')
    sk.end_clip()
    sk.broken(pts, w=0.9, op=0.35, passes=1)
    return d


def piled_points(x, y, rx, ry, n, rmax=0.78, lift=42):
    """
    n positions inside an ellipse, lifted toward the middle so pieces look
    heaped, sorted back to front so nearer pieces are drawn on top.
    """
    pts = []
    for _ in range(n):
        r = math.sqrt(random.random()) * rmax
        t = random.uniform(0, 2 * math.pi)
        pts.append((x + rx * r * math.cos(t), y + ry * r * math.sin(t) - lift * (1 - r)))
    return sorted(pts, key=lambda p: p[1])


def curry_on_rice(sk, bowl, color, deep, light=None, rice=None, pool=(0.6, 0.74)):
    """
    The standard curry plate: a ShallowBowl with a bed of rice and a thick pool
    of curry ladled into the middle. rice: kwargs for rice_bed (e.g. black
    rice). Returns (x, y, rx, ry) of the pool for placing chunks and garnish.
    """
    rice_bed(sk, bowl, **(rice or {}))
    px, py = bowl.well_point(0.12, 0.6)
    prx, pry = bowl.wrx * pool[0], bowl.wry * pool[1]
    curry_pool(sk, px, py, prx, pry, color, deep=deep, light=light)
    return px, py, prx, pry


def pool_point(pool, rmax=0.85, lift=18):
    """A random point on top of a curry pool (for garnish), lifted a little toward the middle."""
    px, py, prx, pry = pool
    r, t = math.sqrt(random.random()) * rmax, random.uniform(0, 2 * math.pi)
    return px + prx * r * math.cos(t), py + pry * r * math.sin(t) - lift * (1 - r)
