"""Lamb rogan josh: deep red, warmly spiced sauce with tender lamb, a ribbon
of yoghurt stirred through, and coriander leaves. No rice in the recipe."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Bowl
import foods

sk = Sketch(seed=47)
bowl = Bowl(sk)
bowl.draw_back()
sk.clip(bowl.surface())
foods.sauce(sk, bowl, "#a3401f", deep="#6a1f10", light="#c9643a")
foods.swirl(sk, bowl.fx + 30, bowl.fy + 10, 200, 66, color="#f6e7d6", width=8, turns=1.5, opacity=0.75)
sk.end_clip()
spots = [(0.3, 0.3), (0.62, 0.1), (0.72, 0.8), (0.45, 1.3), (0.72, 1.7), (0.85, -0.3), (0.55, -0.7), (0.2, 2.6), (0.6, 2.9), (0.75, 2.3), (0.4, -1.6), (0.7, -2.2)]
for r, t in spots:
    x, y = bowl.surface_point(r, t)
    foods.chunk(sk, x + random.uniform(-10, 10), y, random.uniform(38, 50), "#7e3a22", top="#ad6243", shade="#3f160b", sauce="#8a2f18")
for _ in range(16):
    x, y = bowl.random_surface_point(0.82)
    foods.leaf(sk, x, y, size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#6a9442"]), kind="coriander")
for _ in range(3):
    x, y = bowl.random_surface_point(0.7)
    foods.chilli_ring(sk, x, y, size=10, skin="#c8341f", flesh="#e98c6e")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "lamb-rogan-josh.svg")
