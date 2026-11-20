import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import LoadingScreen from "../../../common/components/LoadingScreen";
import { clearDevShop, getDevShop, setDevShop } from "../../../common/utils/devShop";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const base = process.env.REACT_APP_BASE_URL;

const pct = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const when = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "never";

// A horizontal bar: how big a share is
const Meter = ({ value, tone = "bg-orange-400" }) => (
  <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

const Tile = ({ label, value, note }) => (
  <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
    {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
  </div>
);

// The developer's own page: how much each feature of the app is used.
// Only an account listed in DEVELOPER_EMAILS on the server can get any data;
// everyone else is sent to the first page, like any unknown address.
const DeveloperPage = () => {
  const [days, setDays] = useState(30);
  const [shop, setShop] = useState("all");
  const [usage, setUsage] = useState(null);
  const [complete, setComplete] = useState(null);
  const [shopList, setShopList] = useState(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);

  // Only the newest request may show its answer (an older, slower one is dropped)
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!localStorage.getItem("token")) return; // nobody logged in: nothing to ask
    const mine = ++latest.current;
    setError(null);
    try {
      const [u, c] = await Promise.all([
        axios.get(`${base}/api/developer/usage`, { headers: headers(), params: { days, shop } }),
        axios.get(`${base}/api/developer/completeness`, { headers: headers(), params: { shop } }),
      ]);
      if (mine !== latest.current) return;
      setUsage(u.data);
      setComplete(c.data);
    } catch (err) {
      if (mine !== latest.current) return;
      // not logged in, or not the developer: this page does not exist for them
      if ([401, 403, 404].includes(err.response?.status)) setDenied(true);
      else setError("Could not load the numbers. Please try again.");
    }
  }, [days, shop]);

  useEffect(() => {
    load();
  }, [load]);

  // The shops the developer can open
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    axios
      .get(`${base}/api/developer/shops`, { headers: headers() })
      .then((res) => setShopList(res.data.shops))
      .catch(() => {});
  }, []);

  const inside = getDevShop();
  const openShop = (s) => {
    setDevShop(s.id, s.name);
    window.location.assign("/shop/dashboard"); // a fresh start inside that shop
  };
  const leaveShop = () => {
    clearDevShop();
    window.location.assign("/developer");
  };

  // Nobody logged in, or not the developer: sent to the first page like any
  // unknown address. Nothing of this page is shown until the server has said yes.
  if (!localStorage.getItem("token") || denied) return <Navigate to="/" replace />;
  if (!usage && !error) return <LoadingScreen message="Loading" />;
  if (!usage && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-orange-50 font-poppins px-4 text-center">
        <p className="text-gray-700">Something went wrong. Please try again.</p>
        <button onClick={load} className="px-5 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600">
          Try again
        </button>
      </div>
    );
  }

  const unused = usage ? usage.features.filter((f) => f.count === 0) : [];
  const maxDay = usage ? Math.max(1, ...usage.series.map((s) => s.count)) : 1;
  const selectClass = "border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white";

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Developer: how much the app is used</h1>
            <p className="text-sm text-gray-600">Only you can see this page. No customer details are counted, only feature names.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {inside ? (
              <>
                <Link to="/shop/dashboard" className="text-orange-700 underline">
                  Back to {inside.name}
                </Link>
                <button type="button" onClick={leaveShop} className="text-gray-600 underline">
                  Leave shop
                </button>
              </>
            ) : (
              <Link to="/shop/dashboard" className="text-orange-700 underline">
                My own shop
              </Link>
            )}
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Shops</h2>
          <p className="text-xs text-gray-500 mb-3">
            Open a shop to work inside it as its admin: orders, staff, settings and tools. Changes are real.
          </p>
          {!shopList ? (
            <p className="text-sm text-gray-500">Loading the shops...</p>
          ) : shopList.length === 0 ? (
            <p className="text-sm text-gray-600">There are no shops yet.</p>
          ) : (
            <ul className="divide-y" aria-label="Shops">
              {shopList.map((s) => (
                <li key={s.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {s.name}
                      {inside?.id === s.id && (
                        <span className="ml-2 text-xs rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5">you are inside</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      {s.ownerName || "-"} · {s.ownerEmail || "-"} · {s.orders} orders · {s.staff} staff · last activity {when(s.lastActivity)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openShop(s)}
                    aria-label={`Open ${s.name}`}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                  >
                    Open this shop
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-gray-700">
            <span className="block text-xs text-gray-500 mb-1">Shop</span>
            <select className={selectClass} value={shop} onChange={(e) => setShop(e.target.value)} aria-label="Shop">
              <option value="all">All shops together</option>
              {(usage?.shops || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            <span className="block text-xs text-gray-500 mb-1">Period</span>
            <select className={selectClass} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>

        <details className="text-sm text-gray-600 bg-white rounded-xl border border-orange-100 px-4 py-2">
          <summary className="cursor-pointer text-gray-800 font-medium">What do these choices mean?</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Shop:</strong> "All shops together" adds up every shop. Pick one shop to see only its numbers.</li>
            <li><strong>Period:</strong> how many days back to look. A feature that was not used in that time is "never used" here.</li>
            <li>Counting started on the day this feature went live, so older use is not in the numbers.</li>
            <li>What you do <strong>inside a shop as developer</strong> is not counted, so it does not make a shop look busier.</li>
          </ul>
        </details>

        {error && <p className="text-sm rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2">{error}</p>}

        {usage && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label="Uses in total" value={usage.total} note={`in the last ${usage.days} days`} />
              <Tile label="People who used the app" value={`${usage.activePeople} of ${usage.people}`} note="owner and staff" />
              <Tile label="Features used" value={`${usage.features.length - unused.length} of ${usage.features.length}`} />
              <Tile label="Never used" value={unused.length} note={unused.length ? "see the list below" : "all used"} />
            </div>

            <p className="text-xs text-gray-600" role="note">
              {usage.since
                ? `Counting started on ${usage.since.slice(6)}/${usage.since.slice(4, 6)}/${usage.since.slice(0, 4)}.`
                : "Nothing has been counted yet."}{" "}
              Only use by the shop's own admin and staff is counted, not what you do inside a shop as developer.
            </p>

            <section className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-1">Not used at all in this period</h2>
              {unused.length === 0 ? (
                <p className="text-sm text-gray-600">Every feature was used at least once.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">These are the ones to talk to the shop about.</p>
                  <ul className="flex flex-wrap gap-2" aria-label="Features not used">
                    {unused.map((f) => (
                      <li key={f.key} className="text-xs rounded-full bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1">
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">Share of all use, by feature</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[620px]" aria-label="Feature usage">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-3 font-medium">Feature</th>
                      <th className="py-2 pr-3 font-medium text-right">Uses</th>
                      <th className="py-2 pr-3 font-medium w-40">Share</th>
                      <th className="py-2 pr-3 font-medium text-right">People</th>
                      <th className="py-2 pr-3 font-medium text-right">Days used</th>
                      <th className="py-2 font-medium">Last used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usage.features.map((f) => (
                      <tr key={f.key} className={f.count === 0 ? "text-gray-400" : "text-gray-800"}>
                        <td className="py-2 pr-3">
                          {f.label}
                          <span className="block text-xs text-gray-400">{f.group}</span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{f.count}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><Meter value={f.share} /></div>
                            <span className="w-10 text-right text-xs tabular-nums">{pct(f.share)}%</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{f.count ? `${f.people} of ${usage.people}` : "-"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{f.daysUsed || "-"}</td>
                        <td className="py-2 text-xs">{when(f.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                "People" counts the owner and staff who used it at least once. Customers tracking
                an order have no account, so they are counted in Uses but not in People.
              </p>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">Uses per day</h2>
              <div className="flex items-end gap-0.5 h-24" role="img" aria-label="Uses per day">
                {usage.series.map((s) => (
                  <div
                    key={s.day}
                    title={`${s.day.slice(6)}/${s.day.slice(4, 6)}: ${s.count}`}
                    className="flex-1 bg-orange-300 rounded-t min-h-[2px]"
                    style={{ height: `${(s.count / maxDay) * 100}%`, opacity: s.count ? 1 : 0.25 }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{usage.series[0].day.slice(6)}/{usage.series[0].day.slice(4, 6)}</span>
                <span>today</span>
              </div>
            </section>
          </>
        )}

        {complete && (
          <section className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Data completeness</h2>
            <p className="text-xs text-gray-500 mb-3">Out of {complete.total} orders, how many have this filled in. A name like "N", "NA" or "123" does not count as a name.</p>
            <ul className="space-y-2.5" aria-label="Data completeness">
              {complete.fields.map((f) => (
                <li key={f.key}>
                  <div className="flex justify-between text-sm text-gray-800">
                    <span>{f.label}</span>
                    <span className="tabular-nums text-xs text-gray-600">
                      {f.count} of {complete.total} · {pct(f.percent)}%
                    </span>
                  </div>
                  <Meter value={f.percent} tone={f.percent < 50 ? "bg-amber-400" : "bg-green-500"} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default DeveloperPage;
