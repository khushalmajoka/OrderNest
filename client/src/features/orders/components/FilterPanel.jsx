import { useState } from "react";
import { EMPTY_FILTERS, STATUSES } from "../utils/filters";

const inputClass =
  "w-full min-w-0 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const Section = ({ title, children }) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-semibold text-gray-700 mb-1">{title}</legend>
    {children}
  </fieldset>
);

// Two boxes in a row: "from" and "to"
const Pair = ({ label, a, b, draft, set, type = "number", placeholders }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <div className="grid grid-cols-2 gap-2">
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? 0 : undefined}
        aria-label={`${label} ${placeholders?.[0] || "from"}`}
        placeholder={placeholders?.[0]}
        value={draft[a]}
        onChange={(e) => set(a, e.target.value)}
        className={inputClass}
      />
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? 0 : undefined}
        aria-label={`${label} ${placeholders?.[1] || "to"}`}
        placeholder={placeholders?.[1]}
        value={draft[b]}
        onChange={(e) => set(b, e.target.value)}
        className={inputClass}
      />
    </div>
  </div>
);

const Text = ({ label, name, draft, set }) => (
  <label className="block">
    <span className="text-xs text-gray-500">{label}</span>
    <input
      type="text"
      value={draft[name]}
      onChange={(e) => set(name, e.target.value)}
      className={`${inputClass} mt-1`}
    />
  </label>
);

// The filter window. Choices are only applied when "Show orders" is pressed.
const FilterPanel = ({ filters, onApply, onClose }) => {
  const [draft, setDraft] = useState(filters);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleStatus = (status) =>
    set(
      "status",
      draft.status.includes(status)
        ? draft.status.filter((s) => s !== status)
        : [...draft.status, status]
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply(draft);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-xl sm:rounded-lg shadow-lg"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Filter orders</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-800 px-2"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          <Section title="Status">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => {
                const on = draft.status.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1.5 rounded-full border text-sm ${
                      on
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white border-gray-300 text-gray-700"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Quick filters">
            {[
              ["overdue", "Overdue (delivery date passed, not delivered)"],
              ["hasBalance", "Balance still to collect"],
              ["noPhone", "Phone number missing"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                {label}
              </label>
            ))}
          </Section>

          <Section title="Amount (₹)">
            <Pair label="Total" a="totalMin" b="totalMax" draft={draft} set={set} placeholders={["Min", "Max"]} />
            <Pair label="Advance" a="advanceMin" b="advanceMax" draft={draft} set={set} placeholders={["Min", "Max"]} />
            <Pair label="Balance" a="balanceMin" b="balanceMax" draft={draft} set={set} placeholders={["Min", "Max"]} />
          </Section>

          <Section title="Dates">
            <Pair label="Expected delivery" a="deliveryFrom" b="deliveryTo" draft={draft} set={set} type="date" />
            <Pair label="Order created" a="createdFrom" b="createdTo" draft={draft} set={set} type="date" />
          </Section>

          <Section title="Order number">
            <Pair
              label="Order number (the running number in the ID)"
              a="orderNoFrom"
              b="orderNoTo"
              draft={draft}
              set={set}
              placeholders={["From", "To"]}
            />
            <Text label="Order ID contains" name="orderId" draft={draft} set={set} />
          </Section>

          <Section title="Details contain">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Text label="Customer name" name="customer" draft={draft} set={set} />
              <Text label="Product" name="item" draft={draft} set={set} />
              <Text label="Phone" name="phone" draft={draft} set={set} />
              <Text label="Order executive" name="executive" draft={draft} set={set} />
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t">
          <button
            type="button"
            onClick={() => setDraft(EMPTY_FILTERS)}
            className="px-3 py-2 text-sm text-gray-600 underline"
          >
            Clear all
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600"
          >
            Show orders
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterPanel;
