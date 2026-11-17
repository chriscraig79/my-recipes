"""Veggie chilli: a deep red chilli of chargrilled sweet potato, peppers and
cannellini beans, with black rice, a dollop of yoghurt rippled with chilli
sauce, and mint leaves."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=61)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#b2432a", deep="#7a2314", light="#d06a3c")
sk.end_clip()
foods.rice_mound(sk, bowl.fx - 175, bowl.fy - 25, 205, 70, 100, grain="#5b4356", shade="#2c1f2b", dark=True)
spots = [(0.3, 0.25), (0.62, 0.1), (0.72, 0.75), (0.42, 1.25), (0.7, 1.55), (0.85, -0.25), (0.55, -0.55), (0.8, 0.4), (0.55, 2.1)]
for r, t in spots:
    x, y = bowl.surface_point(r, t)
    foods.chunk(sk, x + random.uniform(-10, 10), y, random.uniform(30, 40), "#df8a3a", top="#f4b56b", shade="#93420f", sauce="#b2432a")
for _ in range(14):
    x, y = bowl.random_surface_point(0.82, tmin=-0.9, tmax=2.6)
    foods.bean(sk, x, y, size=random.uniform(12, 15))
for _ in range(10):
    x, y = bowl.random_surface_point(0.8, tmin=-0.9, tmax=2.6)
    foods.strip(sk, x, y, length=30, width=8, color=random.choice(["#d23f28", "#e8b430", "#d23f28"]))
# yoghurt dollop rippled with chilli sauce
dx, dy = bowl.surface_point(0.35, 0.6)
sk.add(f'<ellipse cx="{dx:.1f}" cy="{dy:.1f}" rx="70" ry="30" fill="#fbf6ec" opacity="0.97" filter="url(#wash)"/>')
foods.swirl(sk, dx, dy, 48, 18, color="#c23a1c", width=4, turns=1.2, opacity=0.7)
for _ in range(10):
    x, y = bowl.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(12, 15), color=random.choice(["#5f9a52", "#6aa65a"]), kind="mint")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "veggie-chilli.svg")
