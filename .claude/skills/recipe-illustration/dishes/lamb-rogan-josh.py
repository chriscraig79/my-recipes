"""Lamb rogan josh: a deep red curry of tender lamb on rice, with a ribbon of
yoghurt, coriander leaves and a little fresh chilli."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, ShallowBowl
import foods

sk = Sketch(seed=47)
bowl = ShallowBowl(sk)
bowl.draw_back()
pool = foods.curry_on_rice(sk, bowl, "#a3401f", deep="#661c0e", light="#c9643a")
px, py, prx, pry = pool
for x, y in foods.piled_points(px, py, prx, pry, 13):
    foods.chunk(sk, x, y, random.uniform(42, 54), "#8e452a", top="#bb7250", shade="#45180b", sauce="#8a2f18")
foods.swirl(sk, px + 20, py - 16, 120, 40, color="#f6e7d6", width=7, turns=1.4, opacity=0.8)
for _ in range(14):
    foods.leaf(sk, *foods.pool_point(pool, lift=22), size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#6a9442"]), kind="coriander")
for _ in range(3):
    foods.chilli_ring(sk, *foods.pool_point(pool, 0.7, lift=22), size=10, skin="#c8341f", flesh="#e98c6e")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "lamb-rogan-josh.svg")
