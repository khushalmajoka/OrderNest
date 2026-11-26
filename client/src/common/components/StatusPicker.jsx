import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { statusHint, statusLabel } from "../../features/orders/utils/statusInfo";

// Choosing a status: a list where every status shows its short name AND a
// grey line saying what it means. It replaces the plain drop-down box (which
// cannot show a hint under each choice).
//  - mouse / finger: tap the box, tap a status
//  - keyboard: Down / Up open and move, Enter chooses, Esc closes (the first
//    Esc only closes the list; it does not cancel the whole edit)
//  - Enter on the closed box = the same as in the other edit boxes (save)
const StatusPicker = ({ value, options, onChange, onEnter, large = false, label = "Status", buttonText, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState(null);
  const button = useRef(null);
  const list = useRef(null);

  const close = (focusBack = true) => {
    setOpen(false);
    if (focusBack) button.current?.focus();
  };

  // Place the list under the box (or above it when there is no room below)
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const r = button.current.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const goUp = below < 220 && above > below;
    setBox({
      left,
      width,
      maxHeight: Math.max(160, Math.min(360, goUp ? above : below)),
      ...(goUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    setActive(Math.max(0, options.indexOf(value)));
    const outside = (e) => {
      if (!list.current?.contains(e.target) && !button.current?.contains(e.target)) setOpen(false);
    };
    const away = () => setOpen(false);
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // keep the highlighted choice in view
  useEffect(() => {
    if (open) list.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  const choose = (status) => {
    onChange(status);
    close();
  };

  const onKeyDown = (e) => {
    if (open) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        choose(options[active]);
      } else if (e.key === "Tab") {
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const size = large ? "min-h-[44px] px-3 py-2 text-base" : "h-8 px-2 text-sm";

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={value ? statusHint(value) : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={
          compact
            ? "flex items-center gap-1 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm px-3 py-1.5 min-h-[36px] hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            : `w-full flex items-center justify-between gap-1 border border-gray-300 rounded bg-white text-gray-900 text-left focus:outline-none focus:ring-2 focus:ring-orange-400 ${size}`
        }
      >
        <span className="truncate">{buttonText || statusLabel(value)}</span>
        <ChevronDown size={16} className="shrink-0 text-gray-500" aria-hidden="true" />
      </button>

      {open &&
        box &&
        createPortal(
          <ul
            ref={list}
            role="listbox"
            aria-label={label}
            style={{ position: "fixed", zIndex: 70, overflowY: "auto", ...box }}
            className="bg-white border border-gray-300 rounded-lg shadow-xl py-1"
          >
            {options.map((status, i) => (
              <li
                key={status}
                role="option"
                aria-selected={status === value}
                data-value={status}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(status)}
                className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${i === active ? "bg-stone-100" : ""}`}
              >
                <span className="w-4 shrink-0 mt-0.5 text-orange-700">
                  {value && status === value && <Check size={16} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{statusLabel(status)}</span>
                  <span className="block text-xs text-gray-500">{statusHint(status)}</span>
                </span>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
};

export default StatusPicker;
