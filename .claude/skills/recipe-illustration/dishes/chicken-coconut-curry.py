"""Sri Lankan chicken & coconut curry: a thick golden coconut curry ladled
onto basmati rice in a shallow bowl, with chicken, curry leaves, coriander
and dried chilli."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, ShallowBowl
import foods

sk = Sketch(seed=31)
bowl = ShallowBowl(sk)
bowl.draw_back()
pool = foods.curry_on_rice(sk, bowl, "#c9802c", deep="#94491a", light="#e3a24e")
px, py, prx, pry = pool
foods.swirl(sk, px + 40, py + 8, 110, 36, color="#fbefd2", width=6, turns=1.3, opacity=0.65)
for x, y in foods.piled_points(px, py, prx, pry, 14):
    foods.chunk(sk, x, y, random.uniform(42, 54), "#e4b170", top="#f7d9a3", shade="#8f4f18", sauce="#c47a2a")
for _ in range(8):
    foods.leaf(sk, *foods.pool_point(pool, lift=20), size=random.uniform(12, 16), color="#3f6b2c", kind="curry")
for _ in range(12):
    foods.leaf(sk, *foods.pool_point(pool, lift=15), size=random.uniform(12, 16), color=random.choice(["#7aa34c", "#6a9442"]), kind="coriander")
for _ in range(3):
    foods.chilli_ring(sk, *foods.pool_point(pool, 0.7), size=10, skin="#8f2414", flesh="#b4452a")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-coconut-curry.svg")
