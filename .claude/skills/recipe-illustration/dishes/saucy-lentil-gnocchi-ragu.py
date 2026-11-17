"""Lentil & gnocchi ragù: a thick, rich ragù of lentils, mushrooms and veg
with soft gnocchi cooked in it, topped with basil and grated cheese."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Casserole
import foods

sk = Sketch(seed=97)
pot = Casserole(sk)
pot.draw_back()
sk.clip(pot.surface())
foods.sauce(sk, pot, "#8f3a22", deep="#4e1a0c", light="#b25a34")
# lentils and finely chopped veg give the ragù its texture
foods.dust(sk, lambda: pot.random_surface_point(0.95), count=500, color="#5a2a14", size=(1.6, 3.0), opacity=(0.35, 0.7))
foods.dust(sk, lambda: pot.random_surface_point(0.95), count=160, color="#c87a3a", size=(1.5, 2.6), opacity=(0.4, 0.7))
sk.end_clip()
for x, y in foods.scatter(pot, 30, min_dist=44):
    foods.gnocchi(sk, x, y, size=random.uniform(28, 32))
for _ in range(9):
    x, y = pot.random_surface_point(0.8)
    foods.strip(sk, x, y, length=26, width=5, color=random.choice(["#4f8a34", "#5f9a40"]))
foods.dust(sk, lambda: pot.random_surface_point(0.75), count=120, color="#fbf1d2", size=(1.4, 2.6), opacity=(0.7, 0.95))
pot.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "saucy-lentil-gnocchi-ragu.svg")
