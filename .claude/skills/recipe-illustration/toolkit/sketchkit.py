"""
sketchkit — pencil-and-watercolour food illustrations as SVG.

Standard library only. A dish script builds a Sketch, draws the dish with the
helpers below, and saves an SVG; render.mjs turns that into the WebP the site
uses. See ../SKILL.md for the style rules and workflow, and ../dishes/ for
worked examples.

Canvas: 1600 x 1000. Keep the food inside roughly x 300–1300, y 250–850 so it
survives both crops the site applies: 4:3 on index cards (shows x ≈ 133–1467)
and 16:9 for the recipe hero (shows y ≈ 50–950).
"""
import math
import random

W, H = 1600, 1000

# Palette. Graphite is a warm mid-grey, never black.
GRAPHITE = "#7a6654"
PAPER = "#fbf7ee"


def P(p):
    return f"{p[0]:.1f},{p[1]:.1f}"


def smooth_path(pts):
    """Catmull-Rom spline through the points, as an SVG path."""
    d = f"M{P(pts[0])}"
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{P(c1)} {P(c2)} {P(p2)}"
    return d


def line_pts(p, q, n=8):
    return [(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n) for i in range(n + 1)]


DEFS = '''<defs>
<filter id="paper" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.33  0 0 0 0.09 0"/>
  <feComposite in2="SourceGraphic" operator="over"/>
</filter>
<filter id="graphite" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="wob"/>
  <feDisplacementMap in="SourceGraphic" in2="wob" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.4 -0.25" result="ga"/>
  <feComposite in="d" in2="ga" operator="in"/>
</filter>
<filter id="wash" x="-25%" y="-25%" width="150%" height="150%">
  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="2" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="22" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="1.2" result="b"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="8" result="m"/>
  <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0.35" result="ma"/>
  <feComposite in="b" in2="ma" operator="in" result="mott"/>
  <feMorphology in="b" operator="erode" radius="3" result="er"/>
  <feComposite in="b" in2="er" operator="out" result="rim"/>
  <feColorMatrix in="rim" type="matrix" values="0.75 0 0 0 0  0 0.7 0 0 0  0 0 0.7 0 0  0 0 0 0.55 0" result="rimd"/>
  <feMerge><feMergeNode in="mott"/><feMergeNode in="rimd"/></feMerge>
</filter>
<filter id="softwash" x="-60%" y="-60%" width="220%" height="220%">
  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="4" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="40" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="6"/>
</filter>
</defs>'''


