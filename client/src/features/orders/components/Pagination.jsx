import React from "react";

const Pagination = ({
  ordersPerPage,
  setOrdersPerPage,
  currentPage,
  setCurrentPage,
  totalOrders
}) => {
  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  return (
    <div className="flex justify-between items-center flex-wrap mt-4">
      {/* Orders per page dropdown */}
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="pageSize">Orders per page: </label>
        <select
          id="pageSize"
          value={ordersPerPage}
          onChange={(e) => {
            setOrdersPerPage(Number(e.target.value));
            setCurrentPage(0);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>

      {/* Simple Pagination Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
          disabled={currentPage === 0}
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
        >
          Prev
        </button>

        <span className="text-sm">
          Page {currentPage + 1} of {totalPages}
        </span>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
          }
          disabled={currentPage >= totalPages - 1}
          className="px-3 py-1 border rounded text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
