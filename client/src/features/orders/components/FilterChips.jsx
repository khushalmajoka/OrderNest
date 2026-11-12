import { X } from "lucide-react";
import { filterChips } from "../utils/filters";

// The filters that are switched on, each with an X to remove it.
const FilterChips = ({ filters, onChange, onClearAll }) => {
  const chips = filterChips(filters);
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 max-w-full pl-3 pr-1 py-1 rounded-full bg-orange-100 text-orange-800 text-sm"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={() => onChange({ ...filters, ...chip.clear })}
            className="p-1 rounded-full hover:bg-orange-200"
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-sm text-orange-700 underline px-1"
      >
        Clear all
      </button>
    </div>
  );
};

export default FilterChips;
