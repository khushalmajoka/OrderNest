import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

const MENU_WIDTH = 184;
const GAP = 6;

// The "⋮" button at the end of an order row and the small menu it opens.
// items: [{ key, label, icon, onClick, danger }]. The menu is drawn on the
// page itself (not inside the table), so the table can never cut it off.
const RowActionsMenu = ({ items, label = "More actions" }) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null); // null = closed
  const openedAt = useRef(0);

  const close = () => setPosition(null);

  const open = () => {
    openedAt.current = Date.now();
    const rect = buttonRef.current.getBoundingClientRect();
    const height = items.length * 38 + 16; // close enough to decide up or down
    const fitsBelow = rect.bottom + GAP + height <= window.innerHeight;
    setPosition({
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      top: fitsBelow ? rect.bottom + GAP : Math.max(8, rect.top - GAP - height),
    });
  };

  // While open: close on outside click, Escape, scroll or resize
  useEffect(() => {
    if (!position) return undefined;

    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // Scrolling closes the menu (it would drift away from its row), except a
    // scroll that happens in the first moment, e.g. the browser nudging the
    // button into view as it is tapped
    const onScroll = () => {
      if (Date.now() - openedAt.current > 250) close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  // Keyboard: focus the first item when opened, arrows move between items
  useEffect(() => {
    if (position) menuRef.current?.querySelector("button")?.focus();
  }, [position]);

  const onMenuKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = [...menuRef.current.querySelectorAll("button")];
    const at = buttons.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? (at + 1) % buttons.length : (at - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (position ? close() : open())}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        aria-label={label}
        title={label}
        className={`p-1.5 rounded-md text-gray-600 hover:bg-black/10 ${position ? "bg-black/10" : ""}`}
      >
        <MoreVertical size={18} />
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={onMenuKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", left: position.left, top: position.top, width: MENU_WIDTH }}
            className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
          >
            {items.map((item, index) => (
              <div key={item.key}>
                {item.danger && index > 0 && <div className="my-1 border-t border-gray-100" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    item.onClick();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    item.danger ? "text-red-600" : "text-gray-800"
                  }`}
                >
                  <item.icon size={16} className="shrink-0" />
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default RowActionsMenu;
