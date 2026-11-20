import { useEffect, useState } from "react";
import axios from "axios";
import { ShieldAlert } from "lucide-react";
import { clearDevShop, setDevShop } from "../../../common/utils/devShop";

// Shown at the very top of every page while the developer works INSIDE a
// shop (the developer page opens it). Changes made here are real: the shop's
// orders, staff and settings. Switch to another shop, or leave.
const DevBanner = ({ shop }) => {
  const [shops, setShops] = useState([]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${process.env.REACT_APP_BASE_URL}/api/developer/shops`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        if (!cancelled) setShops(res.data.shops || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const change = (id) => {
    const next = shops.find((s) => s.id === id);
    if (!next) return;
    setDevShop(next.id, next.name);
    window.location.assign("/shop/dashboard"); // a fresh start in the other shop
  };

  const leave = () => {
    clearDevShop();
    window.location.assign("/developer");
  };

  return (
    <div
      role="status"
      className="bg-indigo-700 text-white px-4 md:px-6 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm"
    >
      <span className="flex items-center gap-2 min-w-0">
        <ShieldAlert size={16} className="shrink-0" aria-hidden="true" />
        <span className="truncate">
          Developer: you are inside <strong>{shop?.name}</strong>.<span className="hidden sm:inline"> Changes here are real.</span>
        </span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {shops.length > 1 && (
          <select
            aria-label="Switch shop"
            value={shop?._id || ""}
            onChange={(e) => change(e.target.value)}
            className="bg-indigo-800 border border-indigo-400 rounded px-2 py-1 text-xs"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={leave}
          className="px-2.5 py-1 rounded border border-indigo-300 text-xs hover:bg-indigo-600"
        >
          Leave shop
        </button>
      </span>
    </div>
  );
};

export default DevBanner;
