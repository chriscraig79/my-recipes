"""Chicken massaman: a rich orange-brown curry on jasmine rice, with chicken,
chunks of potato and onion, and peanuts scattered on top."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, ShallowBowl
import foods

sk = Sketch(seed=43)
bowl = ShallowBowl(sk)
bowl.draw_back()
pool = foods.curry_on_rice(sk, bowl, "#c06c28", deep="#863f14", light="#dd9a4c")
px, py, prx, pry = pool
for i, (x, y) in enumerate(foods.piled_points(px, py, prx, pry, 14)):
    if i % 3 == 1:  # potato
        foods.chunk(sk, x, y, random.uniform(44, 54), "#ebc96f", top="#f9e6aa", shade="#a7782a", sauce="#c0702c")
    else:           # chicken
        foods.chunk(sk, x, y, random.uniform(42, 52), "#d79a58", top="#f0c48a", shade="#7d4317", sauce="#b8682a")
for _ in range(5):
    foods.strip(sk, *foods.pool_point(pool, 0.75, lift=22), length=34, width=8, color="#efe0c0")
for _ in range(14):
    foods.peanut(sk, *foods.pool_point(pool, lift=26), size=random.uniform(11, 14))
for _ in range(6):
    foods.leaf(sk, *foods.pool_point(pool, lift=22), size=random.uniform(12, 15), color="#6a9442", kind="coriander")
bowl.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-massaman.svg")
