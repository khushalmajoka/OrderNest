import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export const useShop = () => {
  const [shop, setShop] = useState(null);
  const navigate = useNavigate();

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
        toast.error("Session expired. Please login again.");
        localStorage.clear();
        navigate("/shop");
      }
    };

    fetchDashboardData();
  }, [navigate]);

  return shop;
};