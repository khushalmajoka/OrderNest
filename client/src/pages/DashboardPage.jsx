import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
  const [shop, setShop] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShopDetails = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        navigate("/");
        return;
      }

      try {
        const res = await axios.get(`http://localhost:5000/api/shop/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setShop(res.data.shop);
      } catch (err) {
        console.error("Failed to fetch shop details:", err);
        alert("Session expired or invalid token. Please login again.");
        localStorage.clear();
        navigate("/");
      }
    };

    fetchShopDetails();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/login");
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
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-md">
        <div className="flex items-center space-x-4">
          {shop.logo && (
            <img
              src={shop.logo}
              alt="Shop Logo"
              className="w-12 h-12 rounded-full object-cover border"
            />
          )}
          <h1 className="text-2xl font-semibold text-gray-800">{shop.name}</h1>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Logout
        </button>
      </nav>

      {/* Main Content Placeholder */}
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Welcome to your dashboard</h2>
        <p className="text-gray-600">Orders, stats and everything else will be displayed here soon 🚀</p>
      </div>
    </div>
  );
};

export default Dashboard;
