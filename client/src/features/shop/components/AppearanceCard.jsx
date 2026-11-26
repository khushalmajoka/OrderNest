import { useState } from "react";
import { THEMES, getTheme, setTheme } from "../../../common/utils/theme";

// Choose the look. Changes at once, for this device only.
const AppearanceCard = () => {
  const [chosen, setChosen] = useState(getTheme);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow border border-stone-200">
      <h2 className="text-lg font-semibold text-gray-800">Appearance</h2>
      <p className="text-sm text-gray-600 mt-1 mb-3">
        Choose how the app looks on this phone or computer. Other people keep their own choice. Delivery slips and share
        pictures always stay light.
      </p>
      <div role="radiogroup" aria-label="Appearance" className="space-y-2">
        {THEMES.map((t) => (
          <label
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border p-3 min-h-[44px] cursor-pointer ${
              chosen === t.id ? "border-orange-500 bg-orange-50" : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              name="appearance"
              value={t.id}
              checked={chosen === t.id}
              onChange={() => {
                setChosen(t.id);
                setTheme(t.id);
              }}
              className="mt-1 accent-orange-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">{t.label}</span>
              <span className="block text-xs text-gray-600">{t.note}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default AppearanceCard;
