"""Thai green chicken curry: a pale green coconut sauce with chicken, green
chilli, coriander, a wedge of lime on the rim, and jasmine rice."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=53)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#c2c27a", deep="#8b9646", light="#e4e2ae")
foods.swirl(sk, bowl.fx + 90, bowl.fy + 35, 150, 48, color="#f7f4dc", width=7, turns=1.3, opacity=0.6)
sk.end_clip()
foods.rice_mound(sk, bowl.fx - 175, bowl.fy - 25, 205, 70, 105)
spots = [(0.3, 0.25), (0.62, 0.1), (0.72, 0.75), (0.42, 1.25), (0.7, 1.55), (0.85, -0.25), (0.55, -0.55), (0.18, 0.95), (0.8, 0.4), (0.55, 2.1)]
for r, t in spots:
    x, y = bowl.surface_point(r, t)
    foods.chunk(sk, x + random.uniform(-10, 10), y, random.uniform(38, 48), "#ecd6ac", top="#fbf0d6", shade="#a8925e", sauce="#c3c07a")
for _ in range(7):
    x, y = bowl.random_surface_point(0.75, tmin=-0.8, tmax=2.4)
    foods.chilli_ring(sk, x, y, size=10, skin="#4e8a2b", flesh="#cfe39f")
for _ in range(16):
    x, y = bowl.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#5f8a3c"]), kind="coriander")
lx, ly = bowl.rim_point(-0.35, 1.0, -6)
foods.lime_wedge(sk, lx, ly, size=58, rot=-25)
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "thai-chicken-curry.svg")
