import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Check, Phone, XCircle } from "lucide-react";
import OrderNestLogo from "../../../assets/OrderNestLogoWithoutBg.png";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { deliveryCountdown } from "../../../common/utils/dateUtils";
import { formatDay } from "../../../common/utils/formatDate";

// What the customer sees as steps. Several of the shop's statuses can sit
// inside one step, so the customer is not shown the shop's inner details.
const STEPS = [
  { label: "Order received", statuses: ["Order Received", "Pending"] },
  { label: "Being prepared", statuses: ["In Progress", "Completed"] },
  { label: "Ready", statuses: ["Ready to Dispatch/Pick-Up"] },
  { label: "On the way", statuses: ["Dispatched"] },
  { label: "Delivered", statuses: ["Delivered"] },
];

const stepOf = (status) => STEPS.findIndex((step) => step.statuses.includes(status));

// The steps as a list: done (tick), the current one (orange), the ones to come
const Progress = ({ status }) => {
  const current = stepOf(status);
  return (
    <ol className="mt-4" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const done = index < current || (index === current && status === "Delivered");
        const here = index === current && !done;
        return (
          <li key={step.label} className="flex gap-3" aria-current={here ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  done
                    ? "bg-green-500 text-white"
                    : here
                    ? "bg-orange-500 text-white ring-4 ring-orange-200"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span className={`w-0.5 flex-1 min-h-[18px] ${index < current ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
            <div className="pb-3">
              <p className={`text-sm ${here ? "font-semibold text-gray-900" : done ? "text-gray-700" : "text-gray-400"}`}>
                {step.label}
              </p>
              {here && status !== step.label && (
                <p className="text-xs text-orange-700">{status}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const OrderResult = ({ order }) => {
  const cancelled = order.status === "Cancelled";
  const delivered = order.status === "Delivered";
  const countdown = deliveryCountdown(order.expectedDeliveryDate, order.status);
  // The customer is told the day, and how soon; never "late"
  const soon = countdown.text !== "-" && !countdown.late ? ` (${countdown.text === "Today" ? "today" : "in " + countdown.text})` : "";

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow border border-orange-100 animate-fade-up motion-reduce:animate-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Shop</p>
          <p className="font-semibold text-gray-800 break-words">{order.shopName}</p>
        </div>
        {order.shopPhone && (
          <a
            href={`tel:${String(order.shopPhone).replace(/[^\d+]/g, "")}`}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-orange-500 text-orange-600 text-sm hover:bg-orange-50"
          >
            <Phone size={16} /> Call shop
          </a>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Order ID</dt>
          <dd className="text-gray-800 break-all">{order.orderId}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Customer</dt>
          <dd className="text-gray-800 break-words">{order.customerName || "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Item</dt>
          <dd className="text-gray-800 break-words">{order.item || "-"}</dd>
        </div>
        {order.orderExecutive && (
          <div>
            <dt className="text-xs text-gray-500">Taken by</dt>
            <dd className="text-gray-800 break-words">{order.orderExecutive}</dd>
          </div>
        )}
        {order.expectedDeliveryDate && !cancelled && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">{delivered ? "Expected delivery was" : "Expected delivery"}</dt>
            <dd className="text-gray-800">
              {formatDay(order.expectedDeliveryDate)}
              {!delivered && soon}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 border-t pt-3">
        {cancelled ? (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            <XCircle size={18} className="shrink-0" /> This order was cancelled. Please contact the shop.
          </p>
        ) : stepOf(order.status) === -1 ? (
          <p className="text-sm">
            <span className="text-gray-500">Status: </span>
            <span className="text-orange-600 font-medium">{order.status}</span>
          </p>
        ) : (
          <Progress status={order.status} />
        )}
      </div>
    </div>
  );
};

const TrackOrderPage = () => {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!orderId.trim() || phone.replace(/\D/g, "").length < 10)
      return toast.error("Please enter your Order ID and 10-digit phone number");

    try {
      setLoading(true);
      setSearched(false);
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/orders/track`,
        { orderId: orderId.trim(), phone }
      );
      if (res.data.orders.length === 0) {
        toast.error("No order found. Check your Order ID and phone number.");
      }

      setOrders(res.data.orders || []);
      setSearched(true);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      toast.error(
        err.response?.data?.message || "Failed to track order. Try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-white font-poppins flex flex-col items-center gap-6 px-4 py-6 md:py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 mt-4 md:mt-6">
          <img
            src={OrderNestLogo}
            alt="OrderNest Logo"
            className="w-48 h-auto mx-auto"
          />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="bg-white rounded-xl shadow-lg p-5 sm:p-8 w-full border-t-4 border-orange-500"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Track Your Order
          </h1>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Enter your Order ID and the phone number you gave the shop to check
            your order status.
          </p>

          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="sr-only">Order ID</span>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Order ID"
                autoCapitalize="characters"
                className="w-full px-4 py-2.5 border rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="sr-only">Phone number</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                placeholder="Phone number"
                className="w-full px-4 py-2.5 border rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 min-h-[44px] bg-orange-500 text-white rounded-md hover:bg-orange-600 transition disabled:opacity-60"
            >
              {loading ? "Searching..." : "Track"}
            </button>
          </div>
        </form>
      </div>

      {(loading || (orders.length > 0 && searched)) && (
        <div className="w-full max-w-lg space-y-4" aria-live="polite">
          {loading && (
            <SkeletonRegion label="Looking for your order">
              <div className="bg-white p-4 rounded-xl shadow border border-orange-100 space-y-3">
                <Bar className="h-4 w-1/2" />
                <Bar className="h-4 w-3/5" />
                <Bar className="h-4 w-2/3" />
                <Bar className="h-4 w-1/2" />
                <Bar className="h-4 w-3/5" />
              </div>
            </SkeletonRegion>
          )}
          {!loading &&
            searched &&
            orders.map((order, index) => (
              <OrderResult key={`${order.orderId}-${order.shopName}-${index}`} order={order} />
            ))}
        </div>
      )}
    </div>
  );
};

export default TrackOrderPage;
