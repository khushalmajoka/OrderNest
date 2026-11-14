import React from "react";
import { formatDay, formatDate } from "../../../common/utils/formatDate";
import { getShopLogo } from "../../../common/utils/utils";

// The slip that is printed and stuck on the parcel (A6 shape, 420px wide).
// Black and white on purpose, so it prints clearly on any printer.
//   fields: which parts to print ({ logo: true, ... })
//   edits:  values typed for this one slip only (they win over the order)
//   note:   a line printed at the bottom
const DeliverySlip = React.forwardRef(({ order, shop, fields, edits = {}, note }, ref) => {
  const pick = (key, original) => (edits[key] !== undefined ? edits[key] : original);

  const customerName = pick("customerName", order.customerName);
  const customerPhone = pick("customerPhone", order.phone);
  const address = pick("address", order.address);
  const item = pick("item", order.item);

  // Amount to collect: what was typed for this slip, else the order's balance
  const typedAmount = edits.amount;
  const amount =
    typedAmount !== undefined && String(typedAmount).trim() !== ""
      ? Number(typedAmount) || 0
      : Number(order.balance) || 0;

  const showShop = fields.logo || fields.shopName || fields.shopPhone || fields.shopAddress;
  const showTo = fields.customerName || fields.customerPhone || fields.deliveryAddress;
  const showMoney = fields.amount || fields.totals;
  
  return (
    <div
      ref={ref}
      className="w-[420px] bg-white text-black p-5 border-2 border-black font-poppins"
      style={{ minHeight: 592 }}
    >
      {showShop && (
        <div className="flex items-center gap-3 pb-3 border-b-2 border-black">
          {fields.logo && (
            <img
              src={getShopLogo(shop)}
              alt=""
              className="w-14 h-14 object-contain shrink-0"
            />
          )}
          <div className="min-w-0">
            {fields.shopName && (
              <p className="text-lg font-bold leading-tight break-words">{shop?.name}</p>
            )}
            {fields.shopPhone && shop?.phone && (
              <p className="text-sm">Phone: {shop.phone}</p>
            )}
            {fields.shopAddress && shop?.address && (
              <p className="text-xs leading-snug break-words">{shop.address}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mt-3">
        <p className="text-xl font-extrabold tracking-wide">DELIVERY SLIP</p>
        {fields.orderId && (
          <p className="text-sm font-semibold break-all text-right">
            {order.orderId || order._id.slice(-6)}
          </p>
        )}
      </div>

      {showTo && (
        <div className="mt-3 border-2 border-black rounded p-3">
          <p className="text-xs font-bold tracking-widest">DELIVER TO</p>
          {fields.customerName && (
            <p className="text-2xl font-bold leading-tight mt-1 break-words">
              {customerName || "-"}
            </p>
          )}
          {fields.customerPhone && (
            <p className="text-xl font-semibold mt-1">
              Phone: {customerPhone || "-"}
            </p>
          )}
          {fields.deliveryAddress && (
            <p className="text-lg leading-snug mt-2 whitespace-pre-line break-words">
              {address || "Address not added"}
            </p>
          )}
        </div>
      )}

      {(fields.item || fields.expectedDelivery || fields.orderDate || fields.executive) && (
        <div className="mt-3 text-sm space-y-1">
          {fields.item && (
            <p className="break-words">
              <b>Item:</b> {item || "-"}
            </p>
          )}
          {fields.expectedDelivery && (
            <p>
              <b>Expected delivery:</b>{" "}
              {order.expectedDeliveryDate ? formatDay(order.expectedDeliveryDate) : "-"}
            </p>
          )}
          {fields.orderDate && (
            <p>
              <b>Order date:</b> {formatDate(order.createdAt)}
            </p>
          )}
          {fields.executive && order.orderExecutive && (
            <p>
              <b>Order executive:</b> {order.orderExecutive}
            </p>
          )}
        </div>
      )}

      {showMoney && (
        <div className="mt-4 border-2 border-black rounded p-3 text-center">
          {fields.amount &&
            (amount > 0 ? (
              <>
                <p className="text-xs font-bold tracking-widest">AMOUNT TO COLLECT</p>
                <p className="text-3xl font-extrabold mt-1">₹{amount}</p>
              </>
            ) : (
              <p className="text-2xl font-extrabold tracking-wide">PAID</p>
            ))}
          {fields.totals && (
            <p className="text-xs mt-1">
              Total ₹{order.total} · Advance paid ₹{order.advance}
            </p>
          )}
        </div>
      )}

      {note && (
        <p className="mt-4 text-sm text-center font-semibold whitespace-pre-line break-words">
          {note}
        </p>
      )}
    </div>
  );
});

export default DeliverySlip;
