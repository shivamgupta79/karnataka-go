import { useEffect, useState, type FormEvent } from "react";
import { useHabits } from "../context/HabitsContext";
import { Button, Modal, TextField } from "./ui";

interface HabitFormModalProps {
  open: boolean;
  editingId: string | null;
  onClose: () => void;
}

export function HabitFormModal({ open, editingId, onClose }: HabitFormModalProps) {
  const { trackers, createHabit, updateHabit } = useHabits();
  const editing = editingId ? trackers.find((tracker) => tracker.id === editingId) ?? null : null;
  const isEdit = Boolean(editing);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync fields each time the modal opens (or switches target habit).
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setTarget(editing?.config?.target != null ? String(editing.config.target) : "");
    setUnit(editing?.config?.unit ?? "");
    setError(null);
  }, [open, editingId, editing]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give your habit a name first.");
      return;
    }
    if (trimmedName.length > 200) {
      setError("That name is a little long — keep it under 200 characters.");
      return;
    }

    let targetValue: number | null = null;
    if (target.trim()) {
      const parsed = Number(target);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("The target should be a positive number.");
        return;
      }
      targetValue = parsed;
    }

    setSaving(true);
    try {
      const payload = { name: trimmedName, target: targetValue, unit: unit.trim() || null };
      if (editing) {
        await updateHabit(editing.id, payload);
      } else {
        await createHabit(payload);
      }
      onClose();
    } catch {
      setError("We couldn't save that just now. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit habit" : "New habit"}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="habit-form" loading={saving}>
            {isEdit ? "Save changes" : "Create habit"}
          </Button>
        </>
      }
    >
      <form id="habit-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Habit name"
          name="name"
          placeholder="Drink water"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Target (optional)"
            name="target"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="8"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <TextField
            label="Unit (optional)"
            name="unit"
            placeholder="glasses"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          />
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">
          A target is just for context — each day counts as a simple done / not done.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
