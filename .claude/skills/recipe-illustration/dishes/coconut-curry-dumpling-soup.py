"""Coconut curry dumpling soup: dumplings floating in a golden coconut and
curry broth, drizzled with chilli oil, with coriander and a lime wedge."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=59)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#e2a04a", deep="#b5632a", light="#f3c47c")
for _ in range(4):
    x, y = bowl.random_surface_point(0.7)
    foods.oil_drizzle(sk, x, y, length=random.uniform(90, 150), color="#c23a1c")
sk.end_clip()
for r, t in [(0.35, -2.4), (0.45, -1.2), (0.5, -0.1), (0.2, 0.9), (0.62, 1.6), (0.6, 2.7), (0.68, 0.6)]:
    x, y = bowl.surface_point(r, t)
    foods.dumpling(sk, x, y, size=random.uniform(52, 62))
sk.clip(bowl.surface())
for _ in range(3):
    x, y = bowl.random_surface_point(0.8, tmin=0.2, tmax=2.9)
    foods.oil_drizzle(sk, x, y, length=random.uniform(60, 100), color="#c23a1c")
sk.end_clip()
for _ in range(18):
    x, y = bowl.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#5f8a3c"]), kind="coriander")
lx, ly = bowl.rim_point(-0.35, 1.0, -6)
foods.lime_wedge(sk, lx, ly, size=58, rot=-25)
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "coconut-curry-dumpling-soup.svg")
