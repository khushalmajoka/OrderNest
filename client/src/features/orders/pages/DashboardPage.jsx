import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import loadingGif from "../../../assets/Loading.gif";

import { useShop } from "../../shop/hooks/useShop";
import { useOrders } from "../hooks/useOrders";

import Navbar from "../../shop/components/Navbar";
import SearchBar from "../../../common/components/SearchBar";
import ActionsBar from "../../../common/components/ActionsBar";
import OrderList from "../components/OrderList";
import EditOrderModal from "../../../common/components/EditOrderModal";
import CreateOrderModal from "../../../common/components/CreateOrderModal";
import MappingModal from "../../../common/components/MappingModal";
import WhatsNewModal from "../../whatsNew/WhatsNewModal";
import {
  hasSeenWhatsNew,
  markWhatsNewSeen,
  clearSession,
} from "../../whatsNew/whatsNewStorage";
import axios from "axios";

const Dashboard = () => {
  const shop = useShop();
  console.log(shop);
  if (shop) localStorage.setItem("shop", JSON.stringify(shop));
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(""); // what is typed
  const [search, setSearch] = useState(""); // what is sent to the server
  const [editOrder, setEditOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(
    () => !hasSeenWhatsNew(localStorage.getItem("userId"))
  );

  const [currentPage, setCurrentPage] = useState(0);
  const [ordersPerPage, setOrdersPerPage] = useState(50);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const { orders, setOrders, totalOrders, loading, loaded, refetch } =
    useOrders({
      shopId: shop?._id,
      page: currentPage,
      limit: ordersPerPage,
      search,
      sortField,
      sortOrder,
    });

  // Wait for a pause in typing, then search the whole list from page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Changing the sort starts again from page 1
  const handleSortField = (field) => {
    setSortField(field);
    setCurrentPage(0);
  };
  const handleSortOrder = (order) => {
    setSortOrder(order);
    setCurrentPage(0);
  };

  const handleOrderDeleted = () => {
    // Last row of a later page: step back, otherwise just reload this page
    if (orders.length === 1 && currentPage > 0) {
      setCurrentPage((page) => page - 1);
    } else {
      refetch();
    }
  };

  const showFirstPageAgain = () => {
    setCurrentPage(0);
    refetch();
  };

  const handleWhatsNewConfirmed = () => {
    markWhatsNewSeen(localStorage.getItem("userId"));
    setShowWhatsNew(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate("/shop");
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const data = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]]
      );
      if (!Array.isArray(data) || data.length === 0) {
        return toast.error("Excel sheet is empty or invalid.");
      }

      setExcelHeaders(Object.keys(data[0]));
      setExcelData(data);
      setShowMappingModal(true);
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingConfirm = async (fieldMap) => {
    setShowMappingModal(false);
    setBulkUploading(true);
    try {
      const mappedOrders = excelData.map((row) => {
        const mapped = {};
        for (const [excelKey, field] of Object.entries(fieldMap)) {
          let value = row[excelKey];
          if (["advance", "balance", "price", "quantity"].includes(field)) {
            value = typeof value === "string" ? value.replace(/,/g, "") : value;
            value = Number(value);
          }
          mapped[field] = value;
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

      showFirstPageAgain();
      toast.success(`${res.data.insertedOrders.length} orders uploaded.`);
    } catch (err) {
      toast.error("Bulk upload failed.");
    } finally {
      setBulkUploading(false);
    }
  };

  if (!shop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FACFBC] font-poppins">
        <img src={loadingGif} alt="loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={shop} onLogout={handleLogout} />
      <div className="p-8">
        <div className="flex flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <span className="text-orange-500 text-3xl">📦</span> Orders
            Dashboard
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <ActionsBar
              onCreateClick={() => setShowCreateModal(true)}
              onFileChange={handleBulkUpload}
            />
          </div>
        </div>

        {!loaded ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-orange-500 border-dashed rounded-full animate-spin"></div>
          </div>
        ) : (
          // Keep the table on screen (dimmed) while the next page loads
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            <OrderList
              orders={orders}
              totalOrders={totalOrders}
              searching={Boolean(search)}
              ordersPerPage={ordersPerPage}
              setOrdersPerPage={setOrdersPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              setSortField={handleSortField}
              setSortOrder={handleSortOrder}
              onEdit={setEditOrder}
              setShowEditOrderModal={setShowEditOrderModal}
              onDelete={handleOrderDeleted}
            />
          </div>
        )}

        {showCreateModal && (
          <CreateOrderModal
            onClose={() => setShowCreateModal(false)}
            onOrderCreated={showFirstPageAgain}
          />
        )}

        {showEditOrderModal && (
          <EditOrderModal
            order={editOrder}
            onClose={() => setShowEditOrderModal(false)}
            onUpdate={(updated) =>
              setOrders((prev) =>
                prev.map((order) =>
                  order._id === updated._id ? updated : order
                )
              )
            }
          />
        )}

        {showMappingModal && (
          <MappingModal
            headers={excelHeaders}
            onConfirm={handleMappingConfirm}
            onClose={() => setShowMappingModal(false)}
          />
        )}

        {showWhatsNew && <WhatsNewModal onConfirm={handleWhatsNewConfirmed} />}

        {bulkUploading && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white px-6 py-4 rounded-md shadow-lg text-orange-600 font-semibold">
              Uploading orders...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
