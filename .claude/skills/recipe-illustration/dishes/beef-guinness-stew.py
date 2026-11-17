"""Beef & Guinness stew: dark, glossy gravy with chunks of beef, carrot and
celery, a few thyme sprigs, in an enamelled casserole pot."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Casserole
import foods

sk = Sketch(seed=71)
pot = Casserole(sk)
pot.draw_back()
sk.clip(pot.surface())
foods.sauce(sk, pot, "#5c3520", deep="#2c180c", light="#7c4b2c")
sk.end_clip()
kinds = ["beef"] * 20 + ["carrot"] * 10 + ["celery"] * 6
random.shuffle(kinds)
for (x, y), kind in zip(foods.scatter(pot, len(kinds), min_dist=44), kinds):
    if kind == "beef":
        foods.chunk(sk, x, y, random.uniform(46, 58), "#6e3c25", top="#99603f", shade="#2a120a", sauce="#4a2a18")
    elif kind == "carrot":
        foods.carrot_disc(sk, x, y, size=random.uniform(18, 22))
    else:
        foods.celery_slice(sk, x, y, size=random.uniform(19, 23))
for _ in range(3):
    x, y = pot.random_surface_point(0.7)
    foods.sprig(sk, x, y, length=random.uniform(55, 70), kind="thyme")
pot.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "beef-guinness-stew.svg")
