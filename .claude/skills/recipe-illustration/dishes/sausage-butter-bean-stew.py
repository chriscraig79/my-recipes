"""Sausage & butter bean stew: browned chipolatas and butter beans in a
golden, buttery broth with celery and onion, rosemary, parsley and lemon zest."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Casserole
import foods

sk = Sketch(seed=89)
pot = Casserole(sk)
pot.draw_back()
sk.clip(pot.surface())
foods.sauce(sk, pot, "#d6ad62", deep="#a3742e", light="#f0d08e")
sk.end_clip()
for x, y in foods.scatter(pot, 40, min_dist=26):
    foods.round_bit(sk, x, y, size=random.uniform(12, 15), color="#f1e2bd", shade="#c4a86e")
for _ in range(8):
    x, y = pot.random_surface_point(0.85)
    foods.celery_slice(sk, x, y, size=random.uniform(18, 21))
for _ in range(7):
    x, y = pot.random_surface_point(0.8)
    foods.strip(sk, x, y, length=30, width=6, color="#efe2c4")
sausages = sorted([pot.surface_point(r, t) for r, t in [(0.15, 2.5), (0.5, -0.9), (0.55, 0.3), (0.45, 1.3), (0.6, 2.4), (0.5, -2.2), (0.7, 1.9)]], key=lambda p: p[1])
for x, y in sausages:
    foods.sausage(sk, x, y, length=random.uniform(120, 140), width=38, rot=random.uniform(-35, 35))
x, y = pot.surface_point(0.35, -1.3)
foods.sprig(sk, x, y, length=90, color="#4a6a3a", kind="rosemary", rot=-15)
for _ in range(16):
    x, y = pot.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(11, 14), color=random.choice(["#6a9442", "#5f8a3c"]), kind="coriander")
for _ in range(14):
    x, y = pot.random_surface_point(0.8)
    foods.strip(sk, x, y, length=12, width=2.5, color="#f2d23a")
pot.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "sausage-butter-bean-stew.svg")
