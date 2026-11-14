import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { inputClass } from "./ModalShell";

const ADD_NEW = "__add_new__";

// "Order executive": pick a name from the list (every name used on this shop's
// orders so far, the owner and the staff). No free typing in the box itself;
// a name that is not in the list is added with "Add a new name" and from then
// on is part of the list.
//   value / onChange(name): the chosen name ("" = none yet)
//   shopId: where to load the list from
//   preferred: the name to select at the start when nothing is chosen yet
//   onDefault(name): called for that first automatic choice (not a change by the user)
const ExecutivePicker = ({ shopId, value, onChange, onDefault, preferred = "" }) => {
  const [names, setNames] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const addBox = useRef(null);
  const preferredNow = useRef(preferred);
  preferredNow.current = preferred;

  useEffect(() => {
    if (!shopId) return undefined;
    const controller = new AbortController();
    axios
      .get(`${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shopId}/executives`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal,
      })
      .then((res) => setNames(res.data.names || []))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        console.error("Could not load the names:", err);
        // The list could not be loaded: at least offer the logged-in person's
        // name, so an order can still be made ("+ Add a new name" works too)
        if (preferredNow.current) setNames([preferredNow.current]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [shopId]);

  // The list as shown: the loaded names, plus the current value (an old order
  // may have a name that is not in the list any more)
  const shown = [...names];
  const has = (name) => shown.some((n) => n.toLowerCase() === name.toLowerCase());
  if (value && !has(value)) shown.push(value);
  shown.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  // Nothing chosen yet: start with the logged-in person's name, if it is in the list
  useEffect(() => {
    if (loaded && !value && preferred && has(preferred)) {
      (onDefault || onChange)(shown.find((n) => n.toLowerCase() === preferred.toLowerCase()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (adding) addBox.current?.focus();
  }, [adding]);

  const confirmNew = () => {
    const name = draft.trim().replace(/\s+/g, " ");
    if (!name) return;
    // Same name in other capital letters: use the one already in the list
    const existing = shown.find((n) => n.toLowerCase() === name.toLowerCase());
    const chosen = existing || name;
    if (!existing) setNames((list) => [...list, chosen]);
    onChange(chosen);
    setDraft("");
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          ref={addBox}
          type="text"
          value={draft}
          maxLength={100}
          placeholder="New name"
          aria-label="New order executive name"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmNew();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setAdding(false);
            }
          }}
          className={`${inputClass} min-w-0`}
        />
        <button
          type="button"
          onClick={confirmNew}
          disabled={!draft.trim()}
          className="px-3 min-h-[44px] sm:min-h-0 rounded bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setAdding(false);
          }}
          className="px-3 min-h-[44px] sm:min-h-0 rounded border hover:bg-gray-100"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <select
      name="orderExecutive"
      aria-label="Order executive"
      required
      value={value || ""}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) setAdding(true);
        else onChange(e.target.value);
      }}
      className={inputClass}
    >
      <option value="" disabled>
        {loaded ? "Choose a name" : "Loading names..."}
      </option>
      {shown.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value={ADD_NEW}>+ Add a new name...</option>
    </select>
  );
};

export default ExecutivePicker;
