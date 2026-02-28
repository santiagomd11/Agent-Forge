#!/usr/bin/env python3
"""Generate Figure 3: WindMouse trajectory comparison.

Two-panel figure showing mouse trajectories before and after muscle memory
adaptation. Panel (a) shows a first interaction with default parameters
(wobbly path), panel (b) shows a practiced interaction with adapted
parameters (nearly straight path).
"""

import math
import random
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# IEEE-quality settings
plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["Times New Roman", "Times", "DejaVu Serif"],
    "font.size": 8,
    "axes.labelsize": 9,
    "xtick.labelsize": 8,
    "ytick.labelsize": 8,
    "legend.fontsize": 7,
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "text.usetex": False,
    "axes.linewidth": 0.5,
    "xtick.major.width": 0.5,
    "ytick.major.width": 0.5,
    "xtick.direction": "in",
    "ytick.direction": "in",
    "axes.grid": False,
})

random.seed(42)


def windmouse_path(start_x, start_y, end_x, end_y,
                   gravity=9.0, wind=3.0, max_vel=20.0, homing_dist=12.0):
    """Generate a WindMouse trajectory between two points.

    The algorithm simulates a particle driven by gravity (toward target)
    and wind (random perturbation), producing human-like curved mouse paths.
    """
    points = [(start_x, start_y)]
    sx, sy = float(start_x), float(start_y)
    vx, vy = 0.0, 0.0
    wx, wy = 0.0, 0.0

    while True:
        d = math.hypot(end_x - sx, end_y - sy)
        if d < 1:
            break

        w = min(wind, d)
        m = min(max_vel, d)

        if d >= homing_dist:
            wx = wx / math.sqrt(3) + (random.random() * 2 - 1) * w / math.sqrt(5)
            wy = wy / math.sqrt(3) + (random.random() * 2 - 1) * w / math.sqrt(5)
        else:
            wx /= math.sqrt(3)
            wy /= math.sqrt(3)

        vx += wx + gravity * (end_x - sx) / d
        vy += wy + gravity * (end_y - sy) / d

        v_mag = math.hypot(vx, vy)
        if v_mag > m:
            v_clip = m / 2 + random.random() * m / 2
            ratio = v_clip / v_mag
            vx *= ratio
            vy *= ratio

        sx += vx
        sy += vy
        points.append((sx, sy))

    points.append((float(end_x), float(end_y)))
    return points


START = (0, 0)
END = (400, 300)

# Default parameters (first interaction)
DEFAULT_GRAVITY = 9.0
DEFAULT_WIND = 3.0
DEFAULT_MAX_VEL = 20.0

# Adapted parameters (practiced, n=30)
ADAPTED_GRAVITY = 18.5
ADAPTED_WIND = 1.1
ADAPTED_MAX_VEL = 32.5

# Generate trajectories
random.seed(42)
path_novice = windmouse_path(
    START[0], START[1], END[0], END[1],
    gravity=DEFAULT_GRAVITY, wind=DEFAULT_WIND, max_vel=DEFAULT_MAX_VEL
)

random.seed(42)
path_practiced = windmouse_path(
    START[0], START[1], END[0], END[1],
    gravity=ADAPTED_GRAVITY, wind=ADAPTED_WIND, max_vel=ADAPTED_MAX_VEL
)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.0, 3.0))

MARGIN = 30
XLIM = (-MARGIN, END[0] + MARGIN)
YLIM = (-MARGIN, END[1] + MARGIN)

for ax, path, title in [
    (ax1, path_novice, "(a) First interaction (n=1)"),
    (ax2, path_practiced, "(b) Practiced (n=30)"),
]:
    xs = [p[0] for p in path]
    ys = [p[1] for p in path]

    # Draw the straight-line reference (dashed, light gray)
    ax.plot([START[0], END[0]], [START[1], END[1]],
            color="lightgray", linestyle="--", linewidth=0.6, zorder=1)

    # Draw the trajectory
    ax.plot(xs, ys, color="black", linewidth=0.8, zorder=2)

    # Start marker (circle)
    ax.plot(START[0], START[1], "o", color="black", markersize=6, zorder=3)

    # End marker (square)
    ax.plot(END[0], END[1], "s", color="black", markersize=6, zorder=3)

    # Labels
    ax.text(START[0] - 8, START[1] + 18, "Start", fontsize=7, ha="left", va="bottom")
    ax.text(END[0] + 8, END[1] - 18, "Target", fontsize=7, ha="right", va="top")

    ax.set_xlim(XLIM)
    ax.set_ylim(YLIM)
    ax.set_aspect("equal")
    ax.set_xlabel("x (pixels)")
    ax.set_ylabel("y (pixels)")
    ax.set_title(title, fontsize=9, pad=6)

    # Clean ticks
    ax.tick_params(which="major", direction="in", width=0.5, length=4)

    # Print path stats
    total_dist = sum(
        math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1])
        for i in range(len(path) - 1)
    )
    straight_dist = math.hypot(END[0] - START[0], END[1] - START[1])
    print(f"{title}: {len(path)} points, path length={total_dist:.0f}px, "
          f"straight={straight_dist:.0f}px, ratio={total_dist / straight_dist:.2f}")

fig.tight_layout(pad=0.5)
fig.savefig("fig3_trajectory.pdf", bbox_inches="tight", pad_inches=0.02)
print("Saved fig3_trajectory.pdf")
