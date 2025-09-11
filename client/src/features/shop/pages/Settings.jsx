import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import SettingCard from "../components/SettingCard";
import ConfirmResetModal from "../../../common/components/ConfirmResetModal";

const Settings = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/shop");
  };

  const handleReset = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Total order count reset successfully!");
      setShowModal(false);
    } catch (err) {
      toast.error("Failed to reset orders.");
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar
        shop={JSON.parse(localStorage.getItem("shop"))}
        onLogout={handleLogout}
      />

      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold text-orange-700 mb-6">Settings</h1>

        <SettingCard
          title="Order Management"
          description={
            <>
              Resetting will set{" "}
              <span className="font-semibold">total order count</span> to 0 and
              clear{" "}
              <span className="font-semibold">daily order count records</span>{" "}
              including past ones.
            </>
          }
          actionLabel="Reset Total Order Count"
          onAction={() => setShowModal(true)}
        />
      </div>

      {showModal && (
        <ConfirmResetModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleReset}
          title="Reset Total Order Count"
        />
      )}
    </div>
  );
};

export default Settings;
