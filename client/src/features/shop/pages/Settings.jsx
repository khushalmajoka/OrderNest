import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import SettingCard from "../components/SettingCard";
import StatusColorsCard from "../components/StatusColorsCard";
import MyPasswordCard from "../components/MyPasswordCard";
import ChangeEmailCard from "../components/ChangeEmailCard";
import TableColumnsCard from "../components/TableColumnsCard";
import { isAdmin } from "../../../common/utils/permissions";
import ConfirmResetModal from "../../../common/components/ConfirmResetModal";
import { clearSession } from "../../whatsNew/whatsNewStorage";
import { useShop } from "../hooks/useShop";
import { getErrorMessage } from "../../../common/utils/api";
import loadingGif from "../../../assets/Loading.gif";

const Settings = () => {
  const navigate = useNavigate();
  const { shop, account, error, reload } = useShop();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = () => {
    clearSession();
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
      toast.error(getErrorMessage(err, "Failed to reset orders."));
    }
  };

  if (!shop && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-orange-50 font-poppins px-4 text-center">
        <p className="text-gray-700">{error}</p>
        <button
          onClick={reload}
          className="px-5 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FACFBC] font-poppins">
        <img src={loadingGif} alt="loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={shop} account={account} onLogout={handleLogout} />

      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-orange-700 mb-6">Settings</h1>

        {isAdmin(account) ? (
          <>
            <ChangeEmailCard email={account.email} onChanged={reload} />

            <TableColumnsCard shop={shop} />

            <StatusColorsCard shop={shop} />

            <SettingCard
              title="Order Management"
              description={
                <>
                  Resetting will set{" "}
                  <span className="font-semibold">total order count</span> to 0
                  and clear{" "}
                  <span className="font-semibold">
                    daily order count records
                  </span>{" "}
                  including past ones.
                </>
              }
              actionLabel="Reset Total Order Count"
              onAction={() => setShowModal(true)}
            />
          </>
        ) : (
          <MyPasswordCard
            account={account}
            onRefresh={reload}
            onPasswordChanged={handleLogout}
          />
        )}
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
