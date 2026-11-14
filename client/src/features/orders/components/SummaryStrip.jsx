import { format } from "date-fns";
import { AlertTriangle, CalendarDays, IndianRupee, PackageOpen } from "lucide-react";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { EMPTY_FILTERS, STATUSES, filtersToParams } from "../utils/filters";

const OPEN_STATUSES = STATUSES.filter((s) => s !== "Delivered" && s !== "Cancelled");
const NOT_CANCELLED = STATUSES.filter((s) => s !== "Cancelled");

// Each tile, and the filter that shows the orders it counts
const tiles = (summary) => {
  const today = format(new Date(), "yyyy-MM-dd");
  return [
    {
      id: "open",
      label: "Open orders",
      value: summary.open,
      note: `of ${summary.total} in all`,
      icon: PackageOpen,
      tone: "text-orange-600 bg-orange-100",
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
      value: `₹${Number(summary.balance).toLocaleString("en-IN")}`,
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
};

// The four numbers above the orders. Tapping one shows exactly those orders
// (tap it again to go back to all orders).
const SummaryStrip = ({ summary, filters, onPick }) => {
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {tiles(summary).map((tile) => {
        const active = current === JSON.stringify(filtersToParams(tile.filters));
        return (
          <button
            key={tile.id}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(active ? EMPTY_FILTERS : tile.filters)}
            className={`text-left bg-white rounded-lg border shadow-sm p-3 sm:p-4 transition hover:shadow-md ${
              active ? "border-orange-500 ring-2 ring-orange-300" : "border-orange-100"
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span className={`inline-flex p-1.5 rounded-md ${tile.tone}`}>
                <tile.icon size={16} />
              </span>
              <span className="truncate">{tile.label}</span>
            </div>
            <p className={`mt-2 text-xl sm:text-2xl font-bold text-gray-800 ${tile.valueTone || ""}`}>
              {tile.value}
            </p>
            <p className="text-xs text-gray-500">{tile.note}</p>
          </button>
        );
      })}
    </div>
  );
};

export default SummaryStrip;
