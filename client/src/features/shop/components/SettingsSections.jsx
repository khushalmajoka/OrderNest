import { useRef } from "react";
import { useSearchParams } from "react-router-dom";

// Settings in sections, one shown at a time. The chosen one is kept in the
// address (?section=orders), so refresh and Back stay on it. All sections stay
// on the page (only hidden), so typing that is not saved yet is not lost when
// you look at another section.
//   sections: [{ id, label, content }]
const SettingsSections = ({ sections }) => {
  const [params, setParams] = useSearchParams();
  const tabs = useRef({});
  const current = sections.find((s) => s.id === params.get("section"))?.id || sections[0].id;

  const open = (id) => setParams({ section: id }, { replace: true });

  // Left / Right (and Home / End) move between the section buttons
  const onKeyDown = (e) => {
    const at = sections.findIndex((s) => s.id === current);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: sections.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const id = sections[(to + sections.length) % sections.length].id;
    open(id);
    tabs.current[id]?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label="Settings sections" className="mb-6 flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {sections.map((s) => (
          <button
            key={s.id}
            ref={(el) => (tabs.current[s.id] = el)}
            type="button"
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={s.id === current}
            aria-controls={`panel-${s.id}`}
            tabIndex={s.id === current ? 0 : -1}
            onClick={() => open(s.id)}
            className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium ${
              s.id === current ? "border-orange-700 bg-orange-700 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sections.map((s) => (
        <div key={s.id} role="tabpanel" id={`panel-${s.id}`} aria-labelledby={`tab-${s.id}`} hidden={s.id !== current}>
          {s.content}
        </div>
      ))}
    </>
  );
};

export default SettingsSections;
