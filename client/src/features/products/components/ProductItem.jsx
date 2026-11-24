import ProductThumb from "./ProductThumb";

const priceOf = (size) =>
  size.price === undefined || size.price === null ? "" : `₹${Number(size.price).toLocaleString("en-IN")}${size.priceUnit && size.priceUnit !== "piece" ? ` per ${size.priceUnit}` : ""}`;

// One product on the Products page, as a row (list view) or a card (card view).
// It shows its sizes, each with its own price.
//   p: the product ({ _id, name, notes, images, sizes: [size records] })
const ProductItem = ({ p, view, isAdmin, selected, onToggle, onEdit, onArchive, busy, onPictures }) => {
  const archived = p.sizes.every((s) => s.active === false);
  const onlyNoSize = p.sizes.length === 1 && !p.sizes[0].sizeLabel;
  const shown = view === "cards" ? p.sizes.slice(0, 4) : p.sizes;
  const more = p.sizes.length - shown.length;

  const tick = isAdmin && (
    <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Tick ${p.name}`} className="w-5 h-5 accent-orange-500 shrink-0" />
  );
  const details = (
    <div className="min-w-0">
      <p className="font-medium text-gray-900 break-words">
        {p.name}
        {onlyNoSize ? (
          priceOf(p.sizes[0]) && <span className="text-gray-700 font-normal"> · {priceOf(p.sizes[0])}</span>
        ) : (
          <span className="text-gray-500 font-normal text-sm"> · {p.sizes.length} {p.sizes.length === 1 ? "size" : "sizes"}</span>
        )}
        {archived && <span className="ml-2 text-xs rounded-full bg-gray-200 text-gray-700 px-2 py-0.5">Archived</span>}
      </p>
      {!onlyNoSize && (
        <ul className="mt-1 space-y-0.5" aria-label={`Sizes of ${p.name}`}>
          {shown.map((s) => (
            <li key={s._id} className={`text-sm text-gray-700 ${s.active === false ? "opacity-60 line-through" : ""}`}>
              {s.sizeLabel || "No size"}
              {priceOf(s) && <span className="text-gray-500"> · {priceOf(s)}</span>}
            </li>
          ))}
          {more > 0 && <li className="text-xs text-gray-500">+ {more} more {more === 1 ? "size" : "sizes"}</li>}
        </ul>
      )}
      {p.notes && <p className="text-xs text-gray-500 break-words mt-1">{p.notes}</p>}
    </div>
  );
  const buttons = (
    <>
      <button type="button" onClick={onEdit} aria-label={`Edit ${p.name}`} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-orange-50">
        Edit
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onArchive}
        aria-label={`${archived ? "Restore" : "Archive"} ${p.name}`}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-orange-50 disabled:opacity-60"
      >
        {archived ? "Restore" : "Archive"}
      </button>
    </>
  );

  if (view === "cards") {
    return (
      <li className={`bg-white rounded-lg border border-orange-100 overflow-hidden flex flex-col ${archived ? "opacity-70" : ""}`}>
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
    <li className={`bg-white rounded-lg border border-orange-100 p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3 ${archived ? "opacity-70" : ""}`}>
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
