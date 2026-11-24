import ProductThumb from "./ProductThumb";
import { priceText } from "../utils/productOptions";

// One product on the Products page, as a row (list view) or a card (card view).
const ProductItem = ({ p, view, isAdmin, selected, onToggle, onEdit, onArchive, busy, onPictures }) => {
  const tick = isAdmin && (
    <input
      type="checkbox"
      checked={selected}
      onChange={onToggle}
      aria-label={`Tick ${p.name}${p.sizeLabel ? " " + p.sizeLabel : ""}`}
      className="w-5 h-5 accent-orange-500 shrink-0"
    />
  );
  const details = (
    <div className="min-w-0">
      <p className="font-medium text-gray-900 break-words">
        {p.name}
        {p.sizeLabel && <span className="text-gray-600 font-normal"> · {p.sizeLabel}</span>}
        {!p.active && <span className="ml-2 text-xs rounded-full bg-gray-200 text-gray-700 px-2 py-0.5">Archived</span>}
      </p>
      {priceText(p) && <p className="text-sm text-gray-700">{priceText(p)}</p>}
      {p.notes && <p className="text-xs text-gray-500 break-words mt-0.5">{p.notes}</p>}
    </div>
  );
  const buttons = (
    <>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${p.name}`}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-orange-50"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onArchive}
        aria-label={`${p.active ? "Archive" : "Restore"} ${p.name}`}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-orange-50 disabled:opacity-60"
      >
        {p.active ? "Archive" : "Restore"}
      </button>
    </>
  );

  if (view === "cards") {
    return (
      <li className={`bg-white rounded-lg border border-orange-100 overflow-hidden flex flex-col ${p.active ? "" : "opacity-70"}`}>
        <div className="relative">
          <ProductThumb product={p} size="w-full aspect-square" className="!rounded-none !border-0" onClick={onPictures} />
          {p.images?.length > 1 && (
            <span className="absolute bottom-1 right-1 text-xs rounded-full bg-black bg-opacity-60 text-white px-2 py-0.5">{p.images.length} pictures</span>
          )}
          {isAdmin && <div className="absolute top-2 left-2 bg-white rounded p-0.5 shadow">{tick}</div>}
        </div>
        <div className="p-3 flex flex-col gap-2 flex-1">
          {details}
          <div className="flex gap-2 mt-auto">{buttons}</div>
        </div>
      </li>
    );
  }
  return (
    <li className={`bg-white rounded-lg border border-orange-100 p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3 ${p.active ? "" : "opacity-70"}`}>
      <div className="min-w-0 flex items-start gap-3">
        {tick}
        <ProductThumb product={p} onClick={onPictures} />
        {details}
      </div>
      <div className="flex gap-2 shrink-0">{buttons}</div>
    </li>
  );
};

export default ProductItem;
