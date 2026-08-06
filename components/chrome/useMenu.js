"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * The WAI-ARIA menu-button pattern, shared by the language and account menus.
 *
 * Behaviour it owns:
 *   - Escape closes and returns focus to the trigger
 *   - a pointer-down anywhere outside closes
 *   - opening moves focus to the first item (or the active one, if flagged)
 *   - Arrow/Home/End rove between items; Tab dismisses
 *
 * Focus order is read from the live DOM rather than a ref array, so items that
 * render conditionally can't desynchronise the index — and nothing has to
 * mutate a ref during render to keep it in step.
 */
export default function useMenu() {
  const [open, setOpen] = useState(false);

  const menuId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const items = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"], [role="menuitemradio"]') ?? []),
    []
  );

  const close = useCallback(({ restoreFocus = false } = {}) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Pointerdown rather than click: closing on click would fire after a
  // same-tick re-open, and pointerdown also catches drags starting outside.
  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) close();
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close({ restoreFocus: true });
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Land keyboard users inside the menu instead of stranding them on the
  // trigger. A checked item takes precedence, matching how native selects
  // open onto the current value.
  useEffect(() => {
    if (!open) return;
    const list = items();
    const checked = list.find((el) => el.getAttribute("aria-checked") === "true");
    (checked ?? list[0])?.focus();
  }, [open, items]);

  const onMenuKeyDown = useCallback(
    (event) => {
      const list = items();
      if (!list.length) return;

      const index = list.indexOf(document.activeElement);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        list[(index + delta + list.length) % list.length].focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        list[0].focus();
      } else if (event.key === "End") {
        event.preventDefault();
        list[list.length - 1].focus();
      } else if (event.key === "Tab") {
        // The menu is a transient overlay; tabbing out should dismiss it.
        close();
      }
    },
    [items, close]
  );

  return {
    open,
    close,
    toggle,
    menuId,
    rootRef,
    triggerRef,
    menuRef,
    onMenuKeyDown,
    /** Spread onto the trigger button. */
    triggerProps: {
      ref: triggerRef,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": open ? menuId : undefined,
      onClick: toggle,
    },
    /** Spread onto the menu container. */
    menuProps: {
      id: menuId,
      ref: menuRef,
      role: "menu",
      onKeyDown: onMenuKeyDown,
    },
  };
}
