"""Chicken casserole with dumplings: a red wine casserole of chicken, carrot
and bacon lardons, topped with golden herb dumplings baked on top."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Casserole
import foods

sk = Sketch(seed=73)
pot = Casserole(sk)
pot.draw_back()
sk.clip(pot.surface())
foods.sauce(sk, pot, "#7a2f20", deep="#3e130b", light="#9a4a30")
sk.end_clip()
# between the dumplings: chicken, carrot and lardons peeking out of the sauce
kinds = ["chicken"] * 6 + ["carrot"] * 7 + ["lardon"] * 9
random.shuffle(kinds)
for (x, y), kind in zip(foods.scatter(pot, len(kinds), min_dist=40), kinds):
    if kind == "chicken":
        foods.chunk(sk, x, y, random.uniform(30, 38), "#b97a4a", top="#d9a06c", shade="#5a2a10", sauce="#6e2a1c")
    elif kind == "carrot":
        foods.carrot_disc(sk, x, y, size=random.uniform(15, 18))
    else:
        foods.round_bit(sk, x, y, size=random.uniform(7, 9), color="#c97a6a", shade="#7a3a2a")
# the dumplings sit on top, back to front
dumplings = [(0.0, 0), (0.5, 0.2), (0.5, 1.5), (0.55, 2.8), (0.5, -1.7), (0.62, -0.6), (0.6, 2.2), (0.68, 0.9)]
pts = sorted((pot.surface_point(r, t) for r, t in dumplings), key=lambda p: p[1])
for x, y in pts:
    foods.herb_dumpling(sk, x, y, size=random.uniform(64, 74))
for _ in range(2):
    x, y = pot.random_surface_point(0.7)
    foods.sprig(sk, x, y - 20, length=60, kind="thyme")
pot.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "chicken-casserole-dumplings.svg")
