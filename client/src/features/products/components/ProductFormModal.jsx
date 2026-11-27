import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import ModalShell, { Field, inputClass } from "../../../common/components/ModalShell";
import { getErrorMessage } from "../../../common/utils/api";
import { DIM_UNITS, PRICE_UNITS, SIZE_KINDS, WEIGHT_UNITS } from "../utils/productOptions";
import { uploadPicture } from "../utils/pictures";
import PicturesField from "./PicturesField";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const num = "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-400";

let counter = 0;
const newRow = () => ({
  key: `new${(counter += 1)}`,
  id: null,
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
  removed: false,
  orig: "",
});

// what can be changed in a size line (to know if it was changed)
const snap = (r) => JSON.stringify([r.kind, r.weight, r.weightUnit, r.length, r.breadth, r.height, r.dimUnit, r.text, r.price, r.priceUnit]);

const rowFromSize = (p) => {
  const row = {
    key: p._id,
    id: p._id,
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
    removed: false,
  };
  return { ...row, orig: snap(row) };
};

// what is sent to the server for one size line
const sizeBody = (r, canSetPrice) => {
  const size = { kind: r.kind };
  if (r.kind === "weight") Object.assign(size, { weight: r.weight, weightUnit: r.weightUnit });
  if (r.kind === "dimensions") Object.assign(size, { length: r.length, breadth: r.breadth, height: r.height, dimUnit: r.dimUnit });
  if (r.kind === "text") size.text = r.text;
  const body = { size };
  if (canSetPrice) {
    body.price = r.price;
    body.priceUnit = r.priceUnit;
  }
  return body;
};

