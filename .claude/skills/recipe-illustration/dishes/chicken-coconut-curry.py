"""Chicken coconut curry: creamy golden sauce with chicken, curry leaves and
coriander, steamed basmati rice heaped at the back of the bowl."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=31)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#d9973a", deep="#a8601e", light="#f0c46e")
foods.swirl(sk, bowl.fx + 90, bowl.fy + 35, 150, 48, color="#fbefd2", width=7, turns=1.4, opacity=0.75)
sk.end_clip()
foods.rice_mound(sk, bowl.fx - 175, bowl.fy - 25, 205, 70, 105)
spots = [(0.3, 0.25), (0.62, 0.1), (0.72, 0.75), (0.42, 1.25), (0.7, 1.55), (0.85, -0.25), (0.55, -0.55), (0.18, 0.95), (0.8, 0.4), (0.55, 2.1), (0.8, 2.3)]
for r, t in spots:
    x, y = bowl.surface_point(r, t)
    foods.chunk(sk, x + random.uniform(-10, 10), y, random.uniform(40, 52), "#d9a35e", top="#f1cb8e", shade="#8f4f18", sauce="#c98330")
for _ in range(8):
    x, y = bowl.random_surface_point(0.8, tmin=-0.7, tmax=2.4)
    foods.leaf(sk, x, y, size=random.uniform(12, 16), color="#3f6b2c", kind="curry")
for _ in range(14):
    x, y = bowl.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#6a9442"]), kind="coriander")
for _ in range(3):
    x, y = bowl.random_surface_point(0.7, tmin=0, tmax=2.2)
    foods.chilli_ring(sk, x, y, size=10, skin="#8f2414", flesh="#b4452a")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-coconut-curry.svg")
