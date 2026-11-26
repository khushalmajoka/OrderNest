import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const ago = (since, now) => {
  const seconds = Math.max(0, Math.round((now - since) / 1000));
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
};

// "Updated just now" with a small Refresh button, above the order list.
const UpdatedLabel = ({ since, refreshing, onRefresh, onGuide }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between gap-2 mb-2 text-xs text-gray-500">
      {onGuide ? (
        <button type="button" onClick={onGuide} className="underline text-gray-600 hover:text-orange-800">
          What do the statuses mean?
        </button>
      ) : (
        <span />
      )}
      <span className="flex items-center gap-2">
      {since && <span aria-live="off">Updated {ago(since, now)}</span>}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh the orders"
        title="Refresh the orders"
        className="flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-stone-100 disabled:opacity-60"
      >
        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
      </button>
      </span>
    </div>
  );
};

export default UpdatedLabel;
