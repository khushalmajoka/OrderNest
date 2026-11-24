import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ModalShell, { Field, inputClass } from "../../../common/components/ModalShell";
import { getErrorMessage } from "../../../common/utils/api";
import { DIM_UNITS, PRICE_UNITS, SIZE_KINDS, WEIGHT_UNITS } from "../utils/productOptions";
import { uploadPicture } from "../utils/pictures";
import PicturesField from "./PicturesField";

const blank = {
  name: "",
  kind: "none",
  weight: "",
  weightUnit: "kg",
  length: "",
  breadth: "",
  height: "",
  dimUnit: "inch",
  text: "",
  price: "",
  priceUnit: "piece",
  notes: "",
  category: "",
};

// The form values from a saved product
const fromProduct = (p) => ({
  name: p.name || "",
  kind: p.size?.kind || "none",
  weight: p.size?.weight ?? "",
  weightUnit: p.size?.weightUnit || "kg",
  length: p.size?.length ?? "",
  breadth: p.size?.breadth ?? "",
  height: p.size?.height ?? "",
  dimUnit: p.size?.dimUnit || "inch",
  text: p.size?.text || "",
  price: p.price ?? "",
  priceUnit: p.priceUnit || "piece",
  notes: p.notes || "",
  category: p.category || "",
});

// What is sent to the server
const toBody = (f, canSetPrice, canSetCategory) => {
  const size = { kind: f.kind };
  if (f.kind === "weight") Object.assign(size, { weight: f.weight, weightUnit: f.weightUnit });
  if (f.kind === "dimensions") {
    Object.assign(size, { length: f.length, breadth: f.breadth, height: f.height, dimUnit: f.dimUnit });
  }
  if (f.kind === "text") size.text = f.text;
  const body = { name: f.name, size, notes: f.notes };
  if (canSetCategory) body.category = f.category || null;
  if (canSetPrice) {
    body.price = f.price;
    body.priceUnit = f.priceUnit;
  }
  return body;
};

const num = "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400";

// "Add product" / "Edit product" window. Used by the Products page, and later
// by Create order ("+ New product").
//   product: the product being edited (none = a new one)
//   canSetPrice: this person may see and set prices
//   categories / canSetCategory: only the admin picks a category
//   onSaved(product): called after a good save
const ProductFormModal = ({ product, canSetPrice, categories = [], canSetCategory = false, onClose, onSaved, onPicturesChanged, defaultName = "" }) => {
  const start = product ? fromProduct(product) : { ...blank, name: defaultName };
  const [form, setForm] = useState(start);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState(product?.images || []); // saved pictures (changes are saved at once)
  const [pending, setPending] = useState([]); // pictures of a NEW product, saved with it
  const dirty = JSON.stringify(form) !== JSON.stringify(start) || pending.length > 0;
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = `${process.env.REACT_APP_BASE_URL}/api/products${product ? `/${product._id}` : ""}`;
      const res = await axios({
        method: product ? "put" : "post",
        url,
        data: toBody(form, canSetPrice, canSetCategory),
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // a new product: now save the pictures chosen for it
      let lost = 0;
      if (!product) {
        for (const picture of pending) {
          try {
            await uploadPicture(res.data.product._id, picture);
          } catch {
            lost += 1;
          }
        }
      }
      toast.success(product ? "Product saved." : "Product added.");
      if (lost) toast.error(`${lost} ${lost === 1 ? "picture" : "pictures"} could not be saved. Open Edit on the product to add ${lost === 1 ? "it" : "them"} again.`);
      onSaved(res.data.product);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the product."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={product ? "Edit product" : "Add product"} dirty={dirty} onClose={onClose} onSubmit={submit}>
      <Field label="Name">
        <input
          type="text"
          value={form.name}
          onChange={set("name")}
          placeholder="e.g. Chocolate Cake"
          required
          maxLength={100}
          className={inputClass}
          autoFocus={!product}
        />
      </Field>

      <Field label="Size" hint="(optional)">
        <select value={form.kind} onChange={set("kind")} className={inputClass} aria-label="Size type">
          {SIZE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>

      {form.kind === "weight" && (
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" min="0" step="any" value={form.weight} onChange={set("weight")} placeholder="e.g. 1" aria-label="Weight" className={num} required />
          <select value={form.weightUnit} onChange={set("weightUnit")} aria-label="Weight unit" className="border border-gray-300 p-2 rounded">
            {WEIGHT_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      )}

      {form.kind === "dimensions" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input type="number" inputMode="decimal" min="0" step="any" value={form.length} onChange={set("length")} placeholder="Length" aria-label="Length" className={num} required />
            <span className="text-gray-500">x</span>
            <input type="number" inputMode="decimal" min="0" step="any" value={form.breadth} onChange={set("breadth")} placeholder="Breadth" aria-label="Breadth" className={num} required />
            <span className="text-gray-500">x</span>
            <input type="number" inputMode="decimal" min="0" step="any" value={form.height} onChange={set("height")} placeholder="Height" aria-label="Height" className={num} />
          </div>
          <select value={form.dimUnit} onChange={set("dimUnit")} aria-label="Size unit" className="border border-gray-300 p-2 rounded">
            {DIM_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Height is optional. 10 x 8 is the same size as 8 x 10: it is always kept with the smaller number first.</p>
        </div>
      )}

      {form.kind === "text" && (
        <input type="text" value={form.text} onChange={set("text")} placeholder="e.g. Large" aria-label="Size text" maxLength={60} className={inputClass} required />
      )}

      {canSetPrice && (
        <Field label="Price" hint="(the usual price; you can change it for each order)">
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={set("price")} placeholder="₹" aria-label="Price" className={num} />
            <select value={form.priceUnit} onChange={set("priceUnit")} aria-label="Price is for" className="border border-gray-300 p-2 rounded">
              {PRICE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </Field>
      )}

      {canSetCategory && (
        <Field label="Category" hint="(optional, you make the categories on this page)">
          <select value={form.category} onChange={set("category")} className={inputClass} aria-label="Category">
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}
      <div role="group" aria-label="Pictures">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Pictures<span className="font-normal text-gray-400"> (optional)</span>
        </span>
        <PicturesField
          productId={product?._id || null}
          images={images}
          onImages={setImages}
          pending={pending}
          onPending={setPending}
          onChanged={onPicturesChanged}
        />
      </div>
      <Field label="Notes" hint="(optional, e.g. price changes with the design)">
        <textarea value={form.notes} onChange={set("notes")} rows={3} maxLength={300} className={inputClass} />
      </Field>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-60">
          {saving ? "Saving..." : product ? "Save" : "Add product"}
        </button>
      </div>
    </ModalShell>
  );
};

export default ProductFormModal;
