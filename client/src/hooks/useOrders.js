import { useState, useEffect } from "react";
import axios from "axios";

export const useOrders = (currentPage, ordersPerPage) => {
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");

        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/orders/${userId}?page=${currentPage}&limit=${ordersPerPage}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setOrders(response.data.orders);
        setTotalOrders(response.data.totalCount);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, ordersPerPage]);

  return { orders, setOrders, totalOrders, loading };
};
