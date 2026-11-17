"""Aubergine & chickpea stew: rounds of soft aubergine and chickpeas in a
spiced tomato sauce, finished with toasted pine nuts, parsley and olive oil."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Casserole
import foods

sk = Sketch(seed=83)
pot = Casserole(sk)
pot.draw_back()
sk.clip(pot.surface())
foods.sauce(sk, pot, "#b4442a", deep="#6e1e10", light="#d26a40")
sk.end_clip()
for x, y in foods.scatter(pot, 11, min_dist=78, rmax=0.82):
    foods.aubergine_round(sk, x, y, size=random.uniform(40, 50))
for x, y in foods.scatter(pot, 34, min_dist=24):
    foods.round_bit(sk, x, y, size=random.uniform(9, 11), color="#e6c88e", shade="#a98448")
for _ in range(30):
    x, y = pot.random_surface_point(0.85)
    foods.round_bit(sk, x, y, size=random.uniform(3.5, 4.5), color="#f4e3b8", shade="#c9a86a", line=False)
for _ in range(16):
    x, y = pot.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(12, 15), color=random.choice(["#5f8a3c", "#4f7a34"]), kind="coriander")
for _ in range(10):
    x, y = pot.random_surface_point(0.8)
    sk.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{random.uniform(8, 16):.1f}" ry="{random.uniform(3, 5):.1f}" fill="#e8c24a" opacity="0.45" filter="url(#wash)"/>')
pot.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "aubergine-chickpea-stew.svg")
