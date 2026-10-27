import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PANEL_DEFINITIONS } from "../dashboardPreferences";
import { Icon } from "./Icon";

export function PanelSettings({
  visible,
  focused,
  onToggle,
  onReset,
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const menu = useRef(null);
  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);
  const close = useCallback(
    (returnFocus = false) => {
      onOpenChange?.(false);
      setOpen(false);
      if (returnFocus) button.current?.focus({ preventScroll: true });
    },
    [onOpenChange],
  );
  useLayoutEffect(() => {
    if (!open || focused) return;
    const element = menu.current;
    const position = () => {
      const rect = button.current.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 24);
      const height = Math.min(element.scrollHeight, window.innerHeight - 24);
      const top =
        rect.bottom + 8 + height <= window.innerHeight - 12
          ? rect.bottom + 8
          : Math.max(12, rect.top - height - 8);
      Object.assign(element.style, {
        width: `${width}px`,
        left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
        top: `${Math.max(12, Math.min(top, window.innerHeight - height - 12))}px`,
        maxHeight: `${window.innerHeight - 24}px`,
      });
    };
    element.showPopover?.();
    position();
    element.querySelector("input")?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      element.hidePopover?.();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, focused]);
  useEffect(() => {
    if (!open || focused) return;
    const outside = (event) => {
      if (
        !menu.current?.contains(event.target) &&
        !button.current?.contains(event.target)
      )
        close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, focused, close]);
  return (
    <div className="panel-settings">
      <button
        ref={button}
        type="button"
        className="secondary-button"
        aria-expanded={open && !focused}
        aria-controls="panel-options"
        disabled={Boolean(focused)}
        title={
          focused
            ? "Restaura el panel para personalizar la disposición"
            : "Personalizar paneles"
        }
        onClick={() => {
          onOpenChange?.(!open);
          setOpen(!open);
        }}
      >
        <Icon name="panels" /> PANELES
      </button>
      {open &&
        !focused &&
        createPortal(
          <div
            ref={menu}
            id="panel-options"
            popover={
              typeof HTMLElement.prototype.showPopover === "function"
                ? "manual"
                : undefined
            }
            className="panel-options"
            role="group"
            aria-label="Personalizar paneles"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                event.preventDefault();
                close(true);
              }
              if (event.key === "Tab") {
                const controls = [
                  ...menu.current.querySelectorAll("input,button"),
                ];
                if (
                  (!event.shiftKey && event.target === controls.at(-1)) ||
                  (event.shiftKey && event.target === controls[0])
                ) {
                  event.preventDefault();
                  close(true);
                }
              }
            }}
          >
            <strong>PANELES VISIBLES</strong>
            {PANEL_DEFINITIONS.map(({ id, label }) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={visible[id]}
                  onChange={() => onToggle(id)}
                />
                {label}
              </label>
            ))}
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                onReset();
                close(true);
              }}
            >
              Restablecer disposición
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
