import { useEffect, useId, useRef } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// The frame of a form window (Create / Edit order): dark backdrop, white card,
// title with a back arrow.
//
// Closing rules, so typed text is never lost by accident:
//  - the "←" and Cancel buttons always close it (the caller does that);
//  - tapping the dark area or pressing Escape closes it ONLY while nothing has
//    been typed or changed (`dirty` is false).
// It also locks the page behind it from scrolling, moves the keyboard focus into
// the window, and keeps Tab inside it.
const ModalShell = ({ title, dirty, onClose, onSubmit, children }) => {
  const formRef = useRef(null);
  const titleId = useId();
  // Escape listener always sees the newest values without re-attaching
  const latest = useRef({ dirty, onClose });
  latest.current = { dirty, onClose };

  // Lock the page behind the window; put focus inside it (the card itself,
  // so no keyboard pops up on a phone)
  useEffect(() => {
    const previous = document.body.style.overflow;
    const returnTo = document.activeElement;
    document.body.style.overflow = "hidden";
    formRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
      if (returnTo && document.contains(returnTo)) returnTo.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // The date picker's own calendar handles its own Escape
      if (document.querySelector(".MuiPickersPopper-root, .MuiPopper-root")) return;
      if (!latest.current.dirty) latest.current.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Tab / Shift+Tab wrap around inside the window
  const keepFocusInside = (e) => {
    if (e.key !== "Tab") return;
    const form = formRef.current;
    if (!form || !form.contains(document.activeElement)) return;
    const items = [...form.querySelectorAll("input, select, textarea, button:not([disabled])")].filter(
      (el) => el.offsetParent !== null && el.tabIndex !== -1
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === form)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        // Only a tap on the dark area itself (not inside the card, not on the
        // date picker's calendar), and only if nothing was typed
        if (e.target === e.currentTarget && !dirty) onClose();
      }}
    >
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onSubmit={onSubmit}
        onKeyDown={keepFocusInside}
        className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 relative outline-none"
      >
        <h2 id={titleId} className="text-xl font-bold text-center text-gray-800">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute left-3 sm:left-7 text-gray-600 hover:text-black px-2"
          >
            ←
          </button>
          {title}
        </h2>
        {/* Needed by the date box inside; only these windows use dates, so it
            lives here and not at the top of the whole app */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
      </form>
    </div>
  );
};

// A box with its name written above it (the name stays visible after typing,
// unlike a placeholder).
export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {hint && <span className="font-normal text-gray-400"> {hint}</span>}
    </span>
    {children}
  </label>
);

export const inputClass =
  "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400";

export default ModalShell;
