import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

// Loads one page of the shop's orders. The server does the paging, searching
// and sorting, so only the rows on screen are ever downloaded.
// `page` is 0-based here (the server counts from 1).
export const useOrders = ({
  shopId,
  page,
  limit,
  search,
  sortField,
  sortOrder,
}) => {
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false); // first response has arrived
  const [refreshKey, setRefreshKey] = useState(0);

  // Ask for the current page again (after create / delete / bulk upload)
  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!shopId) return;

    // A newer request (typing, paging) cancels the one still in flight
    const controller = new AbortController();

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shopId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page: page + 1,
              limit,
              search: search || undefined,
              sortBy: sortField || undefined,
              sortDir: sortField ? sortOrder : undefined,
            },
            signal: controller.signal,
          }
        );

        setOrders(response.data.orders);
        setTotalOrders(response.data.totalOrders);
        setLoaded(true);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Error fetching orders:", err);
        toast.error("Failed to load orders. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchOrders();
    return () => controller.abort();
  }, [shopId, page, limit, search, sortField, sortOrder, refreshKey]);

  return { orders, setOrders, totalOrders, loading, loaded, refetch };
};
