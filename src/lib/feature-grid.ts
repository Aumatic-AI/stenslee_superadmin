import { FEATURE_KEYS, type FeatureKey } from "./feature-registry";
import type { FeatureGridState } from "@/features/plans/PlanFeatureEditor";

export function emptyFeatureGrid(): FeatureGridState {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, { enabled: false, limit_value: null }])
  ) as FeatureGridState;
}

export interface FeatureGridRow {
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
}

export function gridFromRows(rows: FeatureGridRow[]): FeatureGridState {
  const grid = emptyFeatureGrid();
  for (const row of rows) {
    if ((FEATURE_KEYS as readonly string[]).includes(row.feature_key)) {
      grid[row.feature_key as FeatureKey] = { enabled: row.enabled, limit_value: row.limit_value };
    }
  }
  return grid;
}
