"use client";

import { buttonVariants } from "@/components/ui/button";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { CopyFieldDef } from "@/components/admin/content/site-content/sections";

/**
 * Structured renderer for one section's copy, skinned with the public
 * site's form rules: eyebrow labels, square-cornered hairline inputs
 * with 2px ink focus outlines, pill action buttons, editorial accordion
 * cards. Strings become labelled inputs, long strings textareas with
 * live counters, arrays repeatable rows / accordion cards with add,
 * remove and reorder (drag handle, or the arrow buttons as the keyboard
 * path), and nested objects bordered sub-panels. Every control patches
 * one key of the section's data object.
 */

// ── Shared field primitives (user-side form styling) ─────────────────────────

const inputClass =
  "border-input bg-background team-focus text-ink placeholder:text-mute/60 focus-visible:outline-none h-9 w-full rounded-md border px-3 text-sm transition-colors";

const textareaClass =
  "border-input bg-background team-focus text-ink placeholder:text-mute/60 focus-visible:outline-none w-full rounded-md border px-3 py-2 text-sm leading-relaxed transition-colors";

// ── Drag-reorder state shared by the row list editors ────────────────────────

interface DragState {
  dragIndex: number | null;
  overIndex: number | null;
}

// ── Field tree renderer ──────────────────────────────────────────────────────

