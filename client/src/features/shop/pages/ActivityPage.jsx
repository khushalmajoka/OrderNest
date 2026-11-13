import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import Navbar from "../components/Navbar";
import LoadingScreen from "../../../common/components/LoadingScreen";
import TopProgressBar from "../../../common/components/TopProgressBar";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { useShop } from "../hooks/useShop";
import { getErrorMessage } from "../../../common/utils/api";
import { clearSession } from "../../whatsNew/whatsNewStorage";

const TABS = [
  { value: "", label: "All" },
  { value: "order", label: "Orders" },
  { value: "staff", label: "Staff" },
];

const dayTitle = (iso) => {
  const day = moment(iso).startOf("day");
  const today = moment().startOf("day");
  if (day.isSame(today)) return "Today";
  if (day.isSame(today.clone().subtract(1, "day"))) return "Yesterday";
  return day.format("DD MMM YYYY");
};

const Entry = ({ item, myId }) => {
  const mine = String(item.actor?.id) === String(myId);
  const who = mine ? "You" : item.actor?.name || "Someone";
  return (
    <li className="bg-white rounded-lg shadow-sm border border-orange-100 p-3 sm:p-4">
      <p className="text-sm text-gray-800 break-words">{item.summary}</p>

      {item.changes?.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {item.changes.map((change) => (
            <li key={change.field} className="text-gray-600 break-words">
              <span className="font-medium text-gray-700">{change.field}:</span>{" "}
              <span className="line-through text-gray-400">{change.from}</span>
              {"  →  "}
              <span className="text-gray-900">{change.to}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-gray-500">
        {who}
        {item.actor?.role === "staff" && !mine ? " (staff)" : ""}
        {" · "}
        {moment(item.createdAt).format("DD MMM, hh:mm A")}
      </p>
    </li>
  );
};

// Shape of the activity list while it loads
const ActivitySkeleton = () => (
  <SkeletonRegion label="Loading the activity" className="space-y-5">
    <div>
      <Bar className="h-3.5 w-16 mb-3" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-orange-100 p-3 sm:p-4 space-y-2"
          >
            <Bar className={`h-4 ${i % 2 ? "w-3/5" : "w-4/5"}`} />
            <Bar className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  </SkeletonRegion>
);

// Who did what: orders created, edited, deleted, uploaded, and staff changes.
// Admin only. Lines are kept for 6 months.
const ActivityPage = () => {
  const navigate = useNavigate();
  const { shop, account, error, reload } = useShop();
  const isAdminAccount = account?.role === "admin";

  const [kind, setKind] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (account && !isAdminAccount) navigate("/shop/dashboard"); // staff: not allowed here
  }, [account, isAdminAccount, navigate]);

  // Wait for a pause in typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (pageNumber) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/activity`, {
          params: { page: pageNumber, limit: 50, kind: kind || undefined, search: search || undefined },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setItems((current) =>
          pageNumber === 1 ? res.data.items : [...(current || []), ...res.data.items]
        );
        setHasMore(res.data.hasMore);
        setPage(pageNumber);
      } catch (err) {
        setLoadError(getErrorMessage(err, "Could not load the activity."));
      } finally {
        setLoading(false);
      }
    },
    [kind, search]
  );

  // A new tab or search starts again from the newest line
  useEffect(() => {
    if (isAdminAccount) load(1);
  }, [isAdminAccount, load]);

  const handleLogout = () => {
    clearSession();
    navigate("/shop");
  };

  if (!shop && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-orange-50 font-poppins px-4 text-center">
        <p className="text-gray-700">{error}</p>
        <button
          onClick={reload}
          className="px-5 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!shop || !isAdminAccount) {
    return <LoadingScreen message="Opening your activity" />;
  }

  // Group the lines by day, keeping the newest first
  const groups = [];
  for (const item of items || []) {
    const title = dayTitle(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <TopProgressBar active={loading && items !== null} />
      <Navbar shop={shop} account={account} onLogout={handleLogout} />

      <div className="p-4 md:p-8 space-y-4 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-orange-700">Activity</h1>
          <p className="text-sm text-gray-600 mt-1">
            Who created, edited or deleted orders, and changes to staff. Kept
            for 6 months.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setKind(tab.value)}
              aria-pressed={kind === tab.value}
              className={`px-4 py-1.5 rounded-full border text-sm ${
                kind === tab.value
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by order ID, name, status..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        {loadError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button onClick={() => load(1)} className="underline shrink-0">
              Try again
            </button>
          </div>
        )}

        {items === null ? (
          <ActivitySkeleton />
        ) : items.length === 0 && !loadError ? (
          <p className="text-gray-500 py-6">
            {search || kind ? "Nothing matches." : "Nothing has happened yet."}
          </p>
        ) : (
          <div className={`space-y-5 ${loading ? "opacity-60" : ""}`}>
            {groups.map((group) => (
              <section key={group.title}>
                <h2 className="text-sm font-semibold text-gray-600 mb-2">
                  {group.title}
                </h2>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <Entry key={item._id} item={item} myId={account.id} />
                  ))}
                </ul>
              </section>
            ))}

            {hasMore && (
              <button
                onClick={() => load(page + 1)}
                disabled={loading}
                className="w-full py-2 rounded-md border border-orange-500 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Show older"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
