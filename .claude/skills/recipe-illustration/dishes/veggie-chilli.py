"""Veggie chilli: a deep red chilli of chargrilled sweet potato, peppers and
cannellini beans on black rice, with a dollop of yoghurt rippled with chilli
sauce and mint leaves, and a warm tortilla folded on the rim."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, ShallowBowl
import foods

sk = Sketch(seed=61)
bowl = ShallowBowl(sk)
bowl.draw_back()
pool = foods.curry_on_rice(sk, bowl, "#b2432a", deep="#7a2314", light="#d06a3c",
                           rice=dict(grain="#5b4356", shade="#2c1f2b", dark=True))
px, py, prx, pry = pool
for x, y in foods.piled_points(px, py, prx, pry, 10):
    foods.chunk(sk, x, y, random.uniform(34, 42), "#df8a3a", top="#f4b56b", shade="#93420f", sauce="#b2432a")
for _ in range(14):
    foods.bean(sk, *foods.pool_point(pool, lift=24), size=random.uniform(12, 15))
for _ in range(10):
    foods.strip(sk, *foods.pool_point(pool, lift=24), length=30, width=8, color=random.choice(["#d23f28", "#e8b430", "#d23f28"]))
dx, dy = px + 20, py - 30
sk.add(f'<ellipse cx="{dx:.1f}" cy="{dy:.1f}" rx="72" ry="32" fill="#fbf6ec" opacity="0.97" filter="url(#wash)"/>')
foods.swirl(sk, dx, dy, 48, 18, color="#c23a1c", width=4, turns=1.2, opacity=0.7)
for _ in range(10):
    foods.leaf(sk, *foods.pool_point(pool, lift=22), size=random.uniform(12, 15), color=random.choice(["#5f9a52", "#6aa65a"]), kind="mint")
bowl.draw_rim()
tx, ty = bowl.rim_point(-0.55, 0.9, 6)
foods.tortilla(sk, tx - 150, ty, size=250, rot=-6)
sk.save(sys.argv[1] if len(sys.argv) > 1 else "veggie-chilli.svg")
