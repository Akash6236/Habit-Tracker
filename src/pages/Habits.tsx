import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  FolderPlus,
  ListChecks,
} from "lucide-react";
import { db, type Habit, type HabitType, type Category } from "../db/database";
import { useLive } from "../lib/useLive";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { IconTile } from "../components/ui/IconTile";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../components/ui/Toast";

interface Props {
  /** signal from parent (e.g. FAB) to open the New Habit modal */
  triggerNew?: number;
  /** signal from parent (e.g. dedicated button) to open New Category modal */
  triggerNewCategory?: number;
}

export function HabitsPage({ triggerNew, triggerNewCategory }: Props) {
  const habits = useLive<Habit[]>(() => db.habits.toArray(), [], []);
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!triggerNew) return;
    setEditing({
      categoryKey: categories[0]?.key ?? "study",
      name: "",
      type: "boolean",
      active: true,
      createdAt: Date.now(),
      emoji: "✨",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerNew]);

  useEffect(() => {
    if (!triggerNewCategory) return;
    setShowAddCat(true);
  }, [triggerNewCategory]);

  return (
    <div className="space-y-5">
      <Card variant="glass">
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl">
              <ListChecks size={18} />
            </IconTile>
          }
          title="Your habit library"
          subtitle="Add, edit, archive — categories define your weights."
          trailing={
            <div className="flex gap-2">
              <Button variant="soft" size="sm" iconLeft={<FolderPlus size={14} />} onClick={() => setShowAddCat(true)}>
                Category
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={() =>
                  setEditing({
                    categoryKey: categories[0]?.key ?? "study",
                    name: "",
                    type: "boolean",
                    active: true,
                    createdAt: Date.now(),
                    emoji: "✨",
                  })
                }
              >
                Habit
              </Button>
            </div>
          }
        />
      </Card>

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderPlus size={22} />}
            title="No categories yet"
            body="Categories help group habits and weight your growth score."
            action={
              <Button variant="primary" onClick={() => setShowAddCat(true)} iconLeft={<Plus size={14} />}>
                New category
              </Button>
            }
          />
        </Card>
      ) : (
        categories.map((c) => {
          const list = habits.filter((h) => h.categoryKey === c.key);
          return (
            <Card key={c.key}>
              <CardHeader
                icon={
                  <IconTile bg={c.color} rounded="xl">
                    <span className="font-display font-bold text-lg">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                  </IconTile>
                }
                title={c.name}
                subtitle={
                  <span className="flex items-center gap-2 mt-0.5">
                    <Chip>weight {c.weight}</Chip>
                    <Chip tone="brand">{list.length} habit{list.length === 1 ? "" : "s"}</Chip>
                  </span>
                }
                trailing={
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Trash2 size={13} />}
                    onClick={async () => {
                      const habitMsg =
                        list.length > 0
                          ? `\n\nThis will also delete ${list.length} habit${
                              list.length === 1 ? "" : "s"
                            } and all their entries.`
                          : "";
                      if (!confirm(`Delete category "${c.name}"?${habitMsg}`)) return;
                      await db.transaction(
                        "rw",
                        [db.categories, db.habits, db.entries],
                        async () => {
                          // Cascade: entries → habits → category
                          const habitIds = (await db.habits
                            .where("categoryKey")
                            .equals(c.key)
                            .toArray()).map((h) => h.id!).filter(Boolean);
                          if (habitIds.length) {
                            await db.entries.where("habitId").anyOf(habitIds).delete();
                          }
                          await db.habits.where({ categoryKey: c.key }).delete();
                          await db.categories.delete(c.id!);
                        }
                      );
                      toast(`"${c.name}" deleted`, "info");
                    }}
                  >
                    Delete
                  </Button>
                }
              />
              <div className="mt-4 space-y-2">
                {list.length === 0 ? (
                  <p className="text-sm text-ink-muted px-1 py-2">
                    No habits yet — tap <strong className="text-ink">+ Habit</strong> to add one.
                  </p>
                ) : (
                  list.map((h) => (
                    <motion.div
                      key={h.id}
                      layout
                      whileHover={{ y: -1 }}
                      className="card-glass !rounded-2xl !p-3 flex items-center gap-3"
                    >
                      <IconTile bg={c.color} size="md" rounded="xl">
                        <span className="text-base font-bold">{h.emoji ?? "•"}</span>
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink truncate">{h.name}</p>
                          {!h.active && <Chip tone="flame">Archived</Chip>}
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5 truncate">
                          {h.type}
                          {h.target ? ` · ${h.target}${h.unit ? " " + h.unit : ""} target` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" iconLeft={<Pencil size={13} />} onClick={() => setEditing(h)}>
                        Edit
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          );
        })
      )}

      <HabitFormModal
        habit={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={(msg) => toast(msg, "success")}
      />
      <CategoryFormModal
        open={showAddCat}
        onClose={() => setShowAddCat(false)}
        onSaved={() => toast("Category added", "success")}
      />
    </div>
  );
}

function HabitFormModal({
  habit,
  categories,
  onClose,
  onSaved,
}: {
  habit: Habit | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [draft, setDraft] = useState<Habit | null>(habit);
  useEffect(() => {
    setDraft(habit);
  }, [habit]);
  if (!draft) return null;
  const isNew = draft.id == null;

  async function save() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    if (isNew) await db.habits.add({ ...draft, name });
    else await db.habits.update(draft.id!, { ...draft, name });
    onSaved(isNew ? "Habit created" : "Habit updated");
    onClose();
  }

  async function archive() {
    if (!draft?.id) return;
    await db.habits.update(draft.id, {
      active: !draft.active,
      archivedAt: draft.active ? Date.now() : undefined,
    });
    onSaved(draft.active ? "Archived" : "Restored");
    onClose();
  }

  async function remove() {
    if (!draft?.id) return onClose();
    if (!confirm("Delete this habit and ALL its entries?")) return;
    await db.transaction("rw", [db.habits, db.entries], async () => {
      await db.entries.where("habitId").equals(draft.id!).delete();
      await db.habits.delete(draft.id!);
    });
    onSaved("Deleted");
    onClose();
  }

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      title={isNew ? "New habit" : "Edit habit"}
      subtitle={isNew ? "Define the smallest version that's still meaningful." : draft.name}
      footer={
        <div className="flex flex-wrap gap-2 justify-end w-full">
          {!isNew && (
            <>
              <Button variant="ghost" iconLeft={draft.active ? <Archive size={14} /> : <ArchiveRestore size={14} />} onClick={archive}>
                {draft.active ? "Archive" : "Restore"}
              </Button>
              <Button variant="ghost" iconLeft={<Trash2 size={14} />} onClick={remove}>
                Delete
              </Button>
            </>
          )}
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <FieldLabel>Name</FieldLabel>
            <input
              className="field"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. DSA practice"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Symbol</FieldLabel>
            <input
              className="field !w-16 text-center"
              value={draft.emoji ?? ""}
              onChange={(e) => setDraft({ ...draft, emoji: e.target.value.slice(0, 2) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Category</FieldLabel>
            <select
              className="field"
              value={draft.categoryKey}
              onChange={(e) => setDraft({ ...draft, categoryKey: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <select
              className="field"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as HabitType })}
            >
              <option value="boolean">Done / not done</option>
              <option value="counter">Counter (steps, reps…)</option>
              <option value="duration">Duration (minutes)</option>
              <option value="scale">Scale (1–5)</option>
            </select>
          </div>
        </div>

        {(draft.type === "counter" || draft.type === "duration") && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Target</FieldLabel>
              <input
                className="field"
                type="number"
                value={draft.target ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    target: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <input
                className="field"
                value={draft.unit ?? ""}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder={draft.type === "duration" ? "min" : "reps"}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CategoryFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [weight, setWeight] = useState(2);

  async function save() {
    const k = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!k) return;
    const exists = await db.categories.where("key").equals(k).first();
    if (exists) {
      alert("A category with this name already exists.");
      return;
    }
    await db.categories.add({ key: k, name: name.trim(), color, weight });
    setName("");
    setColor("#6366f1");
    setWeight(2);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New category"
      subtitle="A bucket for related habits — lifts, study, reading…"
      footer={
        <Button variant="primary" onClick={save}>
          Create
        </Button>
      }
    >
      <div className="space-y-3">
        <div>
          <FieldLabel>Name</FieldLabel>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Side projects"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Accent color</FieldLabel>
            <input className="field !p-1.5 h-11" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Weight (1–3)</FieldLabel>
            <input
              className="field"
              type="number"
              min={1}
              max={3}
              value={weight}
              onChange={(e) => setWeight(Math.max(1, Math.min(3, Number(e.target.value))))}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] uppercase font-semibold tracking-wider text-ink-muted mb-1.5 block">
      {children}
    </label>
  );
}