// One size of the product: its size and its price
const SizeRow = ({ row, index, canSetPrice, canRemove, onChange, onRemove }) => {
  const set = (field) => (e) => onChange({ ...row, [field]: e.target.value });
  const n = index + 1;
  return (
    <li className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2" aria-label={`Size ${n}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">Size {n}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove size ${n}`} className="flex items-center gap-1 px-2 py-1 min-h-[36px] rounded text-sm text-red-700 hover:bg-red-50">
            <Trash2 size={16} /> Remove
          </button>
        )}
      </div>
      <select value={row.kind} onChange={set("kind")} className={inputClass} aria-label={`Size ${n} type`}>
        {SIZE_KINDS.map((k) => (
          <option key={k.value} value={k.value}>{k.label}</option>
        ))}
      </select>

      {row.kind === "weight" && (
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" min="0" step="any" value={row.weight} onChange={set("weight")} placeholder="e.g. 1" aria-label={`Size ${n} weight`} className={num} required />
          <select value={row.weightUnit} onChange={set("weightUnit")} aria-label={`Size ${n} weight unit`} className="border border-gray-300 p-2 rounded">
            {WEIGHT_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      )}

      {row.kind === "dimensions" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input type="number" inputMode="decimal" min="0" step="any" value={row.length} onChange={set("length")} placeholder="Length" aria-label={`Size ${n} length`} className={num} required />
            <span className="text-gray-500">x</span>
            <input type="number" inputMode="decimal" min="0" step="any" value={row.breadth} onChange={set("breadth")} placeholder="Breadth" aria-label={`Size ${n} breadth`} className={num} required />
            <span className="text-gray-500">x</span>
            <input type="number" inputMode="decimal" min="0" step="any" value={row.height} onChange={set("height")} placeholder="Height" aria-label={`Size ${n} height`} className={num} />
          </div>
          <select value={row.dimUnit} onChange={set("dimUnit")} aria-label={`Size ${n} unit`} className="border border-gray-300 p-2 rounded">
            {DIM_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Height is optional. 10 x 8 is the same size as 8 x 10: it is kept with the smaller number first.</p>
        </div>
      )}

      {row.kind === "text" && (
        <input type="text" value={row.text} onChange={set("text")} placeholder="e.g. Large" aria-label={`Size ${n} text`} maxLength={60} className={inputClass} required />
      )}

      {canSetPrice && (
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" min="0" step="any" value={row.price} onChange={set("price")} placeholder="Price ₹" aria-label={`Size ${n} price`} className={num} />
          <select value={row.priceUnit} onChange={set("priceUnit")} aria-label={`Size ${n} price is for`} className="border border-gray-300 p-2 rounded">
            {PRICE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
};

// "Add product" / "Edit product" window. A product has a name, category, pictures and
// notes, and its sizes inside it (each size with its own price). A product without a size
// (a Mug) has one line with "No size" and its price.
//   family: the product being edited (none = a new one); sizes: its size records
//   canSetPrice: this person may see and set prices; canSetCategory: admin only
//   onSaved(): after a good save;  onPicturesChanged(): a picture was added or removed
const ProductFormModal = ({ family, sizes = [], canSetPrice, categories = [], canSetCategory = false, onClose, onSaved, onPicturesChanged }) => {
  const isNew = !family;
  const start = () => ({
    name: family?.name || "",
    category: family?.category || "",
    notes: family?.notes || "",
    inCatalog: Boolean(family?.inCatalog),
    rows: isNew ? [newRow()] : sizes.filter((s) => s.active !== false).map(rowFromSize),
  });
  const [initial] = useState(start);
  const [form, setForm] = useState({ name: initial.name, category: initial.category, notes: initial.notes, inCatalog: initial.inCatalog });
  const [rows, setRows] = useState(initial.rows.length ? initial.rows : [newRow()]);
  const [images, setImages] = useState(family?.images || []);
  const [pending, setPending] = useState([]); // pictures of a NEW product, saved with it
  const [saving, setSaving] = useState(false);

  const dirty =
    form.name !== initial.name || form.category !== initial.category || form.notes !== initial.notes || form.inCatalog !== initial.inCatalog || pending.length > 0 ||
    rows.length !== initial.rows.length || rows.some((r) => r.removed || !r.id || snap(r) !== r.orig);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const live = rows.filter((r) => !r.removed);
  const removedCount = rows.filter((r) => r.removed && r.id).length;
  const change = (key, next) => setRows((list) => list.map((r) => (r.key === key ? next : r)));
  const remove = (r) => setRows((list) => (r.id ? list.map((x) => (x.key === r.key ? { ...x, removed: true } : x)) : list.filter((x) => x.key !== r.key)));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (live.length === 0) return toast.error("A product needs at least one size. To hide the whole product, use Archive on the Products page.");
    setSaving(true);
    const work = rows.map((r) => ({ ...r }));
    try {
      if (isNew) {
        const res = await axios.post(
          `${API}/api/products/families`,
          { name: form.name, notes: form.notes, inCatalog: form.inCatalog, ...(canSetCategory ? { category: form.category || null } : {}), sizes: live.map((r) => sizeBody(r, canSetPrice)) },
          { headers: headers() }
        );
        let lost = 0;
        for (const picture of pending) {
          try {
            await uploadPicture(res.data.family._id, picture);
          } catch {
            lost += 1;
          }
        }
        toast.success("Product added.");
        if (lost) toast.error(`${lost} ${lost === 1 ? "picture" : "pictures"} could not be saved. Open Edit on the product to add ${lost === 1 ? "it" : "them"} again.`);
        onSaved();
        return;
      }
      // the name, notes and category of the product first, then each size line
      await axios.put(
        `${API}/api/products/families/${family._id}`,
        {
          name: form.name,
          notes: form.notes,
          ...(form.inCatalog !== initial.inCatalog ? { inCatalog: form.inCatalog } : {}),
          ...(canSetCategory ? { category: form.category || null } : {}),
        },
        { headers: headers() }
      );
      for (const r of work) {
        if (r.removed && r.id) {
          await axios.put(`${API}/api/products/${r.id}`, { active: false }, { headers: headers() });
          r.id = null; // done: it is archived
          r.gone = true;
        } else if (r.removed) {
          continue;
        } else if (r.id && snap(r) !== r.orig) {
          await axios.put(`${API}/api/products/${r.id}`, sizeBody(r, canSetPrice), { headers: headers() });
          r.orig = snap(r);
        } else if (!r.id) {
          const res = await axios.post(`${API}/api/products`, { family: family._id, ...sizeBody(r, canSetPrice) }, { headers: headers() });
          r.id = res.data.product._id;
          r.orig = snap(r);
        }
      }
      toast.success("Product saved.");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the product."));
      // keep what was saved so far, so a second try does not repeat it
      setRows(work.filter((r) => !r.gone));
      onPicturesChanged?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={isNew ? "Add product" : "Edit product"} dirty={dirty} onClose={onClose} onSubmit={submit}>
      <Field label="Product name" hint="(one name for all its sizes, like Frame)">
        <input type="text" value={form.name} onChange={set("name")} placeholder="e.g. Frame" required maxLength={100} className={inputClass} autoFocus={isNew} />
      </Field>

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
          Pictures<span className="font-normal text-gray-500"> (optional, of the whole product)</span>
        </span>
        <PicturesField productId={family?._id || null} images={images} onImages={setImages} pending={pending} onPending={setPending} onChanged={onPicturesChanged} />
      </div>

      <Field label="Notes" hint="(optional, e.g. price changes with the design)">
        <textarea value={form.notes} onChange={set("notes")} rows={3} maxLength={300} className={inputClass} />
      </Field>

      <label className="flex items-start gap-3 min-h-[44px]">
        <input
          type="checkbox"
          checked={form.inCatalog}
          onChange={(e) => setForm((f) => ({ ...f, inCatalog: e.target.checked }))}
          className="w-5 h-5 mt-0.5 accent-orange-500 shrink-0"
        />
        <span className="text-sm text-gray-800">
          <span className="font-medium">Show in catalog</span>
          <span className="block text-gray-600">Customers with your catalog link see this product, its pictures, sizes and notes.</span>
        </span>
      </label>

      <div role="group" aria-label="Sizes">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Sizes<span className="font-normal text-gray-500"> (each size has its own price; a product with no size, like a Mug, keeps one line with No size)</span>
        </span>
        <ul className="space-y-2">
          {live.map((r) => (
            <SizeRow
              key={r.key}
              row={r}
              index={live.indexOf(r)}
              canSetPrice={canSetPrice}
              canRemove={live.length > 1}
              onChange={(next) => change(r.key, next)}
              onRemove={() => remove(r)}
            />
          ))}
        </ul>
        {removedCount > 0 && <p className="text-xs text-gray-600 mt-1">{removedCount} {removedCount === 1 ? "size" : "sizes"} will be archived when you save. Old orders are not changed.</p>}
        <button
          type="button"
          onClick={() => setRows((list) => [...list, newRow()])}
          className="mt-2 flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-stone-300 text-stone-800 text-sm font-medium hover:bg-stone-100"
        >
          <Plus size={18} /> Add another size
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-orange-700 text-white font-medium hover:bg-orange-800 disabled:opacity-60">
          {saving ? "Saving..." : isNew ? "Add product" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
};

export default ProductFormModal;