export function CopyFields({
  idPrefix,
  fields,
  value,
  onChange,
}: {
  /** Unique input-id prefix (section key + field path). */
  idPrefix: string;
  fields: CopyFieldDef[];
  value: Record<string, unknown>;
  onChange: (key: string, next: unknown) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const wide =
          field.kind === "textarea" ||
          field.kind === "list" ||
          field.kind === "cards";
        return (
          <div
            key={field.key}
            className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}
          >
            {field.kind === "group" ? (
              <fieldset className="border-line bg-paper-soft/40 space-y-2 rounded-md border p-4">
                <legend className="text-mute px-1 text-[12px] font-semibold tracking-[0.12em] uppercase">
                  {field.label}
                </legend>
                <CopyFields
                  idPrefix={id}
                  fields={field.fields}
                  value={plainObject(value[field.key])}
                  onChange={(key, next) =>
                    onChange(field.key, {
                      ...plainObject(value[field.key]),
                      [key]: next,
                    })
                  }
                />
                {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
              </fieldset>
            ) : field.kind === "list" ? (
              <ListEditor
                field={field}
                id={id}
                items={toStringArray(value[field.key])}
                onChange={(next) => onChange(field.key, next)}
              />
            ) : field.kind === "cards" ? (
              <CardsEditor
                field={field}
                idPrefix={id}
                items={toObjectArray(value[field.key])}
                onChange={(next) => onChange(field.key, next)}
              />
            ) : (
              <>
                <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                <StringControl
                  field={field}
                  id={id}
                  raw={value[field.key]}
                  onChange={(next) => onChange(field.key, next)}
                />
                {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function plainObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// ── Repeatable string rows ───────────────────────────────────────────────────

function ListEditor({
  field,
  id,
  items,
  onChange,
}: {
  field: Extract<CopyFieldDef, { kind: "list" }>;
  id: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [drag, setDrag] = useState<DragState>({
    dragIndex: null,
    overIndex: null,
  });

  const setItem = (index: number, next: string) =>
    items.map((item, i) => (i === index ? next : item));
  const remove = (index: number) => items.filter((_, i) => i !== index);

  const atMax = field.max !== undefined && items.length >= field.max;
  const canRemove =
    items.length > 0 &&
    items.length > (field.min ?? (field.allowEmpty ? 0 : 1));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{field.label}</FieldLabel>
        <PillButton
          disabled={atMax}
          onClick={() => onChange([...items, field.newItem?.() ?? ""])}
        >
          <Plus className="size-3.5" aria-hidden="true" /> Нэмэх
        </PillButton>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <p className="text-mute border-line rounded-md border border-dashed px-3 py-2 text-xs">
            Мөр байхгүй — «Нэмэх» дарж нэмнэ үү.
          </p>
        ) : (
          items.map((item, index) => (
            <ReorderableRow
              key={`${id}-${index}`}
              index={index}
              count={items.length}
              drag={drag}
              setDrag={setDrag}
              canRemove={canRemove}
              removeLabel={`${field.itemLabel ?? "Мөр"} ${index + 1} устгах`}
              onDropOn={(target) => {
                if (drag.dragIndex !== null && drag.dragIndex !== target) {
                  onChange(moveItem(items, drag.dragIndex, target));
                }
                setDrag({ dragIndex: null, overIndex: null });
              }}
              onMove={(delta) => {
                const target = index + delta;
                if (target >= 0 && target < items.length) {
                  onChange(moveItem(items, index, target));
                }
              }}
              onRemove={() => onChange(remove(index))}
            >
              <span
                aria-hidden="true"
                className="bg-paper-soft text-mute flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <input
                aria-label={`${field.itemLabel ?? "Мөр"} ${index + 1}`}
                value={item}
                placeholder={`${field.itemLabel ?? "Мөр"} ${index + 1}`}
                onChange={(event) =>
                  onChange(setItem(index, event.target.value))
                }
                className={cn(inputClass, "h-8 text-[13px]")}
              />
            </ReorderableRow>
          ))
        )}
      </div>
      {items.length >= 3 ? (
        <BulkEditLines label={field.label} items={items} onChange={onChange} />
      ) : null}
      {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
    </div>
  );
}

/**
 * "Bulk edit lines" — a 4-row textarea bound newline-separated to the
 * array (typing re-parses: trims, drops empties). While focused the
 * draft is authoritative so mid-typing empty lines survive; unfocused it
 * renders the canonical list, so external row add/remove/reorder (which
 * blur the textarea first) always resyncs.
 */
function BulkEditLines({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState(items.join("\n"));
  const [focused, setFocused] = useState(false);

  return (
    <details className="group/bulk">
      <summary className="text-mute hover:text-ink team-focus mt-1 inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors [&::-webkit-details-marker]:hidden">
        Бөөнөөр засах
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 transition-transform group-open/bulk:rotate-180"
        />
      </summary>
      <textarea
        aria-label={`${label} — бөөнөөр засах`}
        rows={4}
        value={focused ? draft : items.join("\n")}
        placeholder="Нэг мөрөнд нэг утга"
        onFocus={() => {
          setDraft(items.join("\n"));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0),
          );
        }}
        className={cn(textareaClass, "mt-2 min-h-24 font-mono text-[13px]")}
      />
    </details>
  );
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

// ── Accordion object cards ───────────────────────────────────────────────────

function CardsEditor({
  field,
  idPrefix,
  items,
  onChange,
}: {
  field: Extract<CopyFieldDef, { kind: "cards" }>;
  idPrefix: string;
  items: Record<string, unknown>[];
  onChange: (next: Record<string, unknown>[]) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [drag, setDrag] = useState<DragState>({
    dragIndex: null,
    overIndex: null,
  });

  const patch = (index: number, key: string, next: unknown) =>
    onChange(
      items.map((item, i) => (i === index ? { ...item, [key]: next } : item)),
    );

  const atMax = field.max !== undefined && items.length >= field.max;
  const canRemove = items.length > (field.min ?? 1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{field.label}</FieldLabel>
        <PillButton
          disabled={atMax}
          onClick={() => {
            onChange([...items, field.newItem()]);
            setOpenIndex(items.length);
          }}
        >
          <Plus className="size-3.5" aria-hidden="true" /> Нэмэх
        </PillButton>
      </div>
      <div className="border-line bg-paper divide-line divide-y overflow-hidden rounded-md border">
        {items.map((item, index) => {
          const open = openIndex === index;
          const rawTitle = item[field.titleKey];
          const title =
            typeof rawTitle === "string" && rawTitle.length > 0
              ? rawTitle
              : `${field.itemLabel ?? "Бичлэг"} ${index + 1}`;
          return (
            <div
              key={`${idPrefix}-${index}`}
              className={cn(open && "bg-paper-soft/60")}
            >
              <ReorderableRow
                index={index}
                count={items.length}
                drag={drag}
                setDrag={setDrag}
                canRemove={canRemove}
                removeLabel={`${title} устгах`}
                onDropOn={(target) => {
                  if (drag.dragIndex !== null && drag.dragIndex !== target) {
                    onChange(moveItem(items, drag.dragIndex, target));
                    setOpenIndex(target);
                  }
                  setDrag({ dragIndex: null, overIndex: null });
                }}
                onMove={(delta) => {
                  const target = index + delta;
                  if (target >= 0 && target < items.length) {
                    onChange(moveItem(items, index, target));
                    setOpenIndex(target);
                  }
                }}
                onRemove={() => {
                  onChange(items.filter((_, i) => i !== index));
                  setOpenIndex(null);
                }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="text-mute hover:text-ink team-focus flex min-h-10 flex-1 items-center gap-2 rounded px-1 text-left transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-semibold tabular-nums transition-colors",
                      open ? "bg-ink text-paper" : "bg-paper-soft text-mute",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="font-display text-ink min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[0.02em] uppercase">
                    {title}
                  </span>
                  {open ? (
                    <span className="bg-ink text-paper rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-[0.06em] uppercase">
                      Засварлаж байна
                    </span>
                  ) : null}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "text-mute size-4 shrink-0 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
              </ReorderableRow>
              {open ? (
                <div className="border-line bg-paper-soft/60 border-t px-3 pt-3 pb-4">
                  <CopyFields
                    idPrefix={`${idPrefix}-${index}`}
                    fields={field.fields}
                    value={item}
                    onChange={(key, next) => patch(index, key, next)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="text-mute px-3 py-2 text-xs">Бичлэг байхгүй.</p>
        ) : null}
      </div>
      {field.help ? <FieldHelp>{field.help}</FieldHelp> : null}
    </div>
  );
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function StringControl({
  field,
  id,
  raw,
  onChange,
}: {
  field: Extract<CopyFieldDef, { kind: "text" | "textarea" | "url" | "color" }>;
  id: string;
  raw: unknown;
  onChange: (next: string) => void;
}) {
  const value = typeof raw === "string" ? raw : "";

  if (field.kind === "textarea") {
    const max = field.max;
    const atLimit = max !== undefined && value.length >= max;
    return (
      <div className="relative">
        <textarea
          id={id}
          value={value}
          rows={field.rows ?? 3}
          maxLength={max}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            textareaClass,
            "min-h-20",
            max !== undefined && "pr-14 pb-5",
          )}
        />
        {max !== undefined ? (
          <span
            aria-live="polite"
            className={cn(
              "absolute right-2.5 bottom-1.5 text-[12px] tabular-nums",
              atLimit ? "text-destructive" : "text-mute",
            )}
          >
            {value.length} / {max}
          </span>
        ) : null}
      </div>
    );
  }

  const looksLikeHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

  return (
    <div className="flex items-center gap-2">
      {field.kind === "color" ? (
        <span
          aria-hidden="true"
          className="border-line size-9 shrink-0 rounded-md border"
          style={looksLikeHex ? { backgroundColor: value } : undefined}
        />
      ) : null}
      <input
        id={id}
        type={field.kind === "url" ? "url" : "text"}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

// ── Shared row: drag handle, arrow buttons, remove ───────────────────────────

function ReorderableRow({
  index,
  count,
  drag,
  setDrag,
  canRemove,
  removeLabel,
  onDropOn,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  drag: DragState;
  setDrag: (next: DragState) => void;
  canRemove: boolean;
  removeLabel: string;
  onDropOn: (targetIndex: number) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  // The handle arms dragging (mousedown → draggable) so selecting text in
  // the row's inputs never starts a drag.
  const [armed, setArmed] = useState(false);

  return (
    <div
      draggable={armed}
      onDragStart={() => setDrag({ dragIndex: index, overIndex: null })}
      onDragOver={(event) => {
        event.preventDefault();
        if (drag.overIndex !== index) setDrag({ ...drag, overIndex: index });
      }}
      onDragLeave={() => {
        if (drag.overIndex === index) setDrag({ ...drag, overIndex: null });
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropOn(index);
      }}
      onDragEnd={() => {
        setArmed(false);
        setDrag({ dragIndex: null, overIndex: null });
      }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 transition-opacity",
        drag.dragIndex === index && "opacity-55",
        drag.overIndex === index &&
          drag.dragIndex !== index &&
          "ring-ink ring-2 ring-inset",
      )}
    >
      <span
        aria-hidden="true"
        onMouseDown={() => setArmed(true)}
        onMouseUp={() => setArmed(false)}
        onTouchStart={() => setArmed(true)}
        className="text-mute/60 hover:text-mute team-focus cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        title="Чирж дараалал өөрчлөх"
      >
        <GripVertical className="size-4" />
      </span>
      {children}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Дээш нь зөөх"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
        >
          <ChevronUp className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Доош нь зөөх"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={removeLabel}
          title={canRemove ? removeLabel : "Хамгийн багадаа нэг бичлэг үлдэнэ"}
          disabled={!canRemove}
          onClick={onRemove}
          className={buttonVariants({
            size: "icon-xs",
            variant: "destructive",
          })}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Small editorial pill button (TeamButton outline, mini). */
function PillButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase"
    >
      {children}
    </label>
  );
}

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-mute text-xs leading-relaxed">{children}</p>;
}
