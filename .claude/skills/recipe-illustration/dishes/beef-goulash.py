"""Beef goulash: a deep paprika-red stew of beef and mixed peppers, with a
swirl of soured cream, parsley and a dusting of smoked paprika."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "toolkit"))
from sketchkit import Sketch, Casserole
import foods

sk = Sketch(seed=79)
pot = Casserole(sk)
pot.draw_back()
sk.clip(pot.surface())
foods.sauce(sk, pot, "#a3361d", deep="#5e170b", light="#c8532c")
sk.end_clip()
kinds = ["beef"] * 18 + ["pepper"] * 14
random.shuffle(kinds)
for (x, y), kind in zip(foods.scatter(pot, len(kinds), min_dist=40), kinds):
    if kind == "beef":
        foods.chunk(sk, x, y, random.uniform(44, 56), "#7a3a22", top="#a65c3a", shade="#35120a", sauce="#8e2c18")
    else:
        foods.strip(sk, x, y, length=random.uniform(30, 40), width=10, color=random.choice(["#d23f28", "#e8b430", "#5c8a34", "#d23f28"]))
foods.swirl(sk, pot.fx - 30, pot.fy - 20, 150, 50, color="#fbf4ea", width=10, turns=1.6, opacity=0.85)
for _ in range(16):
    x, y = pot.random_surface_point(0.85)
    foods.leaf(sk, x, y, size=random.uniform(11, 14), color=random.choice(["#6a9442", "#5f8a3c"]), kind="coriander")
foods.dust(sk, lambda: pot.random_surface_point(0.5), count=90, color="#8e1f0e")
pot.draw_rim()
sk.save(sys.argv[1] if len(sys.argv) > 1 else "beef-goulash.svg")
