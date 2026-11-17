"""Chicken massaman: a rich orange-brown coconut curry with chicken, chunks
of potato and onion, peanuts scattered on top, and jasmine rice."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=43)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#c4742d", deep="#8c4416", light="#e0a052")
sk.end_clip()
foods.rice_mound(sk, bowl.fx - 175, bowl.fy - 25, 205, 70, 105)
spots = [(0.3, 0.25), (0.62, 0.1), (0.72, 0.75), (0.42, 1.25), (0.7, 1.55), (0.85, -0.25), (0.55, -0.55), (0.18, 0.95), (0.8, 0.4), (0.55, 2.1), (0.8, 2.3)]
for i, (r, t) in enumerate(spots):
    x, y = bowl.surface_point(r, t)
    if i % 3 == 0:  # potato
        foods.chunk(sk, x, y, random.uniform(40, 50), "#e6c26a", top="#f7e2a4", shade="#a7782a", sauce="#c47a32")
    else:           # chicken
        foods.chunk(sk, x, y, random.uniform(38, 48), "#c98a4c", top="#e6b479", shade="#7d4317", sauce="#b86a2a")
for _ in range(5):
    x, y = bowl.random_surface_point(0.75, tmin=-0.8, tmax=2.4)
    foods.strip(sk, x, y, length=34, width=8, color="#efe0c0")
for _ in range(14):
    x, y = bowl.random_surface_point(0.8, tmin=-0.9, tmax=2.5)
    foods.peanut(sk, x, y, size=random.uniform(11, 14))
for _ in range(6):
    x, y = bowl.random_surface_point(0.8)
    foods.leaf(sk, x, y, size=random.uniform(12, 15), color="#6a9442", kind="coriander")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-massaman.svg")
