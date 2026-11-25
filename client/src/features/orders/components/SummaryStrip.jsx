import { format } from "date-fns";
import { AlertTriangle, CalendarDays, Eye, EyeOff, IndianRupee, PackageOpen } from "lucide-react";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { CLOSED_OLD, EMPTY_FILTERS, FINISHED_STATUSES, STATUSES, filtersToParams } from "../utils/filters";
import { MASK } from "./../utils/orderColumns";

const OPEN_STATUSES = STATUSES.filter((s) => !FINISHED_STATUSES.includes(s));
// Cancelled and Closed (old) orders are left out of "Balance to collect"
const NOT_CANCELLED = STATUSES.filter((s) => s !== "Cancelled" && s !== CLOSED_OLD);

// Each tile, and the filter that shows the orders it counts
const tiles = (summary, hidden) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const all = [
    {
      id: "open",
      label: "Open orders",
      value: summary.open,
      note: `of ${summary.total} in all`,
      icon: PackageOpen,
      tone: "text-orange-700 bg-orange-100",
      filters: { ...EMPTY_FILTERS, status: OPEN_STATUSES },
    },
    {
      id: "overdue",
      label: "Overdue",
      value: summary.overdue,
      note: summary.overdue ? "delivery date passed" : "none late",
      icon: AlertTriangle,
      tone: summary.overdue ? "text-red-600 bg-red-100" : "text-green-600 bg-green-100",
      valueTone: summary.overdue ? "text-red-600" : "",
      filters: { ...EMPTY_FILTERS, overdue: true },
    },
    {
      id: "balance",
      label: "Balance to collect",
      value: hidden ? MASK : `₹${Number(summary.balance || 0).toLocaleString("en-IN")}`,
      note: `from ${summary.balanceOrders} ${summary.balanceOrders === 1 ? "order" : "orders"}`,
      icon: IndianRupee,
      tone: "text-blue-600 bg-blue-100",
      filters: { ...EMPTY_FILTERS, hasBalance: true, status: NOT_CANCELLED },
    },
    {
      id: "today",
      label: "Today's orders",
      value: summary.today,
      note: "created today",
      icon: CalendarDays,
      tone: "text-purple-600 bg-purple-100",
      filters: { ...EMPTY_FILTERS, createdFrom: today, createdTo: today },
    },
  ];
  // People who may not see money do not get the money box at all
  return summary.balance === undefined ? all.filter((tile) => tile.id !== "balance") : all;
};

// The four numbers above the orders. Tapping one shows exactly those orders
// (tap it again to go back to all orders).
const SummaryStrip = ({ summary, filters, onPick, amountsHidden, onToggleAmounts }) => {
  if (!summary) {
    return (
      <SkeletonRegion label="Loading the summary" className="mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-orange-100 shadow-sm p-3 sm:p-4 space-y-2">
              <Bar className="h-3 w-1/2" />
              <Bar className="h-6 w-2/3" />
              <Bar className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </SkeletonRegion>
    );
  }

  const current = JSON.stringify(filtersToParams(filters));

  return (
    <div
      className={`grid grid-cols-2 gap-3 mb-5 ${
        summary.balance === undefined ? "lg:grid-cols-3" : "lg:grid-cols-4"
      }`}
    >
      {tiles(summary, amountsHidden).map((tile) => {
        const active = current === JSON.stringify(filtersToParams(tile.filters));
        return (
          <div key={tile.id} className="relative">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onPick(active ? EMPTY_FILTERS : tile.filters)}
              className={`w-full text-left bg-white rounded-lg border shadow-sm p-3 sm:p-4 transition hover:shadow-md ${
                active ? "border-orange-500 ring-2 ring-orange-300" : "border-orange-100"
              }`}
            >
              <div className={`flex items-center gap-2 text-xs sm:text-sm text-gray-600 leading-tight ${tile.id === "balance" ? "pr-9" : ""}`}>
                <span className={`inline-flex shrink-0 p-1.5 rounded-md ${tile.tone}`}>
                  <tile.icon size={16} />
                </span>
                <span>{tile.label}</span>
              </div>
              <p className={`mt-2 text-xl sm:text-2xl font-bold text-gray-800 ${tile.valueTone || ""}`}>
                {tile.value}
              </p>
              <p className="text-xs text-gray-500">{tile.note}</p>
            </button>
            {tile.id === "balance" && (
              // The eye hides or shows only this box's number (Total, Advance and
              // Balance in the list have their own switch in Settings)
              <button
                type="button"
                onClick={onToggleAmounts}
                aria-label={amountsHidden ? "Show balance to collect" : "Hide balance to collect"}
                aria-pressed={!amountsHidden}
                title={amountsHidden ? "Show balance to collect" : "Hide balance to collect"}
                className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                {amountsHidden ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SummaryStrip;
