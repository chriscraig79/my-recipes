"""Mild chicken korma: a pale, creamy korma on rice, with chicken, a swirl of
cream, flaked almonds and a little coriander."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, ShallowBowl
import foods

sk = Sketch(seed=41)
bowl = ShallowBowl(sk)
bowl.draw_back()
pool = foods.curry_on_rice(sk, bowl, "#dfb878", deep="#b5843f", light="#f3dcaa")
px, py, prx, pry = pool
for x, y in foods.piled_points(px, py, prx, pry, 13):
    foods.chunk(sk, x, y, random.uniform(42, 54), "#f0d3a2", top="#fcecce", shade="#a77a40", sauce="#d8b06c")
foods.swirl(sk, px + 10, py - 18, 120, 40, color="#fffaf0", width=8, turns=1.5, opacity=0.85)
for _ in range(20):
    foods.sliver(sk, *foods.pool_point(pool, lift=24), size=random.uniform(10, 13), color="#f6e7c6")
for _ in range(6):
    foods.leaf(sk, *foods.pool_point(pool, 0.75, lift=22), size=random.uniform(12, 15), color=random.choice(["#7aa34c", "#6a9442"]), kind="coriander")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-korma-for-kids.svg")
