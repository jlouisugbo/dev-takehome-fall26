"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

interface MenuPos {
  top: number;
  left: number;
  minWidth: number;
  maxHeight: number;
}

export default function Dropdown<T extends string = string>({
  value,
  options,
  onChange,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function syncPosition() {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 4;
      const pad = 8;
      const minWidth = Math.max(rect.width, 140);
      const estimatedHeight = options.length * 36 + 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - pad;
      const spaceAbove = rect.top - gap - pad;
      const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const maxHeight = Math.max(96, openUpward ? spaceAbove : spaceBelow);
      const menuHeight = Math.min(estimatedHeight, maxHeight);
      const top = openUpward
        ? rect.top - gap - menuHeight
        : rect.bottom + gap;
      const maxLeft = window.innerWidth - minWidth - pad;
      const left = Math.min(Math.max(pad, rect.left), Math.max(pad, maxLeft));
      setPos({ top, left, minWidth, maxHeight });
    }

    syncPosition();
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);
    return () => {
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && pos
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
              maxHeight: pos.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-y-auto rounded-md border border-gray-stroke bg-white py-1 shadow-lg"
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`w-full px-3 py-1.5 text-left text-sm ${
                      active
                        ? "bg-primary-fill text-primary"
                        : "text-gray-text-dark hover:bg-gray-fill"
                    }`}
                    onClick={() => {
                      setOpen(false);
                      if (opt.value !== value) onChange(opt.value);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm disabled:opacity-50"
      >
        <span>{selected?.label ?? value}</span>
        <span className="text-[10px] text-gray-text" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}
