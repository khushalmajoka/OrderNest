import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const OrderTableHeader = ({
  columns,
  showActions,
  sortField,
  sortOrder,
  setSortField,
  setSortOrder,
  selectable = false,
  allSelected = false,
  someSelected = false,
  onToggleAll,
}) => {
  const box = useRef(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const arrow = (field, direction) =>
    sortField === field && sortOrder === direction
      ? "text-gray-900"
      : "text-gray-500";

  return (
    <thead className="bg-orange-100">
      <tr className="text-left text-gray-700">
        {selectable && (
          <th className="pl-3 pr-1 py-3 w-8">
            <input
              ref={box}
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label="Select all orders on this page"
              className="w-4 h-4 accent-orange-500"
            />
          </th>
        )}
        {columns.map((column) =>
          column.sort ? (
            <th
              key={column.key}
              className="px-2 py-3 cursor-pointer select-none"
              onClick={() => handleSort(column.sort)}
            >
              <div className="flex items-center gap-2">
                <span>{column.label}</span>
                <div className="flex flex-col">
                  <ChevronUp size={14} className={arrow(column.sort, "asc")} />
                  <ChevronDown size={14} className={`-mt-1 ${arrow(column.sort, "desc")}`} />
                </div>
              </div>
            </th>
          ) : (
            <th key={column.key} className="px-2 py-3">
              {column.label}
            </th>
          )
        )}
        {showActions && (
          <th className="px-2 py-3">
            <span className="sr-only">Actions</span>
          </th>
        )}
      </tr>
    </thead>
  );
};

export default OrderTableHeader;
