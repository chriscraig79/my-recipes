"""Chicken korma: a pale, creamy sauce with chicken, a swirl of cream,
flaked almonds and a little coriander. No rice in the recipe, so none here."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=41)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#e7c58a", deep="#c39150", light="#f7e4b8")
foods.swirl(sk, bowl.fx - 20, bowl.fy + 5, 210, 70, color="#fffaf0", width=9, turns=1.7, opacity=0.85)
sk.end_clip()
spots = [(0.3, 0.3), (0.62, 0.1), (0.72, 0.8), (0.45, 1.3), (0.72, 1.7), (0.85, -0.3), (0.55, -0.7), (0.2, 2.6), (0.6, 2.9), (0.75, 2.3), (0.4, -1.6), (0.7, -2.2)]
for r, t in spots:
    x, y = bowl.surface_point(r, t)
    foods.chunk(sk, x + random.uniform(-10, 10), y, random.uniform(38, 50), "#e6bd80", top="#f7e0b5", shade="#a3713a", sauce="#dfb877")
for _ in range(22):
    x, y = bowl.random_surface_point(0.8)
    foods.sliver(sk, x, y, size=random.uniform(9, 13), color="#f4e3c0")
for _ in range(7):
    x, y = bowl.random_surface_point(0.75)
    foods.leaf(sk, x, y, size=random.uniform(12, 15), color=random.choice(["#7aa34c", "#6a9442"]), kind="coriander")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-korma-for-kids.svg")
