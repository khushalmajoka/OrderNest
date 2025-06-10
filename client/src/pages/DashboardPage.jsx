import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import OrderList from "../components/OrderList";
import EditOrderModal from "../components/EditOrderModal";
import toast from "react-hot-toast";
import CreateOrderModal from "../components/CreateOrderModal";
import { Plus } from "lucide-react";
import * as XLSX from "xlsx";
import MappingModal from "../components/MappingModal";

const Dashboard = () => {
  const [shop, setShop] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [ordersPerPage, setOrdersPerPage] = useState(100);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [currentPage, ordersPerPage]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        navigate("/shop");
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const shopRes = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/api/shop/${userId}`,
          { headers }
        );

        setShop(shopRes.data.shop);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        toast.error("Session expired or invalid token. Please login again.");
        localStorage.clear();
        navigate("/shop");
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("shopId");
    navigate("/shop");
  };

  const handleDeleteOrder = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders((prev) => prev.filter((order) => order._id !== id));
    } catch (err) {
      console.error("Failed to delete order:", err);
      toast.error("Failed to delete order. Try again.");
    }
  };

  const handleUpdateOrder = async (updatedOrder) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/orders/${updatedOrder._id}`,
        updatedOrder,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = res.data.order;

      // Replace in UI
      setOrders((prev) =>
        prev.map((order) => (order._id === updated._id ? updated : order))
      );

      setEditOrder(null); // Close modal
    } catch (err) {
      console.error("Failed to update order:", err);
      toast.error("Failed to update order. Try again.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(query) ||
      order.orderId?.toLowerCase().includes(query) ||
      order.item?.toLowerCase().includes(query) ||
      order.phone?.toLowerCase().includes(query)
    );
  });

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!Array.isArray(data) || data.length === 0) {
          return toast.error("Excel sheet is empty or invalid.");
        }

        const headers = Object.keys(data[0]);

        setExcelHeaders(headers);
        setExcelData(data);
        setShowMappingModal(true);
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("File parse failed", err);
      toast.error("Failed to read file.");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/orders/${userId}?page=${currentPage}&limit=${ordersPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders(response.data.orders);
      setTotalOrders(response.data.totalCount);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingConfirm = async (fieldMap) => {
    setShowMappingModal(false);
    setBulkUploading(true);

    try {
      const mappedOrders = excelData.map((row) => {
        const mapped = {};
        for (const [excelKey, orderField] of Object.entries(fieldMap)) {
          if (orderField) {
            let value = row[excelKey];

            // Clean commas and convert to number if it's a numeric field
            if (
              ["advance", "balance", "price", "quantity"].includes(orderField)
            ) {
              value =
                typeof value === "string" ? value.replace(/,/g, "") : value;
              value = Number(value);
            }

            mapped[orderField] = value;
          }
        }
        return mapped;
      });

      const token = localStorage.getItem("token");
      const shopId = localStorage.getItem("shopId");

      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/orders/bulk-upload`,
        { orders: mappedOrders, shopId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) => [...res.data.insertedOrders, ...prev]);
      toast.success(`${res.data.insertedOrders.length} orders uploaded.`);
    } catch (err) {
      console.error("Bulk upload failed", err);
      toast.error("Failed to upload orders.");
    } finally {
      setBulkUploading(false);
    }
  };

  if (!shop)
    return (
      <div className="text-center mt-10 text-gray-600 text-lg animate-pulse">
        Loading your shop...
      </div>
    );

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 backdrop-blur-lg bg-white/30 border-b border-orange-200 shadow-md px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={shop.logo}
            alt="Shop Logo"
            className="w-10 h-10 rounded-full border border-orange-400"
          />
          <span className="text-xl font-semibold text-orange-800">
            {shop.name || "Your Shop"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium shadow"
        >
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <div className="p-8 ">
        <div className="flex flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="text-orange-500 text-3xl">📦</span> Orders
            Dashboard
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search by name, ID, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition"
              >
                <Plus /> Create Order
              </button>

              <label className="cursor-pointer px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition">
                📥 Bulk Upload
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-orange-500 border-dashed rounded-full animate-spin"></div>
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            onEdit={(order) => setEditOrder(order)}
            onDelete={handleDeleteOrder}
            onPageChange={fetchOrders}
            totalOrders={totalOrders}
          />
        )}

        {showCreateModal && (
          <CreateOrderModal
            onClose={() => setShowCreateModal(false)}
            onOrderCreated={(newOrder) => {
              setOrders((prev) => [newOrder, ...prev]);
            }}
          />
        )}

        {editOrder && (
          <EditOrderModal
            order={editOrder}
            onClose={() => setEditOrder(null)}
            onSave={handleUpdateOrder}
          />
        )}

        {showMappingModal && (
          <MappingModal
            headers={excelHeaders}
            onConfirm={handleMappingConfirm}
            onClose={() => setShowMappingModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
