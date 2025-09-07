import React from "react";
import { useShop } from "../hooks/useShop";

const OrderCard = React.forwardRef(({ order }, ref) => {
  const shop = useShop();

  return (
    <div
      ref={ref}
      className="w-96 bg-white shadow-xl overflow-hidden border border-gray-200"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-center py-4">
        {shop?.logo && (
          <img
            src={shop.logo}
            alt="Shop Logo"
            className="h-16 mx-auto mb-2 object-contain bg-white rounded-full p-1 shadow"
          />
        )}
        <h2 className="text-xl font-bold tracking-wide">Thank You!</h2>
        <p className="text-sm opacity-90">
          Your order is being prepared with care
        </p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4 text-gray-700">
        {/* Order Summary */}
        <div className="text-center">
          <p className="text-sm">Order No.</p>
          <p className="text-lg font-semibold">
            {order.orderId || order._id.slice(-6)}
          </p>
        </div>

        <hr className="border-gray-200" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-sm">
            <p>
              <b>Item:</b> {order.item}
            </p>
            <p>
              <b>Balance:</b>{" "}
              <span className="text-red-500">₹{order.balance}</span>
            </p>
          </div>

          <p>
            <b>Total Amount:</b>{" "}
            <span className="font-semibold text-green-600">₹{order.total}</span>
          </p>

          <p>
            <b>Advance:</b> ₹{order.advance}
          </p>
          <p>
            <b>Date of Booking:</b>{" "}
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
          <p>
            <b>Expected Delivery:</b>{" "}
            {order.expectedDeliveryDate
              ? new Date(order.expectedDeliveryDate).toLocaleDateString()
              : "-"}
          </p>
          <p>
            <b>Order Executive:</b> {order.orderExecutive || "-"}
          </p>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Footer */}
      <div className="bg-white">
        {shop?.instaqr && (
          <div className="flex items-center justify-center gap-4 p-4">
            <img
              src={shop.instaqr}
              alt="Instagram QR"
              className="h-20 object-contain rounded-lg border shadow-sm"
            />
            <p className="text-sm text-gray-600 mb-3">We appreciate your trust ❤️</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default OrderCard;
