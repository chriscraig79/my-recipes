"""Green Thai chicken curry: a pale green coconut curry on jasmine rice, with
chicken, green chilli, coriander and a wedge of lime on the rim."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, ShallowBowl
import foods

sk = Sketch(seed=53)
bowl = ShallowBowl(sk)
bowl.draw_back()
pool = foods.curry_on_rice(sk, bowl, "#b8bb6e", deep="#808c3e", light="#dfdca4")
px, py, prx, pry = pool
foods.swirl(sk, px + 40, py + 8, 110, 36, color="#f7f4dc", width=6, turns=1.3, opacity=0.6)
for x, y in foods.piled_points(px, py, prx, pry, 13):
    foods.chunk(sk, x, y, random.uniform(42, 52), "#f0dcb4", top="#fcf2dc", shade="#a8925e", sauce="#b5b46c")
for _ in range(7):
    foods.chilli_ring(sk, *foods.pool_point(pool, 0.8, lift=22), size=10, skin="#4e8a2b", flesh="#cfe39f")
for _ in range(14):
    foods.leaf(sk, *foods.pool_point(pool, lift=20), size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#5f8a3c"]), kind="coriander")
lx, ly = bowl.rim_point(-0.25, 0.97, -4)
foods.lime_wedge(sk, lx, ly, size=60, rot=-22)
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "thai-chicken-curry.svg")
