/** Shape of a tracker's `config` jsonb payload. */
export interface HabitConfig {
  target?: number | null;
  unit?: string | null;
}

export interface Tracker {
  id: string;
  user_id: string;
  type: string;
  name: string;
  config: HabitConfig;
  archived: boolean;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  tracker_id: string;
  entry_date: string; // YYYY-MM-DD
  value: number;
  data: Record<string, unknown>;
  created_at: string;
}

export interface HabitInput {
  name: string;
  target?: number | null;
  unit?: string | null;
}
