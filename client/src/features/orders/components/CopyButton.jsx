import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

// Puts text on the clipboard. Falls back to the old way when the browser does
// not allow the new one (for example on a page without https).
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(box);
      return ok;
    } catch {
      return false;
    }
  }
};

// A small "copy" icon next to a value (Order ID, phone, address). One click
// copies it and the icon turns into a green tick for a moment. It shows when
// the row is hovered or the button has the keyboard focus (always on touch
// screens, which cannot hover). Place it inside an element with the
// `group/row` class.
const CopyButton = ({ text, label }) => {
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        if (await copyText(text)) {
          setDone(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1500);
        }
      }}
      aria-label={done ? `${label} copied` : `Copy ${label}`}
      title={done ? "Copied" : `Copy ${label}`}
      className={`inline-flex align-middle ml-1 p-1 rounded text-gray-500 hover:bg-black/10 hover:text-gray-800 focus:opacity-100 transition-opacity ${
        done
          ? "opacity-100 text-green-600"
          : "opacity-0 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
      }`}
    >
      {done ? (
        <Check size={14} strokeWidth={3} className="animate-pop motion-reduce:animate-none" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
};

export default CopyButton;
