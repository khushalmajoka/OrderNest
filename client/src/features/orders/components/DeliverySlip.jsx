import React from "react";
import moment from "moment";
import { getShopLogo } from "../../../common/utils/utils";

// The slip that is printed and stuck on the parcel (A6 shape, 420px wide).
// Black and white on purpose, so it prints clearly on any printer.
const DeliverySlip = React.forwardRef(({ order, shop }, ref) => {
  const balance = Number(order.balance) || 0;

  return (
    <div
      ref={ref}
      className="w-[420px] bg-white text-black p-5 border-2 border-black font-poppins"
      style={{ minHeight: 592 }}
    >
      {/* From: the shop */}
      <div className="flex items-center gap-3 pb-3 border-b-2 border-black">
        <img
          src={getShopLogo(shop)}
          alt=""
          className="w-14 h-14 object-contain shrink-0"
        />
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight break-words">
            {shop?.name}
          </p>
          {shop?.phone && <p className="text-sm">Phone: {shop.phone}</p>}
          {shop?.address && (
            <p className="text-xs leading-snug break-words">{shop.address}</p>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between mt-3">
        <p className="text-xl font-extrabold tracking-wide">DELIVERY SLIP</p>
        <p className="text-sm font-semibold break-all text-right">
          {order.orderId || order._id.slice(-6)}
        </p>
      </div>

      {/* To: the customer */}
      <div className="mt-3 border-2 border-black rounded p-3">
        <p className="text-xs font-bold tracking-widest">DELIVER TO</p>
        <p className="text-2xl font-bold leading-tight mt-1 break-words">
          {order.customerName || "-"}
        </p>
        <p className="text-xl font-semibold mt-1">
          {order.phone ? `Phone: ${order.phone}` : "Phone: -"}
        </p>
        <p className="text-lg leading-snug mt-2 whitespace-pre-line break-words">
          {order.address || "Address not added"}
        </p>
      </div>

      {/* Order details */}
      <div className="mt-3 text-sm space-y-1">
        <p className="break-words">
          <b>Item:</b> {order.item || "-"}
        </p>
        <p>
          <b>Expected delivery:</b>{" "}
          {order.expectedDeliveryDate
            ? moment(String(order.expectedDeliveryDate).slice(0, 10)).format(
                "DD MMM YYYY"
              )
            : "-"}
        </p>
        {order.orderExecutive && (
          <p>
            <b>Order executive:</b> {order.orderExecutive}
          </p>
        )}
      </div>

      {/* Money to collect at the door */}
      <div className="mt-4 border-2 border-black rounded p-3 text-center">
        {balance > 0 ? (
          <>
            <p className="text-xs font-bold tracking-widest">
              AMOUNT TO COLLECT
            </p>
            <p className="text-3xl font-extrabold mt-1">₹{balance}</p>
          </>
        ) : (
          <p className="text-2xl font-extrabold tracking-wide">PAID</p>
        )}
        <p className="text-xs mt-1">
          Total ₹{order.total} · Advance paid ₹{order.advance}
        </p>
      </div>
    </div>
  );
});

export default DeliverySlip;
