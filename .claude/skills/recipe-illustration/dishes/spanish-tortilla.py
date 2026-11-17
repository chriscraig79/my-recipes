"""Spanish tortilla: thick and golden, cut to show layers of potato and onion."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, RoundDish

sk = Sketch(seed=11)
sk.plate()
dish = RoundDish(sk, h=74)
dish.shadow()
dish.paint(top="#e6ab45", side="#b86f24", face="#f2cf6a")

dish.outline()
dish.side_hatching()

# Cut faces: rows of thin potato slices (pale lenses with a pencil edge) and onion curls.
for t, d in dish.faces():
    sk.clip(d)
    rows = 5
    for k in range(rows):
        depth = (k + 0.75) / (rows + 0.3)
        f = -0.05
        while f < 1.0:
            f1 = min(1.08, f + random.uniform(0.22, 0.45))
            pa = dish.face_point(t, f, depth); pa = (pa[0], pa[1] + random.uniform(-2, 2))
            pb = dish.face_point(t, f1, depth); pb = (pb[0], pb[1] + random.uniform(-2, 2))
            mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
            bow = random.uniform(3.5, 7)
            upper, lower = [pa, (mid[0], mid[1] - bow), pb], [pa, (mid[0], mid[1] + bow * 0.8), pb]
            sk.add(f'<path d="M{pa[0]:.1f},{pa[1]:.1f} Q{mid[0]:.1f},{mid[1] - 2 * bow:.1f} {pb[0]:.1f},{pb[1]:.1f} '
                   f'Q{mid[0]:.1f},{mid[1] + 1.6 * bow:.1f} {pa[0]:.1f},{pa[1]:.1f} Z" fill="#fff8de" opacity="0.7"/>')
            sk.pencil(upper, w=0.9, op=0.55, passes=1, j=0.4)
            sk.pencil(lower, w=0.8, op=0.4, passes=1, j=0.4)
            f = f1 + random.uniform(0.02, 0.06)
    for _ in range(5):
        x, y = dish.face_point(t, random.uniform(0.15, 0.85), random.uniform(0.2, 0.8))
        sk.pencil([(x - 9, y + 2), (x, y - 4), (x + 9, y + 1)], w=0.9, op=0.5, passes=1, j=0.3)
    sk.end_clip()

# Top: air bubbles and little browned flecks in pencil, then a little shading.
sk.clip(dish.top())
for _ in range(55):
    x, y = dish.random_top_point(0.93)
    sk.bubble(x, y, random.uniform(4, 12), op=random.uniform(0.25, 0.45))
for _ in range(70):
    x, y = dish.random_top_point()
    sk.mark(x, y, random.uniform(4, 10), random.uniform(-12, 12), op=0.35, w=1, curve=0.5)
sk.end_clip()
dish.top_hatching()

# Parsley.
for _ in range(14):
    t = random.uniform(math.pi * 1.05, math.pi * 1.95) if random.random() < 0.75 else random.uniform(dish.a2 + 0.25, math.pi * 0.95)
    x, y = dish.top_point(random.uniform(0.25, 0.8), t)
    sk.herb_fleck(x, y)

sk.save(sys.argv[1] if len(sys.argv) > 1 else "spanish-tortilla.svg")
