#!/usr/bin/env python3
"""Generate Figure 4: Movement duration adaptation over interactions.

Plots how Fitts' law movement duration decreases with repeated interactions,
following the Power Law of Practice with gaussian noise to simulate real data.
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

np.random.seed(42)

# Parameters
BASE_DURATION = 0.5   # seconds (typical 500px move to 40px-wide target)
ALPHA = 0.4           # power law exponent
FLOOR_RATIO = 0.3     # floor at 30% of base
FLOOR = BASE_DURATION * FLOOR_RATIO  # 0.15s
NOISE_SIGMA = 0.02    # gaussian noise std dev
N_INTERACTIONS = 50

fig, ax = plt.subplots(figsize=(3.5, 2.4))

# Interaction numbers
n = np.arange(1, N_INTERACTIONS + 1)

# Adapted duration: power law with floor
duration_clean = np.maximum(BASE_DURATION * n ** (-ALPHA), FLOOR)

# Add noise for scatter points (clamp so nothing goes below 0)
duration_noisy = np.maximum(duration_clean + np.random.normal(0, NOISE_SIGMA, len(n)), 0.05)

# Scatter: individual interactions
ax.scatter(n, duration_noisy, s=12, color="gray", edgecolors="none", alpha=0.7,
           zorder=2, label="Simulated")

# Trend line: clean power law
n_smooth = np.linspace(1, N_INTERACTIONS, 300)
duration_smooth = np.maximum(BASE_DURATION * n_smooth ** (-ALPHA), FLOOR)
ax.plot(n_smooth, duration_smooth, color="black", linewidth=1.2,
        zorder=3, label=r"$T(n) = T_1 \cdot n^{-0.4}$")

# Floor line
ax.axhline(y=FLOOR, color="black", linestyle="--", linewidth=0.7,
           label=f"Floor ({FLOOR:.2f}s)", zorder=1)

# Annotations
ax.annotate(f"T(1) = {BASE_DURATION:.2f}s",
            xy=(1, duration_noisy[0]), xytext=(5, 0.46),
            fontsize=7, ha="left",
            arrowprops=dict(arrowstyle="-", linewidth=0.5, color="gray"))

# Find where floor is reached
floor_idx = np.argmax(duration_clean <= FLOOR + 1e-6)
floor_n = n[floor_idx]
ax.annotate(f"Floor reached\n(n={floor_n})",
            xy=(floor_n, FLOOR), xytext=(floor_n + 8, FLOOR + 0.08),
            fontsize=7, ha="left",
            arrowprops=dict(arrowstyle="-", linewidth=0.5, color="gray"))

ax.set_xlim(0, N_INTERACTIONS + 1)
ax.set_ylim(0, BASE_DURATION + 0.1)
ax.set_xlabel("Interaction number")
ax.set_ylabel("Movement duration (s)")
ax.legend(loc="upper right", frameon=True, edgecolor="gray", fancybox=False)

ax.tick_params(which="major", direction="in", width=0.5, length=4)
ax.tick_params(which="minor", direction="in", width=0.3, length=2)

fig.tight_layout(pad=0.3)
fig.savefig("fig4_duration.pdf", bbox_inches="tight", pad_inches=0.02)
print("Saved fig4_duration.pdf")
