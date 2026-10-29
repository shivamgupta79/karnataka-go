import type { HabitConfig } from "../types";

/** Human-readable target line, e.g. "8 glasses / day" or "Every day". */
export function describeTarget(config: HabitConfig | null | undefined): string {
  const target = config?.target ?? null;
  const unit = config?.unit?.trim() ?? "";
  if (target != null && unit) return `${target} ${unit} / day`;
  if (target != null) return `${target} / day`;
  if (unit) return `Per day: ${unit}`;
  return "Every day";
}