class Sketch:
    """Collects SVG elements. Everything is drawn in call order (later = on top)."""

    def __init__(self, seed=1):
        random.seed(seed)
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">', DEFS,
                      f'<rect width="{W}" height="{H}" fill="{PAPER}" filter="url(#paper)"/>']
        self._ids = 0

    def add(self, s):
        self.parts.append(s)

    def uid(self, prefix="c"):
        self._ids += 1
        return f"{prefix}{self._ids}"

    def save(self, path):
        with open(path, "w") as f:
            f.write("\n".join(self.parts + ["</svg>"]))

    # ── clipping ──
    def clip(self, *paths):
        """Start a group clipped to the union of the given path strings. Close with end_clip()."""
        cid = self.uid("clip")
        self.add(f'<clipPath id="{cid}">' + "".join(f'<path d="{d}"/>' for d in paths) + "</clipPath>")
        self.add(f'<g clip-path="url(#{cid})">')

    def end_clip(self):
        self.add("</g>")

    # ── watercolour ──
    def wash(self, d, color, opacity=0.85):
        """A watercolour wash: ragged edge, mottled pigment, darker rim where it dries."""
        self.add(f'<path d="{d}" fill="{color}" opacity="{opacity}" filter="url(#wash)"/>')

    def blot(self, x, y, rx, ry, color, opacity=0.3):
        """A soft, bleeding patch of colour (browning, shadows, highlights)."""
        self.add(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="{color}" opacity="{opacity:.2f}" filter="url(#softwash)"/>')

    def soft_stroke(self, d, color, width, opacity):
        self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" opacity="{opacity}" filter="url(#softwash)"/>')

    # ── pencil ──
    def pencil(self, pts, w=1.6, op=0.75, passes=2, j=1.2, color=GRAPHITE):
        """A hand-drawn line through the points: slight wobble, grain, a lighter second pass."""
        w *= 1.1
        op = min(1, op * 0.75)
        for k in range(passes):
            q = [(x + random.uniform(-j, j) * (0.6 if k == 0 else 1.2), y + random.uniform(-j, j) * (0.6 if k == 0 else 1.2)) for x, y in pts]
            self.add(f'<path d="{smooth_path(q)}" fill="none" stroke="{color}" stroke-width="{w * (1 if k == 0 else 0.7):.2f}" '
                     f'stroke-linecap="round" opacity="{op * (1 if k == 0 else 0.55):.2f}" filter="url(#graphite)"/>')

    def broken(self, pts, **kw):
        """Like pencil(), but in uneven segments with small gaps — use for outlines."""
        i, n = 0, len(pts)
        while i < n - 1:
            L = random.randint(max(2, n // 6), max(3, n // 2))
            seg = pts[i:min(n, i + L)]
            if len(seg) > 1:
                kw2 = dict(kw)
                kw2["op"] = kw.get("op", 0.75) * random.uniform(0.55, 1.0)
                kw2["w"] = kw.get("w", 1.6) * random.uniform(0.7, 1.1)
                self.pencil(seg, **kw2)
            i += L + random.randint(0, max(1, n // 14))

    def mark(self, x, y, length, angle_deg, op=0.25, w=1.0, curve=2.0):
        """One short, slightly curved pencil mark — the unit of irregular hatching."""
        a = math.radians(angle_deg)
        dx, dy = length * math.cos(a) / 2, length * math.sin(a) / 2
        self.add(f'<path d="M{x - dx:.1f},{y - dy:.1f} Q{x + random.uniform(-curve, curve):.1f},{y + random.uniform(-curve, curve):.1f} {x + dx:.1f},{y + dy:.1f}" '
                 f'stroke="{GRAPHITE}" stroke-width="{w:.2f}" stroke-linecap="round" fill="none" opacity="{op:.2f}" filter="url(#graphite)"/>')

    def bubble(self, x, y, size, op=0.35):
        pts = [(x + size * math.cos(a), y + size * 0.45 * math.sin(a)) for a in [i * math.pi / 4 for i in range(9)]]
        self.pencil(pts, w=0.9, op=op, passes=1, j=0.8)

    def herb_fleck(self, x, y, color="#6f8f45"):
        rot = random.uniform(0, 360)
        tr = f'transform="rotate({rot:.0f} {x:.1f} {y:.1f})"'
        self.add(f'<path d="M{x:.1f},{y:.1f} q7,-10 15,-2 q-6,9 -15,2 z" fill="{color}" opacity="0.8" {tr}/>')
        self.add(f'<path d="M{x:.1f},{y:.1f} q7,-10 15,-2" fill="none" stroke="{GRAPHITE}" stroke-width="0.8" opacity="0.5" {tr}/>')

    # ── background: always light and loose ──
    def plate(self, cx=800, cy=575, rx=560, ry=250, wash="#efd9a8"):
        """Loose plate: a faint warm wash, a cool shadow wash and a few broken pencil arcs."""
        self.blot(cx + 30, cy - 105 + 120, 640, 300, wash, 0.35)

        def pts(t0, t1, k=1.0, n=60):
            return [(cx + rx * k * math.cos(t0 + (t1 - t0) * i / n), cy + ry * k * math.sin(t0 + (t1 - t0) * i / n)) for i in range(n + 1)]

        self.soft_stroke(smooth_path(pts(0.2, 2.9)), "#b9c4cc", 40, 0.28)
        for t0, t1 in [(-0.2, 1.3), (1.5, 3.3), (3.5, 5.2), (5.35, 6.0)]:
            self.pencil(pts(t0, t1), w=1.3, op=0.45, passes=1, j=1.5)
        for t0, t1 in [(0.3, 1.2), (1.9, 2.8)]:
            self.pencil(pts(t0, t1, 0.8), w=1.1, op=0.3, passes=1, j=1.5)


class RoundDish:
    """
    A round, flat-topped dish seen from the front at about 30°, with a wedge cut
    out of the front so the inside shows: tortilla, frittata, quiche, cake, tart.

    Geometry: centre (cx, cy) of the top, radii (rx, ry), height h. The wedge
    runs between angles a1 and a2 (radians; 0 = right, π/2 = front). The
    bottom ellipse is slightly smaller than the top (kb) so the sides look
    rounded and tucked under.
    """

    def __init__(self, sk, cx=800, cy=470, rx=380, ry=168, h=74, a1=42, a2=118, kb=0.965):
        self.sk, self.cx, self.cy, self.rx, self.ry, self.h = sk, cx, cy, rx, ry, h
        self.a1, self.a2, self.kb = math.radians(a1), math.radians(a2), kb
        self.C, self.Cb = (cx, cy), (cx, cy + h)

    # points
    def E(self, t, dy=0, k=1.0):
        return (self.cx + self.rx * k * math.cos(t), self.cy + self.ry * k * math.sin(t) + dy)

    def bulge(self, t):
        return self.E(t, self.h * 0.48, 1.012)

    def top_point(self, r, t):
        """A point on the top surface: r = 0 (centre) to 1 (rim)."""
        return (self.cx + self.rx * r * math.cos(t), self.cy + self.ry * r * math.sin(t))

    def random_top_point(self, rmax=0.95, avoid_wedge=False):
        while True:
            t = random.uniform(0, 2 * math.pi)
            if avoid_wedge and self.a1 - 0.05 < t < self.a2 + 0.05:
                continue
            return self.top_point(math.sqrt(random.random()) * rmax, t)

    def face_point(self, t, f, depth):
        """A point on the cut face at angle t: f = 0 (centre) to 1 (rim), depth = 0 (top) to 1 (bottom)."""
        p = self.E(t)
        return (self.cx + (p[0] - self.cx) * f, self.cy + (p[1] - self.cy) * f + self.h * depth)

    # shapes
    def band(self, t0, t1, n=48):
        top = [self.E(t0 + (t1 - t0) * i / n) for i in range(n + 1)]
        bot = [self.E(t0 + (t1 - t0) * i / n, self.h, self.kb) for i in range(n + 1)]
        pts = top + [self.bulge(t1)] + list(reversed(bot)) + [self.bulge(t0)]
        return "M" + " L".join(P(p) for p in pts) + " Z"

    def bands(self):
        return [self.band(0, self.a1), self.band(self.a2, math.pi)]

    def top(self):
        p1, p2 = self.E(self.a1), self.E(self.a2)
        return f"M{P(self.C)} L{P(p2)} A{self.rx},{self.ry} 0 1 1 {P(p1)} Z"

    def face(self, t):
        p, m, q = self.E(t), self.bulge(t), self.E(t, self.h, self.kb)
        ctrl = (2 * m[0] - (p[0] + q[0]) / 2, 2 * m[1] - (p[1] + q[1]) / 2)
        return f"M{P(self.C)} L{P(p)} Q{P(ctrl)} {P(q)} L{P(self.Cb)} Z"

    def faces(self):
        """(angle, path) for both cut faces, back one first."""
        return [(self.a2, self.face(self.a2)), (self.a1, self.face(self.a1))]

    # drawing
    def shadow(self, color="#8d8aa3", opacity=0.28):
        self.sk.blot(self.cx + 30, self.cy + self.h + 30, self.rx + 20, self.ry * 0.7, color, opacity)

    def paint(self, top, side, face, side_dark="#8e4f17", top_brown="#a85d1c", top_light="#f6dc93",
              rim="#9a5418", browning=26):
        """Watercolour washes for sides, cut faces and top, with browning and a pooled rim."""
        sk = self.sk
        for d in self.bands():
            sk.wash(d, side, 0.9)
        sk.clip(*self.bands())
        for _ in range(60):
            t = random.uniform(0, math.pi)
            x, y = self.E(t, self.h * random.uniform(0.55, 1.0))
            sk.blot(x, y, random.uniform(15, 40), random.uniform(6, 14), side_dark, random.uniform(0.15, 0.35))
        sk.end_clip()
        for i, (t, d) in enumerate(self.faces()):
            sk.wash(d, face, 0.8 if i == 0 else 0.85)
        sk.wash(self.top(), top, 0.85)
        sk.clip(self.top())
        sk.blot(self.cx - 110, self.cy - 40, 200, 70, top_light, 0.6)
        for _ in range(browning):
            x, y = self.random_top_point()
            sk.blot(x, y, random.uniform(14, 46), random.uniform(6, 18), top_brown, random.uniform(0.18, 0.4))
        sk.add(f'<ellipse cx="{self.cx}" cy="{self.cy}" rx="{self.rx - 4}" ry="{self.ry - 3}" fill="none" stroke="{rim}" '
               f'stroke-width="22" opacity="0.5" filter="url(#softwash)"/>')
        sk.end_clip()

    def outline(self):
        """Light, broken pencil contours — the paint carries the edges, not the line."""
        sk, a1, a2, h, kb = self.sk, self.a1, self.a2, self.h, self.kb

        def arc(t0, t1, n=40, dy=0, k=1.0):
            return [self.E(t0 + (t1 - t0) * i / n, dy, k) for i in range(n + 1)]

        sk.broken(arc(a2, a1 + 2 * math.pi, 120), w=1.6, op=0.75, passes=1)
        sk.broken(arc(0, a1, 24, dy=h, k=kb), w=1.6, op=0.75, passes=1)
        sk.broken(arc(a2, math.pi, 40, dy=h, k=kb), w=1.6, op=0.75, passes=1)
        for t in (0, math.pi):
            sk.pencil([self.E(t), self.bulge(t), self.E(t, h, kb)], w=1.3, op=0.5, passes=1)
        for t in (a1, a2):
            sk.broken(line_pts(self.C, self.E(t), 16), w=1.4, op=0.7, passes=1)
            sk.pencil([self.E(t), self.bulge(t), self.E(t, h, kb)], w=1.3, op=0.6, passes=1)
            sk.pencil(line_pts(self.Cb, self.E(t, h, kb)), w=1.3, op=0.5, passes=1)
        sk.pencil(line_pts(self.C, self.Cb, 4), w=1.2, op=0.55, passes=1)
        for t0, t1 in [(math.pi * 1.05, math.pi * 1.6), (math.pi * 1.7, math.pi * 1.95), (a2 + 0.15, math.pi * 0.95)]:
            sk.pencil(arc(t0, t1, 30, dy=6, k=0.975), w=1.1, op=0.45, passes=1)

    def side_hatching(self, marks=260):
        """Irregular short marks on the sides, clustered toward the shaded right and the bottom."""
        sk = self.sk
        sk.clip(*self.bands())
        for _ in range(marks):
            t = random.uniform(0, math.pi)
            if self.a1 - 0.03 < t < self.a2 + 0.03:
                continue
            shade = 0.35 + 0.65 * (1 - t / math.pi)
            if random.random() > shade:
                continue
            depth = random.betavariate(2.2, 1.3)
            x, y = self.E(t, self.h * depth, 1 - 0.035 * depth)
            sk.mark(x, y, random.uniform(8, 26), random.uniform(58, 80) + random.uniform(-8, 8),
                    op=random.uniform(0.2, 0.5) * shade + 0.08, w=random.uniform(0.7, 1.3))
        sk.end_clip()

    def top_hatching(self, marks=22):
        """A few light marks on the shaded back-right of the top."""
        sk = self.sk
        sk.clip(self.top())
        for _ in range(marks):
            x, y = self.top_point(random.uniform(0.55, 0.95), random.uniform(-0.9, 0.25))
            sk.mark(x, y, random.uniform(6, 18), random.uniform(10, 40), op=random.uniform(0.12, 0.28), w=random.uniform(0.6, 1.1))
        sk.end_clip()
