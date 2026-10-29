import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Entry, HabitInput, Tracker } from "../types";

function buildConfig(input: HabitInput): Tracker["config"] {
  const config: Tracker["config"] = {};
  if (input.target != null && Number.isFinite(input.target)) config.target = input.target;
  if (input.unit && input.unit.trim()) config.unit = input.unit.trim();
  return config;
}

interface HabitsContextValue {
  trackers: Tracker[];
  entries: Entry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createHabit: (input: HabitInput) => Promise<void>;
  updateHabit: (id: string, input: HabitInput) => Promise<void>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
  toggleEntry: (trackerId: string, dateKey: string, nextDone: boolean) => Promise<void>;
}

const HabitsContext = createContext<HabitsContextValue | undefined>(undefined);

export function HabitsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [trackerResult, entryResult] = await Promise.all([
      supabase.from("trackers").select("*").order("created_at", { ascending: false }),
      supabase.from("entries").select("*").order("entry_date", { ascending: false }),
    ]);

    if (trackerResult.error || entryResult.error) {
      setError("We couldn't load your habits just now. Please try again.");
      setLoading(false);
      return;
    }
    setTrackers((trackerResult.data ?? []) as Tracker[]);
    setEntries((entryResult.data ?? []) as Entry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [userId, refresh]);

  const createHabit = useCallback(async (input: HabitInput) => {
    const { data, error: err } = await supabase
      .from("trackers")
      .insert({ type: "habit", name: input.name.trim(), config: buildConfig(input) })
      .select()
      .single();
    if (err) throw err;
    setTrackers((cur) => [data as Tracker, ...cur]);
  }, []);

  const updateHabit = useCallback(async (id: string, input: HabitInput) => {
    const { data, error: err } = await supabase
      .from("trackers")
      .update({ name: input.name.trim(), config: buildConfig(input) })
      .eq("id", id)
      .select()
      .single();
    if (err) throw err;
    setTrackers((cur) => cur.map((t) => (t.id === id ? (data as Tracker) : t)));
  }, []);

  const setArchived = useCallback(async (id: string, archived: boolean) => {
    const { data, error: err } = await supabase
      .from("trackers")
      .update({ archived })
      .eq("id", id)
      .select()
      .single();
    if (err) throw err;
    setTrackers((cur) => cur.map((t) => (t.id === id ? (data as Tracker) : t)));
  }, []);

  /**
   * Optimistic toggle: flip locally first, then persist. On failure the local
   * state rolls back and the error is re-thrown so the caller can offer retry.
   */
  const toggleEntry = useCallback(
    async (trackerId: string, dateKey: string, nextDone: boolean) => {
      const snapshot = entries;
      const tempId = `temp-${crypto.randomUUID()}`;

      if (nextDone) {
        setEntries((cur) => [
          {
            id: tempId,
            user_id: userId,
            tracker_id: trackerId,
            entry_date: dateKey,
            value: 1,
            data: {},
            created_at: new Date().toISOString(),
          },
          ...cur,
        ]);
      } else {
        setEntries((cur) =>
          cur.filter((e) => !(e.tracker_id === trackerId && e.entry_date === dateKey)),
        );
      }

      try {
        if (nextDone) {
          const { data, error: err } = await supabase
            .from("entries")
            .upsert(
              { tracker_id: trackerId, entry_date: dateKey, value: 1 },
              { onConflict: "tracker_id,entry_date" },
            )
            .select()
            .single();
          if (err) throw err;
          const row = data as Entry;
          setEntries((cur) => cur.map((e) => (e.id === tempId ? row : e)));
        } else {
          const { error: err } = await supabase
            .from("entries")
            .delete()
            .eq("tracker_id", trackerId)
            .eq("entry_date", dateKey);
          if (err) throw err;
        }
      } catch (e) {
        setEntries(snapshot);
        throw e;
      }
    },
    [entries, userId],
  );

  const value = useMemo<HabitsContextValue>(
    () => ({ trackers, entries, loading, error, refresh, createHabit, updateHabit, setArchived, toggleEntry }),
    [trackers, entries, loading, error, refresh, createHabit, updateHabit, setArchived, toggleEntry],
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error("useHabits must be used inside a HabitsProvider");
  return ctx;
}
