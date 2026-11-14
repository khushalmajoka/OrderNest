import { useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { SHOP_CATEGORIES } from "../constants";
import { getShopLogo } from "../../../common/utils/utils";
import { getErrorMessage } from "../../../common/utils/api";
import { shrinkLogo } from "../utils/shrinkLogo";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
  </label>
);

// Settings card (admin): the shop's own details. They show in the top bar and
// are printed on every delivery slip.
const ShopProfileCard = ({ shop, onSaved }) => {
  const start = {
    name: shop.name || "",
    phone: shop.phone || "",
    address: shop.address || "",
    category: shop.category || "",
    logo: shop.logo || "",
  };
  const saved = useRef(start); // what the server has now
  const [form, setForm] = useState(start);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const changed = JSON.stringify(form) !== JSON.stringify(saved.current);

  // An older shop may have a category that is not in today's list
  const categories = SHOP_CATEGORIES.includes(form.category) || !form.category
    ? SHOP_CATEGORIES
    : [form.category, ...SHOP_CATEGORIES];

  const handlePicture = async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // so the same picture can be chosen again
    if (!file) return;
    try {
      // Phone photos are huge; a small copy is all the app needs
      set("logo", await shrinkLogo(file));
    } catch {
      toast.error("Could not use this picture. Please choose another image.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/profile`,
        {
          name: form.name,
          phone: form.phone,
          address: form.address,
          category: form.category,
          // only when the picture was changed or removed
          ...(form.logo !== saved.current.logo ? { logo: form.logo } : {}),
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const s = res.data.shop;
      const now = {
        name: s.name || "",
        phone: s.phone || "",
        address: s.address || "",
        category: s.category || "",
        logo: s.logo || "",
      };
      saved.current = now;
      setForm(now);
      toast.success("Shop details saved.");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the shop details."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Shop details</h2>
      <p className="text-sm text-gray-600 mb-4">
        Your shop's name, logo, phone and address. They show at the top of the
        app and on every delivery slip.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <img
          src={getShopLogo({ logo: form.logo })}
          alt="Shop logo"
          className="w-20 h-20 shrink-0 rounded-full border border-orange-300 object-cover"
        />
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => fileInput.current.click()}
            className="px-3 py-2 rounded-md border border-orange-500 text-orange-600 text-sm hover:bg-orange-50"
          >
            {form.logo ? "Change logo" : "Add logo"}
          </button>
          {form.logo && (
            <button
              type="button"
              onClick={() => set("logo", "")}
              className="text-sm text-gray-600 underline"
            >
              Remove logo
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={handlePicture}
            className="hidden"
            aria-label="Choose a logo picture"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Field label="Shop name">
          <input
            type="text"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Category">
          <select
            required
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Shop phone number">
          <input
            type="tel"
            inputMode="tel"
            required
            value={form.phone}
            onChange={(e) => set("phone", e.target.value.replace(/[^\d+\s\-()]/g, ""))}
            className={inputClass}
          />
        </Field>

        <Field label="Shop address (optional)">
          <textarea
            rows={2}
            maxLength={300}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving || !changed}
          className="px-5 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

export default ShopProfileCard;
