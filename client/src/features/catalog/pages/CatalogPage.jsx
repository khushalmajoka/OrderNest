import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart, Image as ImageIcon, MessageCircle, Phone, Search, X } from "lucide-react";
import LoadingScreen from "../../../common/components/LoadingScreen";
import { getShopLogo } from "../../../common/utils/utils";
import { whatsappLink, whatsappNumber } from "../../../common/utils/whatsapp";
import { sortSizes } from "../../products/utils/productOptions";

// The customer catalog (no login). It only ever gets what the server sends for
// this secret link: shop name, logo, phone and the products ticked for it.
// Plain fetch on purpose: nothing about any shop login is sent.
const API = process.env.REACT_APP_BASE_URL;
const imageUrl = (token, id, size) => `${API}/api/catalog/${token}/images/${id}?size=${size}`;

const priceText = (s) =>
  s.price === undefined ? "" : `₹${Number(s.price).toLocaleString("en-IN")}${s.priceUnit && s.priceUnit !== "piece" ? ` per ${s.priceUnit}` : ""}`;

// favourites are kept on the customer's own phone
const favKey = (token) => `catalogFavourites:${token}`;
const readFavourites = (token) => {
  try {
    const list = JSON.parse(localStorage.getItem(favKey(token)));
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
};

const message = (shopName, names) =>
  names.length
    ? `Hello ${shopName}, I saw your catalog and I am interested in:\n${names.map((n) => `• ${n}`).join("\n")}\nPlease tell me more.`
    : `Hello ${shopName}, I saw your catalog and I have a question.`;

const Viewer = ({ token, product, onClose }) => {
  const [at, setAt] = useState(0);
  const count = product.images.length;
  const go = (step) => setAt((i) => (i + step + count) % count);

  useEffect(() => {
    const previous = document.body.style.overflow;
    const returnTo = document.activeElement;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      returnTo?.focus?.({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setAt((i) => (i + 1) % count);
      if (e.key === "ArrowLeft") setAt((i) => (i - 1 + count) % count);
      if (e.key === "Tab") {
        // Tab stays inside the window
        const items = [...document.querySelectorAll("[data-viewer] button")];
        const next = (items.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        e.preventDefault();
        items[next]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, onClose]);

  const round = "flex items-center justify-center w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80";
  return (
    <div data-viewer role="dialog" aria-modal="true" aria-label={`Pictures of ${product.name}`} className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="font-medium break-words">{product.name}</p>
        <button type="button" autoFocus onClick={onClose} aria-label="Close pictures" className={round}>
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center py-3">
        <img src={imageUrl(token, product.images[at], "full")} alt={`${product.name} (${at + 1} of ${count})`} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
      {count > 1 && (
        <div className="flex items-center justify-center gap-6 text-white" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => go(-1)} aria-label="Previous picture" className={round}>
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm">{at + 1} of {count}</span>
          <button type="button" onClick={() => go(1)} aria-label="Next picture" className={round}>
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

const Card = ({ token, product, favourite, onFavourite, onOpen }) => {
  const [allSizes, setAllSizes] = useState(false);
  const sizes = product.sizes;
  const onlyNoSize = sizes.length === 1 && !sizes[0].sizeLabel;
  const shown = allSizes ? sizes : sizes.slice(0, 4);
  const main = product.images[0];
  return (
    <li className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col" aria-label={product.name}>
      <div className="relative">
        {main ? (
          <button type="button" onClick={onOpen} aria-label={`See pictures of ${product.name}`} className="block w-full aspect-square bg-stone-100">
            <img src={imageUrl(token, main, "thumb")} alt="" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="w-full aspect-square bg-stone-100 flex items-center justify-center text-stone-400">
            <ImageIcon size={32} aria-hidden="true" />
          </div>
        )}
        <button
          type="button"
          onClick={onFavourite}
          aria-pressed={favourite}
          aria-label={`Favourite ${product.name}`}
          className="absolute top-2 right-2 w-11 h-11 rounded-full bg-white shadow flex items-center justify-center"
        >
          <Heart size={22} className={favourite ? "fill-red-600 text-red-600" : "text-stone-600"} />
        </button>
        {product.images.length > 1 && (
          <span className="absolute bottom-2 right-2 text-xs rounded-full bg-black/60 text-white px-2 py-0.5">{product.images.length} pictures</span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-medium text-stone-900 break-words">{product.name}</h3>
        {onlyNoSize ? (
          priceText(sizes[0]) && <p className="text-sm text-stone-800">{priceText(sizes[0])}</p>
        ) : (
          <ul aria-label={`Sizes of ${product.name}`} className="text-sm text-stone-700 space-y-0.5">
            {shown.map((s) => (
              <li key={s._id} className="flex flex-wrap justify-between gap-x-2">
                <span>{s.sizeLabel || "Standard"}</span>
                {priceText(s) && <span className="font-medium text-stone-900">{priceText(s)}</span>}
              </li>
            ))}
          </ul>
        )}
        {!onlyNoSize && sizes.length > 4 && (
          <button type="button" onClick={() => setAllSizes(!allSizes)} aria-expanded={allSizes} className="text-sm text-orange-800 underline py-1">
            {allSizes ? "Show fewer sizes" : `Show all ${sizes.length} sizes`}
          </button>
        )}
        {product.notes && <p className="text-xs text-stone-600 break-words">{product.notes}</p>}
      </div>
    </li>
  );
};

const CatalogPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState(null); // "gone" | "error"
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "fav" | "none" | a category id
  const [favourites, setFavourites] = useState(() => readFavourites(token));
  const [viewing, setViewing] = useState(null);

  // search engines are asked not to list a private link
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    setData(null);
    setProblem(null);
    setSlow(false);
    const timer = setTimeout(() => alive && setSlow(true), 5000);
    fetch(`${API}/api/catalog/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 404) return alive && setProblem("gone");
        if (!res.ok) throw new Error("failed");
        const body = await res.json();
        body.products = body.products.map((p) => ({ ...p, sizes: sortSizes(p.sizes) }));
        if (alive) setData(body);
      })
      .catch(() => alive && setProblem("error"))
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [token, attempt]);

  useEffect(() => {
    if (data) document.title = `${data.shop.name} - Catalog`;
  }, [data]);

  const toggle = (id) => {
    const next = new Set(favourites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavourites(next);
    try {
      localStorage.setItem(favKey(token), JSON.stringify([...next]));
    } catch {
      /* private window: kept until the page is closed */
    }
  };

  const liked = useMemo(() => (data?.products || []).filter((p) => favourites.has(p._id)), [data, favourites]);

  const groups = useMemo(() => {
    if (!data) return [];
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const found = data.products.filter((p) => {
      const text = `${p.name} ${p.notes} ${p.sizes.map((s) => s.sizeLabel).join(" ")}`.toLowerCase();
      return words.every((w) => text.includes(w)) && (filter !== "fav" || favourites.has(p._id));
    });
    const known = new Set(data.categories.map((c) => c._id));
    return [
      ...data.categories.map((c) => ({ id: c._id, name: c.name, items: found.filter((p) => p.category === c._id) })),
      { id: "none", name: data.categories.length ? "Other" : "Products", items: found.filter((p) => !known.has(p.category)) },
    ].filter((g) => g.items.length && (filter === "all" || filter === "fav" || filter === g.id));
  }, [data, search, filter, favourites]);

  if (problem) {
    return (
      <main className="theme-light min-h-screen bg-stone-50 font-poppins flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold text-stone-900">{problem === "gone" ? "This catalog is not available" : "Could not open the catalog"}</h1>
        <p className="text-stone-700">
          {problem === "gone" ? "Please ask the shop for a new link." : "Check your internet and try again."}
        </p>
        {problem === "error" && (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="px-5 py-3 rounded-lg bg-orange-700 text-white font-medium">
            Try again
          </button>
        )}
      </main>
    );
  }
  if (!data) return <LoadingScreen message={slow ? "Still opening. The first time can take up to a minute" : "Opening the catalog"} />;

  const { shop } = data;
  const dial = shop.phone.replace(/[^\d+]/g, "");
  const hasWhatsApp = Boolean(whatsappNumber(shop.phone));
  const chips = [
    { id: "all", name: "All" },
    ...data.categories,
    ...(data.categories.length && data.products.some((p) => !data.categories.some((c) => c._id === p.category)) ? [{ _id: "none", name: "Other" }] : []),
    { id: "fav", name: `Favourites (${liked.length})` },
  ];

  return (
    <div className="theme-light min-h-screen bg-stone-50 font-poppins pb-28">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={getShopLogo(shop)} alt="" className="w-14 h-14 rounded-full border border-stone-300 object-cover shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-stone-900 break-words">{shop.name}</h1>
            <a href={`tel:${dial}`} className="text-sm text-orange-800 underline">{shop.phone}</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {data.products.length === 0 ? (
          <p className="text-center text-stone-700 py-10">No products to show yet. Please ask the shop.</p>
        ) : (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="w-full border border-stone-300 rounded-lg pl-10 pr-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
              {chips.map((c) => {
                const id = c.id || c._id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    aria-pressed={filter === id}
                    className={`px-4 py-2 min-h-[44px] rounded-full text-sm border ${filter === id ? "bg-orange-700 border-orange-700 text-white" : "bg-white border-stone-300 text-stone-700"}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {!data.showPrices && <p className="text-sm text-stone-600">Ask us for prices.</p>}
            {groups.length === 0 ? (
              <p className="text-center text-stone-700 py-10">
                {filter === "fav" && !liked.length ? "No favourites yet. Tap the heart on a product." : "Nothing found."}
              </p>
            ) : (
              groups.map((g) => (
                <section key={g.id} aria-label={g.name} className="space-y-2">
                  <h2 className="font-semibold text-stone-800">{g.name}</h2>
                  <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
                    {g.items.map((p) => (
                      <Card key={p._id} token={token} product={p} favourite={favourites.has(p._id)} onFavourite={() => toggle(p._id)} onOpen={() => setViewing(p)} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 shadow-lg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto flex gap-3">
          {hasWhatsApp && (
            <a
              href={whatsappLink(shop.phone, message(shop.name, liked.map((p) => p.name)))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-[2] flex items-center justify-center gap-2 min-h-[48px] rounded-lg bg-green-700 text-white font-medium text-center"
            >
              <MessageCircle size={20} aria-hidden="true" />
              Ask on WhatsApp{liked.length ? ` (${liked.length})` : ""}
            </a>
          )}
          <a href={`tel:${dial}`} className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-lg border border-stone-300 text-stone-800 font-medium">
            <Phone size={20} aria-hidden="true" /> Call
          </a>
        </div>
      </div>

      {viewing && <Viewer token={token} product={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default CatalogPage;
