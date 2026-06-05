// Editorial chart palette tuned to the Hung Phat (HP) brand. The first colour
// is the brand accent; the rest are warm, restrained hues that read well on the
// cream `--surface-card` background. Used for breakdown slices and chart fills.
export const HP_CHART_COLORS = [
  "var(--accent)", // brand pink
  "#c98a3a", // amber
  "#6f8f8a", // muted teal
  "#9c6b8f", // dusty plum
  "#8a8178", // ink-muted
  "#bdc1c6", // platinum
] as const;

// Axis / grid styling shared across recharts charts.
export const AXIS_TICK = { fill: "var(--ink-muted)", fontSize: 11 } as const;
export const GRID_STROKE = "var(--rule)";
