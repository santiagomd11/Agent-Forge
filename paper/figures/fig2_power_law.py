#!/usr/bin/env python3
"""Generate Figure 2: Power Law of Practice curve for muscle memory system.

Plots T(n)/T(1) = n^(-0.4) floored at 0.3, showing how repeated interactions
with the same UI element reduce movement time following the Power Law of Practice.
"""

import numpy as np
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

ALPHA = 0.4
FLOOR = 0.3

fig, ax = plt.subplots(figsize=(3.5, 2.4))

# Power law curve
n = np.logspace(0, 2, 500)  # 1 to 100
ratio = np.maximum(n ** (-ALPHA), FLOOR)

ax.plot(n, ratio, color="black", linewidth=1.2, label=r"$T(n)/T(1) = n^{-0.4}$")

# Floor line
ax.axhline(y=FLOOR, color="black", linestyle="--", linewidth=0.7, label=f"Floor ({int(FLOOR * 100)}%)")

# Key points
# n where floor is reached: n^(-0.4) = 0.3 -> n ≈ 20
n_floor = FLOOR ** (-1.0 / ALPHA)  # 20.29

key_points = [
    (1, 1.0, "n=1\n100%"),
    (10, 10 ** (-ALPHA), f"n=10\n{10 ** (-ALPHA):.0%}"),
    (round(n_floor), FLOOR, f"n={round(n_floor)}\n{FLOOR:.0%} (floor)"),
]

for n_val, t_val, label in key_points:
    actual_val = max(n_val ** (-ALPHA), FLOOR)
    ax.plot(n_val, actual_val, "o", color="black", markersize=4, zorder=5)
    if n_val == 1:
        ax.annotate(label, xy=(n_val, actual_val), xytext=(2.5, 0.88),
                     fontsize=7, ha="left", va="top",
                     arrowprops=dict(arrowstyle="-", linewidth=0.5, color="gray"))
    elif n_val == 10:
        ax.annotate(label, xy=(n_val, actual_val), xytext=(18, 0.52),
                     fontsize=7, ha="left", va="top",
                     arrowprops=dict(arrowstyle="-", linewidth=0.5, color="gray"))
    else:
        ax.annotate(label, xy=(n_val, actual_val), xytext=(35, 0.18),
                     fontsize=7, ha="left", va="top",
                     arrowprops=dict(arrowstyle="-", linewidth=0.5, color="gray"))

ax.set_xscale("log")
ax.set_xlim(1, 100)
ax.set_ylim(0, 1.05)
ax.set_xlabel("Hit count (n)")
ax.set_ylabel("T(n) / T(1)")
ax.legend(loc="upper right", frameon=True, edgecolor="gray", fancybox=False)

# Minor ticks
ax.tick_params(which="minor", direction="in", width=0.3, length=2)
ax.tick_params(which="major", direction="in", width=0.5, length=4)

fig.tight_layout(pad=0.3)
fig.savefig("fig2_power_law.pdf", bbox_inches="tight", pad_inches=0.02)
print("Saved fig2_power_law.pdf")
