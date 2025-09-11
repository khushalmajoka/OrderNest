import { ChevronDown, ChevronUp } from "lucide-react";

const OrderTableHeader = ({ sortField, sortOrder, setSortField, setSortOrder }) => {

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <thead className="bg-orange-100">
      <tr className="text-left text-gray-700">
        {/* Order ID */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("orderId")}
        >
          <div className="flex items-center gap-2">
            <span>Order ID</span>
            <div className="flex flex-col">
              <ChevronUp
                size={14}
                className={
                  sortField === "orderId" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "orderId" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Customer */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("customerName")}
        >
          <div className="flex items-center gap-2">
            <span>Customer</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "customerName" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "customerName" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Product */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("item")}
        >
          <div className="flex items-center gap-2">
            <span>Product</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "item" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "item" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Phone */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("phone")}
        >
          <div className="flex items-center gap-2">
            <span>Phone</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "phone" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "phone" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Total */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("total")}
        >
          <div className="flex items-center gap-2">
            <span>Total</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "total" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "total" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Advance */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("advance")}
        >
          <div className="flex items-center gap-2">
            <span>Advance</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "advance" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "advance" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Balance */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("balance")}
        >
          <div className="flex items-center gap-2">
            <span>Balance</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "balance" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "balance" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Status */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("status")}
        >
          <div className="flex items-center gap-2">
            <span>Status</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "status" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "status" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Expected Delivery */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("expectedDeliveryDate")}
        >
          <div className="flex items-center gap-2">
            <span>Expected Delivery</span>
            {/* <div className="flex flex-col leading-[0.75rem]">
                    <ChevronUp
                      size={14}
                      className={
                        sortField === "expectedDeliveryDate" &&
                        sortOrder === "asc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                    <ChevronDown
                      size={14}
                      className={
                        sortField === "expectedDeliveryDate" &&
                        sortOrder === "desc"
                          ? "text-gray-900"
                          : "text-gray-400"
                      }
                    />
                  </div> */}
          </div>
        </th>

        {/* Days Remaining */}
        <th className="px-4 py-3">Days Remaining</th>

        {/* Order Executive */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("orderExecutive")}
        >
          <div className="flex items-center gap-2">
            <span>Order Executive</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "orderExecutive" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "orderExecutive" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Created */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("createdAt")}
        >
          <div className="flex items-center gap-2">
            <span>Created</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "createdAt" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "createdAt" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Updated */}
        <th
          className="px-4 py-3 cursor-pointer select-none"
          onClick={() => handleSort("updatedAt")}
        >
          <div className="flex items-center gap-2">
            <span>Updated</span>
            <div className="flex flex-col leading-[0.75rem]">
              <ChevronUp
                size={14}
                className={
                  sortField === "updatedAt" && sortOrder === "asc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
              <ChevronDown
                size={14}
                className={
                  sortField === "updatedAt" && sortOrder === "desc"
                    ? "text-gray-900"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
        </th>

        {/* Actions */}
        <th></th>
      </tr>
    </thead>
  );
};

export default OrderTableHeader;
